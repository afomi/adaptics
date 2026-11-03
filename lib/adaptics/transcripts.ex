defmodule Adaptics.Transcripts do
  @moduledoc """
  Read-only browser over Claude Code session transcripts (TX1).

  Straight from the filesystem — no database. Claude Code keeps one folder per
  working directory under `~/.claude/projects` (the cwd with every
  non-alphanumeric character turned into `-`), and one JSONL file per session
  inside it. We only look at projects under `~/workspace`.

  Local use only: the routes exist in dev/test, never in a release.
  See `TRANSCRIPT_EXPLORER.md`.
  """

  @uuid ~r/\A[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\z/
  # How far into a file we look for a session's title before giving up.
  @head_lines 300
  # Longest tool input we keep for display.
  @input_chars 2_000

  def root, do: config(:root, "~/.claude/projects") |> Path.expand()
  def workspace, do: config(:workspace, "~/workspace") |> Path.expand()

  defp config(key, default),
    do: Application.get_env(:adaptics, __MODULE__, []) |> Keyword.get(key, default)

  @doc "Source paths for lightweight checks of transcript changes."
  def source_files(slug) do
    if slug != "" and not String.contains?(slug, ["/", "\\"]), do: session_files(slug), else: []
  end

  @doc "Folder-name prefix shared by every project under the workspace."
  def prefix, do: String.replace(workspace(), ~r/[^A-Za-z0-9]/, "-") <> "-"

  @sorts ~w(name sessions messages recent)
  def sorts, do: @sorts

  @session_sorts ~w(recent title messages)
  def session_sorts, do: @session_sorts

  @doc "Workspace projects, by folder name."
  def list_projects do
    case File.ls(root()) do
      {:ok, names} ->
        names
        |> Enum.filter(&String.starts_with?(&1, prefix()))
        |> Enum.map(&(&1 |> String.replace_prefix(prefix(), "") |> project_summary()))
        |> Enum.reject(&(&1.session_count == 0))
        |> Enum.sort_by(& &1.name)

      {:error, _} ->
        []
    end
  end

  @doc """
  Sort projects by `"name"` (A→Z), `"sessions"`, `"messages"` or `"recent"`
  (most first). `messages` maps slug → your message count; projects not yet
  counted sort last. Ties fall back to name.
  """
  def sort_projects(projects, sort, messages \\ %{}) do
    key =
      case sort do
        "sessions" -> &{-&1.session_count, &1.name}
        "messages" -> &{-Map.get(messages, &1.slug, -1), &1.name}
        "recent" -> &{-activity_key(&1.modified), &1.name}
        _ -> & &1.name
      end

    Enum.sort_by(projects, key)
  end

  @doc """
  How many messages you typed in each project (slug → count), counted with
  the same rules as a session's prompts. Reads every transcript, in parallel.
  """
  def message_counts(projects) do
    projects
    |> Task.async_stream(&{&1.slug, message_count(&1.slug)}, timeout: :infinity, ordered: false)
    |> Map.new(fn {:ok, pair} -> pair end)
  end

  @doc "Sort sessions by `\"recent\"` (default), `\"title\"` (A→Z) or `\"messages\"` (most first)."
  def sort_sessions(sessions, sort, messages \\ %{}) do
    key =
      case sort do
        "title" -> &{String.downcase(&1.title), &1.id}
        "messages" -> &{-Map.get(messages, &1.id, -1), -activity_key(&1.modified)}
        _ -> &{-activity_key(&1.modified), &1.id}
      end

    Enum.sort_by(sessions, key)
  end

  @doc "How many messages you typed in each of a project's sessions (id → count)."
  def session_message_counts(slug) do
    slug
    |> session_files()
    |> Task.async_stream(&{Path.basename(&1, ".jsonl"), count_prompts(&1)},
      timeout: :infinity,
      ordered: false
    )
    |> Map.new(fn {:ok, pair} -> pair end)
  end

  @doc """
  Search a project's sessions for `query` (case-insensitive) in your messages,
  Claude's answers and tool inputs. Returns the sessions with hits, newest
  first, each with its matching turns and a snippet around the first match:
  `%{slug:, id:, title:, modified:, turns: [%{number:, label:, snippet: {before, match, after}}]}`.
  """
  def search(slug, query) do
    if get_project(slug),
      do: search_files(for(path <- session_files(slug), do: {slug, path}), query),
      else: []
  end

  @doc """
  Search every workspace project. Returns `[%{project:, sessions: hits}]`,
  where `hits` is shaped as in `search/2`; the project with the most recent
  hit comes first.
  """
  def search_all(query) do
    projects = Map.new(list_projects(), &{&1.slug, &1})

    projects
    |> Enum.flat_map(fn {slug, _} -> for path <- session_files(slug), do: {slug, path} end)
    |> search_files(query)
    |> Enum.group_by(& &1.slug)
    |> Enum.map(fn {slug, hits} -> %{project: projects[slug], sessions: hits} end)
    |> Enum.sort_by(&activity_key(hd(&1.sessions).modified), :desc)
  end

  # Hits for `{slug, path}` pairs, newest session first, each tagged with its slug.
  defp search_files(pairs, query) do
    query = String.trim(query || "")

    if query == "" do
      []
    else
      regex = Regex.compile!(Regex.escape(query), "iu")

      pairs
      |> Task.async_stream(fn {slug, path} -> search_file(slug, path, query, regex) end,
        timeout: :infinity,
        ordered: false
      )
      |> Enum.flat_map(fn {:ok, hits} -> hits end)
      |> Enum.sort_by(&activity_key(&1.modified), :desc)
    end
  end

  # Cheap check on the raw file first; only files that might match are read
  # line by line. (A query with `"` or `\` is escaped differently in JSON, so
  # skip the check.)
  defp search_file(slug, path, query, regex) do
    if String.contains?(query, ["\"", "\\"]) or Regex.match?(regex, File.read!(path)) do
      case scan_turns(path, regex) do
        [] ->
          []

        turns ->
          id = Path.basename(path, ".jsonl")
          [%{slug: slug, id: id, title: title(path), modified: last_activity(path), turns: turns}]
      end
    else
      []
    end
  end

  # Matching turns, numbered exactly as `get_session/2` numbers them, without
  # decoding every line: prompts are decoded (they number the turns), Claude's
  # lines only when they contain the query (or come before the first prompt,
  # where they make a "(start)" turn). Tool results are never decoded.
  defp scan_turns(path, regex) do
    path
    |> File.stream!()
    |> Enum.reduce({0, nil, []}, fn line, {number, label, hits} = acc ->
      cond do
        prompt_line?(line) ->
          case line |> decode() |> human_prompt() do
            nil ->
              acc

            text ->
              number = number + 1
              label = label(%{text: text})
              {number, label, add_hit(hits, number, label, [text], regex)}
          end

        String.contains?(line, ~s("type":"assistant")) and
            (number == 0 or Regex.match?(regex, line)) ->
          texts =
            line
            |> decode()
            |> entries()
            |> Enum.flat_map(fn
              %{kind: :answer, text: text} -> [text]
              %{kind: :work, tools: tools} -> Enum.map(tools, & &1.input)
            end)

          {number, label} =
            if number == 0 and texts != [], do: {1, label(nil)}, else: {number, label}

          {number, label, add_hit(hits, number, label, texts, regex)}

        true ->
          acc
      end
    end)
    |> elem(2)
    |> Enum.reverse()
  end

  defp prompt_line?(line),
    do: String.contains?(line, ~s("type":"user")) and not String.contains?(line, "toolUseResult")

  defp decode(line) do
    case Jason.decode(line) do
      {:ok, record} when is_map(record) -> record
      _ -> %{}
    end
  end

  # One hit per turn: the first matching text gives the snippet.
  defp add_hit([%{number: number} | _] = hits, number, _label, _texts, _regex), do: hits

  defp add_hit(hits, number, label, texts, regex) do
    case Enum.find_value(texts, &snippet(&1, regex)) do
      nil -> hits
      snippet -> [%{number: number, label: label, snippet: snippet} | hits]
    end
  end

  @snippet_chars 60

  defp snippet(text, regex) do
    case Regex.run(regex, text, return: :index) do
      [{start, length} | _] ->
        before = binary_part(text, 0, start)
        rest = binary_part(text, start + length, byte_size(text) - start - length)

        {ellipsis_left(before), binary_part(text, start, length), ellipsis_right(rest)}

      nil ->
        nil
    end
  end

  defp ellipsis_left(text) do
    if String.length(text) > @snippet_chars,
      do: "…" <> String.slice(text, -@snippet_chars, @snippet_chars),
      else: text
  end

  defp ellipsis_right(text) do
    if String.length(text) > @snippet_chars,
      do: String.slice(text, 0, @snippet_chars) <> "…",
      else: text
  end

  defp message_count(slug) do
    slug |> session_files() |> Enum.map(&count_prompts/1) |> Enum.sum()
  end

  # Only lines that might be a prompt are decoded; tool results are most of a
  # transcript and are skipped by a substring check.
  defp count_prompts(path) do
    path
    |> File.stream!()
    |> Stream.filter(&prompt_line?/1)
    |> Enum.count(&(&1 |> decode() |> human_prompt() != nil))
  end

  # A prompt you typed in the main conversation (not a subagent's).
  defp human_prompt(%{"isSidechain" => true}), do: nil
  defp human_prompt(record), do: prompt_text(record)

  @doc """
  A project by its working folder name (`adaptics` for `~/workspace/adaptics`),
  or nil. The name is the project's id everywhere — in URLs and results — and
  only gets the workspace prefix back when we touch the disk.
  """
  def get_project(slug) do
    if slug != "" and not String.contains?(slug, ["/", "\\"]) and File.dir?(project_dir(slug)),
      do: project_summary(slug)
  end

  @doc "Sessions in a project, newest first, each with a title."
  def list_sessions(slug) do
    slug
    |> session_files()
    |> Enum.map(fn path ->
      %{
        id: Path.basename(path, ".jsonl"),
        modified: last_activity(path),
        size: File.stat!(path).size,
        title: title(path)
      }
    end)
    |> Enum.sort_by(&activity_key(&1.modified), :desc)
  end

  @doc """
  One session as a list of entries in file order:
  `%{kind: :prompt | :answer, text: ...}` and `%{kind: :work, tools: [%{name:, input:}]}`,
  where a run of tool calls between two texts collapses into one `:work` entry.

  The same entries are also grouped as `turns`: each prompt starts a turn
  (`%{number:, label:, prompt:, entries:, tool_count:}`, numbered from 1).
  """
  def get_session(slug, id) do
    path = Path.join(project_dir(slug), id <> ".jsonl")

    if get_project(slug) && Regex.match?(@uuid, id) && File.regular?(path) do
      entries =
        path
        |> records()
        |> Enum.flat_map(&entries/1)
        |> collapse_work()

      %{
        id: id,
        title: title(path),
        modified: last_activity(path),
        entries: entries,
        turns: turns(entries)
      }
    end
  end

  @doc "Prompts and source turn numbers, without decoding the session's tool output."
  def prompt_turns(slug, id) do
    path = Path.join(project_dir(slug), id <> ".jsonl")

    if get_project(slug) && Regex.match?(@uuid, id) && File.regular?(path) do
      path
      |> File.stream!()
      |> Enum.reduce({0, []}, fn line, {number, prompts} = acc ->
        cond do
          prompt_line?(line) ->
            record = decode(line)

            case human_prompt(record) do
              nil ->
                acc

              text ->
                {number + 1,
                 [%{number: number + 1, text: text, at: record["timestamp"]} | prompts]}
            end

          number == 0 and String.contains?(line, ~s("type":"assistant")) ->
            if entries(decode(line)) == [], do: acc, else: {1, prompts}

          true ->
            acc
        end
      end)
      |> elem(1)
      |> Enum.reverse()
    else
      []
    end
  end

  # -- projects ---------------------------------------------------------------

  # ~/.claude/projects/-Users-you-workspace-<slug>
  defp project_dir(slug), do: Path.join(root(), prefix() <> slug)

  defp project_summary(slug) do
    files = session_files(slug)

    %{
      slug: slug,
      name: slug,
      session_count: length(files),
      modified:
        files
        |> Enum.map(&last_activity/1)
        |> Enum.reject(&is_nil/1)
        |> Enum.max(DateTime, fn -> nil end)
    }
  end

  defp session_files(slug) do
    slug |> project_dir() |> Path.join("*.jsonl") |> Path.wildcard()
  end

  defp activity_key(nil), do: 0
  defp activity_key(datetime), do: DateTime.to_unix(datetime)

  @doc "Latest recorded conversation timestamp; filesystem touch times are not activity."
  def last_activity(path) do
    case File.open(path, [:read, :binary], fn io ->
           {:ok, size} = :file.position(io, :eof)
           tail_activity(io, size, min(size, 65_536))
         end) do
      {:ok, time} -> time
      {:error, _} -> nil
    end
  end

  defp tail_activity(_io, 0, _window), do: nil

  defp tail_activity(io, size, window) do
    start = size - window
    {:ok, body} = :file.pread(io, start, window)
    lines = String.split(body, "\n")
    # The first line may begin partway through a record (or UTF-8 character).
    lines = if start > 0, do: tl(lines), else: lines

    latest =
      lines
      |> Enum.filter(&String.contains?(&1, ~s("timestamp")))
      |> Enum.map(&decode/1)
      |> Enum.flat_map(fn record ->
        if record["type"] in ["user", "assistant"] and record["isMeta"] != true and
             record["isSidechain"] != true do
          with value when is_binary(value) <- record["timestamp"],
               {:ok, datetime, _} <- DateTime.from_iso8601(value) do
            [datetime]
          else
            _ -> []
          end
        else
          []
        end
      end)
      |> Enum.max(DateTime, fn -> nil end)

    if is_nil(latest) and start > 0,
      do: tail_activity(io, size, min(size, window * 2)),
      else: latest
  end

  # -- records ----------------------------------------------------------------

  # Lines that are not valid JSON (e.g. a half-written last line) are skipped.
  defp records(path) do
    path
    |> File.stream!()
    # Tool results dominate file size and never produce reader entries.
    |> Stream.filter(&(prompt_line?(&1) or String.contains?(&1, ~s("type":"assistant"))))
    |> Stream.flat_map(fn line ->
      case Jason.decode(line) do
        {:ok, record} when is_map(record) -> [record]
        _ -> []
      end
    end)
  end

  # The session's title: Claude's `ai-title` if present, else the first prompt.
  # Only lines that could hold a title are decoded.
  defp title(path) do
    head =
      path
      |> File.stream!()
      |> Enum.take(@head_lines)
      |> Enum.filter(&(String.contains?(&1, ~s("type":"ai-title")) or prompt_line?(&1)))
      |> Enum.map(&decode/1)

    Enum.find_value(head, fn r -> r["type"] == "ai-title" && r["aiTitle"] end) ||
      Enum.find_value(head, &prompt_text/1) ||
      "(untitled)"
  end

  defp entries(%{"isSidechain" => true}), do: []

  defp entries(%{"type" => "user"} = r) do
    case prompt_text(r) do
      nil -> []
      text -> [%{kind: :prompt, text: text, at: r["timestamp"]}]
    end
  end

  defp entries(%{"type" => "assistant", "message" => %{"content" => blocks}})
       when is_list(blocks) do
    Enum.flat_map(blocks, fn
      %{"type" => "text", "text" => text} ->
        [%{kind: :answer, text: text}]

      %{"type" => "tool_use", "name" => name} = b ->
        [%{kind: :work, tools: [tool(name, b["input"])]}]

      _ ->
        []
    end)
  end

  defp entries(_), do: []

  # A tool call's input as one readable string: the field that says what the
  # call did (a command, a path, a pattern…), else the whole input as JSON.
  defp tool(name, input) do
    text =
      case input do
        %{"command" => c} -> c
        %{"file_path" => p} -> p
        %{"pattern" => p} -> p
        %{"url" => u} -> u
        %{"query" => q} -> q
        %{"prompt" => p} -> p
        %{} = map when map_size(map) > 0 -> Jason.encode!(map, pretty: true)
        _ -> ""
      end

    %{name: name, input: String.slice(text, 0, @input_chars)}
  end

  # A human prompt: a user record that is not meta, not a tool result,
  # and not local-command chatter.
  defp prompt_text(%{"type" => "user", "message" => %{"content" => content}} = r) do
    text =
      case content do
        text when is_binary(text) ->
          text

        blocks when is_list(blocks) ->
          for(%{"type" => "text", "text" => t} <- blocks, do: t) |> Enum.join("\n")

        _ ->
          ""
      end

    cond do
      r["isMeta"] || r["toolUseResult"] -> nil
      String.trim(text) == "" -> nil
      String.starts_with?(text, "<local-command") -> nil
      true -> text
    end
  end

  defp prompt_text(_), do: nil

  # Split entries at each prompt. Anything before the first prompt becomes a
  # turn with no prompt.
  defp turns(entries) do
    entries
    |> Enum.chunk_while(
      [],
      fn
        %{kind: :prompt} = e, [] -> {:cont, [e]}
        %{kind: :prompt} = e, acc -> {:cont, Enum.reverse(acc), [e]}
        e, acc -> {:cont, [e | acc]}
      end,
      fn
        [] -> {:cont, []}
        acc -> {:cont, Enum.reverse(acc), []}
      end
    )
    |> Enum.with_index(1)
    |> Enum.map(fn {chunk, number} ->
      {prompt, rest} =
        case chunk do
          [%{kind: :prompt} = p | rest] -> {p, rest}
          rest -> {nil, rest}
        end

      %{
        number: number,
        label: label(prompt),
        prompt: prompt,
        entries: rest,
        tool_count: rest |> Enum.map(&length(Map.get(&1, :tools, []))) |> Enum.sum()
      }
    end)
  end

  # A short chip label: the prompt's first line, or the tag name of a
  # system-generated prompt such as `<task-notification>`.
  defp label(nil), do: "(start)"

  defp label(%{text: text}) do
    case Regex.run(~r/\A\s*<([a-z][\w-]*)/, text) do
      [_, tag] -> tag
      nil -> text |> String.trim() |> String.split("\n", parts: 2) |> hd() |> String.slice(0, 80)
    end
  end

  defp collapse_work(entries) do
    entries
    |> Enum.chunk_while(
      nil,
      fn
        %{kind: :work, tools: t}, %{kind: :work} = acc -> {:cont, %{acc | tools: acc.tools ++ t}}
        entry, nil -> {:cont, entry}
        entry, acc -> {:cont, acc, entry}
      end,
      fn
        nil -> {:cont, nil}
        acc -> {:cont, acc, nil}
      end
    )
  end
end

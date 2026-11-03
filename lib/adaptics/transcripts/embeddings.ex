defmodule Adaptics.Transcripts.Embeddings do
  @moduledoc """
  Embeddings of transcript turns, for exploring a project by meaning (TX6).

  One vector per turn, from the message you typed (your intent, not Claude's
  reply). By default only *content* is embedded — see `classify/1`: conversation control
  ("proceed", "commit and push"), compaction summaries, interruption markers
  and system-tagged prompts (`<task-notification>`…) would otherwise form the
  biggest "topics". Pasted text is unwrapped and kept. Credential-shaped strings
  never get past `turn_records/2`: see `scrub/1`. Vectors are cached on disk, outside the repo — transcripts can
  hold secrets — one JSONL file per project and model:

      ~/.cache/adaptics/transcript_embeddings/<project>/<model>.jsonl
      {"id": "<session-uuid>#<turn>", "sha": "<sha256 of text>", "embedding": [...]}

  Re-running only embeds turns whose id or text is new. The CLI also embeds
  control prompts so the Workflow semantic axis can separate them by meaning.
  """

  alias Adaptics.Embeddings
  alias Adaptics.Semantic.{Topics, VectorMath}
  alias Adaptics.Transcripts

  @max_chars 2_000
  @batch 16

  def cache_dir do
    Application.get_env(:adaptics, Adaptics.Transcripts, [])
    |> Keyword.get(:embeddings_cache, "~/.cache/adaptics/transcript_embeddings")
    |> Path.expand()
  end

  def cache_path(slug, model),
    do:
      Path.join([cache_dir(), slug, String.replace(model, ~r/[^A-Za-z0-9._-]/, "_") <> ".jsonl"])

  @control ~r/^(proceed|continue|resume|yes|yep|ok|okay|go ahead|go for it|do it|sounds good|great|thanks|thank you|lgtm|you can comm?it|commit|push)\b/i

  # Credential shapes, longest-lived first. Add one when a new kind turns up;
  # `scrub/1` is the only gate between transcripts and everything derived.
  @secrets [
    ~r/\bjur_[a-z]+_[A-Za-z0-9]{8,}/,
    ~r/\bsk-[A-Za-z0-9_-]{16,}/,
    ~r/\bgh[pousr]_[A-Za-z0-9]{20,}/,
    ~r/\bgithub_pat_[A-Za-z0-9_]{20,}/,
    ~r/\bAKIA[0-9A-Z]{16}\b/,
    ~r/\bxox[abprs]-[A-Za-z0-9-]{10,}/,
    ~r/\bBearer\s+[A-Za-z0-9._~+\/=-]{16,}/
  ]
  @placeholder "[secret]"

  @doc "Replaces credential-shaped strings with `[secret]`."
  def scrub(text) do
    Enum.reduce(@secrets, text, &Regex.replace(&1, &2, @placeholder))
  end

  @doc """
  What kind of message a prompt is:
  `:content` | `:control` | `:summary` | `:interrupted` | `:system` | `:secret`
  (nothing left once its credentials are removed).
  """
  def classify(text) do
    text = String.trim(text)

    cond do
      text |> unwrap() |> scrub() |> String.replace(@placeholder, "") |> String.trim() == "" ->
        :secret

      String.starts_with?(text, "<pasted_content") ->
        :content

      String.starts_with?(text, "<") ->
        :system

      String.starts_with?(text, "[Request interrupted") ->
        :interrupted

      String.starts_with?(text, "This session is being continued from a previous conversation") ->
        :summary

      String.length(text) <= 40 and Regex.match?(@control, text) ->
        :control

      true ->
        :content
    end
  end

  @doc """
  Your content messages in a project, one per turn: `%{id => text}` with
  id = `"<session-uuid>#<turn number>"` (the same `#turn-N` the session page
  links to).
  """
  def turn_texts(slug, opts \\ []) do
    Map.new(turn_records(slug, opts), fn {id, turn} -> {id, turn.text} end)
  end

  @doc "Content turns with source coordinates and timestamps for linked visual views."
  def turn_records(slug, opts \\ []) do
    kinds =
      if Keyword.get(opts, :include_control, false), do: [:content, :control], else: [:content]

    for session <- Transcripts.list_sessions(slug),
        turn <- Transcripts.prompt_turns(slug, session.id),
        classify(turn.text) in kinds,
        text = turn.text |> unwrap() |> scrub(),
        text != "",
        into: %{} do
      {"#{session.id}##{turn.number}",
       %{
         text: String.slice(text, 0, @max_chars),
         session_id: session.id,
         number: turn.number,
         at: turn.at,
         title: session.title
       }}
    end
  end

  @doc "Read current, text-matching vectors without embedding or writing anything."
  def cached(slug, opts \\ []) do
    model = Keyword.get(opts, :model, Embeddings.model())
    texts = Keyword.get_lazy(opts, :texts, fn -> turn_texts(slug, opts) end)

    slug
    |> cache_path(model)
    |> read_cache()
    |> Enum.filter(fn {id, entry} -> Map.has_key?(texts, id) and entry.sha == sha(texts[id]) end)
    |> Map.new(fn {id, entry} -> {id, entry.embedding} end)
  end

  @doc "How a project's prompts break down by kind (`classify/1`)."
  def breakdown(slug) do
    for session <- Transcripts.list_sessions(slug),
        turn <- Transcripts.prompt_turns(slug, session.id) do
      classify(turn.text)
    end
    |> Enum.frequencies()
  end

  # Pasted text keeps its words, loses its wrapper tags.
  defp unwrap(text) do
    text
    |> String.replace(~r{</?pasted_content[^>]*>}, "")
    |> String.trim()
  end

  @doc """
  Embeddings for a project's turns: `{:ok, %{id => vector}, stats}` or
  `{:error, reason}`. Cached vectors are reused; new ones are appended to the
  cache as each batch returns, so an interrupted run keeps its progress.
  `on_progress.(done, total)` is called after each batch.
  """
  def embed(slug, opts \\ []) do
    model = Keyword.get(opts, :model, Embeddings.model())
    on_progress = Keyword.get(opts, :on_progress, fn _, _ -> :ok end)
    texts = Keyword.get_lazy(opts, :texts, fn -> turn_texts(slug) end)
    path = cache_path(slug, model)

    cached = read_cache(path)

    todo =
      texts
      |> Enum.reject(fn {id, text} -> get_in(cached, [id, :sha]) == sha(text) end)
      |> Enum.sort()

    File.mkdir_p!(Path.dirname(path))

    result =
      todo
      |> Enum.chunk_every(@batch)
      |> Enum.reduce_while({:ok, 0}, fn batch, {:ok, done} ->
        case Embeddings.embed(Enum.map(batch, &elem(&1, 1)), model: model) do
          {:ok, vectors} ->
            lines =
              batch
              |> Enum.zip(vectors)
              |> Enum.map(fn {{id, text}, v} ->
                Jason.encode!(%{id: id, sha: sha(text), embedding: v}) <> "\n"
              end)

            File.write!(path, lines, [:append])
            done = done + length(batch)
            on_progress.(done, length(todo))
            {:cont, {:ok, done}}

          {:error, reason} ->
            {:halt, {:error, reason}}
        end
      end)

    with {:ok, added} <- result do
      vectors = cached(slug, model: model, texts: texts)

      {:ok, vectors,
       %{
         turns: map_size(texts),
         cached: map_size(texts) - added,
         embedded: added,
         model: model,
         path: path
       }}
    end
  end

  @doc """
  Topics over a project's turn embeddings (`Semantic.Topics.fit/4`), plus for
  each topic the turns nearest its centroid — the most typical messages.
  """
  def topics(vectors, texts, k, examples \\ 4) do
    if map_size(vectors) == 0 do
      %{assignments: %{}, placements: %{}, topics: %{}, typical: %{}}
    else
      fit_topics(vectors, texts, max(k, 1), examples)
    end
  end

  defp fit_topics(vectors, texts, k, examples) do
    # conversational filler that would otherwise label every topic
    filler = ~w(lets let please ok okay yes also just like now want need make sure use using)
    fit = Topics.fit(vectors, texts, k, stopwords: filler)

    typical =
      fit.assignments
      |> Enum.group_by(&elem(&1, 1), &elem(&1, 0))
      |> Map.new(fn {cluster, ids} ->
        center = ids |> Enum.map(&vectors[&1]) |> VectorMath.centroid()

        nearest =
          ids
          |> Enum.sort_by(&(-VectorMath.cosine_similarity(vectors[&1], center)))
          |> Enum.take(examples)

        {cluster, nearest}
      end)

    Map.put(fit, :typical, typical)
  end

  defp read_cache(path) do
    case File.read(path) do
      {:ok, body} ->
        body
        |> String.split("\n", trim: true)
        |> Enum.flat_map(fn line ->
          case Jason.decode(line) do
            {:ok, %{"id" => id, "sha" => sha, "embedding" => v}} ->
              [{id, %{sha: sha, embedding: v}}]

            _ ->
              []
          end
        end)
        # later lines win (a re-embedded turn is appended after its old entry)
        |> Map.new()

      {:error, _} ->
        %{}
    end
  end

  defp sha(text), do: :crypto.hash(:sha256, text) |> Base.encode16(case: :lower)
end

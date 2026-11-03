defmodule Adaptics.TranscriptsTest do
  use ExUnit.Case, async: true

  alias Adaptics.Transcripts

  @demo "demo"
  @hello "11111111-1111-4111-8111-111111111111"

  test "prompt-only scan preserves reader numbering, text, and timestamps" do
    for project <- Transcripts.list_projects(),
        session <- Transcripts.list_sessions(project.slug) do
      expected =
        for turn <- Transcripts.get_session(project.slug, session.id).turns,
            turn.prompt,
            do: %{number: turn.number, text: turn.prompt.text, at: turn.prompt.at}

      assert Transcripts.prompt_turns(project.slug, session.id) == expected
    end

    assert Transcripts.prompt_turns("elsewhere", @hello) == []
    assert Transcripts.prompt_turns("demo", "../bad") == []
  end

  test "lists only projects under the workspace, by name" do
    assert [%{name: "alpha", session_count: 1}, %{slug: @demo, name: "demo", session_count: 2}] =
             Transcripts.list_projects()

    assert Transcripts.get_project("elsewhere") == nil
    assert Transcripts.get_project("-home-fixture-elsewhere") == nil
    # the id is the working folder name; the full folder name is not an id
    assert %{slug: "demo"} = Transcripts.get_project("demo")
    assert Transcripts.get_project("-home-fixture-workspace-demo") == nil
    assert Transcripts.get_project("") == nil
    assert Transcripts.get_project("demo/../alpha") == nil
    assert Transcripts.get_project("../#{@demo}") == nil
  end

  test "counts the messages you typed per project" do
    # demo: 2 + 3 prompts; alpha: 1 (the sidechain and the tool result don't count)
    assert Transcripts.message_counts(Transcripts.list_projects()) == %{
             @demo => 5,
             "alpha" => 1
           }
  end

  test "sorts projects by name, sessions, messages or recent" do
    projects = [
      %{slug: "b", name: "b", session_count: 1, modified: ~U[2026-10-03 00:00:00Z]},
      %{slug: "a", name: "a", session_count: 1, modified: ~U[2026-10-01 00:00:00Z]},
      %{slug: "c", name: "c", session_count: 9, modified: ~U[2026-10-02 00:00:00Z]}
    ]

    order = fn sort, messages ->
      projects |> Transcripts.sort_projects(sort, messages) |> Enum.map(& &1.slug)
    end

    assert order.("name", %{}) == ~w(a b c)
    assert order.("bogus", %{}) == ~w(a b c)
    # ties fall back to name
    assert order.("sessions", %{}) == ~w(c a b)
    assert order.("recent", %{}) == ~w(b c a)
    # not yet counted sorts last
    assert order.("messages", %{"a" => 3, "b" => 7}) == ~w(b a c)
  end

  test "counts messages per session and sorts sessions" do
    other = "22222222-2222-4222-8222-222222222222"
    assert Transcripts.session_message_counts(@demo) == %{@hello => 2, other => 3}

    sessions = [
      %{id: "x", title: "beta", modified: ~U[2026-10-01 00:00:00Z]},
      %{id: "y", title: "Alpha", modified: ~U[2026-10-02 00:00:00Z]},
      %{id: "z", title: "gamma", modified: ~U[2026-10-03 00:00:00Z]}
    ]

    order = fn sort, messages ->
      sessions |> Transcripts.sort_sessions(sort, messages) |> Enum.map(& &1.id)
    end

    assert order.("recent", %{}) == ~w(z y x)
    assert order.("title", %{}) == ~w(y x z)
    assert order.("messages", %{"x" => 5, "y" => 1}) == ~w(x y z)
  end

  test "searches prompts, answers and tool inputs, case-insensitively, by turn" do
    other = "22222222-2222-4222-8222-222222222222"

    # prompt and answer in the same turn → one turn hit, snippet from the prompt
    assert [%{id: @hello, turns: [%{number: 1, snippet: {"Add a ", "hello", " page."}}]}] =
             Transcripts.search(@demo, "HELLO")

    # a file path inside a tool call's input
    assert [%{id: @hello, turns: [%{number: 1, snippet: {_, "router.ex", ""}}]}] =
             Transcripts.search(@demo, "router.ex")

    # markdown answer in the other session
    assert [%{id: ^other, turns: [%{number: 1}]}] = Transcripts.search(@demo, "green")

    assert Transcripts.search(@demo, "no such words") == []
    assert Transcripts.search(@demo, "  ") == []
    assert Transcripts.search("elsewhere", "Outside") == []
  end

  test "searches across every workspace project, grouped by project" do
    groups = Transcripts.search_all("prompt")

    assert groups |> Enum.map(& &1.project.name) |> Enum.sort() == ["alpha", "demo"]

    for %{project: project, sessions: sessions} <- groups, hit <- sessions do
      assert hit.slug == project.slug
    end

    # the sidechain's "Subagent prompt" is not yours and not searched
    alpha = Enum.find(groups, &(&1.project.name == "alpha"))
    assert [%{turns: [%{number: 1, snippet: {"Alpha ", "prompt", "."}}]}] = alpha.sessions

    assert Transcripts.search_all("no such words") == []
    refute Enum.any?(Transcripts.search_all("Outside"), &(&1.project.slug =~ "elsewhere"))
  end

  test "search numbers turns exactly as the session page does" do
    for project <- Transcripts.list_projects(),
        session <- Transcripts.list_sessions(project.slug),
        query <- ["hello", "read", "e", "router", "green", "task", "word"] do
      regex = Regex.compile!(Regex.escape(query), "iu")

      expected =
        for turn <- Transcripts.get_session(project.slug, session.id).turns,
            texts =
              [turn.prompt && turn.prompt.text] ++
                Enum.flat_map(turn.entries, fn
                  %{kind: :answer, text: t} -> [t]
                  %{kind: :work, tools: tools} -> Enum.map(tools, & &1.input)
                end),
            Enum.any?(texts, &(&1 && Regex.match?(regex, &1))),
            do: turn.number

      found =
        case project.slug |> Transcripts.search(query) |> Enum.find(&(&1.id == session.id)) do
          nil -> []
          hit -> Enum.map(hit.turns, & &1.number)
        end

      assert found == expected, "#{query} in #{session.id}"
    end
  end

  test "titles a session by ai-title, falling back to the first prompt" do
    titles = @demo |> Transcripts.list_sessions() |> Map.new(&{&1.id, &1.title})

    assert titles[@hello] == "Hello page"
    assert titles["22222222-2222-4222-8222-222222222222"] == "Untitled session prompt."
  end

  test "reads a session as prompts, answers and collapsed work" do
    session = Transcripts.get_session(@demo, @hello)

    # meta, local-command output, tool results, thinking, sidechain records,
    # unknown types and the truncated last line are all left out
    assert Enum.map(session.entries, &Map.drop(&1, [:at])) == [
             %{kind: :prompt, text: "Add a hello page."},
             %{kind: :answer, text: "Looking at the router first."},
             %{
               kind: :work,
               tools: [
                 %{name: "Read", input: "/home/fixture/workspace/demo/router.ex"},
                 %{name: "Read", input: ""},
                 %{name: "Edit", input: ""}
               ]
             },
             %{kind: :answer, text: "Added the hello page."},
             %{kind: :prompt, text: "Thanks!"}
           ]
  end

  test "keeps the telling part of a tool's input, else the input as JSON" do
    session = Transcripts.get_session(@demo, "22222222-2222-4222-8222-222222222222")

    assert [%{kind: :prompt}, %{kind: :work, tools: [bash, todo]}, %{kind: :answer} | _] =
             session.entries

    assert bash == %{name: "Bash", input: "mix test"}
    assert todo.input =~ ~s("todos")
  end

  test "groups entries into turns, one per prompt, labelled for a table of contents" do
    hello = Transcripts.get_session(@demo, @hello)

    assert [
             %{number: 1, label: "Add a hello page.", tool_count: 3, entries: [_, _, _]},
             %{number: 2, label: "Thanks!", tool_count: 0, entries: []}
           ] = hello.turns

    other = Transcripts.get_session(@demo, "22222222-2222-4222-8222-222222222222")
    labels = Enum.map(other.turns, & &1.label)

    assert [_, "task-notification", long] = labels
    # first line only, cut to 80 characters
    assert String.length(long) == 80
    refute long =~ "second line"
  end

  test "refuses ids that are not session uuids" do
    assert Transcripts.get_session(@demo, "../../etc/passwd") == nil
    assert Transcripts.get_session(@demo, "99999999-9999-4999-8999-999999999999") == nil
  end
end

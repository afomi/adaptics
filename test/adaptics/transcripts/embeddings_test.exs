defmodule Adaptics.Transcripts.EmbeddingsTest do
  # not async: points the cache at a temp dir via app env
  use ExUnit.Case, async: false

  alias Adaptics.Transcripts.Embeddings

  setup do
    dir = Path.join(System.tmp_dir!(), "adaptics-tx-emb-#{System.unique_integer([:positive])}")
    previous = Application.get_env(:adaptics, Adaptics.Transcripts)

    Application.put_env(
      :adaptics,
      Adaptics.Transcripts,
      Keyword.put(previous, :embeddings_cache, dir)
    )

    on_exit(fn ->
      Application.put_env(:adaptics, Adaptics.Transcripts, previous)
      File.rm_rf!(dir)
    end)

    %{dir: dir}
  end

  test "one text per content turn you typed, keyed session#turn" do
    texts = Embeddings.turn_texts("demo")

    assert texts["11111111-1111-4111-8111-111111111111#1"] == "Add a hello page."
    # "Thanks!" is conversation control, not content
    refute Map.has_key?(texts, "11111111-1111-4111-8111-111111111111#2")
    refute Enum.any?(Map.values(texts), &String.starts_with?(&1, "<task-notification>"))
  end

  test "classifies messages so only content is embedded" do
    assert Embeddings.classify("Add a hello page.") == :content
    assert Embeddings.classify("proceed") == :control
    assert Embeddings.classify("you can commit and push") == :control

    assert Embeddings.classify(
             "proceed with the migration, but keep the old ids around for imports"
           ) == :content

    assert Embeddings.classify(
             "This session is being continued from a previous conversation that ran out of context."
           ) == :summary

    assert Embeddings.classify("[Request interrupted by user for tool use]") == :interrupted
    assert Embeddings.classify("<task-notification>done</task-notification>") == :system
    assert Embeddings.classify(~s(<pasted_content id="x">some notes</pasted_content>)) == :content
  end

  test "credentials are scrubbed, and a message that is only a credential is dropped" do
    token = "jur_dev_" <> String.duplicate("aB3", 10)

    assert Embeddings.classify(token) == :secret
    assert Embeddings.classify("  #{token}\n") == :secret
    assert Embeddings.classify(~s(<pasted_content id="x">#{token}</pasted_content>)) == :secret
    assert Embeddings.classify("use this token: #{token}") == :content

    assert Embeddings.scrub("use #{token} for the import") == "use [secret] for the import"
    assert Embeddings.scrub("Authorization: Bearer abcdefghijklmnop1234") == "Authorization: [secret]"
    assert Embeddings.scrub("ghp_" <> String.duplicate("x", 36)) == "[secret]"

    # ordinary words that look a little like tokens are left alone
    assert Embeddings.scrub("the jur_dev branch and sk-learn") == "the jur_dev branch and sk-learn"
  end

  test "embeds, caches outside the repo, and only embeds what's new on re-run", %{dir: dir} do
    assert {:ok, vectors, first} = Embeddings.embed("demo", model: "fake")
    assert map_size(vectors) == map_size(Embeddings.turn_texts("demo"))
    assert first.embedded == map_size(vectors) and first.cached == 0
    assert String.starts_with?(first.path, dir)
    assert File.exists?(first.path)

    assert {:ok, again, second} = Embeddings.embed("demo", model: "fake")
    assert again == vectors
    assert second.embedded == 0 and second.cached == map_size(vectors)

    # a changed message is re-embedded; the rest come from cache
    texts =
      Embeddings.turn_texts("demo")
      |> Map.put("11111111-1111-4111-8111-111111111111#2", "Thanks a lot!")

    assert {:ok, _, third} = Embeddings.embed("demo", model: "fake", texts: texts)
    assert third.embedded == 1
  end

  test "topics come with their most typical messages" do
    {:ok, vectors, _} = Embeddings.embed("demo", model: "fake")
    fit = Embeddings.topics(vectors, Embeddings.turn_texts("demo"), 2)

    assert map_size(fit.topics) == 2

    assert fit.typical |> Map.values() |> List.flatten() |> Enum.sort() ==
             vectors |> Map.keys() |> Enum.sort()
  end

  test "read-only cache rejects changed text and keeps models separate", %{dir: dir} do
    assert Embeddings.cached("demo", model: "absent") == %{}
    refute File.exists?(dir)
    {:ok, vectors, _} = Embeddings.embed("demo", model: "fake")
    assert Embeddings.cached("demo", model: "fake") == vectors
    assert Embeddings.cached("demo", model: "another-model") == %{}

    id = "11111111-1111-4111-8111-111111111111#1"
    texts = Embeddings.turn_texts("demo") |> Map.put(id, "An edited prompt")
    refute Map.has_key?(Embeddings.cached("demo", model: "fake", texts: texts), id)
  end

  test "control turns can be scored alongside subject turns; structural noise stays out" do
    texts = Embeddings.turn_texts("demo", include_control: true)
    assert texts["11111111-1111-4111-8111-111111111111#2"] == "Thanks!"
    refute Enum.any?(Map.values(texts), &String.starts_with?(&1, "<task-notification>"))
  end

  test "an all-workflow project has an empty topic result" do
    assert Embeddings.topics(%{}, %{}, 10) == %{
             assignments: %{},
             placements: %{},
             topics: %{},
             typical: %{}
           }
  end

  test "semantic axis separates workflow by meaning and supports a reviewable cutoff" do
    alias Adaptics.Transcripts.Workflow
    alias Adaptics.Embeddings.Fake

    for {id, text} <- Workflow.anchors() do
      Fake.put(text, if(String.starts_with?(id, "workflow-"), do: [0.0, 1.0], else: [1.0, 0.0]))
    end

    assert Workflow.cached("fake") == nil
    assert {:ok, axis} = Workflow.prepare("fake")
    assert Workflow.cached("fake") == axis
    assert Workflow.cached("other-model") == nil

    Fake.put("status?", [0.1, 0.9])
    Fake.put("commit and push, handoff to the inbox", [0.2, 0.8])
    Fake.put("proceed with the migration, but keep old ids for imports", [0.9, 0.1])

    texts = %{
      "a#1" => "status?",
      "b#1" => "commit and push, handoff to the inbox",
      "c#1" => "proceed with the migration, but keep old ids for imports"
    }

    {:ok, vectors, _} = Embeddings.embed("demo", model: "fake", texts: texts)
    scores = Workflow.scores(vectors, axis)
    assert scores["a#1"] < 0
    assert scores["b#1"] < 0
    assert scores["c#1"] > 0
    assert Map.keys(Workflow.content(vectors, scores)) == ["c#1"]
    assert Workflow.content(vectors, scores, 1.0) == %{}
  end
end

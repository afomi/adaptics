defmodule Adaptics.Transcripts.SnapshotTest do
  use ExUnit.Case, async: false
  alias Adaptics.Transcripts
  alias Adaptics.Transcripts.{Embeddings, Snapshot, Workflow}

  setup do
    dir = Path.join(System.tmp_dir!(), "adaptics-snapshots-#{System.unique_integer([:positive])}")
    root = Path.join(dir, "transcripts")
    File.mkdir_p!(dir)
    File.cp_r!(Transcripts.root(), root)
    previous = Application.get_env(:adaptics, Transcripts)

    Application.put_env(
      :adaptics,
      Transcripts,
      previous
      |> Keyword.put(:root, root)
      |> Keyword.put(:embeddings_cache, Path.join(dir, "cache"))
    )

    on_exit(fn ->
      Application.put_env(:adaptics, Transcripts, previous)
      File.rm_rf!(dir)
    end)

    :ok
  end

  test "persists results and rebuilds after source edits, additions, or deletions" do
    assert Snapshot.fetch("demo", "test", [model: "fake"], fn -> :first end) == :first
    snapshot = Embeddings.cache_path("demo", "fake") <> ".test.snapshot"
    assert Bitwise.band(File.stat!(snapshot).mode, 0o777) == 0o600

    assert Snapshot.fetch("demo", "test", [model: "fake"], fn ->
             flunk("rebuilt unchanged data")
           end) == :first

    file = hd(Transcripts.source_files("demo"))
    File.write!(file, "\n", [:append])
    assert Snapshot.fetch("demo", "test", [model: "fake"], fn -> :edited end) == :edited
    added = Path.join(Path.dirname(file), "99999999-9999-4999-8999-999999999999.jsonl")
    File.write!(added, "")
    assert Snapshot.fetch("demo", "test", [model: "fake"], fn -> :added end) == :added
    File.rm!(added)
    assert Snapshot.fetch("demo", "test", [model: "fake"], fn -> :removed end) == :removed
  end

  test "invalidates when vectors or axis anchors change; models and views stay separate" do
    fetch = fn build -> Snapshot.fetch("demo", "atlas-10", [model: "fake"], build) end
    assert fetch.(fn -> :first end) == :first
    vectors = Embeddings.cache_path("demo", "fake")
    File.write!(vectors, "new vectors")
    assert fetch.(fn -> :vectors_changed end) == :vectors_changed
    anchors = Workflow.cache_path("fake")
    File.mkdir_p!(Path.dirname(anchors))
    File.write!(anchors, "new anchors")
    assert fetch.(fn -> :axis_changed end) == :axis_changed

    assert Snapshot.fetch("demo", "atlas-10", [model: "other"], fn -> :other_model end) ==
             :other_model

    assert Snapshot.fetch("demo", "atlas-3", [model: "fake"], fn -> :other_k end) == :other_k
  end

  test "recovers from an interrupted or corrupt snapshot" do
    Snapshot.fetch("demo", "test", [model: "fake"], fn -> :first end)
    File.write!(Embeddings.cache_path("demo", "fake") <> ".test.snapshot", "truncated")
    assert Snapshot.fetch("demo", "test", [model: "fake"], fn -> :rebuilt end) == :rebuilt
  end

  test "concurrent requests share one build" do
    parent = self()

    tasks =
      for _ <- 1..2 do
        Task.async(fn ->
          Snapshot.fetch("demo", "test", [model: "fake"], fn ->
            send(parent, :built)
            :value
          end)
        end)
      end

    assert Enum.map(tasks, &Task.await/1) == [:value, :value]
    assert_receive :built
    refute_receive :built
  end
end

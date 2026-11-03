defmodule Adaptics.Transcripts.ActivityTest do
  use ExUnit.Case, async: true
  alias Adaptics.Transcripts

  setup do
    path =
      Path.join(
        System.tmp_dir!(),
        "adaptics-activity-#{System.unique_integer([:positive])}.jsonl"
      )

    on_exit(fn -> File.rm(path) end)
    %{path: path}
  end

  test "uses recorded message times despite touched files and later bookkeeping", %{path: path} do
    records = [
      %{type: "user", timestamp: "2026-10-01T10:00:00Z"},
      %{type: "assistant", timestamp: "2026-10-02T11:00:00Z"},
      %{type: "system", timestamp: "2026-10-30T12:00:00Z"},
      %{type: "user", isMeta: true, timestamp: "2026-10-31T12:00:00Z"},
      %{type: "assistant", isSidechain: true, timestamp: "2026-10-31T12:00:00Z"}
    ]

    File.write!(path, Enum.map(records, &(Jason.encode!(&1) <> "\n")))
    File.touch!(path)
    assert Transcripts.last_activity(path) == ~U[2026-10-02 11:00:00Z]
    File.write!(path, ~s({"type":"assistant","timestamp":"unfinished), [:append])
    assert Transcripts.last_activity(path) == ~U[2026-10-02 11:00:00Z]
  end

  test "searches farther back when the tail contains only large bookkeeping records", %{
    path: path
  } do
    File.write!(path, Jason.encode!(%{type: "user", timestamp: "2026-10-01T10:00:00Z"}) <> "\n")

    File.write!(
      path,
      Jason.encode!(%{type: "system", data: String.duplicate("x", 150_000)}) <> "\n",
      [:append]
    )

    assert Transcripts.last_activity(path) == ~U[2026-10-01 10:00:00Z]
  end

  test "unknown dates remain unknown", %{path: path} do
    File.write!(path, "")
    assert Transcripts.last_activity(path) == nil
    File.write!(path, Jason.encode!(%{type: "user", timestamp: 123}) <> "\n")
    assert Transcripts.last_activity(path) == nil
  end
end

defmodule Adaptics.Transcripts.RelatedTest do
  use ExUnit.Case, async: true
  alias Adaptics.Transcripts.Related

  test "ranks across sessions, suppressing rewind copies and workflow" do
    index = %{
      vectors: %{
        "a#1" => [1.0, 0.0],
        "a#2" => [1.0, 0.0],
        "b#1" => [1.0, 0.0],
        "b#2" => [0.9, 0.1],
        "c#1" => [0.8, 0.2],
        "c#2" => [0.95, 0.05],
        "d#1" => [0.0, 1.0]
      },
      texts: %{
        "a#1" => "officials photos",
        "a#2" => "same session",
        "b#1" => "officials  photos\n",
        "b#2" => "missing headshot",
        "c#1" => "missing headshot",
        "c#2" => "handoff please",
        "d#1" => "tokens"
      },
      scores: %{"c#2" => -0.5}
    }

    assert {:ok, matches} = Related.nearest(index, "a#1")
    assert Enum.map(matches, & &1.id) == ["b#2", "d#1"]
    assert hd(matches).session_id == "b"
    assert hd(matches).number == 2
    assert hd(matches).similarity > List.last(matches).similarity
    assert {:ok, [_]} = Related.nearest(index, "a#1", 1)
    assert {:error, :not_embedded} = Related.nearest(index, "missing#1")
    assert {:error, :workflow} = Related.nearest(index, "c#2")
  end
end

defmodule AdapticsWeb.CardsPageTest do
  use AdapticsWeb.ConnCase

  # The transcript line contract agreed with votesmash (docs/AGENT_PARTICIPANTS.md,
  # slice 4). assets/js/crowd_replay.js#parseTranscript enforces the same rules.
  @fixture Path.expand("../../../priv/static/fixtures/crowd_transcript_sample.jsonl", __DIR__)
  @known_actions ~w(get_tour take_free_ticket initiate_chain_ticket confirm_chain_ticket
                    answer_question skip_question submit_claim list_claims cast_vote
                    get_scorecard get_results)

  test "GET /cards renders the card space with its panel controls", %{conn: conn} do
    conn = get(conn, "/cards")
    html = html_response(conn, 200)
    assert html =~ ~s(id="cards-container")
    assert html =~ ~s(id="cards-list")
    assert html =~ ~s(id="cards-url-form")
    assert html =~ ~s(id="cards-view-toggle")
    assert html =~ "window.renderCards()"
  end

  test "GET /cards renders the crowd replay controls", %{conn: conn} do
    html = conn |> get("/cards") |> html_response(200)

    for id <- ~w(cards-crowd-sample cards-crowd-file cards-crowd-play cards-crowd-speed
                 cards-crowd-scrub cards-crowd-clock cards-crowd-status) do
      assert html =~ ~s(id="#{id}"), "missing ##{id}"
    end

    assert html =~ ~s(data-src="/fixtures/crowd_transcript_sample.jsonl")
    assert html =~ "window.renderCrowdReplay(window.cards)"
  end

  test "the sample crowd transcript is served as a static file", %{conn: conn} do
    body = conn |> get("/fixtures/crowd_transcript_sample.jsonl") |> response(200)
    assert body == File.read!(@fixture)
  end

  test "every sample transcript line satisfies the line contract" do
    lines =
      @fixture
      |> File.read!()
      |> String.split("\n", trim: true)
      |> Enum.map(&Jason.decode!/1)

    assert length(lines) > 100

    for line <- lines do
      assert line["v"] == 1
      assert {:ok, _, _} = DateTime.from_iso8601(line["ts"])
      assert is_binary(line["agent"]) and line["agent"] != ""
      assert is_integer(line["seq"])
      assert line["action"] in @known_actions
      assert is_integer(get_in(line, ["response", "status"]))
    end

    # Per agent, seq counts up from 1 with no gaps and never runs backwards in time.
    for {agent, agent_lines} <- Enum.group_by(lines, & &1["agent"]) do
      seqs = Enum.map(agent_lines, & &1["seq"])
      assert Enum.sort(seqs) == Enum.to_list(1..length(seqs)), "#{agent}: seq gaps"

      times =
        agent_lines
        |> Enum.sort_by(& &1["seq"])
        |> Enum.map(&(&1["ts"] |> DateTime.from_iso8601() |> elem(1)))

      assert times == Enum.sort(times, DateTime), "#{agent}: ts runs backwards"
    end
  end

  test "the sample run exercises every phase, every rail and rejected calls" do
    lines =
      @fixture
      |> File.read!()
      |> String.split("\n", trim: true)
      |> Enum.map(&Jason.decode!/1)

    agents = lines |> Enum.map(& &1["agent"]) |> Enum.uniq()
    assert length(agents) == 7

    rails = for %{"action" => "initiate_chain_ticket", "params" => %{"rail" => r}} <- lines, do: r
    assert "bsv_sats" in rails and "bsv_mnee" in rails
    assert Enum.any?(lines, &(&1["action"] == "take_free_ticket"))
    assert Enum.any?(lines, &(&1["action"] == "confirm_chain_ticket" and &1["txid"]))

    errors = for %{"response" => %{"error" => e}} when is_binary(e) <- lines, do: e
    assert "txid_unseen" in errors
    assert "phase_closed" in errors

    for action <- ~w(answer_question submit_claim cast_vote get_scorecard) do
      assert Enum.any?(lines, &(&1["action"] == action)), "no #{action} in sample"
    end
  end
end

defmodule AdapticsWeb.ResonancePageTest do
  use AdapticsWeb.ConnCase

  test "GET /resonance renders the field, its scenes and controls", %{conn: conn} do
    html = conn |> get("/resonance") |> html_response(200)

    assert html =~ "Resonance"
    assert html =~ ~s(id="res-container")

    # scene ids must match SCENES in assets/js/resonance_model.js
    for id <- ~w(two opposed different goal team) do
      assert html =~ ~s(data-scene="#{id}")
    end

    for id <- ~w(res-hint res-vision res-reach res-stubborn res-move res-influence res-add-person res-add-goal res-story) do
      assert html =~ ~s(id="#{id}"), id
    end
  end
end

defmodule AdapticsWeb.ChladniPageTest do
  use AdapticsWeb.ConnCase

  test "GET /chladni renders the modes, the controls panel and the explore pickers", %{conn: conn} do
    html = conn |> get("/chladni") |> html_response(200)

    assert html =~ ~s(id="chladni-container")

    for mode <- ~w(auto explore plate), do: assert(html =~ ~s(data-mode="#{mode}"))

    # every control the JS binds by data-ctl
    for ctl <- ~w(n m sign random drive sustain speed count size opacity palette trails nodal volume pause scatter png) do
      assert html =~ ~s(data-ctl="#{ctl}"), ctl
    end

    for id <- ~w(chladni-panel chladni-panel-btn chladni-sound-btn chladni-reset-btn chladni-explore chladni-ui chladni-note-grid) do
      assert html =~ ~s(id="#{id}"), id
    end
  end
end

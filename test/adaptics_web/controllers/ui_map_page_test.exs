defmodule AdapticsWeb.UiMapPageTest do
  use AdapticsWeb.ConnCase

  test "GET /ui-map renders the pyramid stage and its panel", %{conn: conn} do
    html = conn |> get("/ui-map") |> html_response(200)

    assert html =~ "The UI pyramid"

    for id <- ~w(uim-stage uim-play uim-slider uim-level uim-level-note uim-selection uim-emergence) do
      assert html =~ ~s(id="#{id}"), id
    end
  end
end

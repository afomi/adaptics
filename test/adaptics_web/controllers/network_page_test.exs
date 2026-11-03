defmodule AdapticsWeb.NetworkPageTest do
  use AdapticsWeb.ConnCase

  test "GET /network renders the social network page with its controls", %{conn: conn} do
    conn = get(conn, "/network")
    html = html_response(conn, 200)
    assert html =~ "Your network"
    assert html =~ ~s(id="network-container")
    assert html =~ ~s(id="net-sidebar")
    assert html =~ ~s(id="net-sort")
    assert html =~ ~s(id="net-year")
    assert html =~ ~s(data-level="shared")
    assert html =~ ~s(data-viewpoint="first")
  end
end

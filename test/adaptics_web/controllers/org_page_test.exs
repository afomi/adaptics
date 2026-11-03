defmodule AdapticsWeb.OrgPageTest do
  use AdapticsWeb.ConnCase

  test "GET /org renders the org topology page with its controls", %{conn: conn} do
    conn = get(conn, "/org")
    html = html_response(conn, 200)
    assert html =~ "Org Topology"
    assert html =~ ~s(id="org-container")
    assert html =~ ~s(data-size="xl")
    assert html =~ ~s(data-strategy="reallocate")
    assert html =~ ~s(id="org-ai")
    assert html =~ ~s(id="org-meaningful")
  end
end

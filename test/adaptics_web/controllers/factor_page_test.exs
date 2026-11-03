defmodule AdapticsWeb.FactorPageTest do
  use AdapticsWeb.ConnCase

  test "GET /factor renders the factor tree page with its controls", %{conn: conn} do
    conn = get(conn, "/factor")
    html = html_response(conn, 200)
    assert html =~ ~s(id="factor-container")
    assert html =~ ~s(id="factor-input")
    assert html =~ ~s(value="3^8")
    assert html =~ ~s(data-strategy="balanced")
    assert html =~ ~s(data-strategy="chain")
    assert html =~ ~s(data-strategy="shared")
    assert html =~ ~s(data-strategy="manual")
  end
end

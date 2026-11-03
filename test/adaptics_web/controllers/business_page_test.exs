defmodule AdapticsWeb.BusinessPageTest do
  use AdapticsWeb.ConnCase

  test "GET /business renders the business workspace with its controls", %{conn: conn} do
    conn = get(conn, "/business")
    html = html_response(conn, 200)
    assert html =~ "Business Model"
    assert html =~ ~s(id="biz-container")
    assert html =~ ~s(id="biz-models")
    assert html =~ ~s(id="biz-template")
    assert html =~ ~s(id="biz-editor")
    assert html =~ ~s(data-layout="parts")
    assert html =~ ~s(data-layout="whole")
    assert html =~ ~s(data-view="snapshots")
    assert html =~ ~s(id="biz-time")
    assert html =~ ~s(id="biz-issues")
    assert html =~ ~s(id="biz-json")
  end
end

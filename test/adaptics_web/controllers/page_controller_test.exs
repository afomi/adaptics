defmodule AdapticsWeb.PageControllerTest do
  use AdapticsWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, "/")
    assert html_response(conn, 200) =~ "Adaptics"
  end
end

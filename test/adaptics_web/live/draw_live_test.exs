defmodule AdapticsWeb.DrawLiveTest do
  use AdapticsWeb.ConnCase, async: true

  import Phoenix.LiveViewTest

  describe "GET /draw" do
    test "mounts the tldraw container over the connected socket", %{conn: conn} do
      {:ok, view, html} = live(conn, ~p"/draw")

      assert html =~ ~s(id="tldraw-container")
      assert html =~ ~s(phx-hook="Tldraw")
      assert has_element?(view, "#tldraw-container[phx-hook=Tldraw]")
    end
  end
end

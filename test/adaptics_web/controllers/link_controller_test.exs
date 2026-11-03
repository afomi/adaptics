defmodule AdapticsWeb.LinkControllerTest do
  use AdapticsWeb.ConnCase

  import Adaptics.VisualFixtures

  @create_attrs %{description: "some description", from_id: 42, name: "some name", to_id: 42}
  @update_attrs %{description: "some updated description", from_id: 43, name: "some updated name", to_id: 43}
  @invalid_attrs %{description: nil, from_id: nil, name: nil, to_id: nil}

  describe "index" do
    test "lists all links", %{conn: conn} do
      conn = get(conn, ~p"/links")
      assert html_response(conn, 200) =~ "Listing Links"
    end
  end

  describe "new link" do
    test "renders form", %{conn: conn} do
      conn = get(conn, ~p"/links/new")
      assert html_response(conn, 200) =~ "New Link"
    end
  end

  describe "create link" do
    test "redirects to show when data is valid", %{conn: conn} do
      conn = post(conn, ~p"/links", link: @create_attrs)

      assert %{id: id} = redirected_params(conn)
      assert redirected_to(conn) == ~p"/links/#{id}"

      conn = get(conn, ~p"/links/#{id}")
      assert html_response(conn, 200) =~ "some name"
    end

    test "renders errors when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/links", link: @invalid_attrs)
      assert html_response(conn, 200) =~ "New Link"
    end
  end

  describe "edit link" do
    setup [:create_link]

    test "renders form for editing chosen link", %{conn: conn, link: link} do
      conn = get(conn, ~p"/links/#{link}/edit")
      assert html_response(conn, 200) =~ "Edit Link"
    end
  end

  describe "update link" do
    setup [:create_link]

    test "redirects when data is valid", %{conn: conn, link: link} do
      conn = put(conn, ~p"/links/#{link}", link: @update_attrs)
      assert redirected_to(conn) == ~p"/links/#{link}"

      conn = get(conn, ~p"/links/#{link}")
      assert html_response(conn, 200) =~ "some updated description"
    end

    test "renders errors when data is invalid", %{conn: conn, link: link} do
      conn = put(conn, ~p"/links/#{link}", link: @invalid_attrs)
      assert html_response(conn, 200) =~ "Edit Link"
    end
  end

  describe "delete link" do
    setup [:create_link]

    test "deletes chosen link", %{conn: conn, link: link} do
      conn = delete(conn, ~p"/links/#{link}")
      assert redirected_to(conn) == ~p"/links"

      assert_error_sent 404, fn ->
        get(conn, ~p"/links/#{link}")
      end
    end
  end

  defp create_link(_) do
    link = link_fixture()
    %{link: link}
  end
end

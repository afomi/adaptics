defmodule AdapticsWeb.NodeControllerTest do
  use AdapticsWeb.ConnCase

  import Adaptics.VisualFixtures

  @create_attrs %{description: "some description", name: "some name"}
  @update_attrs %{description: "some updated description", name: "some updated name"}
  @invalid_attrs %{description: nil, name: nil}

  describe "index" do
    test "lists all nodes", %{conn: conn} do
      conn = get(conn, ~p"/nodes")
      assert html_response(conn, 200) =~ "Listing Nodes"
    end
  end

  describe "new node" do
    test "renders form", %{conn: conn} do
      conn = get(conn, ~p"/nodes/new")
      assert html_response(conn, 200) =~ "New Node"
    end
  end

  describe "create node" do
    test "redirects to show when data is valid", %{conn: conn} do
      conn = post(conn, ~p"/nodes", node: @create_attrs)

      assert %{id: id} = redirected_params(conn)
      assert redirected_to(conn) == ~p"/nodes/#{id}"

      conn = get(conn, ~p"/nodes/#{id}")
      assert html_response(conn, 200) =~ "some name"
    end

    test "renders errors when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/nodes", node: @invalid_attrs)
      assert html_response(conn, 200) =~ "New Node"
    end
  end

  describe "edit node" do
    setup [:create_node]

    test "renders form for editing chosen node", %{conn: conn, node: node} do
      conn = get(conn, ~p"/nodes/#{node}/edit")
      assert html_response(conn, 200) =~ "Edit Node"
    end
  end

  describe "update node" do
    setup [:create_node]

    test "redirects when data is valid", %{conn: conn, node: node} do
      conn = put(conn, ~p"/nodes/#{node}", node: @update_attrs)
      assert redirected_to(conn) == ~p"/nodes/#{node}"

      conn = get(conn, ~p"/nodes/#{node}")
      assert html_response(conn, 200) =~ "some updated description"
    end

    test "renders errors when data is invalid", %{conn: conn, node: node} do
      conn = put(conn, ~p"/nodes/#{node}", node: @invalid_attrs)
      assert html_response(conn, 200) =~ "Edit Node"
    end
  end

  describe "delete node" do
    setup [:create_node]

    test "deletes chosen node", %{conn: conn, node: node} do
      conn = delete(conn, ~p"/nodes/#{node}")
      assert redirected_to(conn) == ~p"/nodes"

      assert_error_sent 404, fn ->
        get(conn, ~p"/nodes/#{node}")
      end
    end
  end

  defp create_node(_) do
    node = node_fixture()
    %{node: node}
  end
end

defmodule Adaptics.VisualTest do
  use Adaptics.DataCase

  alias Adaptics.Visual

  describe "nodes" do
    alias Adaptics.Visual.Node

    import Adaptics.VisualFixtures

    @invalid_attrs %{description: nil, name: nil}

    test "list_nodes/0 returns all nodes" do
      node = node_fixture()
      assert Visual.list_nodes() == [node]
    end

    test "get_node!/1 returns the node with given id" do
      node = node_fixture()
      assert Visual.get_node!(node.id) == node
    end

    test "create_node/1 with valid data creates a node" do
      valid_attrs = %{description: "some description", name: "some name"}

      assert {:ok, %Node{} = node} = Visual.create_node(valid_attrs)
      assert node.description == "some description"
      assert node.name == "some name"
    end

    test "create_node/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Visual.create_node(@invalid_attrs)
    end

    test "update_node/2 with valid data updates the node" do
      node = node_fixture()
      update_attrs = %{description: "some updated description", name: "some updated name"}

      assert {:ok, %Node{} = node} = Visual.update_node(node, update_attrs)
      assert node.description == "some updated description"
      assert node.name == "some updated name"
    end

    test "update_node/2 with invalid data returns error changeset" do
      node = node_fixture()
      assert {:error, %Ecto.Changeset{}} = Visual.update_node(node, @invalid_attrs)
      assert node == Visual.get_node!(node.id)
    end

    test "delete_node/1 deletes the node" do
      node = node_fixture()
      assert {:ok, %Node{}} = Visual.delete_node(node)
      assert_raise Ecto.NoResultsError, fn -> Visual.get_node!(node.id) end
    end

    test "change_node/1 returns a node changeset" do
      node = node_fixture()
      assert %Ecto.Changeset{} = Visual.change_node(node)
    end
  end

  describe "links" do
    alias Adaptics.Visual.Link

    import Adaptics.VisualFixtures

    @invalid_attrs %{description: nil, from_id: nil, name: nil, to_id: nil}

    test "list_links/0 returns all links" do
      link = link_fixture()
      assert Visual.list_links() == [link]
    end

    test "get_link!/1 returns the link with given id" do
      link = link_fixture()
      assert Visual.get_link!(link.id) == link
    end

    test "create_link/1 with valid data creates a link" do
      valid_attrs = %{description: "some description", from_id: 42, name: "some name", to_id: 42}

      assert {:ok, %Link{} = link} = Visual.create_link(valid_attrs)
      assert link.description == "some description"
      assert link.from_id == 42
      assert link.name == "some name"
      assert link.to_id == 42
    end

    test "create_link/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Visual.create_link(@invalid_attrs)
    end

    test "update_link/2 with valid data updates the link" do
      link = link_fixture()
      update_attrs = %{description: "some updated description", from_id: 43, name: "some updated name", to_id: 43}

      assert {:ok, %Link{} = link} = Visual.update_link(link, update_attrs)
      assert link.description == "some updated description"
      assert link.from_id == 43
      assert link.name == "some updated name"
      assert link.to_id == 43
    end

    test "update_link/2 with invalid data returns error changeset" do
      link = link_fixture()
      assert {:error, %Ecto.Changeset{}} = Visual.update_link(link, @invalid_attrs)
      assert link == Visual.get_link!(link.id)
    end

    test "delete_link/1 deletes the link" do
      link = link_fixture()
      assert {:ok, %Link{}} = Visual.delete_link(link)
      assert_raise Ecto.NoResultsError, fn -> Visual.get_link!(link.id) end
    end

    test "change_link/1 returns a link changeset" do
      link = link_fixture()
      assert %Ecto.Changeset{} = Visual.change_link(link)
    end
  end
end

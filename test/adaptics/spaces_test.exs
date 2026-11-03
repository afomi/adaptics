defmodule Adaptics.SpacesTest do
  use Adaptics.DataCase

  alias Adaptics.Spaces

  describe "spaces" do
    test "get_or_create_default_space/0 creates default space on first call" do
      space = Spaces.get_or_create_default_space()
      assert space.slug == "default"
      assert space.name == "Default"
    end

    test "get_or_create_default_space/0 returns same space on second call" do
      s1 = Spaces.get_or_create_default_space()
      s2 = Spaces.get_or_create_default_space()
      assert s1.id == s2.id
    end

    test "create_space/1 creates a space with a slug" do
      {:ok, space} = Spaces.create_space(%{name: "My Space", slug: "my-space"})
      assert space.name == "My Space"
      assert space.slug == "my-space"
      assert space.status == "draft"
    end
  end

  describe "nodes" do
    setup do
      {:ok, space} = Spaces.create_space(%{name: "Test Space", slug: "test-space"})
      %{space: space}
    end

    test "create_node/2 persists x, y, and name", %{space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "Concept A", "description" => "", "x" => 120.0, "y" => 80.0})
      assert node.name == "Concept A"
      assert node.x == 120.0
      assert node.y == 80.0
      assert node.space_id == space.id
    end

    test "list_nodes_for_space/1 returns only nodes for that space", %{space: space} do
      {:ok, _} = Spaces.create_node(space, %{"name" => "Node 1", "description" => "", "x" => 0.0, "y" => 0.0})
      {:ok, _} = Spaces.create_node(space, %{"name" => "Node 2", "description" => "", "x" => 50.0, "y" => 50.0})

      {:ok, other_space} = Spaces.create_space(%{name: "Other", slug: "other"})
      {:ok, _} = Spaces.create_node(other_space, %{"name" => "Other Node", "description" => "", "x" => 0.0, "y" => 0.0})

      nodes = Spaces.list_nodes_for_space(space)
      assert length(nodes) == 2
      assert Enum.all?(nodes, &(&1.space_id == space.id))
    end

    test "update_node/2 persists new x/y position", %{space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "Moveable", "description" => "", "x" => 0.0, "y" => 0.0})
      {:ok, moved} = Spaces.update_node(node, %{"x" => 200.0, "y" => 150.0})
      assert moved.x == 200.0
      assert moved.y == 150.0
    end

    test "update_node/2 persists new label", %{space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "Old Name", "description" => "", "x" => 0.0, "y" => 0.0})
      {:ok, renamed} = Spaces.update_node(node, %{"name" => "New Name"})
      assert renamed.name == "New Name"
    end

    test "delete_node/1 removes the node", %{space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "To Delete", "description" => "", "x" => 0.0, "y" => 0.0})
      {:ok, _} = Spaces.delete_node(node)
      assert_raise Ecto.NoResultsError, fn -> Spaces.get_node!(node.id) end
    end
  end

  describe "edges" do
    setup do
      {:ok, space} = Spaces.create_space(%{name: "Edge Space", slug: "edge-space"})
      {:ok, a} = Spaces.create_node(space, %{"name" => "A", "x" => 0.0, "y" => 0.0})
      {:ok, b} = Spaces.create_node(space, %{"name" => "B", "x" => 200.0, "y" => 0.0})
      {:ok, c} = Spaces.create_node(space, %{"name" => "C", "x" => 400.0, "y" => 0.0})
      %{space: space, a: a, b: b, c: c}
    end

    test "create_edge/3 persists from_id and to_id", %{space: space, a: a, b: b} do
      {:ok, edge} = Spaces.create_edge(space, a.id, b.id)
      assert edge.from_id == a.id
      assert edge.to_id == b.id
      assert edge.space_id == space.id
    end

    test "list_edges_for_space/1 returns only edges for that space", %{space: space, a: a, b: b, c: c} do
      {:ok, _} = Spaces.create_edge(space, a.id, b.id)
      {:ok, _} = Spaces.create_edge(space, b.id, c.id)

      {:ok, other_space} = Spaces.create_space(%{name: "Other", slug: "edges-other"})
      {:ok, x} = Spaces.create_node(other_space, %{"name" => "X", "x" => 0.0, "y" => 0.0})
      {:ok, y} = Spaces.create_node(other_space, %{"name" => "Y", "x" => 100.0, "y" => 0.0})
      {:ok, _} = Spaces.create_edge(other_space, x.id, y.id)

      edges = Spaces.list_edges_for_space(space)
      assert length(edges) == 2
      assert Enum.all?(edges, &(&1.space_id == space.id))
    end

    test "delete_edge/1 removes the edge", %{space: space, a: a, b: b} do
      {:ok, edge} = Spaces.create_edge(space, a.id, b.id)
      {:ok, _} = Spaces.delete_edge(edge)
      edges = Spaces.list_edges_for_space(space)
      assert Enum.empty?(edges)
    end
  end
end

defmodule Adaptics.ProjectionsTest do
  use Adaptics.DataCase

  alias Adaptics.Projections
  alias Adaptics.Spaces

  setup do
    {:ok, space} = Spaces.create_space(%{name: "Proj Space", slug: "proj-space"})
    %{space: space}
  end

  describe "create_projection/2" do
    test "creates a projection with a name", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{"name" => "Person view"})
      assert proj.name == "Person view"
      assert proj.space_id == space.id
      assert proj.filter_config == %{}
      assert proj.layout == %{}
    end

    test "creates a projection with filter_config", %{space: space} do
      filter = %{"kinds" => ["person", "org"]}
      {:ok, proj} = Projections.create_projection(space, %{"name" => "People", "filter_config" => filter})
      assert proj.filter_config == filter
    end

    test "enforces unique name per space", %{space: space} do
      {:ok, _} = Projections.create_projection(space, %{"name" => "Dupe"})
      {:error, changeset} = Projections.create_projection(space, %{"name" => "Dupe"})
      assert changeset.errors[:space_id]
    end

    test "same name is allowed in different spaces" do
      {:ok, s2} = Spaces.create_space(%{name: "Other", slug: "other-proj"})
      {:ok, _} = Projections.create_projection(s2, %{"name" => "View"})
      {:ok, s3} = Spaces.create_space(%{name: "Third", slug: "third-proj"})
      assert {:ok, _} = Projections.create_projection(s3, %{"name" => "View"})
    end
  end

  describe "list_projections_for_space/1" do
    test "returns projections in name order", %{space: space} do
      {:ok, _} = Projections.create_projection(space, %{"name" => "Zeta"})
      {:ok, _} = Projections.create_projection(space, %{"name" => "Alpha"})
      {:ok, _} = Projections.create_projection(space, %{"name" => "Mira"})

      names = Projections.list_projections_for_space(space) |> Enum.map(& &1.name)
      assert names == ["Alpha", "Mira", "Zeta"]
    end

    test "only returns projections for that space", %{space: space} do
      {:ok, other} = Spaces.create_space(%{name: "Other", slug: "other-list"})
      {:ok, _} = Projections.create_projection(space, %{"name" => "Mine"})
      {:ok, _} = Projections.create_projection(other, %{"name" => "Theirs"})

      projs = Projections.list_projections_for_space(space)
      assert length(projs) == 1
      assert hd(projs).name == "Mine"
    end
  end

  describe "get_projection_by_name/2" do
    test "returns the projection when found", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{"name" => "Findable"})
      found = Projections.get_projection_by_name(space, "Findable")
      assert found.id == proj.id
    end

    test "returns nil when not found", %{space: space} do
      assert Projections.get_projection_by_name(space, "Ghost") == nil
    end
  end

  describe "update_projection/2" do
    test "updates name and filter_config", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{"name" => "Old"})
      {:ok, updated} = Projections.update_projection(proj, %{"name" => "New", "filter_config" => %{"kinds" => ["doc"]}})
      assert updated.name == "New"
      assert updated.filter_config == %{"kinds" => ["doc"]}
    end
  end

  describe "delete_projection/1" do
    test "removes the projection", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{"name" => "Temp"})
      {:ok, _} = Projections.delete_projection(proj)
      assert Projections.list_projections_for_space(space) == []
    end
  end

  describe "apply/3" do
    setup %{space: space} do
      {:ok, a} = Spaces.create_node(space, %{"name" => "Alice", "x" => 0.0, "y" => 0.0})
      {:ok, b} = Spaces.create_node(space, %{"name" => "Bob", "x" => 100.0, "y" => 0.0})
      {:ok, c} = Spaces.create_node(space, %{"name" => "Corp", "x" => 200.0, "y" => 0.0})
      {:ok, ab} = Spaces.create_edge(space, a.id, b.id)
      {:ok, bc} = Spaces.create_edge(space, b.id, c.id)
      %{a: a, b: b, c: c, ab: ab, bc: bc}
    end

    test "empty filter returns all nodes and edges", %{space: space, a: a, b: b, c: c, ab: ab, bc: bc} do
      {:ok, proj} = Projections.create_projection(space, %{"name" => "All", "filter_config" => %{}})
      nodes = [a, b, c]
      edges = [ab, bc]
      {fn_nodes, fn_edges} = Projections.apply(proj, nodes, edges)
      assert length(fn_nodes) == 3
      assert length(fn_edges) == 2
    end

    test "node_ids filter includes only specified nodes and their edges", %{space: space, a: a, b: b, c: c, ab: ab, bc: bc} do
      filter = %{"node_ids" => [a.id, b.id]}
      {:ok, proj} = Projections.create_projection(space, %{"name" => "AB", "filter_config" => filter})
      nodes = [a, b, c]
      edges = [ab, bc]
      {fn_nodes, fn_edges} = Projections.apply(proj, nodes, edges)
      assert Enum.map(fn_nodes, & &1.id) |> Enum.sort() == Enum.sort([a.id, b.id])
      # bc crosses into c which is excluded — only ab remains
      assert length(fn_edges) == 1
      assert hd(fn_edges).id == ab.id
    end

    test "edges crossing outside filtered nodes are excluded", %{space: space, b: b, c: c, ab: ab, bc: bc} do
      filter = %{"node_ids" => [b.id, c.id]}
      {:ok, proj} = Projections.create_projection(space, %{"name" => "BC", "filter_config" => filter})
      nodes = [b, c]
      edges = [ab, bc]
      {_fn_nodes, fn_edges} = Projections.apply(proj, nodes, edges)
      assert length(fn_edges) == 1
      assert hd(fn_edges).id == bc.id
    end
  end
end

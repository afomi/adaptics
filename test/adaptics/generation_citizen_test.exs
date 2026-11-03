defmodule Adaptics.GenerationCitizenTest do
  use Adaptics.DataCase

  alias Adaptics.GenerationCitizen
  alias Adaptics.Spaces
  alias Adaptics.Projections

  describe "get_or_create_space/0" do
    test "creates the generation-citizen space on first call" do
      space = GenerationCitizen.get_or_create_space()
      assert space.slug == "generation-citizen"
      assert space.name == "Generation Citizen"
      assert space.status == "published"
    end

    test "returns the same space on subsequent calls" do
      s1 = GenerationCitizen.get_or_create_space()
      s2 = GenerationCitizen.get_or_create_space()
      assert s1.id == s2.id
    end
  end

  describe "org_attrs/1" do
    test "maps standard CSV column names to node attrs" do
      row = %{
        "Organization Name" => "Acme Org",
        "Website" => "https://acme.org",
        "Type" => "nonprofit",
        "Regions Served" => "Portland, Salem",
        "Populations Served" => "Youth, Seniors",
        "Programs" => "After School, Summer Camp",
      }

      attrs = GenerationCitizen.org_attrs(row, 100.0, 200.0)

      assert attrs["name"] == "Acme Org"
      assert attrs["kind"] == "org"
      assert attrs["x"] == 100.0
      assert attrs["y"] == 200.0
      assert attrs["metadata"]["website"] == "https://acme.org"
      assert attrs["metadata"]["org_type"] == "nonprofit"
      assert attrs["metadata"]["regions"] == ["Portland", "Salem"]
      assert attrs["metadata"]["populations"] == ["Youth", "Seniors"]
      assert attrs["metadata"]["programs"] == ["After School", "Summer Camp"]
    end

    test "accepts list values directly" do
      row = %{"name" => "Beta Corp", "regions" => ["Eugene", "Bend"]}
      attrs = GenerationCitizen.org_attrs(row)
      assert attrs["metadata"]["regions"] == ["Eugene", "Bend"]
    end

    test "defaults missing fields to empty strings/lists" do
      attrs = GenerationCitizen.org_attrs(%{"name" => "Minimal Org"})
      assert attrs["metadata"]["website"] == ""
      assert attrs["metadata"]["values"] == []
      assert attrs["metadata"]["lat"] == nil
    end

    test "persists as a Node via Spaces.create_node" do
      space = GenerationCitizen.get_or_create_space()
      attrs = GenerationCitizen.org_attrs(%{
        "name" => "Test Org",
        "org_type" => "school",
        "regions" => ["Portland"],
      })
      {:ok, node} = Spaces.create_node(space, attrs)
      assert node.kind == "org"
      assert node.metadata["org_type"] == "school"
      assert node.metadata["regions"] == ["Portland"]
    end
  end

  describe "filter_for/1" do
    test "builds filter_config from keyword criteria" do
      filter = GenerationCitizen.filter_for(org_types: ["nonprofit"], regions: ["Portland"])
      assert filter["metadata_org_type"] == ["nonprofit"]
      assert filter["metadata_regions"] == ["Portland"]
    end

    test "omits empty criteria" do
      filter = GenerationCitizen.filter_for(org_types: [], regions: ["Salem"])
      refute Map.has_key?(filter, "metadata_org_type")
      assert filter["metadata_regions"] == ["Salem"]
    end
  end

  describe "Projections.apply with metadata filters" do
    setup do
      space = GenerationCitizen.get_or_create_space()

      {:ok, nonprofit} = Spaces.create_node(space, GenerationCitizen.org_attrs(%{
        "name" => "Youth Nonprofit",
        "org_type" => "nonprofit",
        "regions" => ["Portland"],
        "populations" => ["Youth"],
      }))

      {:ok, school} = Spaces.create_node(space, GenerationCitizen.org_attrs(%{
        "name" => "Lincoln High",
        "org_type" => "school",
        "regions" => ["Portland"],
        "populations" => ["Youth"],
      }))

      {:ok, govt} = Spaces.create_node(space, GenerationCitizen.org_attrs(%{
        "name" => "Salem Agency",
        "org_type" => "government",
        "regions" => ["Salem"],
        "populations" => ["Seniors"],
      }))

      %{space: space, nonprofit: nonprofit, school: school, govt: govt}
    end

    test "filters by org_type", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{
        "name" => "Nonprofits only",
        "filter_config" => GenerationCitizen.filter_for(org_types: ["nonprofit"])
      })
      nodes = Spaces.list_nodes_for_space(space)
      {visible, _} = Projections.apply(proj, nodes, [])
      names = Enum.map(visible, & &1.name)
      assert "Youth Nonprofit" in names
      refute "Lincoln High" in names
      refute "Salem Agency" in names
    end

    test "filters by region", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{
        "name" => "Portland only",
        "filter_config" => GenerationCitizen.filter_for(regions: ["Portland"])
      })
      nodes = Spaces.list_nodes_for_space(space)
      {visible, _} = Projections.apply(proj, nodes, [])
      names = Enum.map(visible, & &1.name)
      assert "Youth Nonprofit" in names
      assert "Lincoln High" in names
      refute "Salem Agency" in names
    end

    test "combines multiple filters (AND logic)", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{
        "name" => "Portland nonprofits",
        "filter_config" => GenerationCitizen.filter_for(
          org_types: ["nonprofit"],
          regions: ["Portland"]
        )
      })
      nodes = Spaces.list_nodes_for_space(space)
      {visible, _} = Projections.apply(proj, nodes, [])
      names = Enum.map(visible, & &1.name)
      assert names == ["Youth Nonprofit"]
    end
  end
end

defmodule Adaptics.MuniCodesTest do
  use Adaptics.DataCase

  alias Adaptics.MuniCodes
  alias Adaptics.Spaces

  defp row(attrs \\ %{}) do
    Map.merge(
      %{
        city: "vacaville",
        enum: "5.14",
        header: "TAXICABS",
        parent_header: "Title 5 BUSINESS LICENSES",
        section_headings: ["5.14.010 Definitions.", "5.14.020 Permit required."],
        changed_blobs: ["(Ord. 1042 § 1, 1979)", "(Ord. 1867 § 2, 2004; Ord. 1042 § 1, 1979)"]
      },
      attrs
    )
  end

  describe "year_range/1" do
    test "extracts years from history notes, not ordinance numbers" do
      assert MuniCodes.year_range(["(Ord. 1975 § 1, 1990)"]) == {1990, 1990}
      assert MuniCodes.year_range(["(Ord. 1042 § 1, 1979)", "(Ord. 20 § 3, 2012)"]) == {1979, 2012}
      assert MuniCodes.year_range([]) == {nil, nil}
      assert MuniCodes.year_range(["no years here"]) == {nil, nil}
    end
  end

  describe "node_attrs/2" do
    test "builds name, description, and metadata from a chapter row" do
      attrs = MuniCodes.node_attrs(row(), 0)

      assert attrs["name"] == "5.14 Taxicabs"
      assert attrs["kind"] == "muni_chapter"
      assert attrs["description"] =~ "TAXICABS"
      assert attrs["description"] =~ "5.14.010 Definitions."
      assert attrs["metadata"]["code_ref"] == "vacaville 5.14"
      assert attrs["metadata"]["city"] == "vacaville"
      assert attrs["metadata"]["section_count"] == 2
      assert attrs["metadata"]["earliest_year"] == 1979
      assert attrs["metadata"]["latest_year"] == 2004
      assert attrs["metadata"]["span_years"] == 25
    end

    test "omits year metadata when no history exists" do
      attrs = MuniCodes.node_attrs(row(%{changed_blobs: []}), 0)
      refute Map.has_key?(attrs["metadata"], "earliest_year")
      refute Map.has_key?(attrs["metadata"], "span_years")
    end

    test "cities get separate grid regions" do
      vaca = MuniCodes.node_attrs(row(), 0)
      fair = MuniCodes.node_attrs(row(%{city: "fairfield"}), 0)
      assert fair["x"] > vaca["x"]
    end
  end

  describe "import_chapters/2" do
    test "creates then updates idempotently by code_ref" do
      {:ok, space} = Spaces.create_space(%{name: "Muni Test", slug: "muni-test"})

      {:ok, summary} = MuniCodes.import_chapters(space, [row(), row(%{city: "fairfield", enum: "10"})])
      assert summary == %{created: 2, updated: 0}

      {:ok, summary} = MuniCodes.import_chapters(space, [row(%{header: "TAXICABS AND LIVERY"})])
      assert summary == %{created: 0, updated: 1}

      nodes = Spaces.list_nodes_for_space(space)
      assert length(nodes) == 2

      updated = Enum.find(nodes, &(&1.metadata["code_ref"] == "vacaville 5.14"))
      assert updated.name =~ "Taxicabs And Livery"
    end
  end

  test "get_or_create_space is idempotent" do
    space = MuniCodes.get_or_create_space()
    assert space.slug == "muni-codes"
    assert MuniCodes.get_or_create_space().id == space.id
  end
end

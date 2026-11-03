defmodule Adaptics.SketchDataImportTest do
  use Adaptics.DataCase

  alias Adaptics.Projections
  alias Adaptics.SketchDataImport
  alias Adaptics.Spaces

  setup do
    {:ok, space} = Spaces.create_space(%{name: "Import Space", slug: "import-space"})
    %{space: space}
  end

  defp sketch_node(id, attrs \\ %{}) do
    Map.merge(
      %{
        "id" => id,
        "name" => "sketch #{id}",
        "r" => 6,
        "category" => "A",
        "date" => "2025-05-01T00:00:00.000Z",
        "value" => 42,
        "baseX" => 100,
        "baseY" => 200,
        "x" => 555,
        "y" => 666,
        "group" => 1,
        "hidden" => false,
        "tags" => ["t1"]
      },
      attrs
    )
  end

  test "imports nodes with baseX/baseY as position and sketch fields in metadata", %{space: space} do
    {:ok, summary} = SketchDataImport.import(space, %{"nodes" => [sketch_node(7)]})

    assert summary.nodes_created == 1
    assert summary.nodes_updated == 0

    [node] = Spaces.list_nodes_for_space(space)
    assert node.name == "sketch 7"
    assert node.kind == "sketch"
    assert node.x == 100.0
    assert node.y == 200.0
    assert node.metadata["sketch_id"] == "7"
    assert node.metadata["category"] == "A"
    assert node.metadata["value"] == 42
    assert node.metadata["tags"] == ["t1"]
  end

  test "re-import updates by sketch_id instead of duplicating", %{space: space} do
    {:ok, _} = SketchDataImport.import(space, %{"nodes" => [sketch_node(7)]})
    {:ok, summary} = SketchDataImport.import(space, %{"nodes" => [sketch_node(7, %{"name" => "renamed"})]})

    assert summary.nodes_created == 0
    assert summary.nodes_updated == 1

    [node] = Spaces.list_nodes_for_space(space)
    assert node.name == "renamed"
  end

  test "saved views become freeform snapshot projections with remapped ids", %{space: space} do
    payload = %{
      "nodes" => [sketch_node(1), sketch_node(2)],
      "views" => [
        %{
          "id" => 1_720_000_000,
          "name" => "My arrangement",
          "snapshot" => [
            %{"id" => 1, "x" => 10, "y" => 20},
            %{"id" => 2, "x" => 30, "y" => 40},
            %{"id" => 999, "x" => 0, "y" => 0}
          ]
        }
      ]
    }

    {:ok, summary} = SketchDataImport.import(space, payload)
    assert summary.views == 1

    proj = Projections.get_projection_by_name(space, "sketch: My arrangement")
    assert proj.layout["kind"] == "freeform"

    id_by_sketch =
      space
      |> Spaces.list_nodes_for_space()
      |> Map.new(&{&1.metadata["sketch_id"], &1.id})

    assert proj.layout["positions"][to_string(id_by_sketch["1"])] == [10.0, 20.0]
    assert proj.layout["positions"][to_string(id_by_sketch["2"])] == [30.0, 40.0]
    assert map_size(proj.layout["positions"]) == 2
  end

  test "custom modes become axes projections with rewritten properties", %{space: space} do
    payload = %{
      "modes" => [
        %{
          "id" => "custom_scatter_1",
          "name" => "Value vs Category",
          "xAxis" => %{"property" => "value", "scale" => "log", "jitter" => 0, "label" => "Value"},
          "yAxis" => %{"property" => "category", "scale" => "ordinal", "jitter" => 16},
          "dragEnabled" => false,
          "showAxes" => true
        }
      ]
    }

    {:ok, summary} = SketchDataImport.import(space, payload)
    assert summary.modes == 1
    assert summary.skipped_modes == []

    proj = Projections.get_projection_by_name(space, "sketch: Value vs Category")
    assert proj.layout["kind"] == "axes"
    assert proj.layout["x_axis"]["property"] == "metadata.value"
    # log isn't supported — degraded to linear
    assert proj.layout["x_axis"]["scale"] == "linear"
    assert proj.layout["y_axis"]["property"] == "metadata.category"
    assert proj.layout["y_axis"]["jitter"] == 16
  end

  test "modes with unmappable properties are skipped and reported", %{space: space} do
    payload = %{
      "modes" => [
        %{
          "name" => "Grid thing",
          "xAxis" => %{"property" => "gridX", "scale" => "linear"},
          "yAxis" => %{"property" => "gridY", "scale" => "linear"}
        }
      ]
    }

    {:ok, summary} = SketchDataImport.import(space, payload)
    assert summary.modes == 0
    assert summary.skipped_modes == ["sketch: Grid thing"]
    assert Projections.list_projections_for_space(space) == []
  end

  test "re-importing views and modes upserts by name", %{space: space} do
    payload = %{
      "nodes" => [sketch_node(1)],
      "views" => [%{"id" => 5, "name" => "V", "snapshot" => [%{"id" => 1, "x" => 1, "y" => 2}]}]
    }

    {:ok, _} = SketchDataImport.import(space, payload)
    {:ok, _} = SketchDataImport.import(space, payload)

    projections = Projections.list_projections_for_space(space)
    assert length(projections) == 1
  end

  test "empty payload imports nothing but succeeds", %{space: space} do
    assert {:ok, summary} = SketchDataImport.import(space, %{})
    assert summary == %{nodes_created: 0, nodes_updated: 0, views: 0, modes: 0, skipped_modes: []}
  end
end

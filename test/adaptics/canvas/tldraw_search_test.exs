defmodule Adaptics.Canvas.TldrawSearchTest do
  use ExUnit.Case, async: true

  alias Adaptics.Canvas.TldrawParser
  alias Adaptics.Canvas.TldrawSearch

  @fixture_path "test/support/fixtures/sample.tldr"

  setup do
    {:ok, canvas} = TldrawParser.parse_file(@fixture_path)
    %{canvas: canvas}
  end

  describe "search_text/2" do
    test "finds shapes by text content", %{canvas: canvas} do
      results = TldrawSearch.search_text(canvas, "audit")
      assert length(results) == 2
      assert Enum.all?(results, &(&1.text == "Audit function"))
    end

    test "searches case-insensitively", %{canvas: canvas} do
      results = TldrawSearch.search_text(canvas, "HELLO")
      assert length(results) == 1
      assert hd(results).text == "Hello World"
    end

    test "searches frame names", %{canvas: canvas} do
      results = TldrawSearch.search_text(canvas, "System 1")
      assert length(results) == 1
      assert hd(results).name == "System 1"
    end

    test "returns empty for no match", %{canvas: canvas} do
      assert TldrawSearch.search_text(canvas, "zzzznotfound") == []
    end
  end

  describe "by_type/2" do
    test "filters by shape type", %{canvas: canvas} do
      frames = TldrawSearch.by_type(canvas, "frame")
      assert length(frames) == 3

      geos = TldrawSearch.by_type(canvas, "geo")
      assert length(geos) == 3
    end
  end

  describe "by_geo/2" do
    test "filters by geo subtype", %{canvas: canvas} do
      rects = TldrawSearch.by_geo(canvas, "rectangle")
      assert length(rects) == 3
    end
  end

  describe "in_bounds/2" do
    test "finds shapes within bounding box", %{canvas: canvas} do
      results = TldrawSearch.in_bounds(canvas, {0, 0, 200, 200})
      # frame-system1 (100,100) and text-hello (50,50) and frame-nested (120,150) are in range
      ids = Enum.map(results, & &1.id)
      assert "shape:frame-system1" in ids
      assert "shape:text-hello" in ids
    end

    test "excludes shapes outside bounding box", %{canvas: canvas} do
      results = TldrawSearch.in_bounds(canvas, {0, 0, 10, 10})
      assert results == []
    end
  end

  describe "members_of/2" do
    test "returns direct members of a frame", %{canvas: canvas} do
      members = TldrawSearch.members_of(canvas, "shape:frame-system1")
      ids = Enum.map(members, & &1.id)
      assert "shape:frame-nested" in ids
      assert "shape:rect-audit" in ids
      refute "shape:rect-monitor" in ids
    end
  end

  describe "all_members_of/2" do
    test "returns all members recursively", %{canvas: canvas} do
      members = TldrawSearch.all_members_of(canvas, "shape:frame-system1")
      ids = Enum.map(members, & &1.id)
      assert "shape:frame-nested" in ids
      assert "shape:rect-audit" in ids
      assert "shape:rect-monitor" in ids
    end
  end

  describe "containing_set/2" do
    test "returns the containing frame", %{canvas: canvas} do
      frame = TldrawSearch.containing_set(canvas, "shape:rect-monitor")
      assert frame.id == "shape:frame-nested"
      assert frame.name == "Subsystem A"
    end

    test "returns nil for top-level shapes", %{canvas: canvas} do
      assert TldrawSearch.containing_set(canvas, "shape:text-hello") == nil
    end
  end

  describe "containment_path/2" do
    test "returns path from shape to root", %{canvas: canvas} do
      path = TldrawSearch.containment_path(canvas, "shape:rect-monitor")
      path_ids = Enum.map(path, & &1.id)
      assert path_ids == ["shape:frame-system1", "shape:frame-nested"]
    end
  end

  describe "connections/2" do
    test "finds shapes connected via arrow bindings", %{canvas: canvas} do
      connected = TldrawSearch.connections(canvas, "shape:rect-audit")
      ids = Enum.map(connected, & &1.id)
      assert "shape:note-policy" in ids
    end

    test "finds connections in both directions", %{canvas: canvas} do
      connected = TldrawSearch.connections(canvas, "shape:note-policy")
      ids = Enum.map(connected, & &1.id)
      assert "shape:rect-audit" in ids
    end
  end

  describe "duplicates/1" do
    test "detects duplicate text across different frames", %{canvas: canvas} do
      dupes = TldrawSearch.duplicates(canvas)
      assert length(dupes) == 1
      {text, shapes} = hd(dupes)
      assert text == "audit function"
      assert length(shapes) == 2
      parent_ids = Enum.map(shapes, & &1.parent_id) |> Enum.uniq()
      assert length(parent_ids) == 2
    end
  end

  describe "summary/1" do
    test "returns a complete summary", %{canvas: canvas} do
      summary = TldrawSearch.summary(canvas)
      assert summary.shape_count == 9
      assert summary.binding_count == 2
      assert summary.page_count == 1
      assert is_list(summary.types)
      assert is_list(summary.frames)
      assert is_list(summary.texts)
      assert is_list(summary.duplicates)
    end
  end
end

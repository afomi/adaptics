defmodule Adaptics.Canvas.TldrawParserTest do
  use ExUnit.Case, async: true

  alias Adaptics.Canvas.TldrawParser
  alias Adaptics.Canvas.TldrawParser.{Canvas, Shape, Binding}

  @fixture_path "test/support/fixtures/sample.tldr"

  setup do
    {:ok, canvas} = TldrawParser.parse_file(@fixture_path)
    %{canvas: canvas}
  end

  describe "parse_file/1" do
    test "parses a .tldr file into a Canvas struct", %{canvas: canvas} do
      assert %Canvas{} = canvas
      assert canvas.file_path == @fixture_path
    end

    test "extracts pages", %{canvas: canvas} do
      assert length(canvas.pages) == 1
      assert hd(canvas.pages).name == "Page 1"
    end

    test "extracts shapes", %{canvas: canvas} do
      # 2 frames + 1 nested frame + 2 rects + 1 note + 1 text + 1 dup rect + 1 arrow = 9
      assert length(canvas.shapes) == 9
    end

    test "extracts bindings", %{canvas: canvas} do
      assert length(canvas.bindings) == 2
      assert Enum.all?(canvas.bindings, &match?(%Binding{}, &1))
    end

    test "returns error for missing file" do
      assert {:error, :enoent} = TldrawParser.parse_file("nonexistent.tldr")
    end

    test "parse_file! raises on missing file" do
      assert_raise RuntimeError, fn ->
        TldrawParser.parse_file!("nonexistent.tldr")
      end
    end
  end

  describe "shape parsing" do
    test "extracts shape fields", %{canvas: canvas} do
      audit = Enum.find(canvas.shapes, &(&1.id == "shape:rect-audit"))
      assert %Shape{} = audit
      assert audit.type == "geo"
      assert audit.parent_id == "shape:frame-system1"
      assert audit.x == 150
      assert audit.y == 350
    end

    test "extracts text from props.text", %{canvas: canvas} do
      audit = Enum.find(canvas.shapes, &(&1.id == "shape:rect-audit"))
      assert audit.text == "Audit function"
    end

    test "extracts text from richText (ProseMirror format)", %{canvas: canvas} do
      hello = Enum.find(canvas.shapes, &(&1.id == "shape:text-hello"))
      assert hello.text == "Hello World"
    end

    test "extracts frame name", %{canvas: canvas} do
      frame = Enum.find(canvas.shapes, &(&1.id == "shape:frame-system1"))
      assert frame.name == "System 1"
    end
  end

  describe "containment_tree/1" do
    test "groups shapes by parent", %{canvas: canvas} do
      tree = TldrawParser.containment_tree(canvas)
      # page:page1 has top-level shapes
      page_children = Map.get(tree, "page:page1", [])
      assert length(page_children) >= 3
    end
  end

  describe "children_of/2" do
    test "returns direct children of a frame", %{canvas: canvas} do
      children = TldrawParser.children_of(canvas, "shape:frame-system1")
      child_ids = Enum.map(children, & &1.id)
      assert "shape:frame-nested" in child_ids
      assert "shape:rect-audit" in child_ids
    end

    test "does not return grandchildren", %{canvas: canvas} do
      children = TldrawParser.children_of(canvas, "shape:frame-system1")
      child_ids = Enum.map(children, & &1.id)
      refute "shape:rect-monitor" in child_ids
    end
  end

  describe "descendants_of/2" do
    test "returns all nested descendants recursively", %{canvas: canvas} do
      descendants = TldrawParser.descendants_of(canvas, "shape:frame-system1")
      desc_ids = Enum.map(descendants, & &1.id)
      assert "shape:frame-nested" in desc_ids
      assert "shape:rect-audit" in desc_ids
      assert "shape:rect-monitor" in desc_ids
    end
  end

  describe "parent_of/2" do
    test "returns the parent shape", %{canvas: canvas} do
      parent = TldrawParser.parent_of(canvas, "shape:rect-monitor")
      assert parent.id == "shape:frame-nested"
    end

    test "returns nil for top-level shapes", %{canvas: canvas} do
      parent = TldrawParser.parent_of(canvas, "shape:frame-system1")
      # parent_id is "page:page1" which is not a shape
      assert parent == nil
    end
  end

  describe "frames/1" do
    test "returns only frame shapes", %{canvas: canvas} do
      frames = TldrawParser.frames(canvas)
      assert length(frames) == 3
      assert Enum.all?(frames, &(&1.type == "frame"))
    end
  end

  describe "all_text/1" do
    test "extracts all text content", %{canvas: canvas} do
      texts = TldrawParser.all_text(canvas)
      text_values = Enum.map(texts, &elem(&1, 1))
      assert "Audit function" in text_values
      assert "Monitor" in text_values
      assert "Policy review needed" in text_values
      assert "Hello World" in text_values
      assert "System 1" in text_values
    end
  end

  describe "to_json/1" do
    test "round-trips through parse and serialize", %{canvas: canvas} do
      json = TldrawParser.to_json(canvas)
      assert json["tldrawFileFormatVersion"] == 1
      assert is_list(json["records"])
      assert is_map(json["schema"])
    end
  end
end

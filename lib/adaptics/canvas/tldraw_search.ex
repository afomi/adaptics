defmodule Adaptics.Canvas.TldrawSearch do
  @moduledoc """
  Search and query interface for parsed tldraw canvases.

  Supports:
  - Full-text search across shape text content
  - Filter by shape type
  - Spatial queries (bounding box)
  - Containment queries (frames-as-sets)
  - Relationship traversal via bindings
  - Deduplication detection
  """

  alias Adaptics.Canvas.TldrawParser
  alias Adaptics.Canvas.TldrawParser.Canvas

  @doc """
  Searches shapes by text content (case-insensitive substring match).
  Returns matching shapes.
  """
  def search_text(%Canvas{shapes: shapes}, query) do
    query_down = String.downcase(query)

    Enum.filter(shapes, fn shape ->
      matches_text?(shape, query_down)
    end)
  end

  @doc """
  Filters shapes by type (e.g., "frame", "geo", "text", "arrow", "note").
  """
  def by_type(%Canvas{shapes: shapes}, type) do
    Enum.filter(shapes, &(&1.type == type))
  end

  @doc """
  Filters shapes by geo subtype (e.g., "rectangle", "ellipse", "diamond").
  Only applies to shapes with type "geo".
  """
  def by_geo(%Canvas{shapes: shapes}, geo) do
    Enum.filter(shapes, fn shape ->
      shape.type == "geo" && get_in(shape.props, ["geo"]) == geo
    end)
  end

  @doc """
  Returns shapes within a bounding box defined by
  `{x_min, y_min, x_max, y_max}`.
  """
  def in_bounds(%Canvas{shapes: shapes}, {x_min, y_min, x_max, y_max}) do
    Enum.filter(shapes, fn shape ->
      shape.x != nil and shape.y != nil and
        shape.x >= x_min and shape.y >= y_min and
        shape.x <= x_max and shape.y <= y_max
    end)
  end

  @doc """
  Returns all shapes inside a given frame (direct children).
  """
  def members_of(%Canvas{} = canvas, frame_id) do
    TldrawParser.children_of(canvas, frame_id)
  end

  @doc """
  Returns all shapes inside a given frame (recursive — includes nested frames' contents).
  """
  def all_members_of(%Canvas{} = canvas, frame_id) do
    TldrawParser.descendants_of(canvas, frame_id)
  end

  @doc """
  Returns the containing frame for a shape, or nil if top-level.
  """
  def containing_set(%Canvas{} = canvas, shape_id) do
    parent = TldrawParser.parent_of(canvas, shape_id)

    case parent do
      %{type: "frame"} -> parent
      _ -> nil
    end
  end

  @doc """
  Returns the full containment path from a shape up to the page root.
  Each element is a shape (frame or group) that contains the shape.
  """
  def containment_path(%Canvas{shapes: shapes}, shape_id) do
    shape = Enum.find(shapes, &(&1.id == shape_id))
    if shape, do: build_path(shapes, shape.parent_id, []), else: []
  end

  @doc """
  Returns shapes connected to a given shape via bindings (arrows).
  Returns `{:outgoing, [shapes]}` and `{:incoming, [shapes]}`.
  """
  def connections(%Canvas{shapes: shapes, bindings: bindings}, shape_id) do
    # Bindings connect arrows to shapes.
    # An arrow binding with fromId = arrow_id means the arrow starts/ends at toId.
    # We need to find arrows that reference this shape.
    arrow_ids_touching =
      bindings
      |> Enum.filter(&(&1.to_id == shape_id))
      |> Enum.map(& &1.from_id)
      |> MapSet.new()

    # For each arrow touching this shape, find what else it connects to
    connected_shape_ids =
      bindings
      |> Enum.filter(&MapSet.member?(arrow_ids_touching, &1.from_id))
      |> Enum.reject(&(&1.to_id == shape_id))
      |> Enum.map(& &1.to_id)

    connected_shapes =
      Enum.filter(shapes, &(&1.id in connected_shape_ids))

    connected_shapes
  end

  @doc """
  Detects shapes with duplicate text content across different frames.
  Returns a list of `{text, [shapes]}` where each group has 2+ shapes
  with the same text in different parent frames.
  """
  def duplicates(%Canvas{shapes: shapes}) do
    shapes
    |> Enum.filter(&(&1.text != nil and &1.text != ""))
    |> Enum.group_by(fn shape -> String.downcase(shape.text) end)
    |> Enum.filter(fn {_text, group} ->
      length(group) > 1 and
        group
        |> Enum.map(& &1.parent_id)
        |> Enum.uniq()
        |> length() > 1
    end)
    |> Enum.map(fn {text, group} -> {text, group} end)
  end

  @doc """
  Returns a summary of the canvas: shape counts by type, frame list, text snippets.
  """
  def summary(%Canvas{} = canvas) do
    type_counts =
      canvas.shapes
      |> Enum.group_by(& &1.type)
      |> Enum.map(fn {type, shapes} -> {type, length(shapes)} end)
      |> Enum.sort_by(fn {_type, count} -> -count end)

    frames =
      TldrawParser.frames(canvas)
      |> Enum.map(fn f -> %{id: f.id, name: f.name, member_count: length(TldrawParser.children_of(canvas, f.id))} end)

    texts =
      TldrawParser.all_text(canvas)
      |> Enum.map(fn {id, text} -> %{shape_id: id, text: text} end)

    %{
      shape_count: length(canvas.shapes),
      binding_count: length(canvas.bindings),
      page_count: length(canvas.pages),
      types: type_counts,
      frames: frames,
      texts: texts,
      duplicates: duplicates(canvas)
    }
  end

  # --- Private ---

  defp matches_text?(shape, query_down) do
    text_match =
      shape.text != nil and
        String.contains?(String.downcase(shape.text), query_down)

    name_match =
      shape.name != nil and
        String.contains?(String.downcase(shape.name), query_down)

    text_match or name_match
  end

  defp build_path(shapes, parent_id, acc) do
    case Enum.find(shapes, &(&1.id == parent_id)) do
      nil -> acc
      parent -> build_path(shapes, parent.parent_id, [parent | acc])
    end
  end
end

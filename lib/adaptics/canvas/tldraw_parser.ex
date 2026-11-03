defmodule Adaptics.Canvas.TldrawParser do
  @moduledoc """
  Parses `.tldr` files (tldraw's JSON format) into structured Elixir data.

  Convention: frames-as-sets
  - A frame on the tldraw canvas represents a mathematical set
  - Shapes inside a frame are members of that set
  - A frame inside another frame is a subset
  - Arrows between shapes/frames represent relations
  - Frame `props.name` is the set's label
  """

  defmodule Canvas do
    @moduledoc "Parsed representation of a .tldr file."
    defstruct [:file_path, :schema, pages: [], shapes: [], bindings: [], records: []]
  end

  defmodule Shape do
    @moduledoc "A parsed tldraw shape with extracted text and containment info."
    defstruct [
      :id,
      :type,
      :parent_id,
      :x,
      :y,
      :rotation,
      :index,
      :props,
      :meta,
      :text,
      :name,
      is_locked: false,
      opacity: 1
    ]
  end

  defmodule Binding do
    @moduledoc "A parsed tldraw binding (arrow connection)."
    defstruct [:id, :type, :from_id, :to_id, :props, :meta]
  end

  @doc """
  Reads and parses a `.tldr` file from disk.
  Returns `{:ok, %Canvas{}}` or `{:error, reason}`.
  """
  def parse_file(path) do
    with {:ok, contents} <- File.read(path),
         {:ok, json} <- Jason.decode(contents) do
      {:ok, parse_json(json, path)}
    end
  end

  @doc """
  Parses a `.tldr` file and raises on error.
  """
  def parse_file!(path) do
    case parse_file(path) do
      {:ok, canvas} -> canvas
      {:error, reason} -> raise "Failed to parse #{path}: #{inspect(reason)}"
    end
  end

  @doc """
  Parses already-decoded JSON into a `%Canvas{}`.
  """
  def parse_json(json, file_path \\ nil) do
    records = Map.get(json, "records", [])

    pages =
      records
      |> Enum.filter(&(&1["typeName"] == "page"))
      |> Enum.map(fn r -> %{id: r["id"], name: r["name"], index: r["index"]} end)

    shapes =
      records
      |> Enum.filter(&(&1["typeName"] == "shape"))
      |> Enum.map(&parse_shape/1)

    bindings =
      records
      |> Enum.filter(&(&1["typeName"] == "binding"))
      |> Enum.map(&parse_binding/1)

    %Canvas{
      file_path: file_path,
      schema: Map.get(json, "schema"),
      pages: pages,
      shapes: shapes,
      bindings: bindings,
      records: records
    }
  end

  @doc """
  Builds the containment tree as a map of parent_id => [child shapes].
  """
  def containment_tree(%Canvas{shapes: shapes}) do
    Enum.group_by(shapes, & &1.parent_id)
  end

  @doc """
  Returns shapes that are direct children of the given parent ID.
  """
  def children_of(%Canvas{} = canvas, parent_id) do
    canvas
    |> containment_tree()
    |> Map.get(parent_id, [])
  end

  @doc """
  Returns all descendants of a given parent ID (recursive).
  """
  def descendants_of(%Canvas{} = canvas, parent_id) do
    tree = containment_tree(canvas)
    collect_descendants(tree, parent_id)
  end

  @doc """
  Returns the parent shape of a given shape ID, or nil if top-level.
  """
  def parent_of(%Canvas{shapes: shapes}, shape_id) do
    case Enum.find(shapes, &(&1.id == shape_id)) do
      nil -> nil
      shape -> Enum.find(shapes, &(&1.id == shape.parent_id))
    end
  end

  @doc """
  Returns all frames in the canvas.
  """
  def frames(%Canvas{shapes: shapes}) do
    Enum.filter(shapes, &(&1.type == "frame"))
  end

  @doc """
  Extracts all text content from all shapes as `{shape_id, text}` tuples.
  """
  def all_text(%Canvas{shapes: shapes}) do
    shapes
    |> Enum.flat_map(fn shape ->
      texts = []
      texts = if shape.text && shape.text != "", do: [{shape.id, shape.text} | texts], else: texts
      texts = if shape.name && shape.name != "", do: [{shape.id, shape.name} | texts], else: texts
      texts
    end)
  end

  @doc """
  Serializes a `%Canvas{}` back to a JSON-encodable map matching .tldr format.
  """
  def to_json(%Canvas{schema: schema, records: records}) do
    %{
      "tldrawFileFormatVersion" => 1,
      "schema" => schema,
      "records" => records
    }
  end

  # --- Private ---

  defp parse_shape(record) do
    props = Map.get(record, "props", %{})

    %Shape{
      id: record["id"],
      type: record["type"],
      parent_id: record["parentId"],
      x: record["x"],
      y: record["y"],
      rotation: record["rotation"],
      index: record["index"],
      is_locked: record["isLocked"] || false,
      opacity: record["opacity"] || 1,
      props: props,
      meta: record["meta"],
      text: extract_text(props),
      name: props["name"]
    }
  end

  defp parse_binding(record) do
    %Binding{
      id: record["id"],
      type: record["type"],
      from_id: record["fromId"],
      to_id: record["toId"],
      props: record["props"],
      meta: record["meta"]
    }
  end

  @doc """
  Extracts plain text from a shape's props.
  Handles both legacy `props.text` and ProseMirror-style `props.richText`.
  """
  def extract_text(%{"text" => text}) when is_binary(text) and text != "", do: text

  def extract_text(%{"richText" => %{"content" => content}}) when is_list(content) do
    text =
      content
      |> Enum.map(&extract_prosemirror_text/1)
      |> Enum.reject(&(&1 == ""))
      |> Enum.join("\n")

    if text == "", do: nil, else: text
  end

  def extract_text(_), do: nil

  defp extract_prosemirror_text(%{"content" => content}) when is_list(content) do
    content
    |> Enum.map(fn
      %{"type" => "text", "text" => t} -> t
      node -> extract_prosemirror_text(node)
    end)
    |> Enum.join("")
  end

  defp extract_prosemirror_text(_), do: ""

  defp collect_descendants(tree, parent_id) do
    direct = Map.get(tree, parent_id, [])

    direct ++
      Enum.flat_map(direct, fn child ->
        collect_descendants(tree, child.id)
      end)
  end
end

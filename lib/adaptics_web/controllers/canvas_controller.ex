defmodule AdapticsWeb.CanvasController do
  use AdapticsWeb, :controller
  alias Adaptics.{Repo, TldrawCanvas}
  alias Adaptics.Canvas.TldrawParser
  alias Adaptics.Canvas.TldrawSearch

  @tldr_path "tmp/adaptics.tldr"

  def json_data(conn, _params) do
    path = Path.join(File.cwd!(), @tldr_path)

    case File.read(path) do
      {:ok, contents} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(200, contents)

      {:error, _} ->
        conn
        |> put_resp_content_type("application/json")
        |> send_resp(404, Jason.encode!(%{error: "no saved canvas"}))
    end
  end

  def data(conn, _params) do
    canvases = Repo.all(TldrawCanvas)

    render(conn, :data, canvases: canvases, parsed_data: nil, layout: false)
  end

  def meta(conn, _params) do
    path = Path.join(File.cwd!(), @tldr_path)

    {texts, error} =
      case TldrawParser.parse_file(path) do
        {:ok, canvas} ->
          texts =
            canvas.shapes
            |> Enum.filter(&(&1.text != nil and &1.text != ""))
            |> Enum.map(fn shape ->
              frame = TldrawSearch.containing_set(canvas, shape.id)
              %{text: shape.text, type: shape.type, frame: frame && (frame.name || frame.id)}
            end)

          {texts, nil}

        {:error, reason} ->
          {[], "Could not load #{path}: #{inspect(reason)}"}
      end

    render(conn, :meta, texts: texts, error: error, layout: false)
  end

  def parse(conn, %{"json" => json_string}) do
    canvases = Repo.all(TldrawCanvas)

    case Jason.decode(json_string) do
      {:ok, data} ->
        parsed = parse_tldraw_data(data)
        render(conn, :data, canvases: canvases, parsed_data: parsed, layout: false)

      {:error, _} ->
        conn
        |> put_flash(:error, "Invalid JSON")
        |> render(:data, canvases: canvases, parsed_data: nil, layout: false)
    end
  end

  defp parse_tldraw_data(data) do
    records = data |> Map.get("store", %{}) |> Map.values()
    shapes = Enum.filter(records, &(&1["typeName"] == "shape"))
    shapes_by_id = Map.new(records, &{&1["id"], &1})

    %{
      pages: extract_pages(records),
      total_shapes: length(shapes),
      shape_counts: count_shapes_by_type(shapes),
      text_content: extract_text_content(shapes, shapes_by_id),
      frames: extract_frames(shapes),
      raw: data
    }
  end

  defp extract_pages(records) do
    records
    |> Enum.filter(&(&1["typeName"] == "page"))
    |> Enum.map(fn page ->
      shape_count =
        Enum.count(records, &(&1["typeName"] == "shape" && &1["parentId"] == page["id"]))

      %{id: page["id"], name: page["name"] || "Untitled", shape_count: shape_count}
    end)
  end

  defp count_shapes_by_type(shapes) do
    shapes
    |> Enum.group_by(& &1["type"])
    |> Map.new(fn {type, group} -> {type, length(group)} end)
  end

  defp extract_frames(shapes) do
    shapes
    |> Enum.filter(&(&1["type"] == "frame"))
    |> Enum.map(fn frame ->
      %{
        id: frame["id"],
        name: get_in(frame, ["props", "name"]) || "Untitled Frame",
        x: frame["x"],
        y: frame["y"],
        width: get_in(frame, ["props", "w"]),
        height: get_in(frame, ["props", "h"])
      }
    end)
  end

  defp extract_text_content(shapes, shapes_by_id) do
    shapes
    |> Enum.filter(&(&1["type"] == "text"))
    |> Enum.map(fn shape ->
      text = shape_text(shape)

      %{
        text: if(text == "", do: "(empty)", else: text),
        frame: containing_frame_name(shape["parentId"], shapes_by_id),
        x: shape["x"],
        y: shape["y"]
      }
    end)
    # Sort by frame (nil frames last), then y, then x
    |> Enum.sort_by(&{&1[:frame] || "zzz_no_frame", &1[:y], &1[:x]})
  end

  # Extract text from a shape's richText paragraph structure.
  defp shape_text(shape) do
    case get_in(shape, ["props", "richText", "content"]) do
      paragraphs when is_list(paragraphs) ->
        paragraphs
        |> Enum.map(&paragraph_text/1)
        |> Enum.reject(&(&1 == ""))
        |> Enum.join("\n")

      _ ->
        "(empty)"
    end
  end

  defp paragraph_text(paragraph) do
    case get_in(paragraph, ["content"]) do
      text_nodes when is_list(text_nodes) -> Enum.map_join(text_nodes, "", &(&1["text"] || ""))
      _ -> ""
    end
  end

  # Walk parentId chain to the enclosing frame's name, if any.
  defp containing_frame_name(nil, _shapes_by_id), do: nil

  defp containing_frame_name(shape_id, shapes_by_id) do
    case shapes_by_id[shape_id] do
      %{"type" => "frame"} = frame -> get_in(frame, ["props", "name"]) || "Untitled Frame"
      %{"parentId" => parent_id} when not is_nil(parent_id) -> containing_frame_name(parent_id, shapes_by_id)
      _ -> nil
    end
  end
end

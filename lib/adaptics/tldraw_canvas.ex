defmodule Adaptics.TldrawCanvas do
  use Ecto.Schema
  import Ecto.Changeset

  schema "tldraw_canvases" do
    field :name, :string
    field :tldraw_data, :map
    field :text_content, {:array, :string}, default: []
    field :shape_count, :integer, default: 0
    field :page_count, :integer, default: 0

    timestamps()
  end

  @doc false
  def changeset(canvas, attrs) do
    canvas
    |> cast(attrs, [:name, :tldraw_data, :text_content, :shape_count, :page_count])
    |> validate_required([:name, :tldraw_data])
  end

  @doc """
  Creates a canvas from tldraw localStorage JSON data
  """
  def from_tldraw_json(name, json_data) when is_binary(json_data) do
    case Jason.decode(json_data) do
      {:ok, data} -> from_tldraw_json(name, data)
      {:error, _} = error -> error
    end
  end

  def from_tldraw_json(name, data) when is_map(data) do
    parsed = parse_tldraw_data(data)

    %{
      name: name,
      tldraw_data: data,
      text_content: parsed.text_content,
      shape_count: parsed.total_shapes,
      page_count: length(parsed.pages)
    }
  end

  defp parse_tldraw_data(data) do
    store = data["store"] || %{}
    records = Map.values(store)

    pages =
      records
      |> Enum.filter(fn record -> record["typeName"] == "page" end)

    shapes =
      records
      |> Enum.filter(fn record -> record["typeName"] == "shape" end)

    text_content =
      shapes
      |> Enum.filter(fn shape -> shape["type"] == "text" end)
      |> Enum.map(fn shape -> get_in(shape, ["props", "text"]) end)
      |> Enum.reject(&is_nil/1)
      |> Enum.reject(&(&1 == ""))

    %{
      pages: pages,
      total_shapes: length(shapes),
      text_content: text_content
    }
  end
end

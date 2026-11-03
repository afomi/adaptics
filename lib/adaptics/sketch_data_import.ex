defmodule Adaptics.SketchDataImport do
  @moduledoc """
  Migrates /sketch-data's localStorage payloads into the shared data model
  (FC2.15) — consolidation strategy step 2.

  Input is the raw localStorage shapes, read client-side and pushed up:

    - `nodes` — `nodes_data_v1`: `[{id, name, category, date, value, baseX,
      baseY, x, y, group, tags, ...}]`
    - `views` — `saved_views_v1`: `[{id, name, snapshot: [{id, x, y}]}]`
    - `modes` — `custom_modes_v1`: `[{name, xAxis: {property, scale, jitter,
      label}, yAxis: {...}, ...}]`

  Mapping: a sketch node becomes a Node with `baseX/baseY` as its canonical
  position and category/value/date/group/tags in `metadata` (plus `sketch_id`
  for idempotent re-import); a saved view becomes a freeform snapshot
  Projection; a custom mode becomes an axes Projection with properties
  rewritten to the typed schema (`value` → `metadata.value`, `baseX` → `x`).
  Imported projections are prefixed "sketch: " and upserted by name, so
  re-importing updates rather than duplicates.
  """

  alias Adaptics.Projections
  alias Adaptics.Spaces

  @property_map %{
    "value" => "metadata.value",
    "category" => "metadata.category",
    "date" => "metadata.date",
    "group" => "metadata.group",
    "baseX" => "x",
    "baseY" => "y",
    "x" => "x",
    "y" => "y"
  }

  @scale_map %{"linear" => "linear", "ordinal" => "ordinal", "time" => "time", "log" => "linear"}

  @doc """
  Imports nodes, views, and modes into a space.
  Returns `{:ok, summary}` where summary reports exactly what happened:
  `%{nodes_created, nodes_updated, views, modes, skipped_modes: [name]}`.
  """
  def import(space, payload) do
    {id_map, created, updated} = import_nodes(space, payload["nodes"] || [])
    views = import_views(space, payload["views"] || [], id_map)
    {modes, skipped} = import_modes(space, payload["modes"] || [])

    {:ok,
     %{
       nodes_created: created,
       nodes_updated: updated,
       views: views,
       modes: modes,
       skipped_modes: skipped
     }}
  end

  # ── Nodes ─────────────────────────────────────────────────────────────────

  defp import_nodes(space, sketch_nodes) do
    existing_by_sketch_id =
      space
      |> Spaces.list_nodes_for_space()
      |> Enum.filter(&(&1.metadata["sketch_id"] != nil))
      |> Map.new(&{&1.metadata["sketch_id"], &1})

    Enum.reduce(sketch_nodes, {%{}, 0, 0}, fn sketch, {id_map, created, updated} ->
      sketch_id = to_string(sketch["id"])
      attrs = node_attrs(sketch, sketch_id)

      case Map.get(existing_by_sketch_id, sketch_id) do
        nil ->
          {:ok, node} = Spaces.create_node(space, attrs)
          {Map.put(id_map, sketch["id"], node.id), created + 1, updated}

        node ->
          {:ok, node} = Spaces.update_node(node, attrs)
          {Map.put(id_map, sketch["id"], node.id), created, updated + 1}
      end
    end)
  end

  defp node_attrs(sketch, sketch_id) do
    metadata =
      %{
        "sketch_id" => sketch_id,
        "category" => sketch["category"],
        "value" => sketch["value"],
        "date" => sketch["date"],
        "group" => sketch["group"],
        "tags" => sketch["tags"] || []
      }
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)
      |> Map.new()

    %{
      "name" => sketch["name"] || "node #{sketch_id}",
      "kind" => "sketch",
      "x" => to_float(sketch["baseX"] || sketch["x"]),
      "y" => to_float(sketch["baseY"] || sketch["y"]),
      "metadata" => metadata
    }
  end

  # ── Saved views → freeform snapshot Projections ───────────────────────────

  defp import_views(space, views, id_map) do
    Enum.count(views, &import_view(space, &1, id_map))
  end

  defp import_view(space, view, id_map) do
    positions =
      (view["snapshot"] || [])
      |> Enum.flat_map(&remap_position(&1, id_map))
      |> Map.new()

    name = "sketch: " <> (view["name"] || "view #{view["id"]}")
    layout = %{"kind" => "freeform", "positions" => positions}
    upsert_projection(space, name, layout)
  end

  defp remap_position(%{"id" => old_id} = pos, id_map) do
    case Map.get(id_map, old_id) do
      nil -> []
      new_id -> [{to_string(new_id), [to_float(pos["x"]), to_float(pos["y"])]}]
    end
  end

  # ── Custom modes → axes Projections ───────────────────────────────────────

  defp import_modes(space, modes) do
    results = Enum.map(modes, &import_mode(space, &1))

    {
      Enum.count(results, &match?({:ok, _}, &1)),
      results |> Enum.filter(&match?({:skip, _}, &1)) |> Enum.map(&elem(&1, 1))
    }
  end

  defp import_mode(space, mode) do
    name = "sketch: " <> (mode["name"] || mode["id"] || "mode")

    with {:ok, x_axis} <- convert_axis(mode["xAxis"]),
         {:ok, y_axis} <- convert_axis(mode["yAxis"]) do
      layout = %{
        "kind" => "axes",
        "x_axis" => x_axis,
        "y_axis" => y_axis,
        "drag_enabled" => false,
        "show_axes" => mode["showAxes"] != false
      }

      if upsert_projection(space, name, layout), do: {:ok, name}, else: {:skip, name}
    else
      _ -> {:skip, name}
    end
  end

  defp convert_axis(%{"property" => property} = axis) do
    mapped =
      case Map.get(@property_map, property) do
        nil -> if String.starts_with?(property, "metadata."), do: property, else: nil
        found -> found
      end

    if mapped do
      {:ok,
       %{
         "property" => mapped,
         "scale" => Map.get(@scale_map, axis["scale"], "linear"),
         "jitter" => axis["jitter"] || 0,
         "label" => axis["label"] || mapped
       }}
    else
      {:error, :unmapped_property}
    end
  end

  defp convert_axis(_), do: {:error, :missing_axis}

  defp upsert_projection(space, name, layout) do
    attrs = %{"name" => name, "layout" => layout}

    result =
      case Projections.get_projection_by_name(space, name) do
        nil -> Projections.create_projection(space, attrs)
        existing -> Projections.update_projection(existing, attrs)
      end

    match?({:ok, _}, result)
  end

  defp to_float(nil), do: nil
  defp to_float(v) when is_number(v), do: v * 1.0

  defp to_float(v) when is_binary(v) do
    case Float.parse(v) do
      {f, _} -> f
      :error -> nil
    end
  end
end

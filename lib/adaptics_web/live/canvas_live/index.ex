defmodule AdapticsWeb.CanvasLive do
  use AdapticsWeb, :live_view

  alias Adaptics.Spaces
  alias Adaptics.Events
  alias Adaptics.Projections
  alias Adaptics.Projections.Axis
  alias Adaptics.Projections.Schema
  alias Adaptics.Semantic

  @impl true
  def mount(params, _session, socket) do
    space =
      case params["space_slug"] do
        nil -> Spaces.get_or_create_default_space()
        slug -> Spaces.get_space_by_slug!(slug)
      end
    nodes = Spaces.list_nodes_for_space(space)
    edges = Spaces.list_edges_for_space(space)
    projections = Projections.list_projections_for_space(space)

    {:ok,
     socket
     |> assign(:space, space)
     |> assign(:nodes, nodes)
     |> assign(:edges, edges)
     |> assign(:projections, projections)
     |> assign(:active_projection, nil)
     |> assign(:preview_layout, nil)
     |> assign(:comparison_projection, nil)
     |> assign(:page_title, space.name)
     |> derive()}
  end

  @impl true
  def handle_event("node_moved", %{"id" => id, "x" => x, "y" => y}, socket) do
    node = Spaces.get_node!(id)
    {:ok, updated} = Spaces.update_node(node, %{"x" => x, "y" => y})

    nodes =
      Enum.map(socket.assigns.nodes, fn n ->
        if n.id == updated.id, do: updated, else: n
      end)

    {:noreply, socket |> assign(:nodes, nodes) |> derive()}
  end

  @impl true
  def handle_event("node_label_updated", %{"id" => id, "name" => name}, socket) do
    node = Spaces.get_node!(id)
    {:ok, updated} = Spaces.update_node(node, %{"name" => name})

    nodes =
      Enum.map(socket.assigns.nodes, fn n ->
        if n.id == updated.id, do: updated, else: n
      end)

    {:noreply, socket |> assign(:nodes, nodes) |> derive()}
  end

  @impl true
  def handle_event("node_created", %{"x" => x, "y" => y}, socket) do
    {:ok, node} = Spaces.create_node(socket.assigns.space, %{
      "name" => "New Node",
      "description" => "",
      "x" => x,
      "y" => y
    })

    {:noreply,
     socket
     |> assign(:nodes, socket.assigns.nodes ++ [node])
     |> derive()
     |> push_event("node_added", %{id: node.id, name: node.name, x: node.x, y: node.y})}
  end

  @impl true
  def handle_event("node_deleted", %{"id" => id}, socket) do
    node = Spaces.get_node!(id)
    {:ok, _} = Spaces.delete_node(node)

    nodes = Enum.reject(socket.assigns.nodes, &(&1.id == node.id))
    {:noreply, socket |> assign(:nodes, nodes) |> derive()}
  end

  @impl true
  def handle_event("projection_selected", %{"id" => id}, socket) do
    projection = if id == nil, do: nil, else: Projections.get_projection!(id)
    {:noreply, socket |> assign(active_projection: projection, preview_layout: nil) |> derive()}
  end

  @impl true
  def handle_event("comparison_selected", %{"id" => id}, socket) do
    projection = if id == nil, do: nil, else: Projections.get_projection!(id)
    {:noreply, socket |> assign(:comparison_projection, projection) |> derive()}
  end

  # Drag inside a freeform snapshot view updates that view's positions map,
  # not the node's canonical x/y (FC2.13).
  @impl true
  def handle_event("projection_position_updated", %{"id" => id, "node_id" => node_id, "x" => x, "y" => y}, socket) do
    projection = Projections.get_projection!(id)

    case projection.layout do
      %{"kind" => "freeform"} = layout ->
        {:noreply, update_snapshot_position(socket, projection, layout, node_id, x, y)}

      _ ->
        {:noreply, socket}
    end
  end

  @impl true
  def handle_event("layout_previewed", %{"layout" => layout}, socket) do
    case Axis.normalize(layout) do
      {:ok, normalized} -> {:noreply, socket |> assign(:preview_layout, normalized) |> derive()}
      {:error, _reason} -> {:noreply, socket}
    end
  end

  @impl true
  def handle_event("projection_saved", %{"name" => name, "filter_config" => fc, "layout" => layout}, socket) do
    attrs = %{"name" => name, "filter_config" => fc, "layout" => layout}

    {:ok, proj} =
      case Projections.get_projection_by_name(socket.assigns.space, name) do
        nil -> Projections.create_projection(socket.assigns.space, attrs)
        existing -> Projections.update_projection(existing, attrs)
      end

    projections = upsert_in_list(socket.assigns.projections, proj)
    {:noreply, socket |> assign(projections: projections, active_projection: proj, preview_layout: nil) |> derive()}
  end

  # FC2.15 — /sketch-data localStorage migration. The hook reads the raw
  # localStorage payloads (same origin) and pushes them here.
  @impl true
  def handle_event("sketch_data_imported", payload, socket) do
    {:ok, summary} = Adaptics.SketchDataImport.import(socket.assigns.space, payload)

    message =
      "Imported #{summary.nodes_created} new node(s), updated #{summary.nodes_updated}; " <>
        "#{summary.views} view(s), #{summary.modes} mode(s)" <>
        case summary.skipped_modes do
          [] -> ""
          skipped -> " — skipped: #{Enum.join(skipped, ", ")}"
        end

    {:noreply,
     socket
     |> assign(:nodes, Spaces.list_nodes_for_space(socket.assigns.space))
     |> assign(:projections, Projections.list_projections_for_space(socket.assigns.space))
     |> derive()
     |> push_event("import_result", %{message: message})}
  end

  @impl true
  def handle_event("events_batch", %{"events" => events}, socket) when is_list(events) do
    {:ok, _count} = Events.create_events(socket.assigns.space, events)
    {:noreply, socket}
  end

  @impl true
  def handle_event("edge_created", %{"from_id" => from_id, "to_id" => to_id}, socket) do
    {:ok, edge} = Spaces.create_edge(socket.assigns.space, from_id, to_id)

    {:noreply,
     socket
     |> assign(:edges, socket.assigns.edges ++ [edge])
     |> derive()
     |> push_event("edge_added", %{id: edge.id, from_id: edge.from_id, to_id: edge.to_id})}
  end

  defp update_snapshot_position(socket, projection, layout, node_id, x, y) do
    positions = Map.put(layout["positions"] || %{}, to_string(node_id), [x, y])
    {:ok, updated} = Projections.update_projection(projection, %{"layout" => Map.put(layout, "positions", positions)})

    active =
      if socket.assigns.active_projection && socket.assigns.active_projection.id == updated.id,
        do: updated,
        else: socket.assigns.active_projection

    socket
    |> assign(projections: upsert_in_list(socket.assigns.projections, updated), active_projection: active)
    |> derive()
  end

  defp upsert_in_list(projections, proj) do
    if Enum.any?(projections, &(&1.id == proj.id)) do
      Enum.map(projections, &replace_if_match(&1, proj))
    else
      projections ++ [proj]
    end
  end

  defp replace_if_match(%{id: id}, %{id: id} = proj), do: proj
  defp replace_if_match(p, _proj), do: p

  # Derived assigns — computed here (not in render/1) so LiveView change
  # tracking sees them and re-renders the data attributes.
  defp derive(socket) do
    a = socket.assigns

    {visible_nodes, visible_edges} =
      case a.active_projection do
        nil -> {a.nodes, a.edges}
        proj -> Projections.apply(proj, a.nodes, a.edges)
      end

    # A transient preview wins over the active projection's layout.
    layout = a.preview_layout || (a.active_projection && a.active_projection.layout) || %{}
    schema = Schema.analyze(a.nodes)

    comparison =
      case a.comparison_projection do
        nil -> nil
        proj -> %{id: proj.id, name: proj.name, layout: Axis.resolve(proj.layout, visible_nodes)}
      end

    assign(socket,
      visible_nodes: visible_nodes,
      visible_edges: visible_edges,
      resolved_layout: Axis.resolve(layout, visible_nodes),
      resolved_comparison: comparison,
      schema: schema,
      suggestions: Schema.suggest(schema),
      semantic_axes: Enum.map(Semantic.list_axes(computed_only: true), &semantic_axis_json/1)
    )
  end

  defp semantic_axis_json(axis) do
    %{
      id: axis.id,
      name: axis.name,
      negative_pole: axis.negative_pole,
      positive_pole: axis.positive_pole
    }
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div
      id="canvas-container"
      class="fixed inset-0 pt-10 bg-gray-950 overflow-hidden"
      phx-hook="CanvasHook"
      data-nodes={Jason.encode!(Enum.map(@visible_nodes, &node_json/1))}
      data-edges={Jason.encode!(Enum.map(@visible_edges, &edge_json/1))}
      data-projections={Jason.encode!(Enum.map(@projections, &projection_json/1))}
      data-active-projection={Jason.encode!(if @active_projection, do: @active_projection.id, else: nil)}
      data-layout={Jason.encode!(@resolved_layout)}
      data-schema={Jason.encode!(@schema)}
      data-suggestions={Jason.encode!(@suggestions)}
      data-semantic-axes={Jason.encode!(@semantic_axes)}
      data-comparison={Jason.encode!(@resolved_comparison)}
      data-dev={to_string(Mix.env() == :dev)}
    >
    </div>
    """
  end

  defp node_json(node) do
    %{
      id: node.id,
      name: node.name,
      x: node.x || 100,
      y: node.y || 100,
      kind: node.kind,
      heading: node.heading,
      magnitude: node.magnitude,
      metadata: node.metadata || %{},
      inserted_at: node.inserted_at
    }
  end

  defp edge_json(edge) do
    %{
      id: edge.id,
      from_id: edge.from_id,
      to_id: edge.to_id
    }
  end

  defp projection_json(proj) do
    %{
      id: proj.id,
      name: proj.name,
      filter_config: proj.filter_config,
      layout: proj.layout
    }
  end
end

defmodule AdapticsWeb.GCLive do
  use AdapticsWeb, :live_view

  alias Adaptics.GenerationCitizen
  alias Adaptics.Spaces
  alias Adaptics.Events

  @impl true
  def mount(_params, _session, socket) do
    space = GenerationCitizen.get_or_create_space()
    nodes = Spaces.list_nodes_for_space(space)
    edges = Spaces.list_edges_for_space(space)

    facets = build_facets(nodes)

    {:ok,
     socket
     |> assign(:space, space)
     |> assign(:nodes, nodes)
     |> assign(:edges, edges)
     |> assign(:facets, facets)
     |> assign(:active_filters, %{})
     |> assign(:page_title, "Generation Citizen Network")}
  end

  # ── Filter events ──────────────────────────────────────────────────────────

  @impl true
  def handle_event("filter_toggle", %{"facet" => facet, "value" => value}, socket) do
    active = socket.assigns.active_filters
    current = Map.get(active, facet, [])

    updated =
      if value in current do
        Map.put(active, facet, current -- [value])
      else
        Map.put(active, facet, current ++ [value])
      end
      |> Map.reject(fn {_k, v} -> v == [] end)

    {:noreply, assign(socket, :active_filters, updated)}
  end

  @impl true
  def handle_event("filter_clear", _params, socket) do
    {:noreply, assign(socket, :active_filters, %{})}
  end

  # Pass-through canvas events to keep the hook happy
  @impl true
  def handle_event("node_moved", %{"id" => id, "x" => x, "y" => y}, socket) do
    node = Spaces.get_node!(id)
    {:ok, updated} = Spaces.update_node(node, %{"x" => x, "y" => y})
    nodes = Enum.map(socket.assigns.nodes, fn n -> if n.id == updated.id, do: updated, else: n end)
    {:noreply, assign(socket, :nodes, nodes)}
  end

  @impl true
  def handle_event("node_created", %{"x" => x, "y" => y}, socket) do
    {:ok, node} = Spaces.create_node(socket.assigns.space, %{
      "name" => "New Org",
      "kind" => "org",
      "x" => x,
      "y" => y,
      "metadata" => %{}
    })
    {:noreply,
     socket
     |> assign(:nodes, socket.assigns.nodes ++ [node])
     |> push_event("node_added", %{id: node.id, name: node.name, x: node.x, y: node.y})}
  end

  @impl true
  def handle_event("node_label_updated", %{"id" => id, "name" => name}, socket) do
    node = Spaces.get_node!(id)
    {:ok, updated} = Spaces.update_node(node, %{"name" => name})
    nodes = Enum.map(socket.assigns.nodes, fn n -> if n.id == updated.id, do: updated, else: n end)
    {:noreply, assign(socket, :nodes, nodes)}
  end

  @impl true
  def handle_event("node_deleted", %{"id" => id}, socket) do
    node = Spaces.get_node!(id)
    {:ok, _} = Spaces.delete_node(node)
    nodes = Enum.reject(socket.assigns.nodes, &(&1.id == node.id))
    {:noreply, assign(socket, :nodes, nodes)}
  end

  @impl true
  def handle_event("edge_created", %{"from_id" => from_id, "to_id" => to_id}, socket) do
    {:ok, edge} = Spaces.create_edge(socket.assigns.space, from_id, to_id)
    {:noreply,
     socket
     |> assign(:edges, socket.assigns.edges ++ [edge])
     |> push_event("edge_added", %{id: edge.id, from_id: edge.from_id, to_id: edge.to_id})}
  end

  @impl true
  def handle_event("events_batch", %{"events" => events}, socket) when is_list(events) do
    {:ok, _} = Events.create_events(socket.assigns.space, events)
    {:noreply, socket}
  end

  # ── Render ─────────────────────────────────────────────────────────────────

  @impl true
  def render(assigns) do
    visible_nodes = apply_filters(assigns.nodes, assigns.active_filters)
    node_ids = MapSet.new(visible_nodes, & &1.id)
    visible_edges =
      Enum.filter(assigns.edges, fn e ->
        MapSet.member?(node_ids, e.from_id) and MapSet.member?(node_ids, e.to_id)
      end)

    assigns = assign(assigns,
      visible_nodes: visible_nodes,
      visible_edges: visible_edges,
      visible_count: length(visible_nodes),
      total_count: length(assigns.nodes)
    )

    ~H"""
    <div class="fixed inset-0 pt-10 flex bg-gray-950 overflow-hidden">
      <%!-- Filter sidebar --%>
      <aside class="w-56 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-950 p-4 flex flex-col gap-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-sky-400 tracking-widest uppercase">Filter</span>
          <span class="text-xs text-gray-500" id="gc-count">
            {@visible_count}/{@total_count}
          </span>
        </div>

        <%= if @active_filters != %{} do %>
          <button
            phx-click="filter_clear"
            class="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-2 py-1 text-left"
          >
            Clear all filters
          </button>
        <% end %>

        <%= for {facet, values} <- Enum.sort(@facets) do %>
          <.facet_group
            facet={facet}
            values={values}
            active={Map.get(@active_filters, facet, [])}
          />
        <% end %>
      </aside>

      <%!-- Canvas --%>
      <div
        id="gc-canvas"
        class="flex-1 relative overflow-hidden"
        phx-hook="CanvasHook"
        data-nodes={Jason.encode!(Enum.map(@visible_nodes, &node_json/1))}
        data-edges={Jason.encode!(Enum.map(@visible_edges, &edge_json/1))}
        data-projections={Jason.encode!([])}
        data-active-projection={Jason.encode!(nil)}
        data-dev={to_string(Mix.env() == :dev)}
      >
      </div>
    </div>
    """
  end

  # ── Components ─────────────────────────────────────────────────────────────

  attr :facet, :string, required: true
  attr :values, :list, required: true
  attr :active, :list, required: true

  defp facet_group(assigns) do
    ~H"""
    <div>
      <div class="text-xs text-gray-400 uppercase tracking-wider mb-2">
        {facet_label(@facet)}
      </div>
      <div class="flex flex-col gap-1">
        <%= for value <- @values do %>
          <button
            phx-click="filter_toggle"
            phx-value-facet={@facet}
            phx-value-value={value}
            class={[
              "text-xs text-left px-2 py-1 rounded transition-colors",
              if(value in @active,
                do: "bg-sky-900 text-sky-300 border border-sky-600",
                else: "text-gray-300 hover:text-white hover:bg-gray-800"
              )
            ]}
          >
            {value}
          </button>
        <% end %>
      </div>
    </div>
    """
  end

  # ── Helpers ────────────────────────────────────────────────────────────────

  defp facet_label("org_type"),    do: "Type"
  defp facet_label("regions"),     do: "Region"
  defp facet_label("populations"), do: "Population"
  defp facet_label("programs"),    do: "Program"
  defp facet_label("values"),      do: "Values"
  defp facet_label(key),           do: key

  # Build {facet => sorted unique values} from all nodes' metadata.
  # Only facets with at least 2 distinct values are shown.
  defp build_facets(nodes) do
    facet_keys = ["org_type", "regions", "populations", "programs"]

    Enum.reduce(facet_keys, %{}, fn key, acc ->
      values =
        nodes
        |> Enum.flat_map(fn n ->
          val = (n.metadata || %{})[key]
          case val do
            nil -> []
            list when is_list(list) -> list
            scalar -> [scalar]
          end
        end)
        |> Enum.reject(&(&1 == ""))
        |> Enum.uniq()
        |> Enum.sort()

      if length(values) >= 1, do: Map.put(acc, key, values), else: acc
    end)
  end

  # Apply active_filters to node list. Multiple values in the same facet = OR.
  # Multiple facets = AND.
  defp apply_filters(nodes, filters) when filters == %{}, do: nodes

  defp apply_filters(nodes, filters) do
    Enum.filter(nodes, fn node ->
      meta = node.metadata || %{}
      Enum.all?(filters, fn {facet, allowed} ->
        value = Map.get(meta, facet)
        case value do
          nil -> false
          list when is_list(list) -> Enum.any?(list, &(&1 in allowed))
          scalar -> scalar in allowed
        end
      end)
    end)
  end

  defp node_json(node) do
    %{
      id: node.id,
      name: node.name,
      x: node.x || 100,
      y: node.y || 100
    }
  end

  defp edge_json(edge) do
    %{id: edge.id, from_id: edge.from_id, to_id: edge.to_id}
  end
end

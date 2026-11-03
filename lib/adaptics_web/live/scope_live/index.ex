defmodule AdapticsWeb.ScopeLive do
  use AdapticsWeb, :live_view

  @mock_graph %{
    system: %{id: "root", label: "System Pulse", activity: 0.72},
    clusters: [
      %{id: "c1", label: "Attribution", activity: 0.85, children: ["n1", "n2", "n3"]},
      %{id: "c2", label: "Governance", activity: 0.60, children: ["n4", "n5"]},
      %{id: "c3", label: "Energy", activity: 0.92, children: ["n6", "n7", "n8", "n9"]}
    ],
    nodes: [
      %{id: "n1", label: "Contributor A", activity: 0.9},
      %{id: "n2", label: "Contributor B", activity: 0.4},
      %{id: "n3", label: "Validator", activity: 0.7},
      %{id: "n4", label: "Council", activity: 0.5},
      %{id: "n5", label: "Proposal X", activity: 0.8},
      %{id: "n6", label: "Solar Array", activity: 0.95},
      %{id: "n7", label: "Battery", activity: 0.6},
      %{id: "n8", label: "Grid Tie", activity: 0.88},
      %{id: "n9", label: "Load Balance", activity: 0.73}
    ],
    edges: [
      %{from: "n1", to: "n2", weight: 0.8},
      %{from: "n1", to: "n3", weight: 0.5},
      %{from: "n6", to: "n7", weight: 0.9},
      %{from: "n7", to: "n8", weight: 0.7}
    ]
  }

  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:graph, @mock_graph)
     |> assign(:current_layer, "clusters")
     |> assign(:focused_cluster, nil)
     |> assign(:selected_node, nil)
     |> assign(:dark_nav, true)}
  end

  def handle_event("layer_changed", %{"layer" => layer}, socket) do
    {:noreply, assign(socket, :current_layer, layer)}
  end

  def handle_event("cluster_entered", %{"id" => id}, socket) do
    cluster = Enum.find(socket.assigns.graph.clusters, &(&1.id == id))

    {:noreply,
     socket
     |> assign(:focused_cluster, cluster)
     |> assign(:current_layer, "nodes")
     |> assign(:selected_node, nil)}
  end

  def handle_event("node_selected", %{"id" => id}, socket) do
    node = Enum.find(socket.assigns.graph.nodes, &(&1.id == id))
    {:noreply, assign(socket, :selected_node, node)}
  end

  def handle_event("reset_view", _params, socket) do
    {:noreply,
     socket
     |> assign(:focused_cluster, nil)
     |> assign(:selected_node, nil)
     |> assign(:current_layer, "clusters")}
  end

  def render(assigns) do
    ~H"""
    <div class="fixed inset-0 pt-10 bg-white overflow-hidden">
      <div
        id="scope-container"
        class="absolute inset-0 top-10"
        phx-hook="ScopeVisualization"
        phx-update="ignore"
        data-graph={Jason.encode!(@graph)}
      >
      </div>

      <div class="absolute top-14 left-4 z-10 flex items-center gap-2 text-sm text-gray-600">
        <button
          phx-click="reset_view"
          class="hover:text-gray-900 transition-colors"
        >
          System
        </button>
        <%= if @focused_cluster do %>
          <span class="text-gray-400">/</span>
          <span class="text-gray-900"><%= @focused_cluster.label %></span>
        <% end %>
        <%= if @selected_node do %>
          <span class="text-gray-400">/</span>
          <span class="text-blue-600"><%= @selected_node.label %></span>
        <% end %>
      </div>

      <div class="absolute top-14 right-4 z-10 text-xs text-gray-400 font-mono">
        <%= @current_layer %>
      </div>

      <%= if @selected_node do %>
        <div class="absolute bottom-6 right-6 z-10 bg-white/90 border border-gray-200 rounded-lg p-4 w-64 shadow-sm">
          <h3 class="text-gray-900 font-medium text-sm">
            <%= @selected_node.label %>
          </h3>
          <div class="mt-2 flex items-center gap-2">
            <div class="text-xs text-gray-500">Activity</div>
            <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full"
                style={"width: #{trunc(@selected_node.activity * 100)}%"}
              >
              </div>
            </div>
            <div class="text-xs text-gray-700">
              <%= trunc(@selected_node.activity * 100) %>%
            </div>
          </div>
        </div>
      <% end %>
    </div>
    """
  end
end

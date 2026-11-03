defmodule AdapticsWeb.ValueStreamLive do
  use AdapticsWeb, :live_view

  def mount(_params, _session, socket) do
    initial_data = %{
      nodes: [
        %{id: "customer-demand", name: "Customer Demand", type: "anchor", x: 0, y: 0, z: 0, value: 100, tags: ["wardley"], evolution: 0.9, visibility: 0.8},
        %{id: "energy-grid", name: "Smart Grid", type: "capability", x: -50, y: -20, z: 30, value: 85, tags: ["wardley"], evolution: 0.7, visibility: 0.9},
        %{id: "renewable-sources", name: "Renewable Energy", type: "component", x: -80, y: -40, z: 60, value: 70, tags: ["wardley"], evolution: 0.6, visibility: 0.7},
        %{id: "data-processing", name: "Real-time Processing", type: "capability", x: 20, y: -30, z: -40, value: 90, tags: ["wardley"], evolution: 0.8, visibility: 0.6},
        %{id: "cloud-infrastructure", name: "Cloud Platform", type: "component", x: 40, y: -50, z: -20, value: 95, tags: ["wardley"], evolution: 0.9, visibility: 0.5},
        %{id: "ai-optimization", name: "AI Optimization", type: "capability", x: -30, y: 40, z: -50, value: 60, tags: ["wardley"], evolution: 0.4, visibility: 0.6},
        %{id: "storage-systems", name: "Energy Storage", type: "component", x: -60, y: 20, z: 40, value: 75, tags: [], evolution: 0.5, visibility: 0.4},
        %{id: "monitoring", name: "IoT Monitoring", type: "component", x: 60, y: 10, z: 20, value: 80, tags: [], evolution: 0.7, visibility: 0.5},
        %{id: "user-interface", name: "Control Dashboard", type: "capability", x: 10, y: 60, z: 10, value: 65, tags: ["wardley"], evolution: 0.8, visibility: 0.9}
      ],
      connections: [
        %{from: "customer-demand", to: "energy-grid", strength: 0.9, type: "primary"},
        %{from: "energy-grid", to: "renewable-sources", strength: 0.8, type: "dependency"},
        %{from: "energy-grid", to: "storage-systems", strength: 0.7, type: "dependency"},
        %{from: "customer-demand", to: "data-processing", strength: 0.85, type: "primary"},
        %{from: "data-processing", to: "cloud-infrastructure", strength: 0.9, type: "dependency"},
        %{from: "data-processing", to: "ai-optimization", strength: 0.6, type: "enhancement"},
        %{from: "monitoring", to: "data-processing", strength: 0.75, type: "input"},
        %{from: "ai-optimization", to: "user-interface", strength: 0.7, type: "output"},
        %{from: "energy-grid", to: "user-interface", strength: 0.8, type: "output"}
      ]
    }

    {:ok,
     socket
     |> assign(:data, initial_data)
     |> assign(:view_mode, "value_stream")
     |> assign(:selected_node, nil)
     |> assign(:sidebar_open, false)
     |> assign(:dark_nav, true)}
  end

  def handle_event("toggle_view", _params, socket) do
    new_mode = if socket.assigns.view_mode == "value_stream", do: "wardley", else: "value_stream"
    {:noreply, assign(socket, :view_mode, new_mode)}
  end

  def handle_event("toggle_sidebar", _params, socket) do
    {:noreply, assign(socket, :sidebar_open, !socket.assigns.sidebar_open)}
  end

  def handle_event("select_node", %{"id" => node_id}, socket) do
    {:noreply, assign(socket, :selected_node, node_id)}
  end

  def handle_event("add_node", %{"name" => name, "type" => type}, socket) do
    new_node = %{
      id: "node-#{System.unique_integer([:positive])}",
      name: name,
      type: type,
      x: (:rand.uniform(100) - 50) * 1.0,
      y: (:rand.uniform(100) - 50) * 1.0,
      z: (:rand.uniform(100) - 50) * 1.0,
      value: :rand.uniform(100),
      tags: if(type == "anchor", do: ["wardley"], else: []),
      evolution: :rand.uniform() * 1.0,
      visibility: :rand.uniform() * 1.0
    }

    updated_data = %{socket.assigns.data | nodes: [new_node | socket.assigns.data.nodes]}

    {:noreply,
     socket
     |> assign(:data, updated_data)
     |> put_flash(:info, "Node '#{name}' added successfully")}
  end

  def handle_event("import_data", %{"data" => json_data}, socket) do
    try do
      imported_data = Jason.decode!(json_data)
      {:noreply, assign(socket, :data, imported_data)}
    catch
      _ -> {:noreply, put_flash(socket, :error, "Invalid JSON data")}
    end
  end

  def render(assigns) do
    ~H"""
    <div class="fixed inset-0 pt-10 bg-gray-900 overflow-hidden">
      <!-- Top toolbar (below nav) -->
      <div class="absolute top-12 left-4 z-10 flex gap-2">
        <button
          phx-click="toggle_view"
          class="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          <%= if @view_mode == "value_stream", do: "Wardley Map", else: "Value Stream" %>
        </button>
        <button
          phx-click="toggle_sidebar"
          class="px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
        >
          <%= if @sidebar_open, do: "Close Panel", else: "Add / Import" %>
        </button>
      </div>

      <!-- Full-screen canvas -->
      <div
        id="visualization-container"
        class="absolute inset-0 top-10"
        phx-hook="ValueStreamVisualization"
        data-view-mode={@view_mode}
        data-nodes={Jason.encode!(@data.nodes)}
        data-connections={Jason.encode!(@data.connections)}
      >
      </div>

      <!-- Right sidebar drawer -->
      <div class={[
        "absolute top-10 right-0 h-full w-80 bg-gray-800 shadow-xl transform transition-transform duration-300 z-20",
        @sidebar_open && "translate-x-0" || "translate-x-full"
      ]}>
        <div class="p-4 h-full overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-semibold text-white">Controls</h2>
            <button
              phx-click="toggle_sidebar"
              class="text-gray-400 hover:text-white"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Add Node Form -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-300 mb-3">Add New Node</h3>
            <form phx-submit="add_node" class="space-y-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Node name"
                  required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Type</label>
                <select
                  name="type"
                  required
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select type...</option>
                  <option value="anchor">Anchor</option>
                  <option value="capability">Capability</option>
                  <option value="component">Component</option>
                </select>
              </div>
              <button
                type="submit"
                class="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                Add Node
              </button>
            </form>
          </div>

          <hr class="border-gray-700 my-4" />

          <!-- Import Form -->
          <div>
            <h3 class="text-sm font-medium text-gray-300 mb-3">Import JSON Data</h3>
            <form phx-submit="import_data" class="space-y-3">
              <div>
                <textarea
                  name="data"
                  placeholder="Paste JSON data..."
                  required
                  rows="6"
                  class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono"
                ></textarea>
              </div>
              <button
                type="submit"
                class="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
              >
                Import
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Node Info Panel -->
      <%= if @selected_node do %>
        <div class="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur text-white p-4 rounded-lg max-w-xs z-10 border border-gray-700">
          <%= case Enum.find(@data.nodes, &(&1.id == @selected_node)) do %>
            <% node when not is_nil(node) -> %>
              <h3 class="font-bold text-lg"><%= node.name %></h3>
              <p class="text-sm text-gray-300">Type: <%= node.type %></p>
              <p class="text-sm text-gray-300">Value: <%= node.value %></p>
              <%= if "wardley" in node.tags do %>
                <p class="text-sm text-green-400">✓ Wardley Map Compatible</p>
              <% end %>
            <% _ -> %>
              <p>Node not found</p>
          <% end %>
        </div>
      <% end %>
    </div>
    """
  end
end

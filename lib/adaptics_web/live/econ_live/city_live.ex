defmodule AdapticsWeb.EconLive.CityLive do
  use AdapticsWeb, :live_view

  alias AdapticsWeb.EconLive.CityModels

  def mount(_params, _session, socket) do
    current_model = "jiaolong"
    model = CityModels.get_model(current_model)
    data = CityModels.generate(current_model)
    loops = CityModels.feedback_loops(current_model)
    theory = CityModels.theory(current_model)
    actors = CityModels.actors(current_model)
    contracts = CityModels.contracts(current_model)
    annotations = CityModels.annotations(current_model)

    {:ok,
     socket
     |> assign(:current_model, current_model)
     |> assign(:model, model)
     |> assign(:data, data)
     |> assign(:feedback_loops, loops)
     |> assign(:theory, theory)
     |> assign(:actors, actors)
     |> assign(:contracts, contracts)
     |> assign(:annotations, annotations)
     |> assign(:view_mode, "3d")
     |> assign(:selected_node, nil)
     |> assign(:sidebar_open, true)
     |> assign(:sidebar_tab, "theory")
     |> assign(:dark_nav, true)}
  end

  def handle_event("select_node", %{"id" => node_id}, socket) do
    {:noreply, assign(socket, :selected_node, node_id)}
  end

  def handle_event("toggle_view", _params, socket) do
    new_mode = if socket.assigns.view_mode == "3d", do: "2d", else: "3d"
    {:noreply, assign(socket, :view_mode, new_mode)}
  end

  def handle_event("toggle_sidebar", _params, socket) do
    {:noreply, assign(socket, :sidebar_open, !socket.assigns.sidebar_open)}
  end

  def handle_event("sidebar_tab", %{"tab" => tab}, socket) do
    {:noreply, assign(socket, :sidebar_tab, tab)}
  end

  def handle_event("highlight_node", %{"id" => node_id}, socket) do
    {:noreply, assign(socket, :selected_node, node_id)}
  end

  defp tab_class(current_tab, tab) do
    if current_tab == tab do
      "px-3 py-1.5 text-sm font-medium rounded bg-blue-600 text-white"
    else
      "px-3 py-1.5 text-sm font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
    end
  end

  defp loop_type_badge(:reinforcing), do: "bg-green-600"
  defp loop_type_badge(:balancing), do: "bg-blue-600"
  defp loop_type_badge(_), do: "bg-gray-600"

  defp node_type_color("actor"), do: "bg-orange-500"
  defp node_type_color("organization"), do: "bg-blue-500"
  defp node_type_color("institution"), do: "bg-gray-500"
  defp node_type_color("contract"), do: "bg-green-500"
  defp node_type_color("property_right"), do: "bg-pink-500"
  defp node_type_color("infrastructure"), do: "bg-purple-500"
  defp node_type_color("revenue"), do: "bg-yellow-500"
  defp node_type_color("externality"), do: "bg-red-400"
  defp node_type_color(_), do: "bg-gray-500"

  def render(assigns) do
    ~H"""
    <div class="fixed inset-0 pt-10 bg-gray-900 overflow-hidden">
      <!-- Top toolbar -->
      <div class="absolute top-12 left-4 z-10 flex gap-2 items-center">
        <div class="px-3 py-2 bg-gray-800 text-white text-sm rounded border border-gray-600">
          <%= @model.name %>
        </div>
        <button
          phx-click="toggle_view"
          class="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          <%= if @view_mode == "3d", do: "2D View", else: "3D View" %>
        </button>
        <button
          phx-click="toggle_sidebar"
          class="px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
        >
          <%= if @sidebar_open, do: "Hide Panel", else: "Show Panel" %>
        </button>
      </div>

      <!-- Source citation -->
      <div class="absolute top-12 right-4 z-10 max-w-xs">
        <div class="px-3 py-2 bg-gray-800/80 backdrop-blur text-gray-400 text-xs rounded">
          <%= @model.source %>
        </div>
      </div>

      <!-- Three.js canvas -->
      <div
        id={"city-viz-#{@current_model}"}
        class="absolute left-0 right-0 top-10 bottom-0"
        phx-hook="ValueStreamVisualization"
        data-view-mode={@view_mode}
        data-nodes={Jason.encode!(@data.nodes)}
        data-connections={Jason.encode!(@data.connections)}
      >
      </div>

      <!-- Right sidebar -->
      <div class={[
        "absolute top-10 right-0 h-full w-96 bg-gray-800 shadow-xl transform transition-transform duration-300 z-20 overflow-hidden",
        @sidebar_open && "translate-x-0" || "translate-x-full"
      ]}>
        <div class="p-4 h-full overflow-y-auto pb-20">
          <!-- Header -->
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-white">
              City Model
            </h2>
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

          <!-- Model description -->
          <div class="mb-4 p-3 bg-gray-700 rounded-lg">
            <p class="text-sm text-gray-200 leading-relaxed">
              <%= @model.description %>
            </p>
            <p class="text-xs text-gray-400 mt-2">
              <%= @model.subtitle %>
            </p>
          </div>

          <!-- Tab bar -->
          <div class="flex gap-1 mb-4">
            <button
              phx-click="sidebar_tab"
              phx-value-tab="theory"
              class={tab_class(@sidebar_tab, "theory")}
            >
              Theory
            </button>
            <button
              phx-click="sidebar_tab"
              phx-value-tab="actors"
              class={tab_class(@sidebar_tab, "actors")}
            >
              Actors
            </button>
            <button
              phx-click="sidebar_tab"
              phx-value-tab="contracts"
              class={tab_class(@sidebar_tab, "contracts")}
            >
              Contracts
            </button>
          </div>

          <!-- Theory tab -->
          <%= if @sidebar_tab == "theory" do %>
            <div class="space-y-4">
              <%= for section <- @theory do %>
                <div class="p-3 bg-gray-700/50 rounded-lg">
                  <h4 class="text-sm font-semibold text-white mb-1">
                    <%= section.title %>
                  </h4>
                  <p class="text-xs text-gray-300 leading-relaxed">
                    <%= section.body %>
                  </p>
                </div>
              <% end %>

              <hr class="border-gray-700 my-4" />

              <!-- Feedback loops -->
              <h3 class="text-sm font-medium text-gray-300 mb-3">
                Feedback Loops
              </h3>
              <%= for loop <- @feedback_loops do %>
                <div class="p-3 bg-gray-700/50 rounded-lg mb-2">
                  <div class="flex items-center gap-2 mb-1">
                    <span class={"px-2 py-0.5 text-xs rounded text-white #{loop_type_badge(loop.type)}"}>
                      <%= loop.type %>
                    </span>
                    <span class="text-sm font-medium text-white">
                      <%= loop.name %>
                    </span>
                  </div>
                  <p class="text-xs text-gray-300 leading-relaxed">
                    <%= loop.description %>
                  </p>
                  <div class="flex flex-wrap gap-1 mt-2">
                    <%= for node_id <- loop.nodes do %>
                      <button
                        phx-click="highlight_node"
                        phx-value-id={node_id}
                        class="px-2 py-0.5 bg-gray-600 text-xs text-gray-200 rounded hover:bg-gray-500 transition-colors"
                      >
                        <%= node_id %>
                      </button>
                    <% end %>
                  </div>
                </div>
              <% end %>
            </div>
          <% end %>

          <!-- Actors tab -->
          <%= if @sidebar_tab == "actors" do %>
            <div class="space-y-2">
              <%= for actor <- @actors do %>
                <button
                  phx-click="highlight_node"
                  phx-value-id={actor.id}
                  class={"w-full text-left p-3 rounded-lg transition-colors #{if @selected_node == actor.id, do: "bg-blue-600/30 border border-blue-500", else: "bg-gray-700/50 hover:bg-gray-700"}"}
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span class={"w-2.5 h-2.5 rounded-full #{node_type_color(actor.type)}"}></span>
                    <span class="text-sm font-medium text-white">
                      <%= actor.name %>
                    </span>
                    <span class="text-xs text-gray-400">
                      <%= actor.type %>
                    </span>
                  </div>
                  <%= if Map.get(@annotations, actor.id) do %>
                    <p class="text-xs text-gray-300 leading-relaxed mt-1">
                      <%= Map.get(@annotations, actor.id) %>
                    </p>
                  <% end %>
                </button>
              <% end %>
            </div>
          <% end %>

          <!-- Contracts tab -->
          <%= if @sidebar_tab == "contracts" do %>
            <div class="space-y-2">
              <%= for contract <- @contracts do %>
                <button
                  phx-click="highlight_node"
                  phx-value-id={contract.id}
                  class={"w-full text-left p-3 rounded-lg transition-colors #{if @selected_node == contract.id, do: "bg-blue-600/30 border border-blue-500", else: "bg-gray-700/50 hover:bg-gray-700"}"}
                >
                  <div class="flex items-center gap-2 mb-1">
                    <span class={"w-2.5 h-2.5 rounded-full #{node_type_color(contract.type)}"}></span>
                    <span class="text-sm font-medium text-white">
                      <%= contract.name %>
                    </span>
                    <span class="text-xs text-gray-400">
                      <%= contract.type %>
                    </span>
                  </div>
                  <%= if contract.tags != [] do %>
                    <div class="flex flex-wrap gap-1 mt-1 mb-1">
                      <%= for tag <- contract.tags do %>
                        <span class="px-1.5 py-0.5 bg-gray-600 text-xs text-gray-300 rounded">
                          <%= tag %>
                        </span>
                      <% end %>
                    </div>
                  <% end %>
                  <%= if Map.get(@annotations, contract.id) do %>
                    <p class="text-xs text-gray-300 leading-relaxed mt-1">
                      <%= Map.get(@annotations, contract.id) %>
                    </p>
                  <% end %>
                </button>
              <% end %>
            </div>
          <% end %>
        </div>
      </div>

      <!-- Selected node info panel (bottom-left) -->
      <%= if @selected_node do %>
        <div class="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur text-white p-4 rounded-lg max-w-sm z-10 border border-gray-700">
          <%= case Enum.find(@data.nodes, &(&1.id == @selected_node)) do %>
            <% node when not is_nil(node) -> %>
              <div class="flex items-center gap-2 mb-2">
                <span class={"w-3 h-3 rounded-full #{node_type_color(node.type)}"}></span>
                <h3 class="font-bold text-lg">
                  <%= node.name %>
                </h3>
              </div>
              <p class="text-xs text-gray-400 mb-2">
                <%= node.type %>
              </p>
              <%= if Map.get(@annotations, @selected_node) do %>
                <p class="text-sm text-gray-200 leading-relaxed">
                  <%= Map.get(@annotations, @selected_node) %>
                </p>
              <% end %>
              <%= if node.tags != [] do %>
                <div class="flex flex-wrap gap-1 mt-2">
                  <%= for tag <- node.tags do %>
                    <span class="px-2 py-0.5 bg-gray-700 text-xs rounded">
                      <%= tag %>
                    </span>
                  <% end %>
                </div>
              <% end %>
            <% _ -> %>
              <p class="text-gray-400">
                Node not found
              </p>
          <% end %>
        </div>
      <% end %>
    </div>
    """
  end
end

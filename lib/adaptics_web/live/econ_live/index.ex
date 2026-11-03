defmodule AdapticsWeb.EconLive do
  use AdapticsWeb, :live_view

  @models %{
    # Level 1: Simplest possible economic interactions
    "barter" => %{
      name: "Simple Barter",
      description: "Two agents exchanging goods directly. The most primitive economic interaction.",
      complexity: 1,
      category: "basic",
      nodes: [
        %{id: "agent-a", name: "Agent A", type: "agent", x: -40, y: 0, z: 0, value: 50, tags: ["producer"], energy: 100},
        %{id: "agent-b", name: "Agent B", type: "agent", x: 40, y: 0, z: 0, value: 50, tags: ["producer"], energy: 100},
        %{id: "good-a", name: "Good A", type: "resource", x: -20, y: -30, z: 0, value: 25, tags: [], energy: 0},
        %{id: "good-b", name: "Good B", type: "resource", x: 20, y: -30, z: 0, value: 25, tags: [], energy: 0}
      ],
      connections: [
        %{from: "agent-a", to: "good-a", strength: 1.0, type: "produces"},
        %{from: "agent-b", to: "good-b", strength: 1.0, type: "produces"},
        %{from: "good-a", to: "agent-b", strength: 0.5, type: "exchange"},
        %{from: "good-b", to: "agent-a", strength: 0.5, type: "exchange"}
      ]
    },

    # Level 2: Introduction of money as medium of exchange
    "money_medium" => %{
      name: "Money as Medium",
      description: "Introduction of currency eliminates the 'double coincidence of wants' problem.",
      complexity: 2,
      category: "basic",
      nodes: [
        %{id: "producer", name: "Producer", type: "agent", x: -50, y: 0, z: 0, value: 60, tags: ["producer"], energy: 100},
        %{id: "consumer", name: "Consumer", type: "agent", x: 50, y: 0, z: 0, value: 40, tags: ["consumer"], energy: 80},
        %{id: "good", name: "Good", type: "resource", x: 0, y: -30, z: 0, value: 30, tags: [], energy: 0},
        %{id: "money", name: "Money", type: "medium", x: 0, y: 30, z: 0, value: 30, tags: ["abstract"], energy: 0}
      ],
      connections: [
        %{from: "producer", to: "good", strength: 1.0, type: "produces"},
        %{from: "good", to: "consumer", strength: 0.8, type: "purchase"},
        %{from: "consumer", to: "money", strength: 0.8, type: "pays"},
        %{from: "money", to: "producer", strength: 0.8, type: "receives"}
      ]
    },

    # Level 3: Supply and Demand equilibrium
    "supply_demand" => %{
      name: "Supply & Demand",
      description: "Price discovery through the interaction of supply and demand curves.",
      complexity: 3,
      category: "markets",
      nodes: [
        %{id: "supply", name: "Supply", type: "force", x: -40, y: -20, z: 0, value: 50, tags: ["curve"], energy: 60},
        %{id: "demand", name: "Demand", type: "force", x: 40, y: -20, z: 0, value: 50, tags: ["curve"], energy: 60},
        %{id: "price", name: "Price", type: "equilibrium", x: 0, y: 0, z: 0, value: 50, tags: ["emergent"], energy: 0},
        %{id: "quantity", name: "Quantity", type: "equilibrium", x: 0, y: 40, z: 0, value: 50, tags: ["emergent"], energy: 0},
        %{id: "producers", name: "Producers", type: "agent", x: -60, y: 30, z: 0, value: 40, tags: [], energy: 80},
        %{id: "consumers", name: "Consumers", type: "agent", x: 60, y: 30, z: 0, value: 40, tags: [], energy: 80}
      ],
      connections: [
        %{from: "producers", to: "supply", strength: 0.9, type: "determines"},
        %{from: "consumers", to: "demand", strength: 0.9, type: "determines"},
        %{from: "supply", to: "price", strength: 0.7, type: "influences"},
        %{from: "demand", to: "price", strength: 0.7, type: "influences"},
        %{from: "price", to: "quantity", strength: 0.8, type: "clears"}
      ]
    },

    # Level 4: Circular Flow
    "circular_flow" => %{
      name: "Circular Flow",
      description: "The continuous flow of money, goods, and services between households and firms.",
      complexity: 4,
      category: "macro",
      nodes: [
        %{id: "households", name: "Households", type: "sector", x: -50, y: 0, z: 0, value: 50, tags: ["macro"], energy: 100},
        %{id: "firms", name: "Firms", type: "sector", x: 50, y: 0, z: 0, value: 50, tags: ["macro"], energy: 100},
        %{id: "labor-market", name: "Labor Market", type: "market", x: 0, y: -40, z: 0, value: 40, tags: [], energy: 50},
        %{id: "goods-market", name: "Goods Market", type: "market", x: 0, y: 40, z: 0, value: 40, tags: [], energy: 50},
        %{id: "wages", name: "Wages", type: "flow", x: -30, y: -20, z: 20, value: 30, tags: ["money"], energy: 0},
        %{id: "spending", name: "Spending", type: "flow", x: 30, y: 20, z: 20, value: 30, tags: ["money"], energy: 0}
      ],
      connections: [
        %{from: "households", to: "labor-market", strength: 0.9, type: "supplies_labor"},
        %{from: "labor-market", to: "firms", strength: 0.9, type: "employs"},
        %{from: "firms", to: "wages", strength: 0.8, type: "pays"},
        %{from: "wages", to: "households", strength: 0.8, type: "income"},
        %{from: "firms", to: "goods-market", strength: 0.9, type: "supplies_goods"},
        %{from: "households", to: "spending", strength: 0.8, type: "consumes"},
        %{from: "spending", to: "goods-market", strength: 0.8, type: "purchases"}
      ]
    },

    # Level 5: Energy-Economy coupling
    "energy_economy" => %{
      name: "Energy-Economy Nexus",
      description: "Energy as the fundamental enabler and constraint of economic activity. All economic work requires energy transformation.",
      complexity: 5,
      category: "energy",
      nodes: [
        %{id: "sun", name: "Solar Input", type: "source", x: 0, y: -60, z: 0, value: 100, tags: ["primary", "physics"], energy: 1000},
        %{id: "fossil", name: "Fossil Fuels", type: "stock", x: -40, y: -30, z: 0, value: 80, tags: ["stored_sunlight"], energy: 500},
        %{id: "renewable", name: "Renewables", type: "flow", x: 40, y: -30, z: 0, value: 60, tags: ["current_sunlight"], energy: 200},
        %{id: "economy", name: "Economic Activity", type: "system", x: 0, y: 20, z: 0, value: 70, tags: ["dissipative"], energy: 300},
        %{id: "waste-heat", name: "Waste Heat", type: "sink", x: 0, y: 60, z: 0, value: 40, tags: ["entropy", "physics"], energy: 0},
        %{id: "gdp", name: "GDP", type: "measure", x: -30, y: 40, z: 20, value: 50, tags: ["abstract"], energy: 0},
        %{id: "eroi", name: "EROI", type: "constraint", x: 30, y: 40, z: 20, value: 50, tags: ["physics"], energy: 0}
      ],
      connections: [
        %{from: "sun", to: "fossil", strength: 0.3, type: "ancient_capture"},
        %{from: "sun", to: "renewable", strength: 0.9, type: "current_capture"},
        %{from: "fossil", to: "economy", strength: 0.8, type: "powers"},
        %{from: "renewable", to: "economy", strength: 0.5, type: "powers"},
        %{from: "economy", to: "waste-heat", strength: 1.0, type: "dissipates"},
        %{from: "economy", to: "gdp", strength: 0.7, type: "measured_as"},
        %{from: "eroi", to: "economy", strength: 0.9, type: "constrains"}
      ]
    },

    # Level 6: Thermodynamic Economics
    "thermodynamic" => %{
      name: "Thermodynamic Economics",
      description: "Economy as a dissipative structure: order maintained through energy throughput. Entropy as the ultimate constraint.",
      complexity: 6,
      category: "energy",
      nodes: [
        %{id: "low-entropy", name: "Low Entropy Input", type: "source", x: -60, y: -30, z: 0, value: 100, tags: ["physics", "order"], energy: 1000},
        %{id: "high-entropy", name: "High Entropy Output", type: "sink", x: 60, y: -30, z: 0, value: 100, tags: ["physics", "disorder"], energy: 0},
        %{id: "economy", name: "Economic System", type: "dissipative", x: 0, y: 0, z: 0, value: 80, tags: ["far_from_equilibrium"], energy: 400},
        %{id: "complexity", name: "Complexity", type: "emergent", x: -30, y: 40, z: 0, value: 60, tags: ["order"], energy: 200},
        %{id: "information", name: "Information", type: "emergent", x: 30, y: 40, z: 0, value: 60, tags: ["negentropy"], energy: 150},
        %{id: "work", name: "Useful Work", type: "output", x: 0, y: 60, z: 0, value: 50, tags: [], energy: 100}
      ],
      connections: [
        %{from: "low-entropy", to: "economy", strength: 1.0, type: "throughput"},
        %{from: "economy", to: "high-entropy", strength: 1.0, type: "dissipation"},
        %{from: "economy", to: "complexity", strength: 0.6, type: "generates"},
        %{from: "economy", to: "information", strength: 0.5, type: "generates"},
        %{from: "complexity", to: "work", strength: 0.7, type: "enables"},
        %{from: "information", to: "work", strength: 0.7, type: "directs"}
      ]
    },

    # Level 7: Growth and Limits
    "limits_growth" => %{
      name: "Limits to Growth",
      description: "Exponential growth meets finite resources. The dynamics of overshoot and collapse.",
      complexity: 7,
      category: "systems",
      nodes: [
        %{id: "population", name: "Population", type: "stock", x: -40, y: -30, z: 0, value: 70, tags: ["exponential"], energy: 80},
        %{id: "capital", name: "Capital", type: "stock", x: 40, y: -30, z: 0, value: 70, tags: ["exponential"], energy: 80},
        %{id: "resources", name: "Resources", type: "stock", x: 0, y: 0, z: -40, value: 60, tags: ["finite"], energy: 500},
        %{id: "pollution", name: "Pollution", type: "stock", x: 0, y: 0, z: 40, value: 50, tags: ["accumulating"], energy: 0},
        %{id: "food", name: "Food Production", type: "flow", x: -40, y: 30, z: 0, value: 50, tags: [], energy: 60},
        %{id: "output", name: "Industrial Output", type: "flow", x: 40, y: 30, z: 0, value: 50, tags: [], energy: 60},
        %{id: "carrying-capacity", name: "Carrying Capacity", type: "limit", x: 0, y: 60, z: 0, value: 40, tags: ["constraint"], energy: 0}
      ],
      connections: [
        %{from: "population", to: "food", strength: 0.8, type: "demands"},
        %{from: "capital", to: "output", strength: 0.9, type: "produces"},
        %{from: "resources", to: "output", strength: 0.7, type: "enables"},
        %{from: "output", to: "pollution", strength: 0.6, type: "generates"},
        %{from: "pollution", to: "carrying-capacity", strength: -0.5, type: "degrades"},
        %{from: "resources", to: "carrying-capacity", strength: 0.8, type: "determines"},
        %{from: "carrying-capacity", to: "population", strength: -0.4, type: "constrains"}
      ]
    },

    # Level 8: Complex Adaptive Economy
    "complex_adaptive" => %{
      name: "Complex Adaptive Economy",
      description: "Economy as emergent behavior of interacting agents. Self-organization, feedback loops, and phase transitions.",
      complexity: 8,
      category: "complexity",
      nodes: [
        %{id: "agents", name: "Heterogeneous Agents", type: "population", x: 0, y: -40, z: 0, value: 80, tags: ["bounded_rationality"], energy: 200},
        %{id: "interactions", name: "Local Interactions", type: "process", x: -40, y: 0, z: 0, value: 60, tags: ["network"], energy: 100},
        %{id: "emergence", name: "Emergent Patterns", type: "phenomenon", x: 40, y: 0, z: 0, value: 70, tags: ["macro"], energy: 50},
        %{id: "feedback-pos", name: "Positive Feedback", type: "loop", x: -30, y: 40, z: -20, value: 50, tags: ["amplifying"], energy: 40},
        %{id: "feedback-neg", name: "Negative Feedback", type: "loop", x: 30, y: 40, z: -20, value: 50, tags: ["stabilizing"], energy: 40},
        %{id: "adaptation", name: "Adaptation", type: "process", x: 0, y: 40, z: 20, value: 60, tags: ["learning"], energy: 80},
        %{id: "innovation", name: "Innovation", type: "emergence", x: 0, y: 60, z: 0, value: 50, tags: ["novelty"], energy: 60}
      ],
      connections: [
        %{from: "agents", to: "interactions", strength: 0.9, type: "engage_in"},
        %{from: "interactions", to: "emergence", strength: 0.7, type: "produce"},
        %{from: "emergence", to: "feedback-pos", strength: 0.5, type: "triggers"},
        %{from: "emergence", to: "feedback-neg", strength: 0.5, type: "triggers"},
        %{from: "feedback-pos", to: "agents", strength: 0.6, type: "amplifies"},
        %{from: "feedback-neg", to: "agents", strength: 0.6, type: "stabilizes"},
        %{from: "agents", to: "adaptation", strength: 0.7, type: "undergo"},
        %{from: "adaptation", to: "innovation", strength: 0.4, type: "enables"}
      ]
    }
  }

  @model_order ["barter", "money_medium", "supply_demand", "circular_flow", "energy_economy", "thermodynamic", "limits_growth", "complex_adaptive"]

  def mount(_params, _session, socket) do
    current_model = "barter"
    model_data = @models[current_model]

    {:ok,
     socket
     |> assign(:models, @models)
     |> assign(:model_order, @model_order)
     |> assign(:current_model, current_model)
     |> assign(:data, %{nodes: model_data.nodes, connections: model_data.connections})
     |> assign(:model_info, model_data)
     |> assign(:view_mode, "3d")
     |> assign(:selected_node, nil)
     |> assign(:sidebar_open, true)
     |> assign(:dark_nav, true)}
  end

  def handle_event("select_model", %{"model" => model_key}, socket) do
    model_data = @models[model_key]
    data = %{nodes: model_data.nodes, connections: model_data.connections}

    {:noreply,
     socket
     |> assign(:current_model, model_key)
     |> assign(:data, data)
     |> assign(:model_info, model_data)}
  end

  def handle_event("toggle_view", _params, socket) do
    new_mode = if socket.assigns.view_mode == "3d", do: "2d", else: "3d"
    {:noreply, assign(socket, :view_mode, new_mode)}
  end

  def handle_event("toggle_sidebar", _params, socket) do
    {:noreply, assign(socket, :sidebar_open, !socket.assigns.sidebar_open)}
  end

  def handle_event("select_node", %{"id" => node_id}, socket) do
    {:noreply, assign(socket, :selected_node, node_id)}
  end

  def handle_event("next_model", _params, socket) do
    current_idx = Enum.find_index(@model_order, &(&1 == socket.assigns.current_model))
    next_idx = rem(current_idx + 1, length(@model_order))
    next_model = Enum.at(@model_order, next_idx)
    model_data = @models[next_model]

    {:noreply,
     socket
     |> assign(:current_model, next_model)
     |> assign(:data, %{nodes: model_data.nodes, connections: model_data.connections})
     |> assign(:model_info, model_data)}
  end

  def handle_event("prev_model", _params, socket) do
    current_idx = Enum.find_index(@model_order, &(&1 == socket.assigns.current_model))
    prev_idx = if current_idx == 0, do: length(@model_order) - 1, else: current_idx - 1
    prev_model = Enum.at(@model_order, prev_idx)
    model_data = @models[prev_model]

    {:noreply,
     socket
     |> assign(:current_model, prev_model)
     |> assign(:data, %{nodes: model_data.nodes, connections: model_data.connections})
     |> assign(:model_info, model_data)}
  end

  defp category_color("basic"), do: "bg-blue-600"
  defp category_color("markets"), do: "bg-green-600"
  defp category_color("macro"), do: "bg-purple-600"
  defp category_color("energy"), do: "bg-orange-600"
  defp category_color("systems"), do: "bg-red-600"
  defp category_color("complexity"), do: "bg-pink-600"
  defp category_color(_), do: "bg-gray-600"

  defp complexity_bar(level) do
    filled = level
    empty = 8 - level
    String.duplicate("*", filled) <> String.duplicate("-", empty)
  end

  def render(assigns) do
    ~H"""
    <div class="fixed inset-0 pt-10 bg-gray-900 overflow-hidden">
      <!-- Top toolbar (below nav) -->
      <div class="absolute top-12 left-4 z-10 flex gap-2 items-center">
        <button
          phx-click="prev_model"
          class="px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
        >
          &larr;
        </button>
        <div class="px-3 py-2 bg-gray-800 text-white text-sm rounded">
          <%= @model_info.name %>
        </div>
        <button
          phx-click="next_model"
          class="px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
        >
          &rarr;
        </button>
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

      <!-- Full-screen canvas - key by model to force remount on model change -->
      <%= for _ <- [1] do %>
        <div
          id={"econ-viz-#{@current_model}"}
          class="absolute left-0 right-0 top-10 bottom-0"
          phx-hook="ValueStreamVisualization"
          data-view-mode={@view_mode}
          data-nodes={Jason.encode!(@data.nodes)}
          data-connections={Jason.encode!(@data.connections)}
        >
        </div>
      <% end %>

      <!-- Right sidebar drawer -->
      <div class={[
        "absolute top-10 right-0 h-full w-96 bg-gray-800 shadow-xl transform transition-transform duration-300 z-20 overflow-hidden",
        @sidebar_open && "translate-x-0" || "translate-x-full"
      ]}>
        <div class="p-4 h-full overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-white">Economic Models</h2>
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

          <!-- Current Model Info -->
          <div class="mb-6 p-3 bg-gray-700 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <span class={"px-2 py-1 text-xs rounded text-white #{category_color(@model_info.category)}"}>
                <%= @model_info.category %>
              </span>
              <span class="text-xs text-gray-400 font-mono">
                [<%= complexity_bar(@model_info.complexity) %>]
              </span>
            </div>
            <h3 class="text-white font-medium mb-1"><%= @model_info.name %></h3>
            <p class="text-sm text-gray-300 leading-relaxed">
              <%= @model_info.description %>
            </p>
          </div>

          <hr class="border-gray-700 my-4" />

          <!-- Model Selector -->
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-gray-300 mb-3">All Models</h3>
            <%= for model_key <- @model_order do %>
              <% model = @models[model_key] %>
              <button
                phx-click="select_model"
                phx-value-model={model_key}
                class={"w-full text-left p-3 rounded-lg transition-colors #{if @current_model == model_key, do: "bg-blue-600 text-white", else: "bg-gray-700 text-gray-300 hover:bg-gray-600"}"}
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium text-sm"><%= model.name %></span>
                  <span class={"px-2 py-0.5 text-xs rounded #{category_color(model.category)} text-white"}>
                    <%= model.complexity %>
                  </span>
                </div>
                <p class="text-xs mt-1 opacity-75 line-clamp-2">
                  <%= model.description %>
                </p>
              </button>
            <% end %>
          </div>

          <hr class="border-gray-700 my-4" />

          <!-- Philosophy Notes -->
          <div class="text-xs text-gray-400 space-y-2">
            <h4 class="text-gray-300 font-medium">Notes & Themes</h4>
            <p>
              <strong class="text-orange-400">Energy:</strong>
              All economic activity is energy transformation. GDP correlates with energy use.
            </p>
            <p>
              <strong class="text-purple-400">Entropy:</strong>
              Economic systems are dissipative structures - they maintain order by increasing entropy elsewhere.
            </p>
            <p>
              <strong class="text-green-400">Emergence:</strong>
              Macro phenomena emerge from micro interactions. Price is emergent, not designed.
            </p>
            <p>
              <strong class="text-red-400">Limits:</strong>
              Finite planet, exponential growth - the math doesn't work indefinitely.
            </p>
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
              <%= if node[:energy] && node.energy > 0 do %>
                <p class="text-sm text-orange-400">Energy: <%= node.energy %></p>
              <% end %>
              <%= if node[:tags] && length(node.tags) > 0 do %>
                <div class="flex flex-wrap gap-1 mt-2">
                  <%= for tag <- node.tags do %>
                    <span class="px-2 py-0.5 bg-gray-700 text-xs rounded"><%= tag %></span>
                  <% end %>
                </div>
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

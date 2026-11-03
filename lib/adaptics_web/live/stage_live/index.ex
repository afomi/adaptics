defmodule AdapticsWeb.StageLive do
  use AdapticsWeb, :live_view

  @default_steps [
    %{
      id: "step-1",
      label: "Arrive",
      time: 0.0,
      duration: 4.0,
      description: "User walks up to the building entrance"
    },
    %{
      id: "step-2",
      label: "Enter Building",
      time: 4.0,
      duration: 3.0,
      description: "User walks through the entrance and waves hello"
    },
    %{
      id: "step-3",
      label: "Approach Desk",
      time: 7.0,
      duration: 4.0,
      description: "User walks to the service desk, looks around, and leans forward"
    },
    %{
      id: "step-4",
      label: "Greet",
      time: 11.0,
      duration: 3.0,
      description: "User stands at the desk, nods in greeting, hands on hips"
    }
  ]

  @default_panels Enum.map(1..6, fn i ->
    %{id: i, prompt: "", image_url: nil, label: "Panel #{i}"}
  end)

  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:mode, "play")
     |> assign(:steps, @default_steps)
     |> assign(:current_step, "step-1")
     |> assign(:playing, false)
     |> assign(:storyboard_panels, @default_panels)
     |> assign(:new_step_label, "")
     |> assign(:new_step_description, "")
     |> assign(:dark_nav, true)}
  end

  def handle_event("select_step", %{"id" => step_id}, socket) do
    {:noreply,
     socket
     |> assign(:current_step, step_id)
     |> push_event("seek_to_step", %{step_id: step_id})}
  end

  def handle_event("toggle_mode", _params, socket) do
    new_mode = if socket.assigns.mode == "play", do: "storyboard", else: "play"
    {:noreply, assign(socket, :mode, new_mode)}
  end

  def handle_event("play", _params, socket) do
    {:noreply,
     socket
     |> assign(:playing, true)
     |> push_event("play_sequence", %{})}
  end

  def handle_event("pause", _params, socket) do
    {:noreply,
     socket
     |> assign(:playing, false)
     |> push_event("pause_sequence", %{})}
  end

  def handle_event("add_step", %{"label" => label, "description" => desc}, socket)
      when label != "" do
    steps = socket.assigns.steps
    last_step = List.last(steps)
    new_time = last_step.time + last_step.duration
    new_id = "step-#{length(steps) + 1}"

    new_step = %{
      id: new_id,
      label: label,
      time: new_time,
      duration: 2.0,
      description: desc
    }

    {:noreply,
     socket
     |> assign(:steps, steps ++ [new_step])
     |> assign(:new_step_label, "")
     |> assign(:new_step_description, "")}
  end

  def handle_event("add_step", _params, socket), do: {:noreply, socket}

  def handle_event("update_panel_prompt", %{"id" => id_str, "prompt" => prompt}, socket) do
    id = String.to_integer(id_str)

    panels =
      Enum.map(socket.assigns.storyboard_panels, fn panel ->
        if panel.id == id, do: %{panel | prompt: prompt}, else: panel
      end)

    {:noreply, assign(socket, :storyboard_panels, panels)}
  end

  def handle_event("toggle_studio", _params, socket) do
    {:noreply, push_event(socket, "toggle_studio", %{})}
  end

  def render(assigns) do
    ~H"""
    <div class="fixed inset-0 pt-10 bg-gray-900 overflow-hidden">
      <div class="absolute top-12 left-4 z-10 flex gap-2 items-center">
        <button
          phx-click="toggle_mode"
          class="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          <%= if @mode == "play", do: "Storyboard", else: "Play Mode" %>
        </button>
        <%= if @mode == "play" do %>
          <button
            phx-click={if @playing, do: "pause", else: "play"}
            class="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            <%= if @playing, do: "Pause", else: "Play" %>
          </button>
          <button
            phx-click="toggle_studio"
            class="px-3 py-2 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors"
          >
            Studio
          </button>
        <% end %>
      </div>

      <%= if @mode == "play" do %>
        <div
          id="stage-canvas"
          class="absolute left-80 right-0 top-10 bottom-0"
          phx-hook="StageCanvas"
          phx-update="ignore"
          data-steps={Jason.encode!(@steps)}
        >
        </div>

        <div class="absolute top-10 left-0 w-80 bottom-0 bg-gray-800 z-10 flex flex-col overflow-hidden">
          <div class="p-4 border-b border-gray-700">
            <h2 class="text-lg font-semibold text-white">Narrative Steps</h2>
            <p class="text-xs text-gray-400 mt-1">Click a step to scrub the timeline</p>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <%= for step <- @steps do %>
              <button
                phx-click="select_step"
                phx-value-id={step.id}
                class={[
                  "w-full text-left p-3 rounded-lg transition-colors",
                  @current_step == step.id &&
                    "bg-blue-600 text-white" ||
                    "bg-gray-700 text-gray-300 hover:bg-gray-600"
                ]}
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium text-sm"><%= step.label %></span>
                  <span class="text-xs opacity-75"><%= :erlang.float_to_binary(step.time, decimals: 1) %>s</span>
                </div>
                <p class="text-xs mt-1 opacity-75 line-clamp-2"><%= step.description %></p>
              </button>
            <% end %>
          </div>

          <div class="p-4 border-t border-gray-700">
            <h3 class="text-sm font-medium text-gray-300 mb-2">Add Step</h3>
            <form
              phx-submit="add_step"
              class="space-y-2"
            >
              <input
                type="text"
                name="label"
                placeholder="Step label"
                value={@new_step_label}
                required
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                name="description"
                placeholder="Description"
                value={@new_step_description}
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                class="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                Add Step
              </button>
            </form>
          </div>
        </div>
      <% else %>
        <div class="absolute inset-0 top-20 p-8">
          <div class="grid grid-cols-3 grid-rows-2 gap-6 h-full">
            <%= for panel <- @storyboard_panels do %>
              <div class="bg-gray-800 rounded-lg border border-gray-700 flex flex-col overflow-hidden">
                <div class="flex-1 flex items-center justify-center bg-gray-750 border-b border-gray-700">
                  <%= if panel.image_url do %>
                    <img
                      src={panel.image_url}
                      class="w-full h-full object-cover"
                    />
                  <% else %>
                    <div class="text-center text-gray-500">
                      <svg
                        class="w-16 h-16 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p class="text-sm"><%= panel.label %></p>
                    </div>
                  <% end %>
                </div>
                <div class="p-3">
                  <textarea
                    phx-blur="update_panel_prompt"
                    phx-value-id={panel.id}
                    name="prompt"
                    placeholder="Describe this scene..."
                    rows="2"
                    class="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  ><%= panel.prompt %></textarea>
                </div>
              </div>
            <% end %>
          </div>
        </div>
      <% end %>
    </div>
    """
  end
end

defmodule AdapticsWeb.FabricCanvasLive do
  use AdapticsWeb, :live_view

  alias Adaptics.Canvas
  alias Adaptics.Spaces

  @cursor_colors [
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#a855f7",
    "#ec4899",
    "#14b8a6"
  ]

  @impl true
  def mount(%{"space_slug" => slug}, session, socket) do
    space = Spaces.get_space_by_slug!(slug)
    user_id = session["user_id"] || "anon-#{:erlang.unique_integer([:positive])}"
    snapshot = Canvas.get_snapshot(space.id)
    cursor_color = Enum.random(@cursor_colors)

    if connected?(socket) do
      Canvas.subscribe(space.id)

      AdapticsWeb.Presence.track(self(), Canvas.topic(space.id), user_id, %{
        color: cursor_color,
        joined_at: System.system_time(:second)
      })
    end

    {:ok,
     socket
     |> assign(:space, space)
     |> assign(:user_id, user_id)
     |> assign(:cursor_color, cursor_color)
     |> assign(:snapshot_json, if(snapshot, do: snapshot.snapshot, else: %{}))
     |> assign(:page_title, "Sketch: #{space.name}")
     |> assign(:dark_nav, true)}
  end

  # --- Incoming events from JS hook ---

  @impl true
  def handle_event("canvas:object_added", %{"object" => obj}, socket) do
    Canvas.broadcast(socket.assigns.space.id, {:canvas_object_added, obj})
    {:noreply, socket}
  end

  @impl true
  def handle_event("canvas:object_modified", %{"object" => obj}, socket) do
    Canvas.broadcast(socket.assigns.space.id, {:canvas_object_modified, obj})
    {:noreply, socket}
  end

  @impl true
  def handle_event("canvas:object_removed", %{"id" => id}, socket) do
    Canvas.broadcast(socket.assigns.space.id, {:canvas_object_removed, %{id: id}})
    {:noreply, socket}
  end

  @impl true
  def handle_event("canvas:cursor_moved", %{"x" => x, "y" => y}, socket) do
    Canvas.broadcast(socket.assigns.space.id, {:canvas_cursor_moved, %{
      user_id: socket.assigns.user_id,
      x: x,
      y: y,
      color: socket.assigns.cursor_color
    }})

    {:noreply, socket}
  end

  @impl true
  def handle_event("canvas:save_snapshot", %{"snapshot" => snapshot}, socket) do
    Canvas.save_snapshot(
      socket.assigns.space.id,
      snapshot,
      socket.assigns.user_id
    )

    {:noreply, socket}
  end

  # --- Incoming broadcasts from other LiveViews ---

  @impl true
  def handle_info({:canvas_object_added, obj}, socket) do
    {:noreply, push_event(socket, "canvas:remote_object_added", %{object: obj})}
  end

  @impl true
  def handle_info({:canvas_object_modified, obj}, socket) do
    {:noreply, push_event(socket, "canvas:remote_object_modified", %{object: obj})}
  end

  @impl true
  def handle_info({:canvas_object_removed, %{id: id}}, socket) do
    {:noreply, push_event(socket, "canvas:remote_object_removed", %{id: id})}
  end

  @impl true
  def handle_info({:canvas_cursor_moved, cursor_data}, socket) do
    {:noreply, push_event(socket, "canvas:remote_cursor", cursor_data)}
  end

  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{event: "presence_diff", payload: diff}, socket) do
    {:noreply, push_event(socket, "canvas:presence_diff", %{
      joins: Map.keys(diff.joins),
      leaves: Map.keys(diff.leaves)
    })}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div
      id="fabric-canvas-container"
      class="fixed inset-0 pt-10 bg-white overflow-hidden"
      phx-hook="FabricCanvasHook"
      phx-update="ignore"
      data-space-id={@space.id}
      data-user-id={@user_id}
      data-snapshot={Jason.encode!(@snapshot_json)}
    >
    </div>
    """
  end
end

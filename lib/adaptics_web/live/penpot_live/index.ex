defmodule AdapticsWeb.PenpotLive do
  use AdapticsWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Draw"),
     layout: {AdapticsWeb.Layouts, :penpot}}
  end

  @impl true
  def handle_event("download", _params, socket) do
    {:noreply, push_event(socket, "download_excalidraw", %{})}
  end

  @impl true
  def handle_event("load", _params, socket) do
    {:noreply, push_event(socket, "open_file_picker", %{})}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div style="position: fixed; inset: 0; width: 100vw; height: 100vh;">
      <div
        id="excalidraw-container"
        phx-hook="ExcalidrawHook"
        phx-update="ignore"
        style="position: absolute; inset: 0;"
      >
      </div>
      <div style="position: absolute; bottom: 16px; right: 16px; z-index: 10; display: flex; gap: 8px;">
        <button
          phx-click="load"
          style="background: #fff; color: #6965db; border: 1px solid #6965db; border-radius: 6px; padding: 8px 14px; font-size: 13px; cursor: pointer; font-family: sans-serif;"
        >
          load .excalidraw
        </button>
        <button
          phx-click="download"
          style="background: #6965db; color: white; border: none; border-radius: 6px; padding: 8px 14px; font-size: 13px; cursor: pointer; font-family: sans-serif;"
        >
          download .excalidraw
        </button>
      </div>
    </div>
    """
  end
end

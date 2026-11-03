defmodule AdapticsWeb.DrawLive do
  use AdapticsWeb, :live_view

  require Logger

  @tldr_path "tmp/adaptics.tldr"

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Draw")
     |> assign(:hide_nav, true),
     layout: {AdapticsWeb.Layouts, :draw}}
  end

  @impl true
  def handle_event("save_tldr", %{"json" => json}, socket) when is_binary(json) do
    path = Path.join(File.cwd!(), @tldr_path)
    File.mkdir_p!(Path.dirname(path))

    pretty =
      json
      |> Jason.decode!()
      |> Jason.encode!(pretty: true)

    case File.write(path, pretty) do
      :ok ->
        Logger.debug("Saved .tldr to #{path}")
        {:noreply, socket}

      {:error, reason} ->
        Logger.error("Failed to save .tldr: #{inspect(reason)}")
        {:noreply, socket}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div
      id="tldraw-container"
      phx-hook="Tldraw"
      phx-update="ignore"
      style="position: fixed; inset: 0; width: 100vw; height: 100vh; overflow: hidden; margin: 0; padding: 0;"
    >
    </div>
    """
  end
end

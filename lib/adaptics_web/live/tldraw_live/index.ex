defmodule AdapticsWeb.TldrawLive do
  use AdapticsWeb, :live_view

  alias Adaptics.Canvas.TldrawParser
  alias Adaptics.Canvas.TldrawSearch

  @default_path "tmp/adaptics.tldr"

  @impl true
  def mount(_params, _session, socket) do
    path = Path.join(File.cwd!(), @default_path)

    socket =
      if connected?(socket) do
        {:ok, watcher_pid} = FileSystem.start_link(dirs: [Path.dirname(path)])
        FileSystem.subscribe(watcher_pid)
        assign(socket, :watcher_pid, watcher_pid)
      else
        socket
      end

    {canvas, error} = load_canvas(path)
    summary = if canvas, do: TldrawSearch.summary(canvas), else: nil

    {:ok,
     socket
     |> assign(:page_title, "tldraw")
     |> assign(:file_path, path)
     |> assign(:canvas, canvas)
     |> assign(:summary, summary)
     |> assign(:error, error)
     |> assign(:search_query, "")
     |> assign(:search_results, [])
     |> assign(:selected_frame, nil)
     |> assign(:frame_members, [])}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    results =
      if socket.assigns.canvas && String.trim(query) != "" do
        TldrawSearch.search_text(socket.assigns.canvas, query)
      else
        []
      end

    {:noreply,
     socket
     |> assign(:search_query, query)
     |> assign(:search_results, results)}
  end

  @impl true
  def handle_event("select_frame", %{"id" => frame_id}, socket) do
    members =
      if socket.assigns.canvas do
        TldrawSearch.members_of(socket.assigns.canvas, frame_id)
      else
        []
      end

    {:noreply,
     socket
     |> assign(:selected_frame, frame_id)
     |> assign(:frame_members, members)}
  end

  @impl true
  def handle_event("clear_frame", _params, socket) do
    {:noreply,
     socket
     |> assign(:selected_frame, nil)
     |> assign(:frame_members, [])}
  end

  @impl true
  def handle_event("reload", _params, socket) do
    {:noreply, reload_canvas(socket)}
  end

  @impl true
  def handle_info({:file_event, _watcher_pid, {path, _events}}, socket) do
    if Path.basename(path) == Path.basename(socket.assigns.file_path) do
      {:noreply, reload_canvas(socket)}
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_info({:file_event, _watcher_pid, :stop}, socket) do
    {:noreply, socket}
  end

  defp reload_canvas(socket) do
    {canvas, error} = load_canvas(socket.assigns.file_path)
    summary = if canvas, do: TldrawSearch.summary(canvas), else: nil

    socket
    |> assign(:canvas, canvas)
    |> assign(:summary, summary)
    |> assign(:error, error)
    |> assign(:search_query, "")
    |> assign(:search_results, [])
    |> assign(:selected_frame, nil)
    |> assign(:frame_members, [])
  end

  defp load_canvas(path) do
    case TldrawParser.parse_file(path) do
      {:ok, canvas} -> {canvas, nil}
      {:error, reason} -> {nil, "Could not load #{path}: #{inspect(reason)}"}
    end
  end
end

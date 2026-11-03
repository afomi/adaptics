defmodule AdapticsWeb.DesktopLive do
  use AdapticsWeb, :live_view

  @desktop Path.expand("~/Desktop")
  @destinations [
    {"--to-sort",         "/Users/ryan/Desktop/--to-sort"},
    {"crop",              "/Users/ryan/Desktop/--to-sort/_to-crop"},
    {"Bitcoin",           "/Users/ryan/Desktop/shortcuts/bitcoin"},
    {"Documents",         "/Users/ryan/Downloads/_documents"},
    {"Energy",            "/Users/ryan/Downloads/_energy"},
    {"Inspiration",       "/Users/ryan/Dropbox/Development/Visual/inspiration"},
    {"Opentecture",       "/Users/ryan/Dropbox/Development/Visual/opentecture"},
    {"Personal Strategy", "/Users/ryan/Dropbox/Development/Visual/personal-strategy"},
    {"Portfolio",         "/Users/ryan/Dropbox/Development/Visual/portfolio"},
    {"Projects",          "/Users/ryan/Desktop/_projects"},
    {"Q",                 "/Users/ryan/Downloads/_q"},
    {"Screenshots",       "/Users/ryan/Dropbox/Development/Visual/screenshots"},
    {"Visual",            "/Users/ryan/Dropbox/Development/Visual"},
    {"Writing",           "/Users/ryan/Desktop/rw/writing"},
    {"Delete",            "/Users/ryan/.Trash"},
  ]

  # --- helpers ---------------------------------------------------------------

  defp list_files(limit \\ 100) do
    @desktop
    |> File.ls!()
    |> Enum.map(&Path.join(@desktop, &1))
    |> Enum.filter(&File.regular?/1)
    |> Enum.take(limit)
    |> Enum.map(&build_info/1)
  end

  defp build_info(path) do
    %{size: size} = File.stat!(path)
    mime = MIME.from_path(path)
    "#{path}  -   #{mime}" |> IO.puts
    image? = mime && String.starts_with?(mime, "image/")

    %{
      path: path,
      name: Path.basename(path),
      size: size,
      image?: image?,
      mime: mime,
      # inline preview only for reasonably small images (< 1 MB)
      preview:
        if image? do
          "data:#{mime};base64," <> (File.read!(path) |> Base.encode64())
        end
    }
  end

  # --- LiveView callbacks ----------------------------------------------------

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:files, list_files())
     |> assign(:destinations, @destinations)}
  end

  @impl true
  def handle_event("move", %{"path" => src, "dest" => dest}, socket) do
    # target_dir = Path.join(@desktop, dest)
    target_dir = dest
    # File.mkdir_p!(target_dir)
    target = Path.join(target_dir, Path.basename(src))

    cond do
      File.exists?(target) ->
        {:noreply,
         put_flash(socket, :error, "❌  #{Path.basename(src)} already exists in #{dest}")}

      match?({:error, _}, File.rename(src, target)) ->
        {:noreply, put_flash(socket, :error, "❌  Couldn’t move file")}

      true ->
        # refresh list without the moved file
        new_files = Enum.reject(socket.assigns.files, &(&1.path == src))
        {:noreply,
         socket
         |> assign(:files, new_files)
         |> put_flash(:info, "✅ #{src} moved to #{dest}")}
    end
  end
end

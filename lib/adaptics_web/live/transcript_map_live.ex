defmodule AdapticsWeb.TranscriptMapLive do
  use AdapticsWeb, :live_view
  alias Adaptics.Transcripts
  alias Adaptics.Transcripts.{Atlas, Related}

  @impl true
  def mount(%{"project" => slug} = params, _session, socket) do
    case Transcripts.get_project(slug) do
      nil ->
        {:ok, push_navigate(socket, to: ~p"/transcripts")}

      project ->
        {:ok,
         socket
         |> assign(
           page_title: "#{project.name} · Turn atlas",
           project: project,
           atlas: nil,
           related_index: nil,
           focus: params["turn"],
           failed: false
         )
         |> start_async(:atlas, fn -> Atlas.load(slug) end)}
    end
  end

  @impl true
  def handle_async(:atlas, {:ok, atlas}, socket) do
    {:noreply, assign(socket, atlas: Map.delete(atlas, :index), related_index: atlas.index)}
  end

  def handle_async(:atlas, {:exit, _}, socket), do: {:noreply, assign(socket, :failed, true)}

  @impl true
  def handle_event("atlas-related", %{"id" => id}, socket) do
    case socket.assigns.related_index && Related.nearest(socket.assigns.related_index, id) do
      {:ok, matches} -> {:reply, %{matches: matches}, socket}
      _ -> {:reply, %{matches: []}, socket}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <main class="mx-auto max-w-screen-2xl px-6 pb-8 pt-16">
      <.link navigate={~p"/transcripts/#{@project.slug}"} class="text-sm text-zinc-500 hover:underline">← {@project.name} sessions</.link>
      <h1 class="mt-4 text-2xl font-semibold tracking-tight">Turn atlas</h1>
      <p class="mt-2 max-w-3xl text-sm text-zinc-500">Explore what you worked on, and when. Select a message to inspect its closest matches in the original embedding space.</p>
      <p :if={!@atlas && !@failed} id="atlas-loading" class="mt-8 text-sm text-zinc-500">Projecting cached embeddings…</p>
      <p :if={@failed} role="alert" class="mt-8 text-sm">The atlas could not be loaded. Reload to try again.</p>
      <%= if @atlas do %>
        <p id="atlas-coverage" class="mt-4 text-xs text-zinc-500">{@atlas.model} · {@atlas.dimensions} dimensions · {@atlas.indexed}/{@atlas.total} human turns indexed · {length(@atlas.points)} unique points{if @atlas.workflow_filtered, do: " · workflow filtered"}</p>
        <%= if @atlas.points == [] do %>
          <p id="atlas-empty" class="mt-8 text-sm">Index this project to see its messages:</p>
          <code class="mt-2 block text-sm">mix adaptics.transcripts.embed {@project.slug}</code>
        <% else %>
          <div id="transcript-atlas" phx-hook="TranscriptAtlas" phx-update="ignore" data-atlas={Jason.encode!(@atlas)} data-project={@project.slug} data-focus={@focus} class="transcript-atlas mt-5"></div>
          <p class="mt-3 text-xs text-zinc-500">Position: three principal components of the cached vectors. Color: inferred topic. Time view replaces height with message time. Distances in this projection are approximate; cosine scores use all dimensions. The layout stays fixed while you scrub. Embeddings use the first 2,000 characters of your prompt; open the original turn for its full context and answer.</p>
        <% end %>
      <% end %>
    </main>
    """
  end
end

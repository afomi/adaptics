defmodule AdapticsWeb.TranscriptsLive do
  @moduledoc """
  Browse Claude Code transcripts: projects → sessions → one session (TX1).
  Local only — routed in dev/test, never in a release.
  """
  use AdapticsWeb, :live_view

  alias Adaptics.Transcripts
  alias Adaptics.Transcripts.{Embeddings, Related}

  # search_hits/1: one list of matching sessions, shared by both searches.
  embed_templates "transcripts_live/*"

  @impl true
  def mount(_params, _session, socket), do: {:ok, socket}

  @impl true
  def handle_params(params, _uri, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  # Message counts read every transcript (~2s), so the list shows first and
  # the counts arrive from a background task; changing the sort reuses them.
  defp apply_action(socket, :index, params) do
    sort = if params["sort"] in Transcripts.sorts(), do: params["sort"], else: "name"

    socket =
      if socket.assigns[:all_projects] do
        socket
      else
        projects = Transcripts.list_projects()

        socket
        |> assign(:all_projects, projects)
        |> assign(:messages, nil)
        |> start_async(:messages, fn -> Transcripts.message_counts(projects) end)
      end

    socket
    |> search(String.trim(params["q"] || ""), &Transcripts.search_all/1)
    |> assign(:page_title, "Transcripts")
    |> assign(:sort, sort)
    |> sort_projects()
  end

  # Same pattern as the index: counts and search results come from background
  # tasks; a new sort reuses the counts, a new query starts a new search.
  defp apply_action(socket, :project, %{"project" => slug} = params) do
    case Transcripts.get_project(slug) do
      nil ->
        not_found(socket)

      project ->
        sort =
          if params["sort"] in Transcripts.session_sorts(), do: params["sort"], else: "recent"

        query = String.trim(params["q"] || "")

        socket
        |> load_sessions(project)
        |> search(query, &Transcripts.search(slug, &1))
        |> assign(:page_title, project.name)
        |> assign(:sort, sort)
        |> sort_sessions()
    end
  end

  defp apply_action(socket, :show, %{"project" => slug, "id" => id}) do
    with project when project != nil <- Transcripts.get_project(slug),
         session when session != nil <- Transcripts.get_session(slug, id) do
      socket
      |> assign(:page_title, session.title)
      |> assign(:project, project)
      |> assign(:session, session)
      |> assign(related: %{}, related_index: nil)
    else
      nil -> not_found(socket)
    end
  end

  defp load_sessions(socket, project) do
    if socket.assigns[:sessions_project] == project.slug do
      socket
    else
      socket
      |> assign(:project, project)
      |> assign(:sessions_project, project.slug)
      |> assign(:all_sessions, Transcripts.list_sessions(project.slug))
      |> assign(:messages, nil)
      |> start_async(:messages, fn -> Transcripts.session_message_counts(project.slug) end)
    end
  end

  # `search_fun` runs in a background task: one project's search or all of them.
  defp search(socket, query, search_fun) do
    cond do
      query == socket.assigns[:query] ->
        socket

      query == "" ->
        assign(socket, query: "", results: nil)

      true ->
        socket
        |> assign(query: query, results: :searching)
        |> start_async(:search, fn -> search_fun.(query) end)
    end
  end

  @impl true
  def handle_event("related", %{"turn" => number}, socket) do
    with :show <- socket.assigns.live_action,
         {number, ""} <- Integer.parse(number),
         turn when not is_nil(turn) <-
           Enum.find(socket.assigns.session.turns, &(&1.number == number)),
         %{text: text} <- turn.prompt,
         :content <- Embeddings.classify(text) do
      slug = socket.assigns.project.slug
      session_id = socket.assigns.session.id
      existing = socket.assigns.related_index

      {:noreply,
       socket
       |> assign(:related, Map.put(socket.assigns.related, number, :loading))
       |> start_async({:related, slug, session_id, number}, fn ->
         index = existing || Related.load(slug)
         {index, Related.nearest(index, "#{session_id}##{number}")}
       end)}
    else
      _ -> {:noreply, socket}
    end
  end

  def handle_event("search", %{"q" => q}, socket) do
    to =
      case socket.assigns.live_action do
        :index -> index_path(socket.assigns.sort, q)
        :project -> project_path(socket.assigns.project, socket.assigns.sort, q)
      end

    {:noreply, push_patch(socket, to: to)}
  end

  @impl true
  def handle_async({:related, slug, id, number}, result, socket) do
    if socket.assigns.live_action == :show and socket.assigns.project.slug == slug and
         socket.assigns.session.id == id do
      {index, matches} =
        case result do
          {:ok, {index, matches}} -> {index, matches}
          {:exit, _} -> {socket.assigns.related_index, {:error, :unavailable}}
        end

      {:noreply,
       assign(socket,
         related_index: index,
         related: Map.put(socket.assigns.related, number, matches)
       )}
    else
      {:noreply, socket}
    end
  end

  def handle_async(:messages, {:ok, counts}, socket) do
    socket = assign(socket, :messages, counts)

    {:noreply,
     if(socket.assigns.live_action == :index,
       do: sort_projects(socket),
       else: sort_sessions(socket)
     )}
  end

  # A newer start_async(:search) supersedes an older one (LiveView ignores the
  # stale result); a search finishing after the box was cleared is dropped here.
  def handle_async(:search, {:ok, results}, socket) do
    if socket.assigns.query == "",
      do: {:noreply, socket},
      else: {:noreply, assign(socket, :results, results)}
  end

  def handle_async(:search, {:exit, _reason}, socket) do
    {:noreply, socket |> assign(:results, []) |> put_flash(:error, "Search failed.")}
  end

  def handle_async(:messages, {:exit, _reason}, socket) do
    {:noreply, put_flash(socket, :error, "Couldn't count messages.")}
  end

  defp related_message(:not_embedded),
    do: "This turn has no current embedding. Index this project to find related turns."

  defp related_message(:workflow), do: "This turn is closer to how we work than what we work on."
  defp related_message(_), do: "Related turns could not be loaded. Try again."

  # The index URL, leaving out defaults (no query, sorted by name).
  defp index_path(sort, query) do
    params = Enum.reject([q: String.trim(query), sort: sort], fn {_, v} -> v in ["", "name"] end)
    ~p"/transcripts?#{params}"
  end

  # A project page URL, leaving out defaults (no query, newest first).
  defp project_path(project, sort, query) do
    params =
      Enum.reject([q: String.trim(query), sort: sort], fn {_, v} -> v in ["", "recent"] end)

    ~p"/transcripts/#{project.slug}?#{params}"
  end

  defp sort_sessions(socket) do
    %{all_sessions: sessions, sort: sort, messages: messages} = socket.assigns
    assign(socket, :sessions, Transcripts.sort_sessions(sessions, sort, messages || %{}))
  end

  defp sort_projects(socket) do
    %{all_projects: projects, sort: sort, messages: messages} = socket.assigns
    assign(socket, :projects, Transcripts.sort_projects(projects, sort, messages || %{}))
  end

  defp not_found(socket) do
    socket
    |> put_flash(:error, "Not found.")
    |> push_navigate(to: ~p"/transcripts")
  end

  defp ago(nil), do: "No message time"

  defp ago(%DateTime{} = dt) do
    seconds = DateTime.diff(DateTime.utc_now(), dt)

    cond do
      seconds < 3600 -> "#{div(seconds, 60)}m ago"
      seconds < 86_400 -> "#{div(seconds, 3600)}h ago"
      seconds < 86_400 * 30 -> "#{div(seconds, 86_400)}d ago"
      true -> Calendar.strftime(dt, "%Y-%m-%d")
    end
  end

  defp plural(1, word), do: "1 #{word}"
  defp plural(n, word), do: "#{n} #{word}s"

  defp size(bytes) when bytes < 1_048_576, do: "#{div(bytes, 1024)} KB"
  defp size(bytes), do: "#{Float.round(bytes / 1_048_576, 1)} MB"

  # "Read ×3 · Edit ×2", in first-use order.
  defp tools_summary(tools) do
    names = Enum.map(tools, & &1.name)

    names
    |> Enum.frequencies()
    |> Enum.sort_by(fn {name, _} -> Enum.find_index(names, &(&1 == name)) end)
    |> Enum.map_join(" · ", fn
      {name, 1} -> name
      {name, n} -> "#{name} ×#{n}"
    end)
  end

  # Markdown → HTML. Raw HTML in a transcript is shown as code, never rendered:
  # Earmark escapes inline HTML itself and marks HTML blocks `verbatim`.
  defp markdown(text) do
    case Earmark.Parser.as_ast(text) do
      {:ok, ast, _} -> ast
      {:error, ast, _} -> ast
    end
    |> show_html_as_code()
    |> Earmark.Transform.transform()
    |> Phoenix.HTML.raw()
  end

  # (Earmark.Transform.map_ast/3 can't do this: it keeps a node's original children.)
  defp show_html_as_code(nodes) when is_list(nodes), do: Enum.map(nodes, &show_html_as_code/1)

  defp show_html_as_code({tag, attrs, lines, %{verbatim: true}}) do
    attrs = Enum.map_join(attrs, "", fn {k, v} -> ~s( #{k}="#{v}") end)
    source = Enum.join(["<#{tag}#{attrs}>" | lines] ++ ["</#{tag}>"], "\n")
    {"pre", [], [{"code", [], [source], %{}}], %{}}
  end

  defp show_html_as_code({tag, attrs, children, meta}),
    do: {tag, attrs, show_html_as_code(children), meta}

  defp show_html_as_code(text), do: text
end

defmodule AdapticsWeb.WikiLive.Index do
  use AdapticsWeb, :live_view

  alias Adaptics.Wiki

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Wiki")
     |> assign(:search_query, "")
     |> assign(:pages, Wiki.list_recent_changes())}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    pages =
      if query == "" do
        Wiki.list_recent_changes()
      else
        Wiki.search_pages(query)
      end

    {:noreply,
     socket
     |> assign(:search_query, query)
     |> assign(:pages, pages)}
  end
end

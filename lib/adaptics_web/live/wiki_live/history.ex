defmodule AdapticsWeb.WikiLive.History do
  use AdapticsWeb, :live_view

  alias Adaptics.Wiki

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_params(%{"slug" => slug}, _uri, socket) do
    page = Wiki.get_page_by_slug!(slug)

    {:noreply,
     socket
     |> assign(:page_title, "History: #{page.title}")
     |> assign(:page, page)}
  end
end

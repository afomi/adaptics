defmodule AdapticsWeb.WikiLive.Edit do
  use AdapticsWeb, :live_view

  alias Adaptics.Wiki
  alias Adaptics.Wiki.Page

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_params(params, _uri, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :new, params) do
    title = Map.get(params, "title", "")
    page = %Page{title: title}

    socket
    |> assign(:page_title, "New Page")
    |> assign(:page, page)
    |> assign(:form, to_form(Wiki.change_page(page, %{title: title})))
    |> assign(:preview_html, "")
  end

  defp apply_action(socket, :edit, %{"slug" => slug}) do
    page = Wiki.get_page_by_slug!(slug)
    existing_slugs = Wiki.existing_slugs()
    preview = Wiki.Renderer.render(page.body || "", existing_slugs)

    socket
    |> assign(:page_title, "Edit: #{page.title}")
    |> assign(:page, page)
    |> assign(:form, to_form(Wiki.change_page(page)))
    |> assign(:preview_html, preview)
  end

  @impl true
  def handle_event("validate", %{"page" => page_params}, socket) do
    changeset =
      socket.assigns.page
      |> Wiki.change_page(page_params)
      |> Map.put(:action, :validate)

    existing_slugs = Wiki.existing_slugs()
    preview = Wiki.Renderer.render(page_params["body"] || "", existing_slugs)

    {:noreply,
     socket
     |> assign(:form, to_form(changeset))
     |> assign(:preview_html, preview)}
  end

  @impl true
  def handle_event("save", %{"page" => page_params}, socket) do
    save_page(socket, socket.assigns.live_action, page_params)
  end

  defp save_page(socket, :new, page_params) do
    case Wiki.create_page(page_params) do
      {:ok, page} ->
        Wiki.rerender_linking_pages(page.slug)

        {:noreply,
         socket
         |> put_flash(:info, "Page created.")
         |> push_navigate(to: ~p"/wiki/#{page.slug}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, :form, to_form(changeset))}
    end
  end

  defp save_page(socket, :edit, page_params) do
    case Wiki.update_page(socket.assigns.page, page_params) do
      {:ok, page} ->
        {:noreply,
         socket
         |> put_flash(:info, "Page updated.")
         |> push_navigate(to: ~p"/wiki/#{page.slug}")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, :form, to_form(changeset))}
    end
  end
end

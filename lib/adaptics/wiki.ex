defmodule Adaptics.Wiki do
  @moduledoc """
  The Wiki context. Manages wiki pages, revisions, and rendering.
  """

  import Ecto.Query
  alias Adaptics.Repo
  alias Adaptics.Wiki.{Page, Revision, Renderer}

  def list_pages do
    Page
    |> order_by(:title)
    |> Repo.all()
  end

  def list_recent_changes(limit \\ 20) do
    Page
    |> order_by([p], desc: p.updated_at)
    |> limit(^limit)
    |> Repo.all()
  end

  def get_page_by_slug!(slug) do
    Page
    |> Repo.get_by!(slug: slug)
    |> Repo.preload(revisions: from(r in Revision, order_by: [desc: r.inserted_at]))
  end

  def get_page_by_slug(slug) do
    Page
    |> Repo.get_by(slug: slug)
  end

  def create_page(attrs) do
    existing_slugs = existing_slugs()

    Repo.transaction(fn ->
      changeset = Page.changeset(%Page{}, attrs)

      case Repo.insert(changeset) do
        {:ok, page} ->
          rendered = Renderer.render(page.body || "", existing_slugs)
          {:ok, page} = page |> Ecto.Changeset.change(%{rendered_html: rendered}) |> Repo.update()

          %Revision{}
          |> Revision.changeset(%{
            wiki_page_id: page.id,
            body: page.body || "",
            message: Map.get(attrs, :message) || Map.get(attrs, "message"),
            author: Map.get(attrs, :author) || Map.get(attrs, "author")
          })
          |> Repo.insert!()

          page

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  def update_page(%Page{} = page, attrs) do
    existing_slugs = existing_slugs()

    Repo.transaction(fn ->
      changeset = Page.changeset(page, attrs)

      case Repo.update(changeset) do
        {:ok, page} ->
          rendered = Renderer.render(page.body || "", existing_slugs)
          {:ok, page} = page |> Ecto.Changeset.change(%{rendered_html: rendered}) |> Repo.update()

          %Revision{}
          |> Revision.changeset(%{
            wiki_page_id: page.id,
            body: page.body || "",
            message: Map.get(attrs, :message) || Map.get(attrs, "message"),
            author: Map.get(attrs, :author) || Map.get(attrs, "author")
          })
          |> Repo.insert!()

          page

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  def delete_page(%Page{} = page) do
    Repo.delete(page)
  end

  def change_page(%Page{} = page, attrs \\ %{}) do
    Page.changeset(page, attrs)
  end

  def search_pages(query) when is_binary(query) and query != "" do
    search = "%#{query}%"

    Page
    |> where([p], ilike(p.title, ^search) or ilike(p.body, ^search))
    |> order_by(:title)
    |> Repo.all()
  end

  def search_pages(_), do: []

  def page_exists?(slug) do
    Page
    |> where(slug: ^slug)
    |> Repo.exists?()
  end

  def existing_slugs do
    Page
    |> select([p], p.slug)
    |> Repo.all()
    |> MapSet.new()
  end

  @doc """
  Re-renders all pages that contain a wiki link to the given slug.
  Called when a new page is created to turn `?` links into real links.
  """
  def rerender_linking_pages(slug) do
    title_pattern = "%[[%]]%"
    existing = existing_slugs()

    Page
    |> where([p], ilike(p.body, ^title_pattern))
    |> Repo.all()
    |> Enum.each(fn page ->
      links = Renderer.extract_links(page.body || "")
      linked_slugs = Enum.map(links, fn {title, _} -> Page.slugify(title) end)

      if slug in linked_slugs do
        rendered = Renderer.render(page.body || "", existing)
        page |> Ecto.Changeset.change(%{rendered_html: rendered}) |> Repo.update()
      end
    end)
  end
end

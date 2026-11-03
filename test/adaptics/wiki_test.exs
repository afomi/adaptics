defmodule Adaptics.WikiTest do
  use Adaptics.DataCase, async: true

  alias Adaptics.Wiki
  import Adaptics.WikiFixtures

  describe "list_pages/0" do
    test "returns all pages ordered by title" do
      page_b = page_fixture(%{title: "Bravo"})
      page_a = page_fixture(%{title: "Alpha"})

      pages = Wiki.list_pages()
      ids = Enum.map(pages, & &1.id)

      assert List.first(ids) == page_a.id
      assert List.last(ids) == page_b.id
    end
  end

  describe "list_recent_changes/1" do
    test "returns pages ordered by most recently updated" do
      page1 = page_fixture(%{title: "First"})
      page2 = page_fixture(%{title: "Second"})

      # Force page1 to have an older updated_at
      past =
        NaiveDateTime.utc_now()
        |> NaiveDateTime.add(-3600, :second)
        |> NaiveDateTime.truncate(:second)

      page1
      |> Ecto.Changeset.change(%{updated_at: past})
      |> Adaptics.Repo.update!()

      pages = Wiki.list_recent_changes()
      ids = Enum.map(pages, & &1.id)

      assert hd(ids) == page2.id
      assert List.last(ids) == page1.id
    end
  end

  describe "get_page_by_slug!/1" do
    test "returns page with revisions preloaded" do
      page = page_fixture(%{title: "Test Page"})
      fetched = Wiki.get_page_by_slug!(page.slug)

      assert fetched.id == page.id
      assert length(fetched.revisions) == 1
    end

    test "raises for non-existent slug" do
      assert_raise Ecto.NoResultsError, fn ->
        Wiki.get_page_by_slug!("nonexistent")
      end
    end
  end

  describe "create_page/1" do
    test "creates page with valid attrs" do
      {:ok, page} = Wiki.create_page(%{title: "Portland", body: "A city in Oregon."})

      assert page.title == "Portland"
      assert page.slug == "portland"
      assert page.body == "A city in Oregon."
      assert page.rendered_html != nil
    end

    test "generates slug from title" do
      {:ok, page} = Wiki.create_page(%{title: "Portland City Council", body: ""})

      assert page.slug == "portland-city-council"
    end

    test "creates first revision" do
      {:ok, page} = Wiki.create_page(%{title: "Test", body: "Content", author: "anon"})
      page = Wiki.get_page_by_slug!(page.slug)

      assert length(page.revisions) == 1
      revision = hd(page.revisions)
      assert revision.body == "Content"
      assert revision.author == "anon"
    end

    test "fails without title" do
      {:error, changeset} = Wiki.create_page(%{body: "No title"})

      assert %{title: ["can't be blank"]} = errors_on(changeset)
    end

    test "fails with duplicate slug" do
      {:ok, _} = Wiki.create_page(%{title: "Unique Page", body: ""})
      {:error, changeset} = Wiki.create_page(%{title: "Unique Page", body: ""})

      assert %{slug: ["has already been taken"]} = errors_on(changeset)
    end

    test "renders wiki links in HTML" do
      page_fixture(%{title: "Alice"})
      {:ok, page} = Wiki.create_page(%{title: "Links", body: "See [[Alice]] and [[Bob]]."})

      assert page.rendered_html =~ "/wiki/alice"
      assert page.rendered_html =~ "wiki-new"
    end
  end

  describe "update_page/2" do
    test "updates page and creates new revision" do
      page = page_fixture(%{title: "Original"})
      {:ok, updated} = Wiki.update_page(page, %{body: "Updated content"})

      assert updated.body == "Updated content"

      fetched = Wiki.get_page_by_slug!(updated.slug)
      assert length(fetched.revisions) == 2
    end
  end

  describe "delete_page/1" do
    test "deletes the page" do
      page = page_fixture(%{title: "Delete Me"})
      {:ok, _} = Wiki.delete_page(page)

      assert_raise Ecto.NoResultsError, fn ->
        Wiki.get_page_by_slug!(page.slug)
      end
    end
  end

  describe "search_pages/1" do
    test "finds pages by title" do
      page_fixture(%{title: "Portland City Council"})
      page_fixture(%{title: "Salem"})

      results = Wiki.search_pages("Portland")
      assert length(results) == 1
      assert hd(results).title == "Portland City Council"
    end

    test "finds pages by body content" do
      page_fixture(%{title: "Test", body: "The quick brown fox"})

      results = Wiki.search_pages("fox")
      assert length(results) == 1
    end

    test "returns empty for blank query" do
      assert [] = Wiki.search_pages("")
      assert [] = Wiki.search_pages(nil)
    end
  end

  describe "page_exists?/1" do
    test "returns true for existing slug" do
      page_fixture(%{title: "Exists"})
      assert Wiki.page_exists?("exists")
    end

    test "returns false for non-existing slug" do
      refute Wiki.page_exists?("nope")
    end
  end

  describe "rerender_linking_pages/1" do
    test "updates rendered HTML when linked page is created" do
      {:ok, linker} = Wiki.create_page(%{title: "Linker", body: "See [[Target Page]]."})
      assert linker.rendered_html =~ "wiki-new"

      {:ok, _target} = Wiki.create_page(%{title: "Target Page", body: "I exist now."})
      Wiki.rerender_linking_pages("target-page")

      updated = Wiki.get_page_by_slug!("linker")
      refute updated.rendered_html =~ "wiki-new"
      assert updated.rendered_html =~ "/wiki/target-page"
    end
  end
end

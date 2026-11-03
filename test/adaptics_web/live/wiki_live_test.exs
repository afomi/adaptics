defmodule AdapticsWeb.WikiLiveTest do
  use AdapticsWeb.ConnCase

  import Phoenix.LiveViewTest
  import Adaptics.WikiFixtures

  describe "Index" do
    test "lists pages", %{conn: conn} do
      page_fixture(%{title: "Portland City Council"})
      {:ok, _view, html} = live(conn, ~p"/wiki")

      assert html =~ "Wiki"
      assert html =~ "Portland City Council"
    end

    test "shows empty state when no pages", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/wiki")

      assert html =~ "No pages yet"
    end

    test "searches pages", %{conn: conn} do
      page_fixture(%{title: "Portland City Council"})
      page_fixture(%{title: "Salem"})

      {:ok, view, _html} = live(conn, ~p"/wiki")

      html = view |> element("form") |> render_change(%{query: "Portland"})
      assert html =~ "Portland City Council"
      refute html =~ "Salem"
    end
  end

  describe "Show" do
    test "displays a page", %{conn: conn} do
      page = page_fixture(%{title: "Portland", body: "A city in **Oregon**."})
      {:ok, _view, html} = live(conn, ~p"/wiki/#{page.slug}")

      assert html =~ "Portland"
      assert html =~ "<strong>Oregon</strong>"
    end

    test "shows edit and history links", %{conn: conn} do
      page = page_fixture(%{title: "Test Page"})
      {:ok, _view, html} = live(conn, ~p"/wiki/#{page.slug}")

      assert html =~ "Edit"
      assert html =~ "History"
    end

    test "hides edit link on locked page", %{conn: conn} do
      page = page_fixture(%{title: "Locked Page"})
      {:ok, page} = Adaptics.Wiki.update_page(page, %{locked: true})
      {:ok, _view, html} = live(conn, ~p"/wiki/#{page.slug}")

      assert html =~ "locked and cannot be edited"
    end
  end

  describe "Edit - new" do
    test "renders new page form", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/wiki/new")

      assert html =~ "New Page"
      assert html =~ "Title"
      assert html =~ "Body"
    end

    test "pre-fills title from query param", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/wiki/new?title=Portland")

      assert html =~ "Portland"
    end

    test "creates a new page", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/wiki/new")

      view
      |> form("#wiki-page-form", page: %{title: "New Test Page", body: "Hello world"})
      |> render_submit()

      assert_redirect(view, "/wiki/new-test-page")
    end

    test "shows validation errors", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/wiki/new")

      html =
        view
        |> form("#wiki-page-form", page: %{title: "", body: ""})
        |> render_change()

      assert html =~ "can&#39;t be blank"
    end
  end

  describe "Edit - edit" do
    test "renders edit form with existing content", %{conn: conn} do
      page = page_fixture(%{title: "Existing", body: "Old content"})
      {:ok, _view, html} = live(conn, ~p"/wiki/#{page.slug}/edit")

      assert html =~ "Edit: Existing"
      assert html =~ "Old content"
    end

    test "updates the page", %{conn: conn} do
      page = page_fixture(%{title: "Editable"})
      {:ok, view, _html} = live(conn, ~p"/wiki/#{page.slug}/edit")

      view
      |> form("#wiki-page-form", page: %{body: "Updated content"})
      |> render_submit()

      assert_redirect(view, "/wiki/editable")
    end
  end

  describe "History" do
    test "shows revision history", %{conn: conn} do
      page = page_fixture(%{title: "Has History", body: "Version 1"})
      Adaptics.Wiki.update_page(page, %{body: "Version 2"})

      {:ok, _view, html} = live(conn, ~p"/wiki/#{page.slug}/history")

      assert html =~ "History: Has History"
      assert html =~ "Revision #1"
      assert html =~ "Revision #2"
    end
  end
end

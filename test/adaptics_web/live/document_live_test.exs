defmodule AdapticsWeb.DocumentLiveTest do
  use AdapticsWeb.ConnCase

  import Phoenix.LiveViewTest
  import Adaptics.DocumentsFixtures

  describe "Index" do
    test "lists documents", %{conn: conn} do
      doc = document_fixture(%{file_name: "my_report.pdf"})
      {:ok, view, html} = live(conn, ~p"/documents")

      assert html =~ "Documents"
      assert html =~ "my_report.pdf"
      assert html =~ doc.status
    end

    test "shows empty state when no documents", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/documents")
      assert html =~ "No documents uploaded yet"
    end

    test "deletes a document", %{conn: conn} do
      doc = document_fixture(%{file_name: "to_delete.pdf"})
      {:ok, view, html} = live(conn, ~p"/documents")

      assert html =~ "to_delete.pdf"

      view
      |> element(~s{a[data-confirm="Are you sure you want to delete this document?"]})
      |> render_click()

      html = render(view)
      refute html =~ "to_delete.pdf"
    end
  end

  describe "Show" do
    test "displays document details", %{conn: conn} do
      doc = document_fixture(%{file_name: "detail_test.pdf", status: "ready"})
      {:ok, _view, html} = live(conn, ~p"/documents/#{doc.id}")

      assert html =~ "detail_test.pdf"
      assert html =~ "ready"
    end

    test "displays extracted text when available", %{conn: conn} do
      doc = document_fixture(%{extracted_text: "This is the extracted content", status: "ready"})
      {:ok, _view, html} = live(conn, ~p"/documents/#{doc.id}")

      assert html =~ "This is the extracted content"
    end

    test "shows extraction in progress", %{conn: conn} do
      doc = document_fixture(%{status: "extracting"})
      {:ok, _view, html} = live(conn, ~p"/documents/#{doc.id}")

      assert html =~ "Extracting text"
    end

    test "adds an attribute", %{conn: conn} do
      doc = document_fixture()
      {:ok, view, _html} = live(conn, ~p"/documents/#{doc.id}")

      view
      |> form("form[phx-submit='save_attribute']", %{
        "document_attribute" => %{"key" => "author", "value" => "Jane Doe"}
      })
      |> render_submit()

      html = render(view)
      assert html =~ "author"
      assert html =~ "Jane Doe"
    end

    test "displays existing attributes", %{conn: conn} do
      doc = document_fixture()
      document_attribute_fixture(doc, %{key: "title", value: "Test Title"})
      {:ok, _view, html} = live(conn, ~p"/documents/#{doc.id}")

      assert html =~ "title"
      assert html =~ "Test Title"
    end

    test "updates schema type", %{conn: conn} do
      doc = document_fixture()
      {:ok, view, _html} = live(conn, ~p"/documents/#{doc.id}")

      view
      |> form("form[phx-submit='save_schema_type']", %{
        "schema_type" => "ScholarlyArticle"
      })
      |> render_submit()

      html = render(view)
      assert html =~ "Schema type updated"
    end
  end
end

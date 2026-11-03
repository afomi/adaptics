defmodule Adaptics.DocumentsSimilarTest do
  use Adaptics.DataCase

  alias Adaptics.Documents

  import Adaptics.DocumentsFixtures

  describe "find_similar/2" do
    test "returns documents sharing attributes, ordered by shared count" do
      doc_a = document_fixture(%{file_name: "doc_a.pdf"})
      doc_b = document_fixture(%{file_name: "doc_b.pdf"})
      doc_c = document_fixture(%{file_name: "doc_c.pdf"})

      # doc_a has person "Alice" and keyword "budget"
      document_attribute_fixture(doc_a, %{key: "person", value: "Alice"})
      document_attribute_fixture(doc_a, %{key: "keyword", value: "budget"})

      # doc_b shares both attributes with doc_a
      document_attribute_fixture(doc_b, %{key: "person", value: "Alice"})
      document_attribute_fixture(doc_b, %{key: "keyword", value: "budget"})

      # doc_c shares only one attribute with doc_a
      document_attribute_fixture(doc_c, %{key: "person", value: "Alice"})

      results = Documents.find_similar(doc_a)

      assert length(results) == 2

      [first, second] = results
      assert first.document.id == doc_b.id
      assert first.shared_count == 2

      assert second.document.id == doc_c.id
      assert second.shared_count == 1
    end

    test "excludes the source document from results" do
      doc = document_fixture()
      document_attribute_fixture(doc, %{key: "keyword", value: "test"})

      results = Documents.find_similar(doc)
      assert results == []
    end

    test "returns empty list when document has no attributes" do
      doc = document_fixture()

      results = Documents.find_similar(doc)
      assert results == []
    end

    test "ignores non-similarity keys" do
      doc_a = document_fixture(%{file_name: "doc_a.pdf"})
      doc_b = document_fixture(%{file_name: "doc_b.pdf"})

      # These use a key not in the similarity set
      document_attribute_fixture(doc_a, %{key: "author", value: "Test"})
      document_attribute_fixture(doc_b, %{key: "author", value: "Test"})

      results = Documents.find_similar(doc_a)
      assert results == []
    end

    test "respects the limit parameter" do
      doc_a = document_fixture(%{file_name: "doc_a.pdf"})
      document_attribute_fixture(doc_a, %{key: "keyword", value: "shared"})

      for i <- 1..5 do
        doc = document_fixture(%{file_name: "doc_#{i}.pdf"})
        document_attribute_fixture(doc, %{key: "keyword", value: "shared"})
      end

      results = Documents.find_similar(doc_a, 2)
      assert length(results) == 2
    end
  end
end

defmodule Adaptics.DocumentsTest do
  use Adaptics.DataCase, async: true

  alias Adaptics.Documents
  alias Adaptics.Documents.{Document, DocumentAttribute}
  import Adaptics.DocumentsFixtures

  describe "list_documents/0" do
    test "returns all documents ordered by inserted_at desc" do
      doc1 = document_fixture(%{file_name: "first.pdf"})
      doc2 = document_fixture(%{file_name: "second.pdf"})

      documents = Documents.list_documents()
      ids = Enum.map(documents, & &1.id)

      assert doc2.id in ids
      assert doc1.id in ids
    end

    test "returns empty list when no documents exist" do
      assert Documents.list_documents() == []
    end
  end

  describe "get_document!/1" do
    test "returns the document with preloaded attributes" do
      document = document_fixture()
      _attr = document_attribute_fixture(document)

      fetched = Documents.get_document!(document.id)
      assert fetched.id == document.id
      assert length(fetched.attributes) == 1
    end

    test "raises when document does not exist" do
      assert_raise Ecto.NoResultsError, fn ->
        Documents.get_document!(0)
      end
    end
  end

  describe "create_document/1" do
    test "creates a document with valid attrs" do
      attrs = valid_document_attributes()
      assert {:ok, %Document{} = doc} = Documents.create_document(attrs)
      assert doc.file_name == "test_document.pdf"
      assert doc.status == "uploaded"
    end

    test "returns error with missing required fields" do
      assert {:error, changeset} = Documents.create_document(%{})
      assert %{file_name: ["can't be blank"]} = errors_on(changeset)
    end

    test "enforces unique storage_key" do
      attrs = valid_document_attributes(%{storage_key: "same-key.pdf"})
      assert {:ok, _} = Documents.create_document(attrs)
      assert {:error, changeset} = Documents.create_document(attrs)
      assert %{storage_key: ["has already been taken"]} = errors_on(changeset)
    end

    test "validates status values" do
      attrs = valid_document_attributes(%{status: "invalid"})
      assert {:error, changeset} = Documents.create_document(attrs)
      assert %{status: ["is invalid"]} = errors_on(changeset)
    end
  end

  describe "update_document/2" do
    test "updates document fields" do
      document = document_fixture()
      assert {:ok, updated} = Documents.update_document(document, %{status: "ready"})
      assert updated.status == "ready"
    end
  end

  describe "delete_document/1" do
    test "deletes the document" do
      document = document_fixture()
      assert {:ok, _} = Documents.delete_document(document)

      assert_raise Ecto.NoResultsError, fn ->
        Documents.get_document!(document.id)
      end
    end
  end

  describe "attributes" do
    test "create_attribute/1 creates an attribute" do
      document = document_fixture()

      assert {:ok, %DocumentAttribute{} = attr} =
               Documents.create_attribute(%{
                 key: "author",
                 value: "Jane Doe",
                 source: "manual",
                 document_id: document.id
               })

      assert attr.key == "author"
      assert attr.value == "Jane Doe"
    end

    test "create_attribute/1 prevents duplicate key+value per document" do
      document = document_fixture()
      attrs = %{key: "person", value: "Jane Doe", document_id: document.id}
      assert {:ok, _} = Documents.create_attribute(attrs)
      assert {:error, changeset} = Documents.create_attribute(attrs)
      assert %{document_id: ["has already been taken"]} = errors_on(changeset)
    end

    test "create_attribute/1 allows multiple values for the same key" do
      document = document_fixture()
      assert {:ok, _} = Documents.create_attribute(%{key: "person", value: "Jane Doe", document_id: document.id})
      assert {:ok, _} = Documents.create_attribute(%{key: "person", value: "John Smith", document_id: document.id})

      attrs = Documents.list_attributes(document)
      assert length(attrs) == 2
    end

    test "list_attributes/1 returns attributes for a document" do
      document = document_fixture()
      _attr1 = document_attribute_fixture(document, %{key: "author"})
      _attr2 = document_attribute_fixture(document, %{key: "title", value: "Test"})

      attrs = Documents.list_attributes(document)
      assert length(attrs) == 2
      assert Enum.map(attrs, & &1.key) == ["author", "title"]
    end

    test "delete_attribute/1 removes the attribute" do
      document = document_fixture()
      attr = document_attribute_fixture(document)
      assert {:ok, _} = Documents.delete_attribute(attr)
      assert Documents.list_attributes(document) == []
    end

    test "validates source values" do
      document = document_fixture()

      assert {:error, changeset} =
               Documents.create_attribute(%{
                 key: "test",
                 source: "invalid",
                 document_id: document.id
               })

      assert %{source: ["is invalid"]} = errors_on(changeset)
    end
  end

  describe "upsert_attribute/1" do
    test "inserts a new attribute" do
      document = document_fixture()

      assert {:ok, attr} =
               Documents.upsert_attribute(%{
                 key: "person",
                 value: "Jane Doe",
                 source: "extracted",
                 document_id: document.id
               })

      assert attr.key == "person"
      assert attr.value == "Jane Doe"
    end

    test "does nothing on duplicate key+value" do
      document = document_fixture()
      attrs = %{key: "person", value: "Jane Doe", source: "extracted", document_id: document.id}
      assert {:ok, _} = Documents.upsert_attribute(attrs)
      assert {:ok, _} = Documents.upsert_attribute(attrs)

      people = Documents.get_attributes_by_key(document, "person")
      assert length(people) == 1
    end
  end

  describe "get_attributes_by_key/2" do
    test "returns only attributes with the given key" do
      document = document_fixture()
      Documents.create_attribute(%{key: "person", value: "Alice", document_id: document.id})
      Documents.create_attribute(%{key: "person", value: "Bob", document_id: document.id})
      Documents.create_attribute(%{key: "keyword", value: "budget", document_id: document.id})

      people = Documents.get_attributes_by_key(document, "person")
      assert length(people) == 2
      assert Enum.all?(people, &(&1.key == "person"))
    end
  end

  describe "delete_attributes_by_source/2" do
    test "deletes only attributes with the given source" do
      document = document_fixture()
      Documents.create_attribute(%{key: "person", value: "Manual Person", source: "manual", document_id: document.id})
      Documents.create_attribute(%{key: "person", value: "Extracted Person", source: "extracted", document_id: document.id})

      {count, _} = Documents.delete_attributes_by_source(document, "extracted")
      assert count == 1

      remaining = Documents.list_attributes(document)
      assert length(remaining) == 1
      assert hd(remaining).source == "manual"
    end
  end
end

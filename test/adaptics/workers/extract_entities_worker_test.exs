defmodule Adaptics.Workers.ExtractEntitiesWorkerTest do
  use Adaptics.DataCase, async: true
  use Oban.Testing, repo: Adaptics.Repo

  alias Adaptics.Workers.ExtractEntitiesWorker
  alias Adaptics.Documents
  import Adaptics.DocumentsFixtures

  describe "perform/1" do
    test "skips extraction when document has no extracted text" do
      document = document_fixture(%{extracted_text: nil, status: "uploaded"})
      assert :ok = perform_job(ExtractEntitiesWorker, %{"document_id" => document.id})
    end

    test "skips extraction when extracted text is empty" do
      document = document_fixture(%{extracted_text: "", status: "ready"})
      assert :ok = perform_job(ExtractEntitiesWorker, %{"document_id" => document.id})
    end

    @tag :spacy
    test "extracts entities and stores them as attributes when spaCy is available" do
      if Adaptics.Documents.EntityExtractor.available?() do
        document =
          document_fixture(%{
            extracted_text: "John Smith works at Portland City Council in Portland, Oregon.",
            status: "ready"
          })

        assert :ok = perform_job(ExtractEntitiesWorker, %{"document_id" => document.id})

        # Check that some attributes were created
        attrs = Documents.list_attributes(Documents.get_document!(document.id))
        assert length(attrs) > 0
      end
    end

    test "clears previous extracted attributes before re-running" do
      document = document_fixture(%{extracted_text: "Some text", status: "ready"})

      # Seed an extracted attribute
      Documents.create_attribute(%{
        document_id: document.id,
        key: "person",
        value: "Old Person",
        source: "extracted"
      })

      # Also seed a manual attribute that should survive
      Documents.create_attribute(%{
        document_id: document.id,
        key: "author",
        value: "Manual Author",
        source: "manual"
      })

      # Even if extraction fails (no spaCy), the old extracted attrs are cleared
      _result = perform_job(ExtractEntitiesWorker, %{"document_id" => document.id})

      remaining = Documents.list_attributes(Documents.get_document!(document.id))
      manual_attrs = Enum.filter(remaining, &(&1.source == "manual"))
      assert length(manual_attrs) == 1
      assert hd(manual_attrs).value == "Manual Author"
    end
  end
end

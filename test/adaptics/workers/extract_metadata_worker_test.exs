defmodule Adaptics.Workers.ExtractMetadataWorkerTest do
  use Adaptics.DataCase, async: true
  use Oban.Testing, repo: Adaptics.Repo

  alias Adaptics.Workers.ExtractMetadataWorker
  alias Adaptics.Documents
  import Adaptics.DocumentsFixtures

  @sample_text """
  The Community Development Program has achieved a 95% response rate.
  The Equal Employment Policy governs hiring. The city must provide 30 days notice.
  """

  describe "perform/1" do
    test "skips extraction when document has no extracted text" do
      document = document_fixture(%{extracted_text: nil, status: "uploaded"})
      assert :ok = perform_job(ExtractMetadataWorker, %{"document_id" => document.id})

      attrs = Documents.list_attributes(Documents.get_document!(document.id))
      assert attrs == []
    end

    test "skips extraction when extracted text is empty" do
      document = document_fixture(%{extracted_text: "", status: "ready"})
      assert :ok = perform_job(ExtractMetadataWorker, %{"document_id" => document.id})
    end

    test "extracts and stores metadata attributes" do
      document = document_fixture(%{extracted_text: @sample_text, status: "ready"})
      assert :ok = perform_job(ExtractMetadataWorker, %{"document_id" => document.id})

      attrs = Documents.list_attributes(Documents.get_document!(document.id))
      keys = Enum.map(attrs, & &1.key) |> Enum.uniq()

      assert "program" in keys
      assert "performance_metric" in keys
      assert "policy" in keys
      assert "modal_language" in keys
    end

    test "clears previous metadata attributes before re-running" do
      document = document_fixture(%{extracted_text: @sample_text, status: "ready"})

      # Seed an old metadata attribute
      Documents.create_attribute(%{
        document_id: document.id,
        key: "program",
        value: "Old Stale Program",
        source: "extracted"
      })

      assert :ok = perform_job(ExtractMetadataWorker, %{"document_id" => document.id})

      attrs = Documents.list_attributes(Documents.get_document!(document.id))
      program_values = attrs |> Enum.filter(&(&1.key == "program")) |> Enum.map(& &1.value)

      refute "Old Stale Program" in program_values
    end

    test "preserves manual attributes" do
      document = document_fixture(%{extracted_text: @sample_text, status: "ready"})

      Documents.create_attribute(%{
        document_id: document.id,
        key: "author",
        value: "Manual Author",
        source: "manual"
      })

      assert :ok = perform_job(ExtractMetadataWorker, %{"document_id" => document.id})

      attrs = Documents.list_attributes(Documents.get_document!(document.id))
      manual_attrs = Enum.filter(attrs, &(&1.source == "manual"))
      assert length(manual_attrs) == 1
      assert hd(manual_attrs).value == "Manual Author"
    end

    test "preserves NER attributes from other workers" do
      document = document_fixture(%{extracted_text: @sample_text, status: "ready"})

      Documents.create_attribute(%{
        document_id: document.id,
        key: "person",
        value: "Jane Doe",
        source: "extracted"
      })

      Documents.create_attribute(%{
        document_id: document.id,
        key: "organization",
        value: "Portland City Council",
        source: "extracted"
      })

      assert :ok = perform_job(ExtractMetadataWorker, %{"document_id" => document.id})

      attrs = Documents.list_attributes(Documents.get_document!(document.id))
      ner_attrs = Enum.filter(attrs, &(&1.key in ~w(person organization)))
      assert length(ner_attrs) == 2
    end
  end
end

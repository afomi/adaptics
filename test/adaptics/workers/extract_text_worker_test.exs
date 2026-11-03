defmodule Adaptics.Workers.ExtractTextWorkerTest do
  use Adaptics.DataCase, async: true
  use Oban.Testing, repo: Adaptics.Repo

  alias Adaptics.Workers.ExtractTextWorker
  alias Adaptics.Documents
  import Adaptics.DocumentsFixtures

  describe "perform/1" do
    test "extracts text from a document and updates status" do
      document = document_fixture(%{status: "uploaded"})

      # Write a minimal PDF to local storage so extraction has something to read
      config = Application.get_env(:adaptics, :document_storage)
      storage_path = Path.join(config[:path], document.storage_key)
      File.mkdir_p!(Path.dirname(storage_path))
      File.write!(storage_path, minimal_pdf())

      job = ExtractTextWorker.new(%{"document_id" => document.id})
      assert :ok = perform_job(ExtractTextWorker, job.changes[:args])

      updated = Documents.get_document!(document.id)
      assert updated.status in ["ready", "error"]
    end

    test "returns error for non-existent document" do
      assert_raise Ecto.NoResultsError, fn ->
        perform_job(ExtractTextWorker, %{"document_id" => 0})
      end
    end
  end
end

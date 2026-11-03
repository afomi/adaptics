defmodule Adaptics.Workers.ExtractTextWorker do
  @moduledoc """
  Oban worker that extracts text from uploaded PDF documents using pdftotext.
  On success, enqueues ExtractEntitiesWorker for NER processing.
  """

  use Oban.Worker, queue: :documents, max_attempts: 3

  alias Adaptics.Documents

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"document_id" => document_id}}) do
    document = Documents.get_document!(document_id)

    case Documents.extract_text(document) do
      {:ok, document} ->
        if document.extracted_text && document.extracted_text != "" do
          %{"document_id" => document_id}
          |> Adaptics.Workers.ExtractEntitiesWorker.new()
          |> Oban.insert()

          %{"document_id" => document_id}
          |> Adaptics.Workers.ExtractMetadataWorker.new()
          |> Oban.insert()
        end

        :ok

      {:error, _changeset} ->
        {:error, "text extraction failed"}
    end
  end
end

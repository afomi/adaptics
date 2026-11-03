defmodule Adaptics.Workers.ExtractMetadataWorker do
  @moduledoc """
  Oban worker that extracts structured metadata (programs, metrics, policies,
  modal language) from a document's extracted text using Elixir regex patterns.
  Stores results as document attributes with source "extracted".
  """

  use Oban.Worker, queue: :documents, max_attempts: 3

  alias Adaptics.Documents
  alias Adaptics.Documents.MetadataExtractor

  @metadata_keys ~w(program performance_metric policy modal_language)

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"document_id" => document_id}}) do
    document = Documents.get_document!(document_id)

    if is_nil(document.extracted_text) || document.extracted_text == "" do
      :ok
    else
      run_extraction(document)
    end
  end

  defp run_extraction(document) do
    # Clear only metadata keys before re-running (not NER keys from other workers)
    Documents.delete_attributes_by_keys(document, @metadata_keys, "extracted")

    case MetadataExtractor.extract(document.extracted_text) do
      {:ok, results} ->
        store_results(document, results)
        :ok

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp store_results(document, results) do
    Enum.each(results, fn {key, values} ->
      Enum.each(values, fn value ->
        Documents.upsert_attribute(%{
          document_id: document.id,
          key: key,
          value: value,
          source: "extracted"
        })
      end)
    end)
  end
end

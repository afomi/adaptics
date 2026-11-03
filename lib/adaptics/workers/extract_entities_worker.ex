defmodule Adaptics.Workers.ExtractEntitiesWorker do
  @moduledoc """
  Oban worker that runs Python spaCy NER on a document's extracted text.
  Stores results as document attributes and enqueues geocoding if addresses are found.
  """

  use Oban.Worker, queue: :documents, max_attempts: 3

  alias Adaptics.Documents
  alias Adaptics.Documents.EntityExtractor

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
    # Clear only NER keys before re-running (not metadata keys from other workers)
    Documents.delete_attributes_by_keys(
      document,
      ~w(person organization location keyword geocoded_location),
      "extracted"
    )

    case EntityExtractor.extract(document.extracted_text) do
      {:ok, %{"entities" => entities, "keywords" => keywords}} ->
        store_entities(document, entities)
        store_keywords(document, keywords)
        maybe_enqueue_geocoding(document)
        :ok

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp store_entities(document, entities) do
    Enum.each(entities, fn %{"type" => type, "text" => text} ->
      case EntityExtractor.entity_type_to_key(type) do
        nil ->
          :skip

        key ->
          Documents.upsert_attribute(%{
            document_id: document.id,
            key: key,
            value: text,
            source: "extracted"
          })
      end
    end)
  end

  defp store_keywords(document, keywords) do
    Enum.each(keywords, fn %{"text" => text} ->
      Documents.upsert_attribute(%{
        document_id: document.id,
        key: "keyword",
        value: text,
        source: "extracted"
      })
    end)
  end

  defp maybe_enqueue_geocoding(document) do
    geocoding_config = Application.get_env(:adaptics, :geocoding, [])

    if geocoding_config[:enabled] do
      %{"document_id" => document.id}
      |> Adaptics.Workers.GeocodeAddressesWorker.new()
      |> Oban.insert()
    end
  end
end

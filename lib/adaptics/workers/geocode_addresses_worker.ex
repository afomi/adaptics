defmodule Adaptics.Workers.GeocodeAddressesWorker do
  @moduledoc """
  Oban worker that geocodes location entities on a document.
  Stores latitude/longitude as additional attributes.
  Respects Nominatim rate limits (1 req/sec).
  """

  use Oban.Worker, queue: :documents, max_attempts: 3

  alias Adaptics.Documents
  alias Adaptics.Documents.Geocoder

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"document_id" => document_id}}) do
    document = Documents.get_document!(document_id)
    locations = Documents.get_attributes_by_key(document, "location")

    Enum.each(locations, fn attr ->
      case Geocoder.geocode(attr.value) do
        {:ok, %{lat: lat, lon: lon, display_name: display_name}} ->
          Documents.upsert_attribute(%{
            document_id: document.id,
            key: "geocoded_location",
            value: "#{attr.value}|#{lat},#{lon}|#{display_name}",
            source: "extracted"
          })

        {:error, :not_found} ->
          :skip

        {:error, _reason} ->
          :skip
      end

      # Respect Nominatim rate limit: 1 request per second
      Process.sleep(1100)
    end)

    :ok
  end
end

defmodule Adaptics.Workers.GeocodeAddressesWorkerTest do
  use Adaptics.DataCase, async: true
  use Oban.Testing, repo: Adaptics.Repo

  alias Adaptics.Workers.GeocodeAddressesWorker
  alias Adaptics.Documents
  import Adaptics.DocumentsFixtures

  describe "perform/1" do
    test "completes successfully when document has no location attributes" do
      document = document_fixture(%{status: "ready"})
      assert :ok = perform_job(GeocodeAddressesWorker, %{"document_id" => document.id})
    end

    @tag :geocoding
    test "geocodes location attributes and stores results" do
      document = document_fixture(%{status: "ready"})

      Documents.create_attribute(%{
        document_id: document.id,
        key: "location",
        value: "Portland, Oregon",
        source: "extracted"
      })

      assert :ok = perform_job(GeocodeAddressesWorker, %{"document_id" => document.id})

      geocoded = Documents.get_attributes_by_key(document, "geocoded_location")
      assert length(geocoded) == 1
      assert String.contains?(hd(geocoded).value, "Portland")
    end
  end
end

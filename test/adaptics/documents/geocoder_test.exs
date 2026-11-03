defmodule Adaptics.Documents.GeocoderTest do
  use ExUnit.Case, async: true

  alias Adaptics.Documents.Geocoder

  @moduletag :geocoding

  describe "geocode/1" do
    test "returns coordinates for a known location" do
      assert {:ok, result} = Geocoder.geocode("Portland, Oregon")
      assert is_float(result.lat)
      assert is_float(result.lon)
      assert is_binary(result.display_name)
    end

    test "returns not_found for gibberish" do
      assert {:error, :not_found} = Geocoder.geocode("xyzzyplugh99999notaplace")
    end
  end
end

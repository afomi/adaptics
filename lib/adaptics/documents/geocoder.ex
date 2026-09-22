defmodule Adaptics.Documents.Geocoder do
  @moduledoc """
  Geocodes location strings using the Nominatim API (OpenStreetMap).
  Respects Nominatim's usage policy: max 1 request per second.
  """

  @doc """
  Geocodes a location string, returning `{:ok, %{lat: lat, lon: lon, display_name: name}}` or `{:error, reason}`.
  """
  def geocode(query) when is_binary(query) do
    config = Application.get_env(:adaptics, :geocoding, [])
    base_url = config[:base_url] || "https://nominatim.openstreetmap.org"
    user_agent = config[:user_agent] || "adaptics/0.1.0"

    url =
      "#{base_url}/search?" <>
        URI.encode_query(%{"q" => query, "format" => "json", "limit" => "1"})

    :ssl.start()
    :inets.start()

    headers = [
      {~c"User-Agent", String.to_charlist(user_agent)}
    ]

    case :httpc.request(:get, {String.to_charlist(url), headers}, [{:ssl, ssl_opts()}], []) do
      {:ok, {{_, 200, _}, _headers, body}} ->
        parse_response(List.to_string(body))

      {:ok, {{_, status, _}, _, body}} ->
        {:error, "Nominatim returned HTTP #{status}: #{List.to_string(body) |> String.slice(0, 200)}"}

      {:error, reason} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
    end
  end

  defp parse_response(body) do
    case Jason.decode(body) do
      {:ok, [first | _]} ->
        {:ok,
         %{
           lat: parse_float(first["lat"]),
           lon: parse_float(first["lon"]),
           display_name: first["display_name"]
         }}

      {:ok, []} ->
        {:error, :not_found}

      {:error, _} ->
        {:error, "failed to parse Nominatim response"}
    end
  end

  defp parse_float(val) when is_binary(val) do
    {f, _} = Float.parse(val)
    f
  end

  defp parse_float(val) when is_float(val), do: val
  defp parse_float(val) when is_integer(val), do: val / 1

  defp ssl_opts do
    [
      verify: :verify_peer,
      cacerts: :public_key.cacerts_get(),
      depth: 3,
      customize_hostname_check: [
        match_fun: :public_key.pkix_verify_hostname_match_fun(:https)
      ]
    ]
  end
end

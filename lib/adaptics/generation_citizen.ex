defmodule Adaptics.GenerationCitizen do
  @moduledoc """
  Schema contract and helpers for Generation Citizen org nodes.

  Orgs are stored as Nodes in a Space with slug "generation-citizen".
  Domain-specific attributes are stored in the `metadata` jsonb field.

  ## Node field mapping

  | Node field   | GC meaning                                      |
  |---|---|
  | name         | Organization name                               |
  | kind         | "org"                                           |
  | metadata     | See keys below                                  |

  ## metadata keys

  | Key          | Type       | Notes                                    |
  |---|---|---|
  | website      | string     | Homepage URL                             |
  | logo         | string     | Logo image URL                           |
  | org_type     | string     | e.g. "nonprofit", "government", "school" |
  | values       | [string]   | Organizational values                    |
  | programs     | [string]   | Program names offered                    |
  | regions      | [string]   | Geographic regions served                |
  | populations  | [string]   | Population groups served                 |
  | address      | string     | Street address (for geo map)             |
  | lat          | float      | Latitude (populated after geocoding)     |
  | lng          | float      | Longitude (populated after geocoding)    |
  """

  alias Adaptics.Spaces
  alias Adaptics.Repo
  alias Adaptics.Space

  @space_slug "generation-citizen"

  @doc """
  Returns (or creates) the Generation Citizen space.
  """
  def get_or_create_space do
    case Repo.get_by(Space, slug: @space_slug) do
      nil ->
        {:ok, space} = Spaces.create_space(%{
          name: "Generation Citizen",
          slug: @space_slug,
          status: "published"
        })
        space
      space ->
        space
    end
  end

  @doc """
  Builds node attrs from a flat org map (e.g. parsed from CSV).

  Expected keys (string or atom):
    name, website, logo, org_type, values, programs, regions, populations, address

  Multi-value fields accept either a list or a comma-separated string.
  """
  def org_attrs(org, x \\ 0.0, y \\ 0.0) do
    %{
      "name"        => get(org, "name") || get(org, "Organization Name") || "Unknown",
      "kind"        => "org",
      "x"           => x,
      "y"           => y,
      "metadata"    => %{
        "website"     => get(org, "website") || get(org, "Website") || "",
        "logo"        => get(org, "logo") || get(org, "Logo") || "",
        "org_type"    => get(org, "org_type") || get(org, "Type") || "",
        "values"      => parse_list(org, ["values", "Values"]),
        "programs"    => parse_list(org, ["programs", "Programs"]),
        "regions"     => parse_list(org, ["regions", "Regions Served", "Region"]),
        "populations" => parse_list(org, ["populations", "Populations Served", "Population"]),
        "address"     => get(org, "address") || get(org, "Address") || "",
        "lat"         => nil,
        "lng"         => nil,
      }
    }
  end

  @doc """
  Returns filter_config for a Projection given keyword filter criteria.

  Example:
    filter_for(org_types: ["nonprofit"], regions: ["Portland"])
  """
  def filter_for(criteria) do
    Enum.reduce(criteria, %{}, fn
      {:org_types, types}, acc when types != [] ->
        Map.put(acc, "metadata_org_type", types)
      {:regions, regions}, acc when regions != [] ->
        Map.put(acc, "metadata_regions", regions)
      {:populations, pops}, acc when pops != [] ->
        Map.put(acc, "metadata_populations", pops)
      {:programs, progs}, acc when progs != [] ->
        Map.put(acc, "metadata_programs", progs)
      {:values, vals}, acc when vals != [] ->
        Map.put(acc, "metadata_values", vals)
      _, acc ->
        acc
    end)
  end

  # ── Private helpers ────────────────────────────────────────────────────────

  defp get(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, String.to_atom(key))
  end

  defp parse_list(map, keys) do
    raw = Enum.find_value(keys, fn k -> get(map, k) end)
    case raw do
      nil -> []
      list when is_list(list) -> list
      str when is_binary(str) ->
        str |> String.split(~r/[,;|]/) |> Enum.map(&String.trim/1) |> Enum.reject(&(&1 == ""))
    end
  end
end

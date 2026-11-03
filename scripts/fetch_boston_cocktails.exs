# One-off: vendor the Mr. Boston cocktail dataset (via tidytuesday 2020-05-26)
# as normalized per-drink JSON.
#
#   mix run scripts/fetch_boston_cocktails.exs
#
# Downloads the long-format CSV (one row per drink-ingredient), groups rows by
# drink, and writes one file per drink to priv/data/cocktails/boston/.
# Output is committed; nothing fetches this URL at runtime.
# License is informal (scraped from the Mr. Boston Bartender's Guide) — see
# priv/data/cocktails/ATTRIBUTION.md.

csv_url =
  "https://raw.githubusercontent.com/rfordatascience/tidytuesday/main/data/2020/2020-05-26/boston_cocktails.csv"

out_dir = Path.join(["priv", "data", "cocktails", "boston"])

slugify = fn name ->
  name
  |> String.downcase()
  |> String.normalize(:nfd)
  |> String.replace(~r/[^a-z0-9]+/, "-")
  |> String.trim("-")
end

# Minimal RFC4180 parser — ingredient strings contain quoted commas, so plain
# String.split(",") would corrupt rows. Not worth a CSV dep for a one-off.
parse_csv = fn text ->
  parse_row = fn parse_row, rest, field, row ->
    case rest do
      "" -> {Enum.reverse([field | row]), ""}
      "\r\n" <> rest -> {Enum.reverse([field | row]), rest}
      "\n" <> rest -> {Enum.reverse([field | row]), rest}
      "," <> rest -> parse_row.(parse_row, rest, "", [field | row])
      "\"" <> rest when field == "" ->
        # quoted field: consume through the closing quote ("" escapes a quote)
        {quoted, rest} =
          Enum.reduce_while(Stream.cycle([nil]), {"", rest}, fn _, {acc, r} ->
            case r do
              "\"\"" <> r -> {:cont, {acc <> "\"", r}}
              "\"" <> r -> {:halt, {acc, r}}
              <<c::utf8, r::binary>> -> {:cont, {acc <> <<c::utf8>>, r}}
            end
          end)

        parse_row.(parse_row, rest, quoted, row)
      <<c::utf8, rest::binary>> -> parse_row.(parse_row, rest, field <> <<c::utf8>>, row)
    end
  end

  Stream.unfold(String.trim_trailing(text, "\n") <> "\n", fn
    "" -> nil
    rest -> parse_row.(parse_row, rest, "", [])
  end)
  |> Enum.to_list()
end

IO.puts("Fetching #{csv_url} ...")
%{status: 200, body: body} = Req.get!(csv_url, decode_body: false)

[header | rows] = parse_csv.(body)
["name", "category", "row_id", "ingredient_number", "ingredient", "measure"] = header

drinks =
  rows
  |> Enum.map(fn [name, category, _row_id, ingredient_number, ingredient, measure] ->
    %{
      name: name,
      category: category,
      number: String.to_integer(ingredient_number),
      ingredient: ingredient,
      measure: measure
    }
  end)
  |> Enum.group_by(& &1.name)

File.mkdir_p!(out_dir)

{written, _seen} =
  Enum.reduce(Enum.sort_by(drinks, fn {name, _} -> name end), {[], MapSet.new()}, fn
    {name, rows}, {written, seen} ->
      base = slugify.(name)

      slug =
        Enum.find(Stream.map(Stream.iterate(1, &(&1 + 1)), fn
          1 -> base
          n -> "#{base}-#{n}"
        end), &(!MapSet.member?(seen, &1)))

      normalized = %{
        slug: slug,
        name: name,
        source: "boston",
        category: rows |> List.first() |> Map.fetch!(:category),
        description: nil,
        keywords: [],
        ingredients:
          for row <- Enum.sort_by(rows, & &1.number) do
            %{name: row.ingredient, quantity: nil, measure: row.measure}
          end
      }

      path = Path.join(out_dir, slug <> ".json")
      File.write!(path, Jason.encode!(normalized, pretty: true))
      {[path | written], MapSet.put(seen, slug)}
  end)

# Explicit success: files decode, drink count matches the grouped CSV.
reread = Enum.map(written, fn path -> path |> File.read!() |> Jason.decode!() end)

if length(reread) != map_size(drinks) do
  raise "wrote #{length(reread)} files but CSV has #{map_size(drinks)} drinks"
end

if Enum.any?(reread, &(&1["ingredients"] == [])), do: raise("drink with no ingredients")

IO.puts("OK: wrote #{length(reread)} drinks to #{out_dir} (#{length(rows)} CSV rows)")

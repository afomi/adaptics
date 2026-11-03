# One-off: vendor alfg/opendrinks (MIT) as normalized per-drink JSON.
#
#   mix run scripts/fetch_opendrinks.exs
#
# Downloads the repo tarball, extracts src/recipes/*.json in memory, and
# writes one normalized file per drink to priv/data/cocktails/opendrinks/.
# Output is committed; nothing fetches this URL at runtime.

tarball_url = "https://codeload.github.com/alfg/opendrinks/tar.gz/refs/heads/master"
out_dir = Path.join(["priv", "data", "cocktails", "opendrinks"])

slugify = fn name ->
  name
  |> String.downcase()
  |> String.normalize(:nfd)
  |> String.replace(~r/[^a-z0-9]+/, "-")
  |> String.trim("-")
end

IO.puts("Fetching #{tarball_url} ...")
%{status: 200, body: body} = Req.get!(tarball_url, decode_body: false)

{:ok, files} = :erl_tar.extract({:binary, body}, [:memory, :compressed])

recipes =
  for {path, content} <- files,
      path = List.to_string(path),
      String.contains?(path, "/src/recipes/"),
      String.ends_with?(path, ".json"),
      do: {Path.basename(path, ".json"), content}

if recipes == [], do: raise("no recipes found in tarball — layout changed?")

File.mkdir_p!(out_dir)

written =
  for {slug_from_file, content} <- recipes do
    raw = Jason.decode!(content)

    slug = slugify.(raw["name"] || slug_from_file)

    normalized = %{
      slug: slug,
      name: raw["name"],
      source: "opendrinks",
      category: nil,
      description: raw["description"],
      keywords: raw["keywords"] || [],
      ingredients:
        for ing <- raw["ingredients"] || [] do
          %{
            name: ing["ingredient"],
            quantity: ing["quantity"],
            measure: ing["measure"]
          }
        end
    }

    path = Path.join(out_dir, slug <> ".json")
    File.write!(path, Jason.encode!(normalized, pretty: true))
    path
  end

# Explicit success: every written file decodes and has a name + ingredients.
reread =
  for path <- written do
    drink = path |> File.read!() |> Jason.decode!()
    if drink["name"] in [nil, ""], do: raise("#{path}: missing name")
    drink
  end

with_ingredients = Enum.count(reread, &(&1["ingredients"] != []))

IO.puts("OK: wrote #{length(written)} drinks to #{out_dir}")
IO.puts("    #{with_ingredients} have at least one ingredient")

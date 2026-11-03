defmodule Mix.Tasks.Adaptics.Topics do
  @shortdoc "Fit topic models (k-means + c-TF-IDF + 3D PCA) over a space's embeddings"

  @moduledoc """
  Fits a topic model per embedding model for a space (FC2.21) and reports the
  topics with their cross-city composition — the "like ordinances between
  cities near each other" check: a healthy topic mixes both cities.

      mix adaptics.topics
      mix adaptics.topics --space muni-codes --k 14

  Requires embeddings already stored (mix adaptics.triangulate). Pure math,
  no Ollama needed. Idempotent: refitting replaces the stored model.
  """

  use Mix.Task

  alias Adaptics.Semantic

  @impl Mix.Task
  def run(args) do
    {opts, _, _} = OptionParser.parse(args, strict: [space: :string, k: :integer])
    Mix.Task.run("app.start")

    space_slug = Keyword.get(opts, :space, Adaptics.MuniCodes.space_slug())
    k = Keyword.get(opts, :k, 14)
    space = Adaptics.Spaces.get_space_by_slug!(space_slug)
    info = &Mix.shell().info/1

    nodes = Adaptics.Spaces.list_nodes_for_space(space)
    city_of = Map.new(nodes, &{&1.id, &1.metadata["city"]})
    name_of = Map.new(nodes, &{&1.id, &1.name})

    models = embedding_models(space)

    if models == [] do
      Mix.raise("No node_embeddings for #{space.slug} — run mix adaptics.triangulate first")
    end

    for model <- models do
      {:ok, fitted} = Semantic.fit_topic_model(space, model, k)
      info.("")
      info.("TOPICS #{space.slug} × #{model} (k=#{fitted.k}, #{map_size(fitted.placements)} records):")
      report(fitted, city_of, name_of, info)
    end

    info.("")
    info.("TOPIC MODELS DONE — /topo/#{space.slug} Topics mode now shows the atlas")
  end

  defp embedding_models(space) do
    import Ecto.Query

    Adaptics.Repo.all(
      from e in Adaptics.Semantic.NodeEmbedding,
        join: n in Adaptics.Visual.Node,
        on: n.id == e.node_id,
        where: n.space_id == ^space.id,
        distinct: true,
        select: e.model
    )
    |> Enum.sort()
  end

  defp report(fitted, city_of, name_of, info) do
    members_by_topic =
      fitted.placements
      |> Enum.group_by(fn {_id, p} -> p["topic"] end, fn {id, _p} -> String.to_integer(id) end)

    mixed =
      Enum.count(members_by_topic, fn {_t, ids} ->
        ids |> Enum.map(&city_of[&1]) |> Enum.uniq() |> length() > 1
      end)

    info.("  #{mixed} of #{map_size(members_by_topic)} topics span both cities")

    fitted.topics
    |> Enum.sort_by(fn {_c, t} -> -t["size"] end)
    |> Enum.each(fn {cluster, topic} ->
      ids = Map.get(members_by_topic, String.to_integer(cluster), [])
      cities = ids |> Enum.frequencies_by(&city_of[&1])
      city_summary = Enum.map_join(cities, ", ", fn {c, n} -> "#{c}: #{n}" end)
      example = ids |> Enum.sort() |> List.first()

      info.("  [#{topic["size"]}] #{topic["label"]}  (#{city_summary})")
      if example, do: info.("      e.g. #{name_of[example]}")
    end)
  end
end

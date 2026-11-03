defmodule Mix.Tasks.Adaptics.Triangulate do
  @shortdoc "Embed + score a space under multiple embedding models and report cross-model agreement"

  @moduledoc """
  Surveys the same records with several embedding models (FC2.20), then
  reports (a) Platonic-Representation-Hypothesis-style mutual k-NN alignment
  between each model pair and the records where their neighborhoods disagree
  most, and (b) per-axis score disagreements.

      mix adaptics.triangulate
      mix adaptics.triangulate --space muni-codes --models "qwen3-embedding:8b,nomic-embed-text" --k 10

  Requires Ollama running with the models pulled. Idempotent: embeddings and
  scores upsert; already-embedded (node, model) pairs are skipped.
  """

  use Mix.Task

  alias Adaptics.Semantic
  alias Adaptics.Semantic.Triangulation

  @default_models "qwen3-embedding:8b,nomic-embed-text"

  @impl Mix.Task
  def run(args) do
    {opts, _, _} = OptionParser.parse(args, strict: [space: :string, models: :string, k: :integer])
    Mix.Task.run("app.start")

    space_slug = Keyword.get(opts, :space, Adaptics.MuniCodes.space_slug())
    models = opts |> Keyword.get(:models, @default_models) |> String.split(",") |> Enum.map(&String.trim/1)
    k = Keyword.get(opts, :k, 10)

    space = Adaptics.Spaces.get_space_by_slug!(space_slug)
    axes = Semantic.list_axes()
    info = &Mix.shell().info/1

    # ── Survey: embed + axis vectors + scores per model ────────────────────
    for model <- models do
      survey_model(space, axes, model, info)
    end

    # ── Report: PRH mutual k-NN alignment per model pair ───────────────────
    names =
      space
      |> Adaptics.Spaces.list_nodes_for_space()
      |> Map.new(&{&1.id, &1.name})

    for [model_a, model_b] <- pairs(models) do
      report_pair(space, axes, names, model_a, model_b, k, info)
    end

    info.("")
    info.("TRIANGULATION DONE — layers on /topo/#{space.slug} can now stack the same axes under different models")
  end

  defp report_pair(space, axes, names, model_a, model_b, k, info) do
    embeddings_a = Triangulation.embeddings_for_space(space, model_a)
    embeddings_b = Triangulation.embeddings_for_space(space, model_b)
    alignment = Triangulation.mutual_knn_alignment(embeddings_a, embeddings_b, k)

    info.("")
    info.(
      "ALIGNMENT #{model_a} vs #{model_b}: mean mutual #{alignment.k}-NN overlap " <>
        "#{Float.round(alignment.mean, 3)} over #{alignment.count} records"
    )

    info.("  least-aligned records (neighborhoods the models disagree about):")

    alignment.per_record
    |> Enum.sort_by(&elem(&1, 1))
    |> Enum.take(10)
    |> Enum.each(fn {id, overlap} -> info.("    #{Float.round(overlap, 2)}  #{names[id]}") end)

    for axis <- axes, Semantic.axis_vector_for(Semantic.get_axis!(axis.id), model_a) do
      report_axis_disagreement(space, axis, model_a, model_b, info)
    end
  end

  defp report_axis_disagreement(space, axis, model_a, model_b, info) do
    top = Triangulation.axis_disagreement(space, axis, model_a, model_b) |> Enum.take(5)

    if top != [] do
      info.("  #{axis.name} — largest score disagreements (#{shorten(model_a)} minus #{shorten(model_b)}):")
      Enum.each(top, fn d -> info.("    #{sign(d.delta)}#{Float.round(abs(d.delta), 3)}  #{d.name}") end)
    end
  end

  defp survey_model(space, axes, model, info) do
    {:ok, embed} = Semantic.embed_space_with_model(space, model, batch_size: 8, timeout: 300_000)
    info.("EMBEDDED #{space.slug} × #{model}: #{embed.embedded} new, #{embed.failed} failed")

    if embed.failed > 0 do
      Mix.raise("Embedding failures under #{model} — is Ollama running with the model pulled?")
    end

    for axis <- axes do
      axis = ensure_variant(Semantic.get_axis!(axis.id), model, info)
      {:ok, scored} = Semantic.score_nodes_with_model(axis, model, space_id: space.id)
      info.("  scored #{axis.name}: #{scored.scored} records")
    end
  end

  defp ensure_variant(axis, model, info) do
    if Semantic.axis_vector_for(axis, model) do
      axis
    else
      {:ok, computed} = Semantic.compute_axis_variant(axis, model)
      info.("  axis #{axis.name} surveyed by #{model}")
      computed
    end
  end

  defp pairs(models) do
    for {a, i} <- Enum.with_index(models), {b, j} <- Enum.with_index(models), i < j, do: [a, b]
  end

  defp shorten(model), do: model |> String.split(":") |> hd()
  defp sign(delta), do: if(delta >= 0, do: "+", else: "−")
end

defmodule Adaptics.Transcripts.Workflow do
  @moduledoc """
  A local semantic axis: how we work (negative) ↔ what we work on (positive).

  Uses the same centroid-difference direction as Semantic axes, centered at
  the midpoint of the two poles. Scores are signed distances, not probabilities.
  Anchors are versioned and cached per model alongside transcript vectors.
  """
  alias Adaptics.Semantic.VectorMath
  alias Adaptics.Transcripts.Embeddings

  @cache "_axes/workflow-v1"
  @workflow [
    "What is the current status? Anything remaining?",
    "Start working on this and keep going until you are done.",
    "Commit and push the changes, then hand off to the inbox.",
    "Continue from where we left off in the previous session.",
    "Run the tests and tell me when everything passes.",
    "Please summarize the work and prepare a handoff for the next agent.",
    "Yes, proceed with your plan.",
    "How far along are you? What is taking so long?"
  ]
  @subject [
    "The jurisdiction counts look too high; some records may be duplicates.",
    "Officials need headshots and avatars on their profile pages.",
    "Model the relationship between seats, electorates and elected officials.",
    "Authentication tokens should expire when a user signs out.",
    "Rename the service and make its feature flags consistent.",
    "The Docker containers need to connect to the database through AWS SSM.",
    "Show related transcript turns from other sessions using embeddings.",
    "Plot topics over time in a three dimensional map."
  ]

  # Below about -0.04 turns are nearly all workflow; just under 0 real subject
  # matter still appears, so the line sits a little on the workflow side.
  @cutoff -0.03
  def cutoff, do: @cutoff

  def cache_path(model), do: Embeddings.cache_path(@cache, model)

  def anchors do
    for {pole, texts} <- [workflow: @workflow, subject: @subject],
        {text, index} <- Enum.with_index(texts),
        into: %{} do
      {"#{pole}-#{index}", text}
    end
  end

  def prepare(model) do
    with {:ok, vectors, _stats} <- Embeddings.embed(@cache, model: model, texts: anchors()) do
      {:ok, from_vectors(vectors)}
    end
  end

  # Read only: the session browser never needs a running embedding backend.
  def cached(model) do
    vectors = Embeddings.cached(@cache, model: model, texts: anchors())
    if map_size(vectors) == map_size(anchors()), do: from_vectors(vectors)
  end

  defp from_vectors(vectors) do
    pole = fn name ->
      vectors
      |> Enum.filter(fn {id, _} -> String.starts_with?(id, name <> "-") end)
      |> Enum.map(fn {_, vector} -> VectorMath.normalize(vector) end)
      |> VectorMath.centroid()
    end

    subject = pole.("subject")
    workflow = pole.("workflow")
    direction = subject |> VectorMath.subtract(workflow) |> VectorMath.normalize()

    midpoint =
      (VectorMath.dot_product(subject, direction) + VectorMath.dot_product(workflow, direction)) /
        2

    %{direction: direction, midpoint: midpoint}
  end

  def score(vector, axis) do
    VectorMath.dot_product(VectorMath.normalize(vector), axis.direction) - axis.midpoint
  end

  def scores(vectors, axis),
    do: Map.new(vectors, fn {id, vector} -> {id, score(vector, axis)} end)

  def content(vectors, scores, threshold \\ @cutoff) do
    Map.filter(vectors, fn {id, _} -> scores[id] >= threshold end)
  end
end

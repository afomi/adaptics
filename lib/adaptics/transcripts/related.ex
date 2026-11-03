defmodule Adaptics.Transcripts.Related do
  @moduledoc "Cached nearest turns from other sessions in the same project."
  alias Adaptics.Semantic.VectorMath
  alias Adaptics.Transcripts.{Embeddings, Snapshot, Workflow}

  def load(slug, opts \\ []) do
    Snapshot.fetch(slug, "related", opts, fn -> build(slug, opts) end)
  end

  defp build(slug, opts) do
    model = Keyword.get(opts, :model, Adaptics.Embeddings.model())
    records = Embeddings.turn_records(slug, include_control: true)
    texts = Map.new(records, fn {id, turn} -> {id, turn.text} end)
    vectors = Embeddings.cached(slug, model: model, texts: texts)
    axis = Workflow.cached(model)

    vectors =
      if axis,
        do: vectors,
        else: Map.filter(vectors, fn {id, _} -> Embeddings.classify(texts[id]) == :content end)

    %{
      texts: texts,
      records: records,
      vectors: vectors,
      scores: if(axis, do: Workflow.scores(vectors, axis), else: %{}),
      model: model
    }
  end

  @doc "Excludes the source session and repeated text; similarity is cosine, not confidence."
  def nearest(index, id, limit \\ 5) do
    cond do
      not Map.has_key?(index.vectors, id) -> {:error, :not_embedded}
      Map.get(index.scores, id, 0.0) < 0 -> {:error, :workflow}
      true -> {:ok, rank(index, id, limit)}
    end
  end

  defp rank(index, id, limit) do
    session = id |> String.split("#") |> hd()
    source_text = normalize_text(index.texts[id])
    source_vector = index.vectors[id]

    index.vectors
    |> Enum.reject(fn {other, vector} ->
      String.starts_with?(other, session <> "#") or
        normalize_text(index.texts[other]) == source_text or
        Map.get(index.scores, other, 0.0) < 0 or
        length(vector) != length(source_vector)
    end)
    |> Enum.map(fn {other, vector} ->
      {session_id, turn} = other |> String.split("#", parts: 2) |> List.to_tuple()

      %{
        id: other,
        session_id: session_id,
        number: String.to_integer(turn),
        text: index.texts[other],
        similarity: VectorMath.cosine_similarity(source_vector, vector)
      }
    end)
    |> Enum.sort_by(&{-&1.similarity, &1.id})
    |> Enum.uniq_by(&normalize_text(&1.text))
    |> Enum.take(max(limit, 0))
  end

  defp normalize_text(text), do: text |> String.trim() |> String.replace(~r/\s+/u, " ")
end

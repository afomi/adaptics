defmodule Adaptics.Transcripts.Atlas do
  @moduledoc "A stable topic projection of cached turns, with source timestamps."
  alias Adaptics.Transcripts.{Embeddings, Related, Snapshot, Workflow}

  def load(slug, opts \\ []) do
    k = Keyword.get(opts, :k, 10)
    Snapshot.fetch(slug, "atlas-#{k}", opts, fn -> build(slug, opts) end)
  end

  defp build(slug, opts) do
    index = Related.load(slug, opts)

    vectors =
      if map_size(index.scores) > 0,
        do: Workflow.content(index.vectors, index.scores),
        else: index.vectors

    # Re-sent prompts have one point; their original turns remain in the reader.
    vectors =
      vectors
      |> Enum.sort_by(&elem(&1, 0))
      |> Enum.uniq_by(fn {id, _} -> index.texts[id] end)
      |> Map.new()

    fit = Embeddings.topics(vectors, index.texts, Keyword.get(opts, :k, 10))

    points =
      for {id, position} <- Enum.sort(fit.placements) do
        record = index.records[id]

        %{
          id: id,
          text: record.text,
          title: record.title,
          session_id: record.session_id,
          number: record.number,
          at: timestamp(record.at),
          position: position,
          topic: fit.assignments[id]
        }
      end

    %{
      points: points,
      topics: fit.topics,
      model: index.model,
      index: index,
      dimensions: vectors |> Map.values() |> List.first([]) |> length(),
      indexed: map_size(index.vectors),
      total: map_size(index.texts),
      workflow_filtered: map_size(index.scores) > 0
    }
  end

  defp timestamp(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> DateTime.to_unix(dt, :millisecond)
      _ -> nil
    end
  end

  defp timestamp(_), do: nil
end

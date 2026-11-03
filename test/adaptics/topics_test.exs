defmodule Adaptics.Semantic.TopicsTest do
  use Adaptics.DataCase

  alias Adaptics.Semantic
  alias Adaptics.Semantic.Topics
  alias Adaptics.Spaces

  # Two well-separated blobs in 3D.
  defp blob_embeddings do
    %{
      1 => [1.0, 0.02, 0.0],
      2 => [0.98, 0.0, 0.01],
      3 => [0.99, 0.01, 0.02],
      4 => [0.0, 1.0, 0.01],
      5 => [0.01, 0.98, 0.0],
      6 => [0.02, 0.99, 0.02]
    }
  end

  describe "kmeans/2" do
    test "separates two obvious blobs" do
      %{assignments: assignments} = Topics.kmeans(blob_embeddings(), 2)

      first_blob = [assignments[1], assignments[2], assignments[3]]
      second_blob = [assignments[4], assignments[5], assignments[6]]

      assert length(Enum.uniq(first_blob)) == 1
      assert length(Enum.uniq(second_blob)) == 1
      refute hd(first_blob) == hd(second_blob)
    end

    test "is deterministic" do
      assert Topics.kmeans(blob_embeddings(), 3) == Topics.kmeans(blob_embeddings(), 3)
    end

    test "caps k at the record count" do
      %{centroids: centroids} = Topics.kmeans(%{1 => [1.0, 0.0], 2 => [0.0, 1.0]}, 5)
      assert length(centroids) == 2
    end
  end

  describe "pca_3d/1" do
    test "preserves blob structure: within-blob distances < across-blob" do
      placements = Topics.pca_3d(blob_embeddings())

      distance = fn a, b ->
        Enum.zip(placements[a], placements[b])
        |> Enum.map(fn {x, y} -> (x - y) * (x - y) end)
        |> Enum.sum()
        |> :math.sqrt()
      end

      within = distance.(1, 2)
      across = distance.(1, 4)
      assert within < across
    end

    test "output is bounded to [-1, 1] and deterministic" do
      placements = Topics.pca_3d(blob_embeddings())

      for {_id, [x, y, z]} <- placements do
        assert x >= -1.0 and x <= 1.0
        assert y >= -1.0 and y <= 1.0
        assert z >= -1.0 and z <= 1.0
      end

      assert placements == Topics.pca_3d(blob_embeddings())
    end

    test "tiny inputs degrade to the origin" do
      assert Topics.pca_3d(%{1 => [1.0, 0.0]}) == %{1 => [0.0, 0.0, 0.0]}
    end
  end

  describe "label_topics/2" do
    test "picks terms distinctive per cluster, skipping stopwords" do
      assignments = %{1 => 0, 2 => 0, 3 => 1, 4 => 1}

      texts = %{
        1 => "Taxicab permits and the taxicab driver shall carry insurance",
        2 => "Taxicab vehicle inspection and driver permits",
        3 => "Floodplain elevation and the floodplain zone map",
        4 => "Floodplain zone development elevation certificates"
      }

      labels = Topics.label_topics(assignments, texts)

      assert "taxicab" in labels[0].terms
      assert "floodplain" in labels[1].terms
      refute "the" in labels[0].terms
      refute "shall" in labels[0].terms
      assert labels[0].label =~ "taxicab"
    end
  end

  describe "fit/3 and fit_topic_model/3" do
    test "fit combines assignments, placements, and topics" do
      texts = Map.new(1..6, fn id -> {id, "record number #{id} text"} end)
      result = Topics.fit(blob_embeddings(), texts, 2)

      assert map_size(result.assignments) == 6
      assert map_size(result.placements) == 6
      assert map_size(result.topics) == 2
      assert Enum.sum(Enum.map(result.topics, fn {_c, t} -> t.size end)) == 6
    end

    test "fit_topic_model persists and refits idempotently" do
      {:ok, space} = Spaces.create_space(%{name: "Topic Space", slug: "topic-space"})

      nodes =
        for i <- 1..4 do
          {:ok, node} = Spaces.create_node(space, %{"name" => "N#{i}", "metadata" => %{"city" => "x"}})
          node
        end

      for {node, vector} <- Enum.zip(nodes, [[1.0, 0.0], [0.9, 0.1], [0.0, 1.0], [0.1, 0.9]]) do
        Adaptics.Repo.insert!(%Semantic.NodeEmbedding{
          node_id: node.id,
          model: "test-model",
          embedding: vector,
          embedded_at: DateTime.utc_now() |> DateTime.truncate(:second)
        })
      end

      {:ok, fitted} = Semantic.fit_topic_model(space, "test-model", 2)
      assert fitted.k == 2
      assert map_size(fitted.placements) == 4
      placement = fitted.placements[to_string(hd(nodes).id)]
      assert is_integer(placement["topic"])
      assert length(placement["pos"]) == 3

      {:ok, refitted} = Semantic.fit_topic_model(space, "test-model", 2)
      assert refitted.id == fitted.id
      assert length(Semantic.topic_models_for_space(space)) == 1

      assert {:error, :no_embeddings} = Semantic.fit_topic_model(space, "absent-model", 2)
    end
  end
end

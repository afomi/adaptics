defmodule Adaptics.Semantic.TriangulationTest do
  use Adaptics.DataCase

  alias Adaptics.Embeddings.Fake
  alias Adaptics.Semantic
  alias Adaptics.Semantic.Triangulation
  alias Adaptics.Spaces

  describe "mutual_knn_alignment/3 (pure)" do
    test "identical spaces align perfectly" do
      embeddings = %{1 => [1.0, 0.0], 2 => [0.9, 0.1], 3 => [0.0, 1.0], 4 => [-1.0, 0.0]}
      result = Triangulation.mutual_knn_alignment(embeddings, embeddings, 2)
      assert result.mean == 1.0
      assert result.k == 2
      assert result.count == 4
    end

    test "disagreeing neighborhoods score below 1, localized per record" do
      # Model A: 1 and 2 are twins; Model B: 2 has defected to 3's neighborhood.
      a = %{1 => [1.0, 0.0], 2 => [0.99, 0.01], 3 => [0.0, 1.0], 4 => [0.01, 0.99]}
      b = %{1 => [1.0, 0.0], 2 => [0.0, 1.0], 3 => [0.0, 0.99], 4 => [1.0, 0.01]}

      result = Triangulation.mutual_knn_alignment(a, b, 1)
      assert result.mean < 1.0
      assert Enum.any?(result.per_record, fn {_id, overlap} -> overlap < 1.0 end)
    end

    test "uses only shared ids and caps k" do
      a = %{1 => [1.0, 0.0], 2 => [0.0, 1.0], 99 => [1.0, 1.0]}
      b = %{1 => [1.0, 0.0], 2 => [0.0, 1.0], 77 => [1.0, 1.0]}
      result = Triangulation.mutual_knn_alignment(a, b, 10)
      assert result.count == 2
      assert result.k == 1
    end
  end

  describe "multi-model pipeline" do
    setup do
      {:ok, space} = Spaces.create_space(%{name: "Tri Space", slug: "tri-space"})

      for text <- ["wordy one", "wordy two", "terse one", "terse two"] do
        Fake.put(text, if(String.starts_with?(text, "wordy"), do: [1.0, 0.0], else: [-1.0, 0.0]))
      end

      {:ok, axis} =
        Semantic.create_axis(%{
          "name" => "Verbosity",
          "negative_pole" => "concise",
          "positive_pole" => "verbose",
          "negative_examples" => ["terse one", "terse two"],
          "positive_examples" => ["wordy one", "wordy two"]
        })

      {:ok, axis} = Semantic.compute_axis_vector(axis)
      %{space: space, axis: axis}
    end

    test "embed_space_with_model stores per-model rows and skips already-embedded", %{space: space} do
      {:ok, _} = Spaces.create_node(space, %{"name" => "N1"})
      {:ok, _} = Spaces.create_node(space, %{"name" => "N2"})

      {:ok, result} = Semantic.embed_space_with_model(space, "model-a")
      assert result == %{embedded: 2, failed: 0}

      {:ok, result} = Semantic.embed_space_with_model(space, "model-a")
      assert result == %{embedded: 0, failed: 0}

      {:ok, result} = Semantic.embed_space_with_model(space, "model-b")
      assert result == %{embedded: 2, failed: 0}

      assert map_size(Triangulation.embeddings_for_space(space, "model-a")) == 2
      assert map_size(Triangulation.embeddings_for_space(space, "model-b")) == 2
    end

    test "compute_axis_variant stores a per-model vector without touching the primary", %{axis: axis} do
      {:ok, updated} = Semantic.compute_axis_variant(axis, "model-b")

      assert updated.axis_vector == axis.axis_vector
      assert Semantic.axis_vector_for(updated, "model-b") == [1.0, 0.0]
      assert updated.variants["model-b"]["metadata"]["pole_separation"] == -1.0
      assert Semantic.axis_vector_for(updated, Adaptics.Embeddings.model()) == axis.axis_vector
      assert Semantic.axis_vector_for(updated, "unknown-model") == nil
    end

    test "changing anchors clears variants too", %{axis: axis} do
      {:ok, axis} = Semantic.compute_axis_variant(axis, "model-b")
      {:ok, updated} = Semantic.update_axis(axis, %{"positive_examples" => ["brand new", "other new"]})
      assert updated.variants == %{}
      assert updated.axis_vector == nil
    end

    test "score_nodes_with_model scores from that model's embeddings, keyed by model", %{space: space, axis: axis} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "wordy one"})
      {:ok, axis} = Semantic.compute_axis_variant(axis, "model-b")
      {:ok, _} = Semantic.embed_space_with_model(space, "model-b")

      {:ok, result} = Semantic.score_nodes_with_model(axis, "model-b", space_id: space.id)
      assert result.scored == 1

      {_axis, scores} = Semantic.axis_scores(axis.id, [node.id], "model-b")
      assert map_size(scores) == 1

      # Primary-model scores are separate rows; none exist yet.
      {_axis, primary} = Semantic.axis_scores(axis.id, [node.id])
      assert primary == %{}

      assert {:error, _} = Semantic.score_nodes_with_model(axis, "no-such-model", space_id: space.id)
    end

    test "node_scores_for_space keys by model; disagreement ranks deltas", %{space: space, axis: axis} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "wordy one"})
      {:ok, axis} = Semantic.compute_axis_variant(axis, "model-b")
      {:ok, _} = Semantic.embed_space_with_model(space, "model-b")
      {:ok, _} = Semantic.score_nodes_with_model(axis, "model-b", space_id: space.id)
      {:ok, _} = Semantic.score_nodes(axis, space_id: space.id)

      by_model = Semantic.node_scores_for_space(space)[node.id]
      assert Map.has_key?(by_model, "model-b")
      assert Map.has_key?(by_model, Adaptics.Embeddings.model())

      assert Semantic.score_models_for_space(space) |> length() == 2

      [top] = Triangulation.axis_disagreement(space, axis, Adaptics.Embeddings.model(), "model-b")
      assert top.node_id == node.id
      assert is_number(top.delta)
    end
  end
end

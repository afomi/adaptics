defmodule Adaptics.SemanticTest do
  use Adaptics.DataCase

  alias Adaptics.Embeddings.Fake
  alias Adaptics.Semantic
  alias Adaptics.Semantic.VectorMath
  alias Adaptics.Spaces

  describe "VectorMath" do
    test "dot_product with hand-computed vectors" do
      assert VectorMath.dot_product([1.0, 2.0, 3.0], [4.0, 5.0, 6.0]) == 32.0
      assert VectorMath.dot_product([1.0], [1.0, 2.0]) == 0.0
    end

    test "cosine_similarity" do
      assert VectorMath.cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0
      assert VectorMath.cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == -1.0
      assert VectorMath.cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0
      assert VectorMath.cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0
    end

    test "normalize produces unit vectors and passes zero through" do
      normalized = VectorMath.normalize([3.0, 4.0])
      assert_in_delta VectorMath.magnitude(normalized), 1.0, 1.0e-9
      assert normalized == [0.6, 0.8]
      assert VectorMath.normalize([0.0, 0.0]) == [0.0, 0.0]
    end

    test "centroid is the element-wise mean" do
      assert VectorMath.centroid([[1.0, 0.0], [3.0, 2.0]]) == [2.0, 1.0]
      assert VectorMath.centroid([[5.0, 5.0]]) == [5.0, 5.0]
    end

    test "euclidean_distance" do
      assert VectorMath.euclidean_distance([0.0, 0.0], [3.0, 4.0]) == 5.0
    end
  end

  describe "axis CRUD" do
    test "create_axis requires at least 2 anchors per pole" do
      {:error, changeset} =
        Semantic.create_axis(%{
          "name" => "Verbosity",
          "negative_pole" => "concise",
          "positive_pole" => "verbose",
          "negative_examples" => ["short"],
          "positive_examples" => ["long", "wordy"]
        })

      assert changeset.errors[:negative_examples]
    end

    test "create_axis with valid attrs; unique name enforced" do
      assert {:ok, axis} = Semantic.create_axis(valid_axis_attrs())
      assert axis.axis_vector == nil
      assert {:error, changeset} = Semantic.create_axis(valid_axis_attrs())
      assert changeset.errors[:name]
    end

    test "changing anchors invalidates a computed vector" do
      {:ok, axis} = Semantic.create_axis(valid_axis_attrs())
      {:ok, computed} = Semantic.compute_axis_vector(axis)
      assert computed.axis_vector

      {:ok, updated} =
        Semantic.update_axis(computed, %{"positive_examples" => ["totally new", "other new"]})

      assert updated.axis_vector == nil
    end

    test "updating unrelated fields keeps the vector" do
      {:ok, axis} = Semantic.create_axis(valid_axis_attrs())
      {:ok, computed} = Semantic.compute_axis_vector(axis)

      {:ok, updated} = Semantic.update_axis(computed, %{"is_active" => false})
      assert updated.axis_vector == computed.axis_vector
    end
  end

  describe "compute_axis_vector/1" do
    test "axis vector is the normalized difference of pole centroids, with quality metrics" do
      Fake.put("wordy one", [1.0, 0.0])
      Fake.put("wordy two", [1.0, 0.0])
      Fake.put("terse one", [-1.0, 0.0])
      Fake.put("terse two", [-1.0, 0.0])

      {:ok, axis} =
        Semantic.create_axis(%{
          "name" => "Verbosity",
          "negative_pole" => "concise",
          "positive_pole" => "verbose",
          "negative_examples" => ["terse one", "terse two"],
          "positive_examples" => ["wordy one", "wordy two"]
        })

      {:ok, computed} = Semantic.compute_axis_vector(axis)

      assert computed.axis_vector == [1.0, 0.0]
      assert computed.model == Adaptics.Embeddings.model()
      assert computed.metadata["pole_separation"] == -1.0
      assert computed.metadata["positive_spread"] == 0.0
      assert computed.metadata["negative_spread"] == 0.0
      assert computed.metadata["computed_at"]
    end
  end

  describe "node embeddings and scoring" do
    setup do
      {:ok, space} = Spaces.create_space(%{name: "Sem Space", slug: "sem-space"})
      %{space: space}
    end

    test "node_text combines name, description, and metadata values but skips URLs", %{space: space} do
      {:ok, node} =
        Spaces.create_node(space, %{
          "name" => "Org",
          "description" => "A group",
          "metadata" => %{"org_type" => "nonprofit", "regions" => ["east", "west"], "website" => "https://x.org"}
        })

      text = Semantic.node_text(node)
      assert text =~ "Org"
      assert text =~ "A group"
      assert text =~ "nonprofit"
      assert text =~ "east"
      refute text =~ "https://x.org"
    end

    test "creating a node embeds it via the inline Oban worker", %{space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "Embedded on save"})
      reloaded = Spaces.get_node!(node.id)
      assert reloaded.embedding
      assert reloaded.embedded_at
    end

    test "moving a node does not change its embedding timestamp", %{space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "Stay"})
      embedded_at = Spaces.get_node!(node.id).embedded_at

      {:ok, _} = Spaces.update_node(Spaces.get_node!(node.id), %{"x" => 50.0, "y" => 60.0})
      assert Spaces.get_node!(node.id).embedded_at == embedded_at
    end

    test "score_nodes projects embedded nodes and upserts idempotently", %{space: space} do
      Fake.put("wordy one", [1.0, 0.0])
      Fake.put("wordy two", [1.0, 0.0])
      Fake.put("terse one", [-1.0, 0.0])
      Fake.put("terse two", [-1.0, 0.0])

      {:ok, axis} = Semantic.create_axis(valid_axis_attrs())
      {:ok, axis} = Semantic.compute_axis_vector(axis)

      {:ok, a} = Spaces.create_node(space, %{"name" => "A"})
      {:ok, b} = Spaces.create_node(space, %{"name" => "B"})

      set_embedding(a, [0.8, 0.6])
      set_embedding(b, [-0.6, 0.8])

      {:ok, result} = Semantic.score_nodes(axis, space_id: space.id)
      assert result.scored == 2
      assert result.skipped == 0

      {axis_loaded, scores} = Semantic.axis_scores(axis.id, [a.id, b.id])
      assert axis_loaded.id == axis.id
      assert_in_delta scores[a.id], 0.8, 1.0e-9
      assert_in_delta scores[b.id], -0.6, 1.0e-9

      # Idempotent: rescoring keeps one row per [node, axis]
      {:ok, _} = Semantic.score_nodes(axis, space_id: space.id)
      assert Semantic.score_count(axis) == 2
    end

    test "score_nodes counts nodes without embeddings as skipped", %{space: space} do
      Fake.put("wordy one", [1.0, 0.0])
      Fake.put("wordy two", [1.0, 0.0])
      Fake.put("terse one", [-1.0, 0.0])
      Fake.put("terse two", [-1.0, 0.0])

      {:ok, axis} = Semantic.create_axis(valid_axis_attrs())
      {:ok, axis} = Semantic.compute_axis_vector(axis)

      {:ok, a} = Spaces.create_node(space, %{"name" => "NoVec"})
      clear_embedding(a)

      {:ok, result} = Semantic.score_nodes(axis, space_id: space.id)
      assert result.scored == 0
      assert result.skipped == 1
    end

    test "score_nodes on an uncomputed axis errors explicitly" do
      {:ok, axis} = Semantic.create_axis(valid_axis_attrs())
      assert {:error, _} = Semantic.score_nodes(axis, [])
    end
  end

  describe "semantic layout resolve" do
    test "Projections.Axis.resolve/3 kind=semantic uses stored scores" do
      {:ok, space} = Spaces.create_space(%{name: "Resolve Space", slug: "resolve-space"})

      Fake.put("wordy one", [1.0, 0.0])
      Fake.put("wordy two", [1.0, 0.0])
      Fake.put("terse one", [-1.0, 0.0])
      Fake.put("terse two", [-1.0, 0.0])

      {:ok, axis} = Semantic.create_axis(valid_axis_attrs())
      {:ok, axis} = Semantic.compute_axis_vector(axis)

      {:ok, node} = Spaces.create_node(space, %{"name" => "N"})
      set_embedding(node, [1.0, 0.0])
      {:ok, _} = Semantic.score_nodes(axis, space_id: space.id)

      layout = %{
        "kind" => "semantic",
        "x_axis" => %{"axis_id" => axis.id},
        "y_axis" => %{"axis_id" => axis.id}
      }

      resolved = Adaptics.Projections.Axis.resolve(layout, [Spaces.get_node!(node.id)])

      assert resolved["kind"] == "semantic"
      assert resolved["drag_enabled"] == false
      # Single score of 1.0 → fitted domain hugs it, capped at 1.0
      [dmin, dmax] = resolved["x"]["domain"]
      assert_in_delta dmin, 0.98, 1.0e-9
      assert dmax == 1.0
      assert resolved["x"]["label"] == "Verbosity"
      assert resolved["x"]["negative_pole"] == "concise"
      assert_in_delta resolved["x"]["values"][Integer.to_string(node.id)], 1.0, 1.0e-9
    end
  end

  defp valid_axis_attrs do
    %{
      "name" => "Verbosity",
      "negative_pole" => "concise",
      "positive_pole" => "verbose",
      "negative_examples" => ["terse one", "terse two"],
      "positive_examples" => ["wordy one", "wordy two"]
    }
  end

  defp set_embedding(node, vector) do
    node
    |> Ecto.Changeset.change(embedding: vector)
    |> Adaptics.Repo.update!()
  end

  defp clear_embedding(node) do
    # Reload first — the inline embed worker may have written since creation.
    Spaces.get_node!(node.id)
    |> Ecto.Changeset.change(embedding: nil, embedded_at: nil)
    |> Adaptics.Repo.update!()
  end
end

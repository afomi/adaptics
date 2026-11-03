defmodule AdapticsWeb.TopoTest do
  use AdapticsWeb.ConnCase

  alias Adaptics.MuniCodes
  alias Adaptics.Semantic
  alias Adaptics.Spaces

  defp create_computed_axis(name) do
    {:ok, axis} =
      Semantic.create_axis(%{
        "name" => name,
        "negative_pole" => "low",
        "positive_pole" => "high",
        "negative_examples" => ["#{name} neg a", "#{name} neg b"],
        "positive_examples" => ["#{name} pos a", "#{name} pos b"]
      })

    {:ok, computed} = Semantic.compute_axis_vector(axis)
    computed
  end

  test "GET /topo serves records with scores and computed axes", %{conn: conn} do
    space = MuniCodes.get_or_create_space()

    {:ok, node} =
      Spaces.create_node(space, %{
        "name" => "5.14 Taxicabs",
        "metadata" => %{"city" => "vacaville", "chapter" => "5.14", "section_count" => 2}
      })

    axis = create_computed_axis("TestAxis")
    {:ok, _} = Semantic.score_nodes(axis, space_id: space.id)

    response = conn |> get(~p"/topo") |> html_response(200)

    assert response =~ "data-records"
    assert response =~ "5.14 Taxicabs"
    assert response =~ "vacaville"
    assert response =~ "TestAxis"
    assert response =~ "renderTopo"
    # City layer payload with lat/lng from the registry
    assert response =~ "data-cities"
    assert response =~ "38.3566"
    # Models present in the scores (Fake adapter model name from config default)
    assert response =~ "data-models"
    assert response =~ Adaptics.Embeddings.model()
    refute response =~ Integer.to_string(node.id + 999_999)
  end

  test "GET /topo without the space renders empty data", %{conn: conn} do
    response = conn |> get(~p"/topo") |> html_response(200)
    assert response =~ ~s(data-records="[]")
  end

  test "GET /topo/:space_slug uses that space", %{conn: conn} do
    {:ok, space} = Spaces.create_space(%{name: "Other Topo", slug: "other-topo"})
    {:ok, _} = Spaces.create_node(space, %{"name" => "TopoNode", "metadata" => %{"city" => "x"}})
    axis = create_computed_axis("SlugAxis")
    {:ok, _} = Semantic.score_nodes(axis, space_id: space.id)

    response = conn |> get(~p"/topo/other-topo") |> html_response(200)
    assert response =~ "TopoNode"
  end

  test "GET /topo serves stored topic models in data-topics", %{conn: conn} do
    space = MuniCodes.get_or_create_space()
    {:ok, node} = Spaces.create_node(space, %{"name" => "Clustered", "metadata" => %{"city" => "vacaville"}})

    Adaptics.Repo.insert!(%Semantic.NodeEmbedding{
      node_id: node.id,
      model: "test-model",
      embedding: [1.0, 0.0],
      embedded_at: DateTime.utc_now() |> DateTime.truncate(:second)
    })

    {:ok, _} = Semantic.fit_topic_model(space, "test-model", 1)

    response = conn |> get(~p"/topo") |> html_response(200)
    assert response =~ "data-topics"
    assert response =~ "test-model"
    assert response =~ ~s(&quot;placements&quot;)
  end

  test "nodes without scores are excluded from records", %{conn: conn} do
    space = MuniCodes.get_or_create_space()
    {:ok, _} = Spaces.create_node(space, %{"name" => "Unscored", "metadata" => %{"city" => "vacaville"}})
    _axis = create_computed_axis("NoScores")

    response = conn |> get(~p"/topo") |> html_response(200)
    refute response =~ "Unscored"
  end
end

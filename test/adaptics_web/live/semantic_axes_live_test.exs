defmodule AdapticsWeb.SemanticAxesLiveTest do
  use AdapticsWeb.ConnCase

  import Phoenix.LiveViewTest

  alias Adaptics.Semantic
  alias Adaptics.Spaces

  defp valid_axis_params do
    %{
      "name" => "Verbosity",
      "negative_pole" => "concise",
      "positive_pole" => "verbose",
      "negative_examples" => "terse one\nterse two",
      "positive_examples" => "wordy one\nwordy two"
    }
  end

  test "mounts and lists axes", %{conn: conn} do
    {:ok, _} =
      Semantic.create_axis(%{
        "name" => "Existing",
        "negative_pole" => "low",
        "positive_pole" => "high",
        "negative_examples" => ["a", "b"],
        "positive_examples" => ["c", "d"]
      })

    {:ok, _view, html} = live(conn, ~p"/axes")
    assert html =~ "Semantic Axes"
    assert html =~ "Existing"
    assert html =~ "Not computed"
  end

  test "create_axis splits textarea anchors into lists", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/axes")

    html = render_submit(view, "create_axis", %{"axis" => valid_axis_params()})

    assert html =~ "created"
    axis = Semantic.get_axis_by_name("Verbosity")
    assert axis.positive_examples == ["wordy one", "wordy two"]
    assert axis.negative_examples == ["terse one", "terse two"]
  end

  test "create_axis with too few anchors reports an error", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/axes")

    params = Map.put(valid_axis_params(), "positive_examples", "only one")
    html = render_submit(view, "create_axis", %{"axis" => params})

    assert html =~ "not saved"
    assert Semantic.get_axis_by_name("Verbosity") == nil
  end

  test "compute_axis computes the vector and reports metrics", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/axes")
    render_submit(view, "create_axis", %{"axis" => valid_axis_params()})
    axis = Semantic.get_axis_by_name("Verbosity")

    html = render_click(view, "compute_axis", %{"id" => to_string(axis.id)})

    assert html =~ "Computed"
    assert html =~ "pole separation"
    assert Semantic.get_axis!(axis.id).axis_vector
  end

  test "score_nodes embeds and scores the default space's nodes", %{conn: conn} do
    space = Spaces.get_or_create_default_space()
    {:ok, _} = Spaces.create_node(space, %{"name" => "Scoreme"})

    {:ok, view, _html} = live(conn, ~p"/axes")
    render_submit(view, "create_axis", %{"axis" => valid_axis_params()})
    axis = Semantic.get_axis_by_name("Verbosity")
    render_click(view, "compute_axis", %{"id" => to_string(axis.id)})

    html = render_click(view, "score_nodes", %{"id" => to_string(axis.id)})

    assert html =~ "scored 1"
    assert Semantic.score_count(Semantic.get_axis!(axis.id)) == 1
  end

  test "delete_axis removes the axis", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/axes")
    render_submit(view, "create_axis", %{"axis" => valid_axis_params()})
    axis = Semantic.get_axis_by_name("Verbosity")

    html = render_click(view, "delete_axis", %{"id" => to_string(axis.id)})

    assert html =~ "Deleted"
    assert Semantic.get_axis_by_name("Verbosity") == nil
  end

  test "computed axes appear in canvas data-semantic-axes", %{conn: conn} do
    {:ok, axis} =
      Semantic.create_axis(%{
        "name" => "OnCanvas",
        "negative_pole" => "low",
        "positive_pole" => "high",
        "negative_examples" => ["a", "b"],
        "positive_examples" => ["c", "d"]
      })

    {:ok, _} = Semantic.compute_axis_vector(axis)

    {:ok, _view, html} = live(conn, ~p"/canvas")
    assert html =~ "data-semantic-axes"
    assert html =~ "OnCanvas"
  end
end

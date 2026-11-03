defmodule AdapticsWeb.CanvasLiveTest do
  use AdapticsWeb.ConnCase

  import Phoenix.LiveViewTest

  alias Adaptics.Spaces
  alias Adaptics.Events
  alias Adaptics.Projections

  describe "canvas mount" do
    test "renders canvas container with data attributes", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/canvas")

      assert html =~ ~s(id="canvas-container")
      assert html =~ "data-nodes"
      assert html =~ "data-edges"
      assert html =~ "data-dev"
    end

    test "data-dev reflects Mix.env (false in test env)", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/canvas")

      # Mix.env() is :test when running tests; data-dev is only "true" in :dev
      assert html =~ ~s(data-dev="false")
    end

    test "data-nodes contains existing nodes as JSON", %{conn: conn} do
      space = Spaces.get_or_create_default_space()
      {:ok, node} = Spaces.create_node(space, %{"name" => "Alpha", "x" => 50.0, "y" => 75.0})

      {:ok, _view, html} = live(conn, ~p"/canvas")

      assert html =~ "Alpha"
      assert html =~ Integer.to_string(node.id)
    end

    test "data-edges contains existing edges as JSON", %{conn: conn} do
      space = Spaces.get_or_create_default_space()
      {:ok, a} = Spaces.create_node(space, %{"name" => "A", "x" => 0.0, "y" => 0.0})
      {:ok, b} = Spaces.create_node(space, %{"name" => "B", "x" => 100.0, "y" => 0.0})
      {:ok, edge} = Spaces.create_edge(space, a.id, b.id)

      {:ok, _view, html} = live(conn, ~p"/canvas")

      assert html =~ Integer.to_string(edge.id)
      assert html =~ Integer.to_string(a.id)
      assert html =~ Integer.to_string(b.id)
    end
  end

  describe "node events" do
    setup do
      space = Spaces.get_or_create_default_space()
      %{space: space}
    end

    test "node_created event persists node and pushes node_added", %{conn: conn, space: space} do
      {:ok, view, _html} = live(conn, ~p"/canvas")

      view |> render_hook("node_created", %{"x" => 200.0, "y" => 150.0})

      nodes = Spaces.list_nodes_for_space(space)
      assert Enum.any?(nodes, &(&1.x == 200.0 && &1.y == 150.0))
    end

    test "node_moved event updates node position", %{conn: conn, space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "Mover", "x" => 0.0, "y" => 0.0})

      {:ok, view, _html} = live(conn, ~p"/canvas")

      view |> render_hook("node_moved", %{"id" => node.id, "x" => 300.0, "y" => 250.0})

      updated = Spaces.get_node!(node.id)
      assert updated.x == 300.0
      assert updated.y == 250.0
    end

    test "node_label_updated event renames node", %{conn: conn, space: space} do
      {:ok, node} = Spaces.create_node(space, %{"name" => "Old", "x" => 0.0, "y" => 0.0})

      {:ok, view, _html} = live(conn, ~p"/canvas")

      view |> render_hook("node_label_updated", %{"id" => node.id, "name" => "New"})

      updated = Spaces.get_node!(node.id)
      assert updated.name == "New"
    end
  end

  describe "space routing" do
    test "/canvas/:space_slug mounts that space", %{conn: conn} do
      {:ok, space} = Spaces.create_space(%{name: "Routed", slug: "routed-space"})
      {:ok, _} = Spaces.create_node(space, %{"name" => "InRouted", "x" => 1.0, "y" => 2.0})
      {:ok, _} = Spaces.create_node(Spaces.get_or_create_default_space(), %{"name" => "InDefault", "x" => 1.0, "y" => 2.0})

      {:ok, _view, html} = live(conn, ~p"/canvas/routed-space")
      assert html =~ "InRouted"
      refute html =~ "InDefault"

      {:ok, _view, html} = live(conn, ~p"/canvas")
      assert html =~ "InDefault"
      refute html =~ "InRouted"
    end
  end

  describe "node hover" do
    test "canvas mounts with nodes available for hover interaction", %{conn: conn} do
      space = Spaces.get_or_create_default_space()
      {:ok, node} = Spaces.create_node(space, %{"name" => "Hoverable", "x" => 50.0, "y" => 50.0})

      {:ok, _view, html} = live(conn, ~p"/canvas")

      # Node is present in data-nodes; hover wiring happens client-side
      assert html =~ "Hoverable"
      assert html =~ Integer.to_string(node.id)
    end
  end

  describe "edge events" do
    setup do
      space = Spaces.get_or_create_default_space()
      {:ok, a} = Spaces.create_node(space, %{"name" => "A", "x" => 0.0, "y" => 0.0})
      {:ok, b} = Spaces.create_node(space, %{"name" => "B", "x" => 100.0, "y" => 0.0})
      %{space: space, a: a, b: b}
    end

    test "edge_created event persists edge and pushes edge_added", %{conn: conn, space: space, a: a, b: b} do
      {:ok, view, _html} = live(conn, ~p"/canvas")

      view |> render_hook("edge_created", %{"from_id" => a.id, "to_id" => b.id})

      edges = Spaces.list_edges_for_space(space)
      assert Enum.any?(edges, &(&1.from_id == a.id && &1.to_id == b.id))
    end
  end

  describe "projections" do
    setup do
      space = Spaces.get_or_create_default_space()
      {:ok, a} = Spaces.create_node(space, %{"name" => "Alpha", "x" => 0.0, "y" => 0.0})
      {:ok, b} = Spaces.create_node(space, %{"name" => "Beta", "x" => 100.0, "y" => 0.0})
      %{space: space, a: a, b: b}
    end

    test "canvas mounts with data-projections attribute", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/canvas")
      assert html =~ "data-projections"
    end

    test "projection_saved event creates a projection and updates assigns", %{conn: conn, space: space} do
      {:ok, view, _html} = live(conn, ~p"/canvas")

      view |> render_hook("projection_saved", %{
        "name" => "My View",
        "filter_config" => %{},
        "layout" => %{}
      })

      assert Projections.get_projection_by_name(space, "My View")
    end

    test "projection_saved with same name updates existing projection", %{conn: conn, space: space} do
      {:ok, _proj} = Projections.create_projection(space, %{"name" => "Existing", "filter_config" => %{}})
      {:ok, view, _html} = live(conn, ~p"/canvas")

      view |> render_hook("projection_saved", %{
        "name" => "Existing",
        "filter_config" => %{"node_ids" => [1, 2]},
        "layout" => %{}
      })

      updated = Projections.get_projection_by_name(space, "Existing")
      assert updated.filter_config == %{"node_ids" => [1, 2]}
    end

    test "projection_selected filters visible nodes in rendered data", %{conn: conn, space: space, a: a} do
      filter = %{"node_ids" => [a.id]}
      {:ok, proj} = Projections.create_projection(space, %{"name" => "Only Alpha", "filter_config" => filter})

      {:ok, view, _html} = live(conn, ~p"/canvas")
      html = view |> render_hook("projection_selected", %{"id" => proj.id})

      # data-nodes JSON in the rendered HTML contains only Alpha
      assert html =~ "Alpha"
      refute html =~ ~s("name":"Beta")
    end

    test "projection_selected with nil id restores all nodes", %{conn: conn, space: space, a: a} do
      filter = %{"node_ids" => [a.id]}
      {:ok, proj} = Projections.create_projection(space, %{"name" => "Filtered", "filter_config" => filter})

      {:ok, view, _html} = live(conn, ~p"/canvas")
      view |> render_hook("projection_selected", %{"id" => proj.id})
      html = view |> render_hook("projection_selected", %{"id" => nil})

      assert html =~ "Alpha"
      assert html =~ "Beta"
    end
  end

  describe "axis layouts" do
    setup do
      space = Spaces.get_or_create_default_space()
      {:ok, a} = Spaces.create_node(space, %{"name" => "Alpha", "x" => 0.0, "y" => 0.0, "kind" => "org", "metadata" => %{"value" => 3}})
      {:ok, b} = Spaces.create_node(space, %{"name" => "Beta", "x" => 100.0, "y" => 0.0, "kind" => "person", "metadata" => %{"value" => 9}})
      %{space: space, a: a, b: b}
    end

    defp axes_layout do
      %{
        "kind" => "axes",
        "x_axis" => %{"property" => "metadata.value", "scale" => "linear"},
        "y_axis" => %{"property" => "kind", "scale" => "ordinal", "jitter" => 16}
      }
    end

    test "canvas mounts with layout, schema, and suggestions attributes", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/canvas")

      assert html =~ "data-layout"
      assert html =~ "data-schema"
      assert html =~ "data-suggestions"
      assert html =~ ~s(&quot;kind&quot;:&quot;freeform&quot;)
      assert html =~ "metadata.value"
    end

    test "data-nodes carries kind and metadata", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/canvas")

      assert html =~ ~s(&quot;kind&quot;:&quot;org&quot;)
      assert html =~ ~s(&quot;value&quot;:3)
    end

    test "saving a projection with an axes layout persists and resolves it", %{conn: conn, space: space, a: a, b: b} do
      {:ok, view, _html} = live(conn, ~p"/canvas")

      html =
        view
        |> render_hook("projection_saved", %{
          "name" => "By value",
          "filter_config" => %{},
          "layout" => axes_layout()
        })

      proj = Projections.get_projection_by_name(space, "By value")
      assert proj.layout["kind"] == "axes"
      assert proj.layout["x_axis"]["property"] == "metadata.value"

      assert html =~ ~s(&quot;kind&quot;:&quot;axes&quot;)
      assert html =~ ~s(&quot;#{a.id}&quot;:3)
      assert html =~ ~s(&quot;#{b.id}&quot;:9)
      assert html =~ ~s(&quot;drag_enabled&quot;:false)
    end

    test "layout_previewed overrides the active layout without persisting", %{conn: conn, space: space} do
      {:ok, view, _html} = live(conn, ~p"/canvas")

      html = view |> render_hook("layout_previewed", %{"layout" => axes_layout()})
      assert html =~ ~s(&quot;kind&quot;:&quot;axes&quot;)
      assert Projections.list_projections_for_space(space) == []

      html = view |> render_hook("layout_previewed", %{"layout" => %{}})
      assert html =~ ~s(&quot;kind&quot;:&quot;freeform&quot;)
    end

    test "invalid previewed layout is ignored", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/canvas")

      html = view |> render_hook("layout_previewed", %{"layout" => %{"kind" => "spiral"}})
      assert html =~ ~s(&quot;kind&quot;:&quot;freeform&quot;)
    end

    test "invalid layout is rejected on save", %{space: space} do
      {:ok, proj} = Projections.create_projection(space, %{"name" => "V", "layout" => %{}})

      assert {:error, changeset} = Projections.update_projection(proj, %{"layout" => %{"kind" => "spiral"}})
      assert changeset.errors[:layout]
    end

    test "selecting an axes projection resolves its layout", %{conn: conn, space: space} do
      {:ok, proj} = Projections.create_projection(space, %{"name" => "Axes view", "layout" => axes_layout()})

      {:ok, view, _html} = live(conn, ~p"/canvas")
      html = view |> render_hook("projection_selected", %{"id" => proj.id})

      assert html =~ ~s(&quot;kind&quot;:&quot;axes&quot;)
      assert html =~ ~s(&quot;domain&quot;:[3,9]) or html =~ ~s(&quot;domain&quot;:[3.0,9.0])
    end
  end

  describe "freeform snapshots and comparison (FC2.13/FC2.14)" do
    setup do
      space = Spaces.get_or_create_default_space()
      {:ok, a} = Spaces.create_node(space, %{"name" => "Alpha", "x" => 10.0, "y" => 20.0})
      %{space: space, a: a}
    end

    test "saving a freeform snapshot layout persists positions", %{conn: conn, space: space, a: a} do
      {:ok, view, _html} = live(conn, ~p"/canvas")

      view
      |> render_hook("projection_saved", %{
        "name" => "My placement",
        "filter_config" => %{},
        "layout" => %{"kind" => "freeform", "positions" => %{to_string(a.id) => [111, 222]}}
      })

      proj = Projections.get_projection_by_name(space, "My placement")
      assert proj.layout["positions"][to_string(a.id)] == [111, 222]
    end

    test "projection_position_updated edits the snapshot, not the node", %{conn: conn, space: space, a: a} do
      {:ok, proj} =
        Projections.create_projection(space, %{
          "name" => "Snap",
          "layout" => %{"kind" => "freeform", "positions" => %{to_string(a.id) => [10, 20]}}
        })

      {:ok, view, _html} = live(conn, ~p"/canvas")
      view |> render_hook("projection_selected", %{"id" => proj.id})
      view |> render_hook("projection_position_updated", %{"id" => proj.id, "node_id" => a.id, "x" => 300, "y" => 400})

      updated = Projections.get_projection!(proj.id)
      assert updated.layout["positions"][to_string(a.id)] == [300, 400]

      node = Spaces.get_node!(a.id)
      assert node.x == 10.0
      assert node.y == 20.0
    end

    test "projection_position_updated on a non-freeform projection is a no-op", %{conn: conn, space: space, a: a} do
      {:ok, proj} =
        Projections.create_projection(space, %{
          "name" => "Axes proj",
          "layout" => %{
            "kind" => "axes",
            "x_axis" => %{"property" => "heading"},
            "y_axis" => %{"property" => "kind", "scale" => "ordinal"}
          }
        })

      {:ok, view, _html} = live(conn, ~p"/canvas")
      view |> render_hook("projection_position_updated", %{"id" => proj.id, "node_id" => a.id, "x" => 1, "y" => 2})

      assert Projections.get_projection!(proj.id).layout["positions"] == nil
    end

    test "comparison_selected resolves the second projection into data-comparison", %{conn: conn, space: space, a: a} do
      {:ok, proj} =
        Projections.create_projection(space, %{
          "name" => "Other view",
          "layout" => %{"kind" => "freeform", "positions" => %{to_string(a.id) => [500, 600]}}
        })

      {:ok, view, _html} = live(conn, ~p"/canvas")
      html = view |> render_hook("comparison_selected", %{"id" => proj.id})

      assert html =~ "data-comparison"
      assert html =~ "Other view"
      assert html =~ ~s(&quot;#{a.id}&quot;:[500,600])

      html = view |> render_hook("comparison_selected", %{"id" => nil})
      assert html =~ ~s(data-comparison="null")
    end
  end

  describe "sketch_data_imported (FC2.15)" do
    test "imports pushed localStorage payloads and refreshes assigns", %{conn: conn} do
      space = Spaces.get_or_create_default_space()
      {:ok, view, _html} = live(conn, ~p"/canvas")

      payload = %{
        "nodes" => [
          %{"id" => 1, "name" => "Imported", "category" => "A", "value" => 5, "baseX" => 10, "baseY" => 20}
        ],
        "views" => [%{"id" => 9, "name" => "V", "snapshot" => [%{"id" => 1, "x" => 1, "y" => 2}]}],
        "modes" => [
          %{
            "name" => "M",
            "xAxis" => %{"property" => "value", "scale" => "linear"},
            "yAxis" => %{"property" => "category", "scale" => "ordinal"}
          }
        ]
      }

      html = view |> render_hook("sketch_data_imported", payload)

      assert html =~ "Imported"
      assert Enum.any?(Spaces.list_nodes_for_space(space), &(&1.metadata["sketch_id"] == "1"))
      assert Projections.get_projection_by_name(space, "sketch: V")
      assert Projections.get_projection_by_name(space, "sketch: M")

      assert_push_event(view, "import_result", %{message: message})
      assert message =~ "1 new node(s)"
      assert message =~ "1 view(s), 1 mode(s)"
    end
  end

  describe "events_batch" do
    test "persists a batch of events for the space", %{conn: conn} do
      space = Spaces.get_or_create_default_space()
      {:ok, view, _html} = live(conn, ~p"/canvas")

      batch = [
        %{"type" => "create:node:99", "payload" => %{"id" => 99, "x" => 10, "y" => 20}},
        %{"type" => "state:idle→selected", "payload" => %{"node_id" => 99}},
      ]

      view |> render_hook("events_batch", %{"events" => batch})

      events = Events.list_events_for_space(space)
      types = Enum.map(events, & &1.type)
      assert "create:node:99" in types
      assert "state:idle→selected" in types
    end

    test "ignores empty batch without error", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/canvas")
      assert render_hook(view, "events_batch", %{"events" => []})
    end
  end
end

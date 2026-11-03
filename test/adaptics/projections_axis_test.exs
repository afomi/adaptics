defmodule Adaptics.Projections.AxisTest do
  use ExUnit.Case, async: true

  alias Adaptics.Projection
  alias Adaptics.Projections.Axis

  defp make_node(id, attrs \\ %{}) do
    Map.merge(
      %{
        id: id,
        name: "n#{id}",
        kind: nil,
        x: nil,
        y: nil,
        z: nil,
        heading: nil,
        magnitude: nil,
        wardley_x: nil,
        wardley_y: nil,
        metadata: %{},
        inserted_at: ~N[2026-01-01 00:00:00],
        updated_at: ~N[2026-01-01 00:00:00]
      },
      attrs
    )
  end

  defp axes_layout(x_axis, y_axis, extra \\ %{}) do
    Map.merge(
      %{"kind" => "axes", "x_axis" => x_axis, "y_axis" => y_axis},
      extra
    )
  end

  describe "normalize/1" do
    test "nil and empty map are freeform" do
      assert Axis.normalize(nil) == {:ok, %{}}
      assert Axis.normalize(%{}) == {:ok, %{}}
    end

    test "freeform with positions round-trips" do
      layout = %{"kind" => "freeform", "positions" => %{"1" => [10, 20.5]}}
      assert {:ok, ^layout} = Axis.normalize(layout)
    end

    test "freeform with bad positions is rejected" do
      layout = %{"kind" => "freeform", "positions" => %{"1" => ["a", 2]}}
      assert {:error, _} = Axis.normalize(layout)
    end

    test "axes layout fills defaults" do
      {:ok, normalized} =
        Axis.normalize(axes_layout(%{"property" => "metadata.value"}, %{"property" => "kind", "scale" => "ordinal"}))

      assert normalized["x_axis"] == %{
               "property" => "metadata.value",
               "scale" => "linear",
               "jitter" => 0,
               "label" => "metadata.value"
             }

      assert normalized["y_axis"]["scale"] == "ordinal"
      assert normalized["drag_enabled"] == false
      assert normalized["show_axes"] == true
    end

    test "unknown kind is rejected" do
      assert {:error, message} = Axis.normalize(%{"kind" => "spiral"})
      assert message =~ "spiral"
    end

    test "unknown scale is rejected" do
      layout = axes_layout(%{"property" => "kind", "scale" => "log"}, %{"property" => "kind"})
      assert {:error, message} = Axis.normalize(layout)
      assert message =~ "log"
    end

    test "unknown property is rejected" do
      layout = axes_layout(%{"property" => "nope"}, %{"property" => "kind"})
      assert {:error, message} = Axis.normalize(layout)
      assert message =~ "nope"
    end

    test "missing axis maps are rejected" do
      assert {:error, _} = Axis.normalize(%{"kind" => "axes"})
    end

    test "semantic layout requires integer axis ids" do
      assert {:ok, normalized} =
               Axis.normalize(%{"kind" => "semantic", "x_axis" => %{"axis_id" => 1}, "y_axis" => %{"axis_id" => 2}})

      assert normalized["drag_enabled"] == false
      assert {:error, _} = Axis.normalize(%{"kind" => "semantic", "x_axis" => %{"axis_id" => "1"}, "y_axis" => %{"axis_id" => 2}})
    end

    test "Projection.changeset rejects invalid layouts and normalizes valid ones" do
      valid =
        Projection.changeset(%Projection{}, %{
          "name" => "V",
          "space_id" => 1,
          "layout" => axes_layout(%{"property" => "heading"}, %{"property" => "kind", "scale" => "ordinal"})
        })

      assert valid.valid?
      assert Ecto.Changeset.get_change(valid, :layout)["x_axis"]["scale"] == "linear"

      invalid =
        Projection.changeset(%Projection{}, %{
          "name" => "V",
          "space_id" => 1,
          "layout" => %{"kind" => "spiral"}
        })

      refute invalid.valid?
      assert {message, _} = invalid.errors[:layout]
      assert message =~ "spiral"
    end
  end

  describe "resolve/2 — freeform" do
    test "empty layout resolves to draggable freeform" do
      assert Axis.resolve(%{}, [make_node(1)]) == %{"kind" => "freeform", "drag_enabled" => true}
    end

    test "freeform snapshot carries positions" do
      resolved = Axis.resolve(%{"kind" => "freeform", "positions" => %{"1" => [5, 6]}}, [make_node(1)])
      assert resolved["drag_enabled"] == true
      assert resolved["positions"] == %{"1" => [5, 6]}
    end
  end

  describe "resolve/2 — axes" do
    test "linear domain from metadata numbers, including string-encoded" do
      nodes = [
        make_node(1, %{metadata: %{"value" => 3.5}}),
        make_node(2, %{metadata: %{"value" => "10.0"}}),
        make_node(3, %{metadata: %{"value" => 7}})
      ]

      resolved =
        Axis.resolve(
          axes_layout(%{"property" => "metadata.value"}, %{"property" => "kind", "scale" => "ordinal"}),
          nodes
        )

      assert resolved["kind"] == "axes"
      assert resolved["x"]["domain"] == [3.5, 10.0]
      assert resolved["x"]["values"] == %{"1" => 3.5, "2" => 10.0, "3" => 7}
    end

    test "nodes missing the property are omitted from values" do
      nodes = [make_node(1, %{metadata: %{"value" => 1}}), make_node(2), make_node(3, %{metadata: %{"value" => "not a number"}})]

      resolved =
        Axis.resolve(
          axes_layout(%{"property" => "metadata.value"}, %{"property" => "kind", "scale" => "ordinal"}),
          nodes
        )

      assert Map.keys(resolved["x"]["values"]) == ["1"]
    end

    test "ordinal domain is sorted distinct values" do
      nodes = [
        make_node(1, %{kind: "org"}),
        make_node(2, %{kind: "person"}),
        make_node(3, %{kind: "org"})
      ]

      resolved =
        Axis.resolve(
          axes_layout(%{"property" => "heading"}, %{"property" => "kind", "scale" => "ordinal", "jitter" => 16}),
          nodes
        )

      assert resolved["y"]["domain"] == ["org", "person"]
      assert resolved["y"]["jitter"] == 16
      assert resolved["y"]["values"]["3"] == "org"
    end

    test "time scale coerces ISO strings and NaiveDateTime to epoch ms" do
      nodes = [
        make_node(1, %{metadata: %{"date" => "2026-01-02"}}),
        make_node(2, %{metadata: %{"date" => "2026-01-01T12:00:00Z"}}),
        make_node(3, %{inserted_at: ~N[2026-03-01 00:00:00]})
      ]

      resolved =
        Axis.resolve(
          axes_layout(
            %{"property" => "metadata.date", "scale" => "time"},
            %{"property" => "inserted_at", "scale" => "time"}
          ),
          nodes
        )

      jan1_noon = DateTime.to_unix(~U[2026-01-01 12:00:00Z], :millisecond)
      jan2 = DateTime.to_unix(~U[2026-01-02 00:00:00Z], :millisecond)
      mar1 = DateTime.to_unix(~U[2026-03-01 00:00:00Z], :millisecond)

      assert resolved["x"]["values"] == %{"1" => jan2, "2" => jan1_noon}
      assert resolved["x"]["domain"] == [jan1_noon, jan2]
      assert resolved["y"]["values"]["3"] == mar1
    end

    test "top-level numeric fields resolve" do
      nodes = [make_node(1, %{heading: 0.5, magnitude: 2.0}), make_node(2, %{heading: 1.5, magnitude: 1.0})]

      resolved =
        Axis.resolve(
          axes_layout(%{"property" => "heading"}, %{"property" => "magnitude"}),
          nodes
        )

      assert resolved["x"]["domain"] == [0.5, 1.5]
      assert resolved["y"]["values"] == %{"1" => 2.0, "2" => 1.0}
    end

    test "empty values yield a safe default domain" do
      resolved = Axis.resolve(axes_layout(%{"property" => "heading"}, %{"property" => "kind", "scale" => "ordinal"}), [make_node(1)])
      assert resolved["x"]["domain"] == [0, 1]
      assert resolved["y"]["domain"] == []
    end
  end

  describe "resolve/2 — semantic" do
    test "resolves scores via injected scores_fn with [-1, 1] domain and pole labels" do
      fake_axis = %{name: "Verbosity", negative_pole: "concise", positive_pole: "verbose"}
      scores_fn = fn 3, _node_ids -> {fake_axis, %{1 => 0.4, 2 => -0.2}} end

      resolved =
        Axis.resolve(
          %{"kind" => "semantic", "x_axis" => %{"axis_id" => 3}, "y_axis" => %{"axis_id" => 3}},
          [make_node(1), make_node(2)],
          scores_fn: scores_fn
        )

      assert resolved["drag_enabled"] == false
      # Domain fits the observed scores (padded 10%), not the full [-1, 1]
      [dmin, dmax] = resolved["x"]["domain"]
      assert_in_delta dmin, -0.26, 1.0e-9
      assert_in_delta dmax, 0.46, 1.0e-9
      assert resolved["x"]["values"] == %{"1" => 0.4, "2" => -0.2}
      assert resolved["x"]["label"] == "Verbosity"
      assert resolved["x"]["negative_pole"] == "concise"
      assert resolved["x"]["positive_pole"] == "verbose"
    end
  end
end

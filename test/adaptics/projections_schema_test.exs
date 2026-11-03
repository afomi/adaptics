defmodule Adaptics.Projections.SchemaTest do
  use ExUnit.Case, async: true

  alias Adaptics.Projections.Schema

  defp make_node(id, attrs \\ %{}) do
    Map.merge(
      %{
        id: id,
        name: "n#{id}",
        kind: nil,
        z: nil,
        heading: nil,
        magnitude: nil,
        metadata: %{},
        inserted_at: ~N[2026-01-01 00:00:00]
      },
      attrs
    )
  end

  describe "analyze/1" do
    test "empty node list yields empty schema" do
      assert Schema.analyze([]) == []
    end

    test "infers types across heterogeneous metadata" do
      nodes = [
        make_node(1, %{metadata: %{"value" => 3, "org_type" => "nonprofit", "regions" => ["east"], "active" => true}}),
        make_node(2, %{metadata: %{"value" => "7.5", "org_type" => "gov", "founded" => "2001-06-01"}})
      ]

      schema = Schema.analyze(nodes)
      by_prop = Map.new(schema, &{&1.property, &1})

      assert by_prop["metadata.value"].type == "number"
      assert by_prop["metadata.org_type"].type == "string"
      assert by_prop["metadata.regions"].type == "array"
      assert by_prop["metadata.active"].type == "boolean"
      assert by_prop["metadata.founded"].type == "date"
    end

    test "surfaces metadata keys missing from the first node, with coverage" do
      nodes = [make_node(1), make_node(2, %{metadata: %{"score" => 5}}), make_node(3, %{metadata: %{"score" => 9}}), make_node(4)]

      schema = Schema.analyze(nodes)
      score = Enum.find(schema, &(&1.property == "metadata.score"))

      assert score.type == "number"
      assert score.coverage == 0.5
    end

    test "includes covered top-level fields and omits uncovered ones" do
      nodes = [make_node(1, %{kind: "org", heading: 1.0, inserted_at: ~N[2026-02-01 00:00:00]}), make_node(2, %{kind: "person"})]

      schema = Schema.analyze(nodes)
      props = Enum.map(schema, & &1.property)

      assert "kind" in props
      assert "heading" in props
      assert "inserted_at" in props
      refute "magnitude" in props
      refute "z" in props
    end
  end

  describe "suggest/1" do
    test "proposes scatter, timeseries, and distribution layouts" do
      schema = [
        %{property: "heading", type: "number", coverage: 1.0},
        %{property: "metadata.value", type: "number", coverage: 1.0},
        %{property: "kind", type: "string", coverage: 1.0},
        %{property: "inserted_at", type: "date", coverage: 1.0}
      ]

      suggestions = Schema.suggest(schema)
      names = Enum.map(suggestions, & &1.name)

      assert "heading vs value" in names
      assert "heading over time" in names
      assert "value over time" in names
      assert "heading by kind" in names
      assert "value by kind" in names

      scatter = Enum.find(suggestions, &(&1.name == "heading vs value"))
      assert scatter.layout["kind"] == "axes"
      assert scatter.layout["x_axis"]["property"] == "heading"
      assert scatter.layout["y_axis"]["property"] == "metadata.value"

      distribution = Enum.find(suggestions, &(&1.name == "heading by kind"))
      assert distribution.layout["y_axis"]["scale"] == "ordinal"
      assert distribution.layout["y_axis"]["jitter"] == 16

      timeseries = Enum.find(suggestions, &(&1.name == "heading over time"))
      assert timeseries.layout["x_axis"]["scale"] == "time"

      assert Enum.all?(suggestions, fn s -> match?({:ok, _}, Adaptics.Projections.Axis.normalize(s.layout)) end)
    end

    test "no numeric properties yields no suggestions" do
      assert Schema.suggest([%{property: "kind", type: "string", coverage: 1.0}]) == []
    end
  end
end

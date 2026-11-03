defmodule Adaptics.EventsTest do
  use Adaptics.DataCase

  alias Adaptics.Events
  alias Adaptics.Spaces

  setup do
    {:ok, space} = Spaces.create_space(%{name: "Event Space", slug: "event-space"})
    %{space: space}
  end

  describe "create_event/3" do
    test "persists type and payload for a space", %{space: space} do
      {:ok, event} = Events.create_event(space, "create:node:42", %{"id" => 42, "x" => 10.0})
      assert event.type == "create:node:42"
      assert event.payload["id"] == 42
      assert event.payload["x"] == 10.0
      assert event.space_id == space.id
    end

    test "persists event with empty payload by default", %{space: space} do
      {:ok, event} = Events.create_event(space, "state:idle→selected")
      assert event.type == "state:idle→selected"
      assert event.payload == %{}
    end

    test "requires a type", %{space: space} do
      {:error, changeset} = Events.create_event(space, nil)
      assert changeset.errors[:type]
    end
  end

  describe "create_events/2" do
    test "persists a batch of events atomically", %{space: space} do
      batch = [
        %{"type" => "create:node:1", "payload" => %{"id" => 1}},
        %{"type" => "move:node:1", "payload" => %{"id" => 1, "to" => %{"x" => 100, "y" => 50}}},
        %{"type" => "create:edge:5", "payload" => %{"id" => 5, "from_id" => 1, "to_id" => 2}},
      ]

      {:ok, count} = Events.create_events(space, batch)
      assert count == 3

      events = Events.list_events_for_space(space)
      assert length(events) == 3
    end

    test "returns 0 for empty batch", %{space: space} do
      {:ok, count} = Events.create_events(space, [])
      assert count == 0
    end
  end

  describe "list_events_for_space/1" do
    test "returns events in insertion order", %{space: space} do
      {:ok, _} = Events.create_event(space, "event:first")
      {:ok, _} = Events.create_event(space, "event:second")
      {:ok, _} = Events.create_event(space, "event:third")

      events = Events.list_events_for_space(space)
      types = Enum.map(events, & &1.type)
      assert types == ["event:first", "event:second", "event:third"]
    end

    test "only returns events for the given space", %{space: space} do
      {:ok, other} = Spaces.create_space(%{name: "Other", slug: "other-events"})
      {:ok, _} = Events.create_event(space, "mine")
      {:ok, _} = Events.create_event(other, "theirs")

      events = Events.list_events_for_space(space)
      assert length(events) == 1
      assert hd(events).type == "mine"
    end
  end

  describe "list_events_for_space/2 with type filter" do
    test "returns only events of the given type", %{space: space} do
      {:ok, _} = Events.create_event(space, "create:node:1")
      {:ok, _} = Events.create_event(space, "move:node:1")
      {:ok, _} = Events.create_event(space, "create:node:2")

      creates = Events.list_events_for_space(space, "create:node:1")
      assert length(creates) == 1
      assert hd(creates).type == "create:node:1"
    end
  end
end

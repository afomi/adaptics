defmodule Adaptics.Canvas do
  @moduledoc """
  Context for multiplayer Fabric.js canvas.
  Handles persistence (snapshots) and PubSub broadcasting.

  ## Reusability

  To port to another project, change:
  - `@pubsub` to your app's PubSub name
  - `alias Adaptics.Repo` to your app's Repo
  """

  alias Adaptics.Repo
  alias Adaptics.Canvas.CanvasSnapshot

  @pubsub Adaptics.PubSub
  @topic_prefix "fabric_canvas:"

  # --- Topic ---

  def topic(space_id), do: @topic_prefix <> to_string(space_id)

  def subscribe(space_id) do
    Phoenix.PubSub.subscribe(@pubsub, topic(space_id))
  end

  # --- Broadcast ---

  @doc """
  Broadcasts a canvas operation to all subscribers except the sender.

  Message tuples:
    {:canvas_object_added, object_data}
    {:canvas_object_modified, object_data}
    {:canvas_object_removed, %{id: object_id}}
    {:canvas_cursor_moved, %{user_id: ..., x: ..., y: ...}}
  """
  def broadcast(space_id, msg) do
    Phoenix.PubSub.broadcast_from(@pubsub, self(), topic(space_id), msg)
  end

  # --- Snapshot persistence ---

  def get_snapshot(space_id) do
    Repo.get_by(CanvasSnapshot, space_id: space_id)
  end

  def save_snapshot(space_id, snapshot_json, user_id \\ nil) do
    case get_snapshot(space_id) do
      nil ->
        %CanvasSnapshot{}
        |> CanvasSnapshot.changeset(%{
          space_id: space_id,
          snapshot: snapshot_json,
          version: 1,
          saved_by: user_id
        })
        |> Repo.insert()

      existing ->
        existing
        |> CanvasSnapshot.changeset(%{
          snapshot: snapshot_json,
          version: existing.version + 1,
          saved_by: user_id
        })
        |> Repo.update()
    end
  end
end

defmodule Adaptics.Events do
  @moduledoc """
  Context for canvas event persistence.
  Events are immutable audit records — insert only.
  """

  import Ecto.Query, warn: false
  alias Adaptics.Repo
  alias Adaptics.Event
  alias Adaptics.Space

  @doc """
  Persists a single event for a space.
  """
  def create_event(%Space{id: space_id}, type, payload \\ %{}) do
    %Event{}
    |> Event.changeset(%{type: type, payload: payload, space_id: space_id})
    |> Repo.insert()
  end

  @doc """
  Persists multiple events in a single transaction.
  Returns {:ok, count} or {:error, reason}.
  """
  def create_events(%Space{} = space, events) when is_list(events) do
    Repo.transaction(fn ->
      Enum.each(events, fn %{"type" => type, "payload" => payload} ->
        {:ok, _} = create_event(space, type, payload)
      end)
      length(events)
    end)
  end

  @doc """
  Returns all events for a space in insertion order.
  """
  def list_events_for_space(%Space{id: space_id}) do
    Repo.all(
      from e in Event,
        where: e.space_id == ^space_id,
        order_by: [asc: e.inserted_at, asc: e.id]
    )
  end

  @doc """
  Returns events of a specific type for a space.
  """
  def list_events_for_space(%Space{id: space_id}, type) do
    Repo.all(
      from e in Event,
        where: e.space_id == ^space_id and e.type == ^type,
        order_by: [asc: e.inserted_at, asc: e.id]
    )
  end
end

defmodule Adaptics.Event do
  use Ecto.Schema
  import Ecto.Changeset

  schema "events" do
    field :type, :string
    field :payload, :map, default: %{}

    belongs_to :space, Adaptics.Space

    timestamps(updated_at: false)
  end

  @doc false
  def changeset(event, attrs) do
    event
    |> cast(attrs, [:type, :payload, :space_id])
    |> validate_required([:type, :space_id])
  end
end

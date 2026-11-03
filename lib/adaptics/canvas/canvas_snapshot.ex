defmodule Adaptics.Canvas.CanvasSnapshot do
  use Ecto.Schema
  import Ecto.Changeset

  schema "canvas_snapshots" do
    field :snapshot, :map, default: %{}
    field :version, :integer, default: 1
    field :saved_by, :string

    belongs_to :space, Adaptics.Space

    timestamps()
  end

  def changeset(snapshot, attrs) do
    snapshot
    |> cast(attrs, [:snapshot, :version, :saved_by, :space_id])
    |> validate_required([:space_id, :snapshot, :version])
    |> unique_constraint(:space_id)
  end
end

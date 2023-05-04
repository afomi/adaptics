defmodule Adaptics.Visual.Node do
  use Ecto.Schema
  import Ecto.Changeset

  schema "nodes" do
    field :description, :string
    field :name, :string

    timestamps()
  end

  @doc false
  def changeset(node, attrs) do
    node
    |> cast(attrs, [:name, :description])
    |> validate_required([:name, :description])
  end
end

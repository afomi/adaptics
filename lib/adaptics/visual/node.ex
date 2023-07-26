defmodule Adaptics.Visual.Node do
  use Ecto.Schema
  import Ecto.Changeset

  schema "nodes" do
    field :description, :string
    field :name, :string
    field :hash, :string

    field :wardley_x, :float
    field :wardley_y, :float
    field :z, :float
    field :wardley_text, :string

    timestamps()
  end

  @doc false
  def changeset(node, attrs) do
    node
    |> cast(attrs, [:name, :description, :wardley_x, :wardley_y, :z, :wardley_text])
    |> validate_required([:name, :description])
  end
end

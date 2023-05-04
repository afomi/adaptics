defmodule Adaptics.Visual.Link do
  use Ecto.Schema
  import Ecto.Changeset

  schema "links" do
    field :description, :string
    field :from_id, :integer
    field :name, :string
    field :to_id, :integer

    timestamps()
  end

  @doc false
  def changeset(link, attrs) do
    link
    |> cast(attrs, [:name, :description, :from_id, :to_id])
    |> validate_required([:name, :description, :from_id, :to_id])
  end
end

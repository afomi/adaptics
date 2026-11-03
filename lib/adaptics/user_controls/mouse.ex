defmodule Adaptics.UserControls.Mouse do
  use Ecto.Schema
  import Ecto.Changeset

  schema "mice" do
    field :x, :integer
    field :y, :integer

    timestamps()
  end

  @doc false
  def changeset(mouse, attrs) do
    mouse
    |> cast(attrs, [:x, :y])
    |> validate_required([:x, :y])
  end
end

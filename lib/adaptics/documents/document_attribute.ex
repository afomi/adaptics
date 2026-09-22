defmodule Adaptics.Documents.DocumentAttribute do
  use Ecto.Schema
  import Ecto.Changeset

  schema "document_attributes" do
    field :key, :string
    field :value, :string
    field :source, :string, default: "manual"

    belongs_to :document, Adaptics.Documents.Document

    timestamps()
  end

  @required_fields ~w(key document_id)a
  @optional_fields ~w(value source)a

  def changeset(attribute, attrs) do
    attribute
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_inclusion(:source, ~w(manual extracted llm))
    |> unique_constraint([:document_id, :key, :value])
  end
end

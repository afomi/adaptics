defmodule Adaptics.Documents.Document do
  use Ecto.Schema
  import Ecto.Changeset

  schema "documents" do
    field :file_name, :string
    field :file_size, :integer
    field :content_type, :string, default: "application/pdf"
    field :storage_key, :string
    field :status, :string, default: "pending"
    field :extracted_text, :string
    field :schema_type, :string
    field :metadata, :map, default: %{}

    has_many :attributes, Adaptics.Documents.DocumentAttribute

    timestamps()
  end

  @required_fields ~w(file_name file_size storage_key)a
  @optional_fields ~w(content_type status extracted_text schema_type metadata)a

  def changeset(document, attrs) do
    document
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> validate_inclusion(:status, ~w(pending uploaded extracting ready error))
    |> unique_constraint(:storage_key)
  end
end

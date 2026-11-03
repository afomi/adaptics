defmodule Adaptics.Repo.Migrations.CreateDocuments do
  use Ecto.Migration

  def change do
    create table(:documents) do
      add :file_name, :string, null: false
      add :file_size, :integer, null: false
      add :content_type, :string, null: false, default: "application/pdf"
      add :storage_key, :string, null: false
      add :status, :string, null: false, default: "pending"
      add :extracted_text, :text
      add :schema_type, :string
      add :metadata, :map, default: %{}

      timestamps()
    end

    create unique_index(:documents, [:storage_key])
    create index(:documents, [:status])
    create index(:documents, [:schema_type])
    create index(:documents, [:inserted_at])
  end
end

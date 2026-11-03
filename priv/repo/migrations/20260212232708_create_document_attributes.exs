defmodule Adaptics.Repo.Migrations.CreateDocumentAttributes do
  use Ecto.Migration

  def change do
    create table(:document_attributes) do
      add :key, :string, null: false
      add :value, :text
      add :source, :string, default: "manual"
      add :document_id, references(:documents, on_delete: :delete_all), null: false

      timestamps()
    end

    create index(:document_attributes, [:document_id])
    create unique_index(:document_attributes, [:document_id, :key])
  end
end

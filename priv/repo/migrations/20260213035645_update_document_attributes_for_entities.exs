defmodule Adaptics.Repo.Migrations.UpdateDocumentAttributesForEntities do
  use Ecto.Migration

  def change do
    drop unique_index(:document_attributes, [:document_id, :key])
    create unique_index(:document_attributes, [:document_id, :key, :value])
  end
end

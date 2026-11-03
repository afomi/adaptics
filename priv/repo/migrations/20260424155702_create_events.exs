defmodule Adaptics.Repo.Migrations.CreateEvents do
  use Ecto.Migration

  def change do
    create table(:events) do
      add :type, :string, null: false
      add :payload, :map, default: %{}
      add :space_id, references(:spaces, on_delete: :delete_all)

      timestamps(updated_at: false)
    end

    create index(:events, [:space_id])
    create index(:events, [:type])
    create index(:events, [:inserted_at])
  end
end

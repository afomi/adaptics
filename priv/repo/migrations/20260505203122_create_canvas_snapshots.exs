defmodule Adaptics.Repo.Migrations.CreateCanvasSnapshots do
  use Ecto.Migration

  def change do
    create table(:canvas_snapshots) do
      add :space_id, references(:spaces, on_delete: :delete_all), null: false
      add :snapshot, :map, null: false, default: %{}
      add :version, :integer, null: false, default: 1
      add :saved_by, :string

      timestamps()
    end

    create unique_index(:canvas_snapshots, [:space_id])
  end
end

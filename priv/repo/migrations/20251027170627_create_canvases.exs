defmodule Adaptics.Repo.Migrations.CreateCanvases do
  use Ecto.Migration

  def change do
    create table(:tldraw_canvases) do
      add :name, :string, null: false
      add :tldraw_data, :map, null: false
      add :text_content, {:array, :text}, default: []
      add :shape_count, :integer, default: 0
      add :page_count, :integer, default: 0

      timestamps()
    end

    create index(:tldraw_canvases, [:inserted_at])
    create index(:tldraw_canvases, [:name])
  end
end

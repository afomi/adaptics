defmodule Adaptics.Repo.Migrations.AddWardleyFieldsToNode do
  use Ecto.Migration

  def change do
    alter table("nodes") do
      add :wardley_x, :float
      add :wardley_y, :float
      add :wardley_text, :string
    end

  end
end

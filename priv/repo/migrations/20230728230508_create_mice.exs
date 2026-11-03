defmodule Adaptics.Repo.Migrations.CreateMice do
  use Ecto.Migration

  def change do
    create table(:mice) do
      add :x, :integer
      add :y, :integer

      timestamps()
    end
  end
end

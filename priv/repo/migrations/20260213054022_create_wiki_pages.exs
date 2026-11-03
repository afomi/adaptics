defmodule Adaptics.Repo.Migrations.CreateWikiPages do
  use Ecto.Migration

  def change do
    create table(:wiki_pages) do
      add :title, :string, null: false
      add :slug, :string, null: false
      add :body, :text
      add :rendered_html, :text
      add :locked, :boolean, default: false, null: false

      timestamps()
    end

    create unique_index(:wiki_pages, [:slug])
    create index(:wiki_pages, [:title])

    create table(:wiki_revisions) do
      add :wiki_page_id, references(:wiki_pages, on_delete: :delete_all), null: false
      add :body, :text
      add :message, :string
      add :author, :string

      timestamps(updated_at: false)
    end

    create index(:wiki_revisions, [:wiki_page_id])
  end
end

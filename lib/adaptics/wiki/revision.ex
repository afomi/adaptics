defmodule Adaptics.Wiki.Revision do
  use Ecto.Schema
  import Ecto.Changeset

  schema "wiki_revisions" do
    field :body, :string
    field :message, :string
    field :author, :string

    belongs_to :wiki_page, Adaptics.Wiki.Page

    timestamps(updated_at: false)
  end

  def changeset(revision, attrs) do
    revision
    |> cast(attrs, [:body, :message, :author, :wiki_page_id])
    |> validate_required([:wiki_page_id])
    |> foreign_key_constraint(:wiki_page_id)
  end
end

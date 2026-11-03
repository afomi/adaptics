defmodule Adaptics.Wiki.Page do
  use Ecto.Schema
  import Ecto.Changeset

  schema "wiki_pages" do
    field :title, :string
    field :slug, :string
    field :body, :string
    field :rendered_html, :string
    field :locked, :boolean, default: false

    has_many :revisions, Adaptics.Wiki.Revision, foreign_key: :wiki_page_id

    timestamps()
  end

  @required_fields [:title]
  @optional_fields [:body, :locked]

  def changeset(page, attrs) do
    page
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> generate_slug()
    |> unique_constraint(:slug)
  end

  defp generate_slug(changeset) do
    case get_change(changeset, :title) do
      nil -> changeset
      title -> put_change(changeset, :slug, slugify(title))
    end
  end

  def slugify(title) do
    title
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9\s-]/, "")
    |> String.replace(~r/\s+/, "-")
    |> String.trim("-")
  end
end

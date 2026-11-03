defmodule AdapticsWeb.LinkHTML do
  use AdapticsWeb, :html

  embed_templates "link_html/*"

  @doc """
  Renders a link form.

  A Link is a core generic object — a typed relation between two Nodes (or pointers
  to other records). Used by the new and edit actions.
  """
  attr :changeset, Ecto.Changeset, required: true
  attr :action, :string, required: true

  def link_form(assigns)
end

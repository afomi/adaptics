defmodule AdapticsWeb.NodeHTML do
  use AdapticsWeb, :html

  embed_templates "node_html/*"

  @doc """
  Renders a node form.

  Used by the new and edit actions. A Node is a core generic object — flexible
  enough to stand alone or point at another data record — so this form exposes the
  full attribute surface (identity, position, Wardley placement).
  """
  attr :changeset, Ecto.Changeset, required: true
  attr :action, :string, required: true

  def node_form(assigns)
end

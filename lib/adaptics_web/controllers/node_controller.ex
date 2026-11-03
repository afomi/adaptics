defmodule AdapticsWeb.NodeController do
  use AdapticsWeb, :controller

  alias Adaptics.Visual
  alias Adaptics.Visual.Node
  import Ecto.Query, warn: false

  def index(conn, _params) do
    nodes = Visual.list_nodes()
    node_count = Adaptics.Repo.one(from p in Adaptics.Visual.Node, select: count("*"))
    render(conn, "index.html", nodes: nodes, node_count: node_count)
  end

  def new(conn, _params) do
    changeset = Visual.change_node(%Node{})
    render(conn, "new.html", changeset: changeset)
  end

  def create(conn, %{"node" => node_params}) do
    case Visual.create_node(node_params) do
      {:ok, node} ->
        conn
        |> put_flash(:info, "Node created successfully.")
        |> redirect(to: ~p"/nodes/#{node}")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    node = Visual.get_node!(id)

    links = links_touching(node.hash)

    render(conn, "show.html", node: node, links: links)
  end

  # Links related to a Node are matched by hash. A Node without a hash (e.g. a
  # freshly created generic object) has no hash-based relations yet.
  defp links_touching(nil), do: []

  defp links_touching(hash) do
    Adaptics.Repo.all(
      from l in Adaptics.Visual.Link,
        where: l.to_hash == ^hash or l.from_hash == ^hash
    )
  end

  def edit(conn, %{"id" => id}) do
    node = Visual.get_node!(id)
    changeset = Visual.change_node(node)
    render(conn, "edit.html", node: node, changeset: changeset)
  end

  def update(conn, %{"id" => id, "node" => node_params}) do
    node = Visual.get_node!(id)

    case Visual.update_node(node, node_params) do
      {:ok, node} ->
        conn
        |> put_flash(:info, "Node updated successfully.")
        |> redirect(to: ~p"/nodes/#{node}")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", node: node, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    node = Visual.get_node!(id)
    {:ok, _node} = Visual.delete_node(node)

    conn
    |> put_flash(:info, "Node deleted successfully.")
    |> redirect(to: ~p"/nodes")
  end
end

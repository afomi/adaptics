defmodule AdapticsWeb.NodeController do
  use AdapticsWeb, :controller

  alias Adaptics.Visual
  alias Adaptics.Visual.Node
  import Ecto.Query, warn: false

  def index(conn, _params) do
    nodes = Visual.list_nodes()
    render(conn, "index.html", nodes: nodes)
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
        |> redirect(to: Routes.node_path(conn, :show, node))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html", changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    node = Visual.get_node!(id)
    hash = node.hash

    links = Adaptics.Repo.all(from u in "links",
          where: u.to_hash == ^hash or u.from_hash == ^hash,
          select: [:id, :to_hash, :from_hash, :name, :description, :from_id, :to_id])

    render(conn, "show.html", node: node, links: links)
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
        |> redirect(to: Routes.node_path(conn, :show, node))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html", node: node, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    node = Visual.get_node!(id)
    {:ok, _node} = Visual.delete_node(node)

    conn
    |> put_flash(:info, "Node deleted successfully.")
    |> redirect(to: Routes.node_path(conn, :index))
  end
end

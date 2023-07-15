defmodule AdapticsWeb.PageController do
  use AdapticsWeb, :controller

  alias Adaptics.Visual
  alias Adaptics.Visual.Node
  alias Adaptics.Visual.Link

  def index(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "index.html", nodes: nodes, links: links)
  end

  def splines(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "splines.html", nodes: nodes, links: links)
  end

  def voxels(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "voxels.html", nodes: nodes, links: links)
  end
end

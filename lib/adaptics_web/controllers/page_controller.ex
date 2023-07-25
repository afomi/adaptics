defmodule AdapticsWeb.PageController do
  use AdapticsWeb, :controller

  alias Adaptics.Visual
  alias Adaptics.Visual.Node
  alias Adaptics.Visual.Link

  def index(conn, _params) do
    render(conn, "index.html", passSomeVariableKey: "Some Variable Value")
  end

  def nodes(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "nodes.html", nodes: nodes, links: links)
  end

  def splines(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "splines.html", nodes: nodes, links: links)
  end

  def three_d(conn, _params) do
    nodes = Visual.list_wardley_nodes()
    links = Visual.list_wardley_links()
    render(conn, "3d.html", nodes: nodes, links: links)
  end

  def voxels(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "voxels.html", nodes: nodes, links: links)
  end
end

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

  def graph(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "graph.html", nodes: nodes, links: links)
  end

  def splines(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "splines.html", nodes: nodes, links: links)
  end

  def pool(conn, _params) do
    render(conn, "pool.html")
  end

  def bunkbed(conn, _params) do
    render(conn, "bunkbed.html")
  end

  def unwriter(conn, _params) do
    render(conn, "unwriter.html")
  end

  def ecosystem(conn, _params) do
    render(conn, "ecosystem.html")
  end

  def three_d(conn, _params) do
    nodes = Visual.list_wardley_nodes()
    links = Visual.list_wardley_links()
    render(conn, "3d.html", nodes: nodes, links: links)
  end

  def vortex(conn, _params) do
    render(conn, "vortex.html")
  end

  def link(conn, _params) do
    render(conn, "link.html")
  end

  def voxels(conn, _params) do
    nodes = Visual.list_nodes()
    links = Visual.list_links()
    render(conn, "voxels.html", nodes: nodes, links: links)
  end

  def flow(conn, _params) do
    # nodes = Visual.list_nodes()
    # links = Visual.list_links()
    render(conn, "flow.html")
  end
end

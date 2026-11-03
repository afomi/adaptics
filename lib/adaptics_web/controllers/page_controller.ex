defmodule AdapticsWeb.PageController do
  use AdapticsWeb, :controller

  alias Adaptics.Visual

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

  def game(conn, _params) do
    render(conn, "game.html")
  end

  def clock(conn, _params) do
    render(conn, "clock.html")
  end

  def unwriter(conn, _params) do
    render(conn, "unwriter.html")
  end

  def cubeviz(conn, _params) do
    render(conn, "cubeviz.html")
  end

  def ecosystem(conn, _params) do
    render(conn, "ecosystem.html")
  end

  def chladni(conn, _params) do
    render(conn, "chladni.html")
  end

  def three_d(conn, _params) do
    nodes = Visual.list_wardley_nodes()
    links = Visual.list_wardley_links()
    render(conn, "3d.html", nodes: nodes, links: links)
  end

  def vortex(conn, _params) do
    render(conn, "vortex.html")
  end

  # /topo/cocktails — cocktail layers view (spirits / drinks / supporting
  # ingredients as stacked layers with typed edges). "cocktails" is a pseudo
  # space slug: it shadows any real space named "cocktails".
  def topo(conn, %{"space_slug" => "cocktails"}) do
    render(conn, "topo.html",
      view: "cocktails",
      cocktails_json: Jason.encode!(Adaptics.Cocktails.payload()),
      records_json: "[]",
      cities_json: "[]",
      models_json: "[]",
      axes_json: "[]",
      topics_json: "null"
    )
  end

  # /topo — 3D semantic-axis space (FC2.18). Records from a space (default
  # muni-codes) positioned by their scores on three semantic axes; the client
  # renders a Three.js scatter with per-city toggles and axis remapping.
  def topo(conn, params) do
    space = Adaptics.Spaces.get_space_by_slug(params["space_slug"] || Adaptics.MuniCodes.space_slug())
    axes = Adaptics.Semantic.list_axes(computed_only: true)

    {records, models} =
      case space do
        nil ->
          {[], []}

        space ->
          scores = Adaptics.Semantic.node_scores_for_space(space)

          records =
            for node <- Adaptics.Spaces.list_nodes_for_space(space),
                node_scores = Map.get(scores, node.id, %{}),
                map_size(node_scores) > 0 do
              %{
                id: node.id,
                name: node.name,
                city: node.metadata["city"],
                chapter: node.metadata["chapter"],
                section_count: node.metadata["section_count"],
                earliest_year: node.metadata["earliest_year"],
                latest_year: node.metadata["latest_year"],
                # Keyed by embedding model: %{model => %{axis_id => score}}.
                scores: node_scores
              }
            end

          {records, Adaptics.Semantic.score_models_for_space(space)}
      end

    cities =
      records
      |> Enum.map(& &1.city)
      |> Enum.uniq()
      |> Enum.map(fn city ->
        coords = Adaptics.MuniCodes.city_coordinates()[city] || %{lat: nil, lng: nil}
        %{city: city, lat: coords.lat, lng: coords.lng}
      end)

    topics =
      case space do
        nil ->
          %{}

        space ->
          space
          |> Adaptics.Semantic.topic_models_for_space()
          |> Map.new(fn tm ->
            {tm.model, %{k: tm.k, topics: tm.topics, placements: tm.placements}}
          end)
      end

    render(conn, "topo.html",
      view: "muni",
      cocktails_json: "null",
      records_json: Jason.encode!(records),
      cities_json: Jason.encode!(cities),
      models_json: Jason.encode!(models),
      topics_json: Jason.encode!(topics),
      axes_json:
        Jason.encode!(
          Enum.map(axes, fn a ->
            %{id: a.id, name: a.name, negative_pole: a.negative_pole, positive_pole: a.positive_pole}
          end)
        )
    )
  end

  def link(conn, _params) do
    render(conn, "link_page.html")
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

  def simulation(conn, _params) do
    render(conn, "simulation.html")
  end

  def energy(conn, _params) do
    render(conn, "energy.html")
  end

  def angles(conn, _params) do
    render(conn, "angles.html")
  end

  def about(conn, _params) do
    render(conn, "about.html")
  end

  def adaptics(conn, _params) do
    render(conn, "adaptics.html")
  end

  def neighborhood(conn, _params) do
    render(conn, "neighborhood.html")
  end

  def civics(conn, _params) do
    render(conn, "civics.html")
  end

  def toroidal_cash_flow(conn, _params) do
    render(conn, "toroidal_cash_flow.html")
  end

  def timeline(conn, _params) do
    render(conn, "timeline.html")
  end

  def rings(conn, _params) do
    render(conn, "rings.html")
  end

  def math(conn, _params) do
    render(conn, "math.html")
  end

  def hydrogen(conn, _params) do
    render(conn, "hydrogen.html")
  end

  def lens(conn, _params) do
    render(conn, "lens.html")
  end

  def coherence(conn, _params) do
    render(conn, "coherence.html")
  end

  def tariffs(conn, _params) do
    render(conn, "tariffs.html")
  end

  def factor(conn, _params) do
    render(conn, "factor.html")
  end

  def gtd(conn, _params) do
    render(conn, "gtd.html")
  end

  def spheres(conn, _params) do
    render(conn, "spheres.html")
  end

  def org(conn, _params) do
    render(conn, "org.html")
  end

  def resonance(conn, _params) do
    render(conn, "resonance.html")
  end

  def ui_map(conn, _params) do
    render(conn, "ui_map.html")
  end

  def business(conn, _params) do
    render(conn, "business.html")
  end

  def network(conn, _params) do
    render(conn, "network.html")
  end

  def russell(conn, _params) do
    render(conn, "russell.html")
  end

  def cards(conn, _params) do
    render(conn, "cards.html")
  end

  def motion(conn, _params) do
    render(conn, "motion.html")
  end

  def aframe(conn, _params) do
    conn
    |> put_root_layout(false)
    |> put_layout(false)
    |> render("aframe.html")
  end

  # 100,000 economic agents as GPU Points — a substrate for simulation dynamics.
  # Keeps the root layout (so /assets/app.js loads and defines renderEconAgents)
  # but hides the nav so the Three.js scene owns the viewport.
  def agents(conn, _params) do
    conn
    |> assign(:hide_nav, true)
    |> render("agents.html")
  end

  # Ported from sandbox /infosynth — a self-contained D3 sketch-data canvas.
  # Served raw (not via heex) because the ~4k-line inline JS is not heex-safe.
  def sketch_data(conn, _params) do
    path = Path.join(Application.app_dir(:adaptics, "priv/static"), "sketch-data.html")

    conn
    |> put_resp_content_type("text/html")
    |> send_file(200, path)
  end
end

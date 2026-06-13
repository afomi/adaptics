defmodule AdapticsWeb.Router do
  use AdapticsWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, {AdapticsWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", AdapticsWeb do
    pipe_through :browser

    resources "/nodes", NodeController
    resources "/links", LinkController

    get "/pool", PageController, :pool
    get "/ivn", PageController, :nodes
    get "/flow", PageController, :flow
    get "/graph", PageController, :graph
    get "/splines", PageController, :splines
    get "/3d", PageController, :three_d
    get "/voxels", PageController, :voxels
    get "/link", PageController, :link
    get "/vortex", PageController, :vortex
    get "/unwriter", PageController, :unwriter
    get "/ecosystem", PageController, :ecosystem
    get "/clock", PageController, :clock
    live "/desktop", DesktopLive, :index
    live "/draw", DrawLive, :index
    get "/draw/data", CanvasController, :data
    get "/draw/meta", CanvasController, :meta
    post "/draw/data/parse", CanvasController, :parse
    get "/game", PageController, :game
    get "/cubeviz", PageController, :cubeviz
    get "/simulation", PageController, :simulation
    get "/energy", PageController, :energy
    get "/angles", PageController, :angles
    get "/about", PageController, :about
    get "/neighborhood", PageController, :neighborhood
    get "/rings", PageController, :rings
    get "/math", PageController, :math
    get "/hydrogen", PageController, :hydrogen
    get "/lens", PageController, :lens
    get "/coherence", PageController, :coherence
    get "/gtd", PageController, :gtd
    get "/spheres", PageController, :spheres
    get "/adaptics", PageController, :adaptics
    get "/timeline", PageController, :timeline
    live "/canvas", CanvasLive, :index
    live "/gc", GCLive, :index
    live "/documents", DocumentLive.Index, :index
    live "/documents/:id", DocumentLive.Show, :show
    live "/docs", DocsLive.Index, :index
    live "/docs/:id", DocsLive.Show, :show
    live "/value_stream", ValueStreamLive, :index
    live "/econ", EconLive, :index
    live "/econ/city", EconLive.CityLive, :index
    live "/stage", StageLive, :index
    live "/scope", ScopeLive, :index
    live "/sketch/:space_slug", FabricCanvasLive, :index
    live "/tldraw", TldrawLive, :index
    # live "/games/:id", GameBoardLive, :show
    live "/games/:id", GameBoardLive, :show
    get "/", PageController, :index
  end

  scope "/wiki", AdapticsWeb do
    pipe_through :browser

    live "/", WikiLive.Index, :index
    live "/new", WikiLive.Edit, :new
    live "/:slug", WikiLive.Show, :show
    live "/:slug/edit", WikiLive.Edit, :edit
    live "/:slug/history", WikiLive.History, :history
  end

  # Other scopes may use custom stacks.
  # scope "/api", AdapticsWeb do
  #   pipe_through :api
  # end

  # Enables LiveDashboard only for development
  #
  # If you want to use the LiveDashboard in production, you should put
  # it behind authentication and allow only admins to access it.
  # If your application does not have an admins-only section yet,
  # you can use Plug.BasicAuth to set up some basic authentication
  # as long as you are also using SSL (which you should anyway).
  if Mix.env() in [:dev, :test] do
    import Phoenix.LiveDashboard.Router

    scope "/" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: AdapticsWeb.Telemetry
    end
  end

  # Enables the Swoosh mailbox preview in development.
  #
  # Note that preview only shows emails that were sent by the same
  # node running the Phoenix server.
  if Mix.env() == :dev do
    scope "/dev" do
      pipe_through :browser

      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end

# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :adaptics,
  ecto_repos: [Adaptics.Repo]

# Configures the endpoint
config :adaptics, AdapticsWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [formats: [html: AdapticsWeb.ErrorHTML, json: AdapticsWeb.ErrorJSON], layout: false],
  pubsub_server: Adaptics.PubSub,
  live_view: [signing_salt: "totNZ643"]

# Configures the mailer
#
# By default it uses the "Local" adapter which stores the emails
# locally. You can see the emails in your browser, at "/dev/mailbox".
#
# For production it's recommended to configure a different adapter
# at the `config/runtime.exs`.
config :adaptics, Adaptics.Mailer, adapter: Swoosh.Adapters.Local

# Swoosh API client is needed for adapters other than SMTP.
config :swoosh, :api_client, false

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.25.5",
  default: [
    args:
      ~w(js/app.js --bundle --target=esnext --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ],
  excalidraw: [
    args:
      ~w(js/excalidraw_css.js --bundle --target=esnext --outdir=../priv/static/assets --external:*.woff2 --external:*.woff --external:*.ttf --conditions=development),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# For TailwindCSS
config :tailwind, version: "3.4.3", default: [
  args: ~w(
    --config=tailwind.config.js
    --input=css/app.css
    --output=../priv/static/assets/app.css
  ),
  cd: Path.expand("../assets", __DIR__)
]

# Oban background job processing
config :adaptics, Oban,
  repo: Adaptics.Repo,
  queues: [documents: 5, embeddings: 2]

# Text embeddings (semantic axes) — local Ollama by default.
# Requires the model pulled in Ollama (`ollama pull qwen3-embedding:8b`);
# the app degrades gracefully (embedding features report unavailable) when
# Ollama is not running. Axes record the model they were computed with —
# recompute axes and rescore nodes after switching models.
config :adaptics, Adaptics.Embeddings,
  adapter: Adaptics.Embeddings.Ollama,
  url: "http://localhost:11434",
  model: "qwen3-embedding:8b"

# Entity extraction configuration
config :adaptics, :entity_extraction,
  python_path: "python3",
  script_path: Path.expand("../priv/python/extract_entities.py", __DIR__),
  venv_path: Path.expand("../priv/python/.venv", __DIR__)

# Geocoding configuration
config :adaptics, :geocoding,
  enabled: false,
  base_url: "https://nominatim.openstreetmap.org",
  user_agent: "adaptics/0.1.0"

# Document storage configuration
config :adaptics, :document_storage,
  adapter: Adaptics.Documents.Storage.Local,
  path: Path.expand("../priv/uploads/documents", __DIR__)

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"

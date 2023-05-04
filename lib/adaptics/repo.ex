defmodule Adaptics.Repo do
  use Ecto.Repo,
    otp_app: :adaptics,
    adapter: Ecto.Adapters.Postgres
end

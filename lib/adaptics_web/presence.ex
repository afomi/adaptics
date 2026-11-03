defmodule AdapticsWeb.Presence do
  use Phoenix.Presence,
    otp_app: :adaptics,
    pubsub_server: Adaptics.PubSub
end

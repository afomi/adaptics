defmodule Adaptics.Semantic.TopicModel do
  @moduledoc """
  A fitted topic model for one (space, embedding model) pair (FC2.21):
  cluster labels/terms/sizes plus each node's cluster and 3D PCA position.
  Written by `mix adaptics.topics`; read by /topo's Topics mode.
  """

  use Ecto.Schema

  schema "topic_models" do
    field :model, :string
    field :k, :integer
    field :topics, :map, default: %{}
    field :placements, :map, default: %{}

    belongs_to :space, Adaptics.Space

    timestamps()
  end
end

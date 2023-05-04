defmodule Adaptics.VisualFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Adaptics.Visual` context.
  """

  @doc """
  Generate a node.
  """
  def node_fixture(attrs \\ %{}) do
    {:ok, node} =
      attrs
      |> Enum.into(%{
        description: "some description",
        name: "some name"
      })
      |> Adaptics.Visual.create_node()

    node
  end

  @doc """
  Generate a link.
  """
  def link_fixture(attrs \\ %{}) do
    {:ok, link} =
      attrs
      |> Enum.into(%{
        description: "some description",
        from_id: 42,
        name: "some name",
        to_id: 42
      })
      |> Adaptics.Visual.create_link()

    link
  end
end

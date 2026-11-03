defmodule Adaptics.UserControlsFixtures do
  @moduledoc """
  This module defines test helpers for creating
  entities via the `Adaptics.UserControls` context.
  """

  @doc """
  Generate a mouse.
  """
  def mouse_fixture(attrs \\ %{}) do
    {:ok, mouse} =
      attrs
      |> Enum.into(%{
        x: 42,
        y: 42
      })
      |> Adaptics.UserControls.create_mouse()

    mouse
  end
end

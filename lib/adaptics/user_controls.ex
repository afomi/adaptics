defmodule Adaptics.UserControls do
  @moduledoc """
  The UserControls context.
  """

  import Ecto.Query, warn: false
  alias Adaptics.Repo

  alias Adaptics.UserControls.Mouse

  @doc """
  Returns the list of mice.

  ## Examples

      iex> list_mice()
      [%Mouse{}, ...]

  """
  def list_mice do
    Repo.all(Mouse)
  end

  @doc """
  Gets a single mouse.

  Raises `Ecto.NoResultsError` if the Mouse does not exist.

  ## Examples

      iex> get_mouse!(123)
      %Mouse{}

      iex> get_mouse!(456)
      ** (Ecto.NoResultsError)

  """
  def get_mouse!(id), do: Repo.get!(Mouse, id)

  @doc """
  Creates a mouse.

  ## Examples

      iex> create_mouse(%{field: value})
      {:ok, %Mouse{}}

      iex> create_mouse(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def create_mouse(attrs \\ %{}) do
    %Mouse{}
    |> Mouse.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a mouse.

  ## Examples

      iex> update_mouse(mouse, %{field: new_value})
      {:ok, %Mouse{}}

      iex> update_mouse(mouse, %{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def update_mouse(%Mouse{} = mouse, attrs) do
    mouse
    |> Mouse.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a mouse.

  ## Examples

      iex> delete_mouse(mouse)
      {:ok, %Mouse{}}

      iex> delete_mouse(mouse)
      {:error, %Ecto.Changeset{}}

  """
  def delete_mouse(%Mouse{} = mouse) do
    Repo.delete(mouse)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking mouse changes.

  ## Examples

      iex> change_mouse(mouse)
      %Ecto.Changeset{data: %Mouse{}}

  """
  def change_mouse(%Mouse{} = mouse, attrs \\ %{}) do
    Mouse.changeset(mouse, attrs)
  end
end

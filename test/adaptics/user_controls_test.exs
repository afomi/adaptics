defmodule Adaptics.UserControlsTest do
  use Adaptics.DataCase

  alias Adaptics.UserControls

  describe "mice" do
    alias Adaptics.UserControls.Mouse

    import Adaptics.UserControlsFixtures

    @invalid_attrs %{x: nil, y: nil}

    test "list_mice/0 returns all mice" do
      mouse = mouse_fixture()
      assert UserControls.list_mice() == [mouse]
    end

    test "get_mouse!/1 returns the mouse with given id" do
      mouse = mouse_fixture()
      assert UserControls.get_mouse!(mouse.id) == mouse
    end

    test "create_mouse/1 with valid data creates a mouse" do
      valid_attrs = %{x: 42, y: 42}

      assert {:ok, %Mouse{} = mouse} = UserControls.create_mouse(valid_attrs)
      assert mouse.x == 42
      assert mouse.y == 42
    end

    test "create_mouse/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = UserControls.create_mouse(@invalid_attrs)
    end

    test "update_mouse/2 with valid data updates the mouse" do
      mouse = mouse_fixture()
      update_attrs = %{x: 43, y: 43}

      assert {:ok, %Mouse{} = mouse} = UserControls.update_mouse(mouse, update_attrs)
      assert mouse.x == 43
      assert mouse.y == 43
    end

    test "update_mouse/2 with invalid data returns error changeset" do
      mouse = mouse_fixture()
      assert {:error, %Ecto.Changeset{}} = UserControls.update_mouse(mouse, @invalid_attrs)
      assert mouse == UserControls.get_mouse!(mouse.id)
    end

    test "delete_mouse/1 deletes the mouse" do
      mouse = mouse_fixture()
      assert {:ok, %Mouse{}} = UserControls.delete_mouse(mouse)
      assert_raise Ecto.NoResultsError, fn -> UserControls.get_mouse!(mouse.id) end
    end

    test "change_mouse/1 returns a mouse changeset" do
      mouse = mouse_fixture()
      assert %Ecto.Changeset{} = UserControls.change_mouse(mouse)
    end
  end
end

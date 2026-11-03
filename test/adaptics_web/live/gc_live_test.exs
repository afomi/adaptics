defmodule AdapticsWeb.GCLiveTest do
  use AdapticsWeb.ConnCase

  import Phoenix.LiveViewTest

  alias Adaptics.GenerationCitizen
  alias Adaptics.Spaces

  setup do
    space = GenerationCitizen.get_or_create_space()
    # Clear existing nodes so each test starts clean
    space |> Spaces.list_nodes_for_space() |> Enum.each(&Spaces.delete_node/1)

    {:ok, nonprofit} =
      Spaces.create_node(space, GenerationCitizen.org_attrs(%{
        "name" => "Youth Nonprofit",
        "org_type" => "nonprofit",
        "regions" => ["Portland"],
        "populations" => ["Youth"],
        "programs" => ["After-School Tutoring"],
      }, 80.0, 80.0))

    {:ok, school} =
      Spaces.create_node(space, GenerationCitizen.org_attrs(%{
        "name" => "Lincoln High",
        "org_type" => "school",
        "regions" => ["Portland"],
        "populations" => ["Youth"],
        "programs" => ["Mentorship", "College Prep"],
      }, 300.0, 80.0))

    {:ok, govt} =
      Spaces.create_node(space, GenerationCitizen.org_attrs(%{
        "name" => "Salem Agency",
        "org_type" => "government",
        "regions" => ["Salem"],
        "populations" => ["Seniors"],
        "programs" => ["Benefits Enrollment"],
      }, 80.0, 200.0))

    %{space: space, nonprofit: nonprofit, school: school, govt: govt}
  end

  describe "mount" do
    test "renders all nodes on load", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/gc")

      assert html =~ "Youth Nonprofit"
      assert html =~ "Lincoln High"
      assert html =~ "Salem Agency"
    end

    test "renders filter sidebar with facets", %{conn: conn} do
      {:ok, _view, html} = live(conn, ~p"/gc")

      assert html =~ "Portland"
      assert html =~ "Salem"
      assert html =~ "nonprofit"
      assert html =~ "school"
      assert html =~ "Youth"
      assert html =~ "Seniors"
    end

    test "shows total count", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/gc")
      count_text = view |> element("#gc-count") |> render()
      assert count_text =~ "3"
    end
  end

  describe "filtering" do
    test "toggling a region filter shows only matching nodes", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/gc")

      html = view |> element("button[phx-value-facet=regions][phx-value-value=Portland]") |> render_click()

      assert html =~ "Youth Nonprofit"
      assert html =~ "Lincoln High"
      refute html =~ ~s("name":"Salem Agency")
    end

    test "count updates when filter is active", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/gc")

      view |> element("button[phx-value-facet=regions][phx-value-value=Portland]") |> render_click()

      count_text = view |> element("#gc-count") |> render()
      assert count_text =~ "2"
      assert count_text =~ "3"
    end

    test "toggling org_type filter", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/gc")

      html = view |> element("button[phx-value-facet=org_type][phx-value-value=government]") |> render_click()

      assert html =~ "Salem Agency"
      refute html =~ ~s("name":"Youth Nonprofit")
      refute html =~ ~s("name":"Lincoln High")
    end

    test "two filters AND together", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/gc")

      view |> element("button[phx-value-facet=org_type][phx-value-value=nonprofit]") |> render_click()
      html = view |> element("button[phx-value-facet=regions][phx-value-value=Portland]") |> render_click()

      assert html =~ "Youth Nonprofit"
      refute html =~ ~s("name":"Lincoln High")
      refute html =~ ~s("name":"Salem Agency")
    end

    test "toggling same value off clears it", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/gc")

      view |> element("button[phx-value-facet=regions][phx-value-value=Portland]") |> render_click()
      view |> element("button[phx-value-facet=regions][phx-value-value=Portland]") |> render_click()

      # All nodes back — no filter active means no "Clear all" button
      html = render(view)
      refute html =~ "filter_clear"
    end

    test "clear all filters restores all nodes", %{conn: conn} do
      {:ok, view, _html} = live(conn, ~p"/gc")

      view |> element("button[phx-value-facet=regions][phx-value-value=Portland]") |> render_click()
      view |> element("button[phx-click=filter_clear]") |> render_click()

      count_text = view |> element("#gc-count") |> render()
      assert count_text =~ "3"
    end
  end
end

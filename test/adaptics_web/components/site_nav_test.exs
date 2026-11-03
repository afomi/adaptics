defmodule AdapticsWeb.SiteNavTest do
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest, only: [rendered_to_string: 1]

  # Routes that are deliberately not in the megamenu: data endpoints,
  # sub-pages reached from their parent, and dev tools.
  @not_in_nav ~w(/ /draw/data /draw/data/json /draw/meta /wiki/new /nodes/new /links/new /transcripts/ /dashboard /dev/mailbox)

  defp nav_paths do
    %{dark: false, __changed__: nil}
    |> AdapticsWeb.CoreComponents.site_nav()
    |> rendered_to_string()
    |> then(&Regex.scan(~r/href="([^"]+)"/, &1, capture: :all_but_first))
    |> List.flatten()
    |> Enum.reject(&(&1 == "/"))
  end

  defp page_routes do
    AdapticsWeb.Router
    |> Phoenix.Router.routes()
    |> Enum.filter(&(&1.verb == :get and not String.contains?(&1.path, ":")))
    |> Enum.map(& &1.path)
    |> Enum.uniq()
  end

  test "every nav link is a real route" do
    assert nav_paths() -- page_routes() == []
  end

  test "every top-level page is in the nav" do
    assert (page_routes() -- nav_paths()) -- @not_in_nav == []
  end

  test "five columns, with Transcripts under Canvas & Docs in dev/test" do
    html = rendered_to_string(AdapticsWeb.CoreComponents.site_nav(%{dark: false, __changed__: nil}))

    for title <- ["01 / Graphs &amp; Networks", "02 / 3D &amp; Space", "03 / Flows &amp; Systems", "04 / Canvas &amp; Docs", "05 / Misc"] do
      assert html =~ title
    end

    assert html =~ ~s(href="/transcripts")
  end
end

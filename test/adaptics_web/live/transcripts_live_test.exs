defmodule AdapticsWeb.TranscriptsLiveTest do
  use AdapticsWeb.ConnCase, async: false

  import Phoenix.LiveViewTest

  @demo "demo"
  @hello "11111111-1111-4111-8111-111111111111"

  setup do
    dir = Path.join(System.tmp_dir!(), "adaptics-tx-ui-#{System.unique_integer([:positive])}")
    previous = Application.get_env(:adaptics, Adaptics.Transcripts)

    Application.put_env(
      :adaptics,
      Adaptics.Transcripts,
      Keyword.put(previous, :embeddings_cache, dir)
    )

    on_exit(fn ->
      Application.put_env(:adaptics, Adaptics.Transcripts, previous)
      File.rm_rf!(dir)
    end)

    :ok
  end

  test "related turns expose measured evidence and link straight to other sessions", %{conn: conn} do
    {:ok, _, _} = Adaptics.Transcripts.Embeddings.embed(@demo)
    {:ok, view, _} = live(conn, ~p"/transcripts/#{@demo}/#{@hello}")
    refute has_element?(view, "#more-like-2")
    view |> element("#more-like-1") |> render_click()
    html = render_async(view)
    assert html =~ "dimensions"
    assert html =~ "cosine"

    assert has_element?(
             view,
             ~s(#related-1 a[href="/transcripts/demo/22222222-2222-4222-8222-222222222222#turn-1"])
           )

    refute has_element?(view, ~s(#related-1 a[href="/transcripts/demo/#{@hello}#turn-1"]))
  end

  test "unindexed turns explain how to build the local index", %{conn: conn} do
    {:ok, view, _} = live(conn, ~p"/transcripts/#{@demo}/#{@hello}")
    view |> element("#more-like-1") |> render_click()
    assert render_async(view) =~ "mix adaptics.transcripts.embed demo"
  end

  test "atlas links from the project and loads cached positions with source dates", %{conn: conn} do
    {:ok, _, _} = Adaptics.Transcripts.Embeddings.embed(@demo)
    {:ok, view, _} = live(conn, ~p"/transcripts/#{@demo}")
    assert has_element?(view, ~s(#turn-atlas-link[href="/transcripts/demo/map"]))
    {:ok, view, _} = live(conn, ~p"/transcripts/#{@demo}/map")
    assert render_async(view) =~ "unique points"
    assert has_element?(view, "#transcript-atlas[data-atlas]")

    atlas =
      view
      |> element("#transcript-atlas")
      |> render()
      |> Floki.parse_fragment!()
      |> Floki.attribute("data-atlas")
      |> hd()
      |> Jason.decode!()

    assert Enum.all?(atlas["points"], &(is_integer(&1["at"]) and length(&1["position"]) == 3))
    refute Map.has_key?(atlas, "index")
    render_hook(view, "atlas-related", %{id: "#{@hello}#1"})
    assert_reply(view, %{matches: [_ | _]})
    render_hook(view, "atlas-related", %{id: "nonexistent#1"})
    assert_reply(view, %{matches: []})
  end

  test "atlas empty state never needs Ollama", %{conn: conn} do
    {:ok, view, _} = live(conn, ~p"/transcripts/#{@demo}/map")
    assert render_async(view) =~ "Index this project"
    refute has_element?(view, "#transcript-atlas")
  end

  test "browses projects → sessions → one session", %{conn: conn} do
    {:ok, view, html} = live(conn, ~p"/transcripts")
    assert html =~ "demo"
    # reachable from the site's megamenu (column 04, dev/test only)
    assert html =~ ~s(href="/transcripts")
    refute html =~ "elsewhere"

    {:ok, view, html} =
      view |> element("#project-#{@demo} a") |> render_click() |> follow_redirect(conn)

    assert html =~ "Hello page"

    {:ok, view, html} =
      view |> element("#session-#{@hello} a") |> render_click() |> follow_redirect(conn)

    assert html =~ "Add a hello page."
    assert html =~ "Read ×2 · Edit"
    # a sidebar table of contents links to each turn on the page
    assert view |> element(~s(#transcript-toc a[href="#turn-2"]), "Thanks!") |> has_element?()
    assert view |> element("section#turn-2") |> has_element?()

    {:ok, _view, html} =
      view |> element("#back-to-transcripts") |> render_click() |> follow_redirect(conn)

    assert html =~ "Sort by"
    refute html =~ "Subagent chatter."
  end

  test "sorts projects; message counts arrive in the background", %{conn: conn} do
    {:ok, view, html} = live(conn, ~p"/transcripts")
    # default: by folder name
    assert html =~ ~r/alpha.*demo/s

    html = render_async(view)
    assert html =~ "5 messages"
    assert html =~ "1 message ·"

    html = view |> element("#sort a", "sessions") |> render_click()
    assert_patch(view, ~p"/transcripts?sort=sessions")
    assert html =~ ~r/demo.*alpha/s

    html = view |> element("#sort a", "messages") |> render_click()
    assert html =~ ~r/demo.*alpha/s

    html = view |> element("#sort a", "name") |> render_click()
    assert html =~ ~r/alpha.*demo/s
  end

  test "sorts a project's sessions and searches them", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/transcripts/#{@demo}")

    assert view |> element("#back-to-projects", "All projects") |> has_element?()

    html = render_async(view)
    assert html =~ "2 messages"
    assert html =~ "3 messages"

    html = view |> element("#sort a", "messages") |> render_click()
    assert_patch(view, ~p"/transcripts/#{@demo}?sort=messages")
    assert html =~ ~r/Untitled session prompt.*Hello page/s

    view |> form("#search", q: "router.ex") |> render_submit()
    assert_patch(view, ~p"/transcripts/#{@demo}?q=router.ex&sort=messages")
    html = render_async(view)

    assert html =~ ~s(href="/transcripts/#{@demo}/#{@hello}#turn-1")
    assert html =~ ~r{<mark[^>]*>router.ex</mark>}

    view |> form("#search", q: "nothing like this") |> render_submit()
    assert render_async(view) =~ "No matches"

    # clearing the search shows the sessions again
    view |> form("#search", q: "") |> render_submit()
    assert render(view) =~ "Sort by"
  end

  test "searches across projects from the index", %{conn: conn} do
    {:ok, view, _html} = live(conn, ~p"/transcripts")

    view |> form("#search", q: "prompt") |> render_submit()
    assert_patch(view, ~p"/transcripts?q=prompt")
    html = render_async(view)

    assert view |> element("#results-#{@demo}") |> has_element?()
    assert view |> element("#results-alpha") |> has_element?()
    assert html =~ ~r{<mark[^>]*>prompt</mark>}

    assert html =~
             ~s(href="/transcripts/alpha/44444444-4444-4444-8444-444444444444#turn-1")

    # sorting keeps the query; clearing it brings the project list back
    view |> element("#search") |> render_submit(%{q: ""})
    assert render(view) =~ "Sort by"
  end

  test "renders answers as markdown, with raw HTML shown as code", %{conn: conn} do
    {:ok, _view, html} =
      live(conn, ~p"/transcripts/#{@demo}/22222222-2222-4222-8222-222222222222")

    assert html =~ "<h2>"
    assert html =~ "<strong>green</strong>"
    assert html =~ "<li>"
    refute html =~ "<script>"
    assert html =~ "&lt;script&gt;"
    assert html =~ "&lt;b&gt;tag&lt;/b&gt;"
    # a work line expands to each call's input
    assert html =~ "<details open"
    assert html =~ "mix test"
  end

  test "an unknown project goes back to the list", %{conn: conn} do
    assert {:error, {:live_redirect, %{to: "/transcripts"}}} =
             live(conn, ~p"/transcripts/elsewhere")
  end
end

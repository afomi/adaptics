defmodule Adaptics.Wiki.RendererTest do
  use Adaptics.DataCase, async: true

  alias Adaptics.Wiki.Renderer

  describe "extract_links/1" do
    test "extracts simple wiki links" do
      body = "See [[Portland City Council]] for details."
      links = Renderer.extract_links(body)
      assert [{"Portland City Council", "Portland City Council"}] = links
    end

    test "extracts wiki links with display text" do
      body = "Visit [[Portland City Council|the council]]."
      links = Renderer.extract_links(body)
      assert [{"Portland City Council", "the council"}] = links
    end

    test "extracts multiple links" do
      body = "See [[Alice]] and [[Bob|Robert]]."
      links = Renderer.extract_links(body)
      assert [{"Alice", "Alice"}, {"Bob", "Robert"}] = links
    end

    test "returns empty list for nil" do
      assert [] = Renderer.extract_links(nil)
    end

    test "returns empty list for no links" do
      assert [] = Renderer.extract_links("No links here.")
    end
  end

  describe "linkify/2" do
    test "replaces link to existing page with anchor" do
      existing = MapSet.new(["portland-city-council"])
      result = Renderer.linkify("See [[Portland City Council]].", existing)
      assert result =~ "/wiki/portland-city-council"
      assert result =~ ">Portland City Council</a>"
      refute result =~ "wiki-new"
    end

    test "replaces link to non-existing page with create link" do
      result = Renderer.linkify("See [[Portland City Council]].", MapSet.new())
      assert result =~ "/wiki/new?title=Portland+City+Council"
      assert result =~ "wiki-new"
      assert result =~ "Portland City Council?</a>"
    end

    test "uses display text when provided" do
      existing = MapSet.new(["portland-city-council"])
      result = Renderer.linkify("See [[Portland City Council|the council]].", existing)
      assert result =~ ">the council</a>"
    end

    test "handles nil body" do
      assert "" = Renderer.linkify(nil, MapSet.new())
    end
  end

  describe "render/2" do
    test "renders markdown to HTML" do
      html = Renderer.render("**bold** text")
      assert html =~ "<strong>bold</strong>"
    end

    test "renders wiki links and markdown together" do
      existing = MapSet.new(["alice"])
      html = Renderer.render("Hello [[Alice]], meet [[Bob]].", existing)
      assert html =~ "/wiki/alice"
      assert html =~ ">Alice</a>"
      assert html =~ "wiki-new"
    end

    test "renders empty body" do
      html = Renderer.render("")
      assert html == ""
    end
  end
end

defmodule Adaptics.Wiki.Renderer do
  @moduledoc """
  Renders wiki page bodies from Markdown with [[wiki links]] to HTML.

  Pipeline:
  1. Replace [[wiki links]] with unique placeholders
  2. Render Markdown to HTML via Earmark
  3. Replace placeholders with HTML anchor tags
  """

  alias Adaptics.Wiki.Page

  @wiki_link_regex ~r/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/

  @doc """
  Renders a wiki page body to HTML, resolving wiki links against existing slugs.
  """
  def render(body, existing_slugs \\ MapSet.new())
  def render(nil, _existing_slugs), do: ""
  def render("", _existing_slugs), do: ""

  def render(body, existing_slugs) do
    {text_with_placeholders, placeholder_map} = replace_links_with_placeholders(body, existing_slugs)

    html = to_html(text_with_placeholders)

    Enum.reduce(placeholder_map, html, fn {placeholder, anchor_html}, acc ->
      String.replace(acc, placeholder, anchor_html)
    end)
  end

  @doc """
  Extracts all wiki links from the body text.
  Returns a list of `{title, display_text}` tuples.
  """
  def extract_links(body) when is_binary(body) do
    @wiki_link_regex
    |> Regex.scan(body)
    |> Enum.map(fn
      [_full, title, display] when is_binary(display) and display != "" ->
        {String.trim(title), String.trim(display)}

      [_full, title] ->
        {String.trim(title), String.trim(title)}

      [_full, title, ""] ->
        {String.trim(title), String.trim(title)}
    end)
  end

  def extract_links(_), do: []

  defp replace_links_with_placeholders(body, existing_slugs) do
    counter = :counters.new(1, [:atomics])

    {replaced, placeholders} =
      Regex.scan(@wiki_link_regex, body, return: :index)
      |> Enum.reduce({body, %{}}, fn [{start, len} | _groups], {text, map} ->
        :counters.add(counter, 1, 1)
        n = :counters.get(counter, 1)

        full_match = String.slice(body, start, len)
        [_full | captures] = Regex.run(@wiki_link_regex, full_match)

        title = String.trim(List.first(captures))

        display =
          case captures do
            [_, d] when d != "" -> String.trim(d)
            _ -> title
          end

        slug = Page.slugify(title)
        placeholder = "WIKILINK#{n}PLACEHOLDER"

        create_url = "/wiki/new?title=#{URI.encode_www_form(title)}"

        anchor_html =
          if MapSet.member?(existing_slugs, slug) do
            ~s(<a href="/wiki/#{slug}">#{escape_html(display)}</a>)
          else
            ~s(<a href="#{create_url}" class="wiki-new">#{escape_html(display)}?</a>)
          end

        {String.replace(text, full_match, placeholder, global: false), Map.put(map, placeholder, anchor_html)}
      end)

    {replaced, placeholders}
  end

  @doc """
  Replaces [[wiki links]] in the body with HTML anchor tags.
  Existing pages get normal links. Non-existing pages get a `?` linking to the create form.
  """
  def linkify(body, existing_slugs) when is_binary(body) do
    Regex.replace(@wiki_link_regex, body, fn _full, title, display ->
      title = String.trim(title)
      display = if display != "", do: String.trim(display), else: title
      slug = Page.slugify(title)
      create_url = "/wiki/new?title=#{URI.encode_www_form(title)}"

      if MapSet.member?(existing_slugs, slug) do
        ~s(<a href="/wiki/#{slug}">#{escape_html(display)}</a>)
      else
        ~s(<a href="#{create_url}" class="wiki-new">#{escape_html(display)}?</a>)
      end
    end)
  end

  def linkify(body, _existing_slugs), do: body || ""

  defp to_html(text) do
    case Earmark.as_html(text) do
      {:ok, html, _warnings} -> html
      {:error, _html, _errors} -> "<p>#{escape_html(text)}</p>"
    end
  end

  defp escape_html(text) do
    text
    |> String.replace("&", "&amp;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
    |> String.replace("\"", "&quot;")
  end
end

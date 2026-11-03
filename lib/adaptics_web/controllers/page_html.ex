defmodule AdapticsWeb.PageHTML do
  use AdapticsWeb, :html
  
  # Use the original index template content
  embed_templates "page_html/index.html"

  # For now, just embed the other templates that don't conflict
  embed_templates "page_html/*", except: ["page_html/index.html", "page_html/link_page.html"]
  
  def link_page(assigns) do
    ~H"""
    <p>Link page placeholder - <%= @passSomeVariableKey %></p>
    """
  end
end
defmodule AdapticsWeb.DrawLive.Data do
  use AdapticsWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Canvas Data")
     |> assign(:tldraw_data, nil)
     |> assign(:loading, true),
     layout: {AdapticsWeb.Layouts, :root}}
  end

  @impl true
  def handle_event("tldraw_data_loaded", %{"json" => json_string}, socket) when is_binary(json_string) do
    case Jason.decode(json_string) do
      {:ok, data} ->
        parsed = parse_tldraw_data(data)
        {:noreply,
         socket
         |> assign(:tldraw_data, parsed)
         |> assign(:loading, false)}

      {:error, _} ->
        {:noreply,
         socket
         |> assign(:tldraw_data, nil)
         |> assign(:loading, false)
         |> put_flash(:error, "Failed to parse tldraw data")}
    end
  end

  @impl true
  def handle_event("tldraw_data_loaded", %{"json" => nil}, socket) do
    {:noreply,
     socket
     |> assign(:tldraw_data, nil)
     |> assign(:loading, false)
     |> put_flash(:info, "No canvas data found. Draw something first!")}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div style="min-height: 100vh; background: #f9fafb; padding: 40px 20px; font-family: system-ui;">
      <div
        id="tldraw-data-reader"
        phx-hook="TldrawDataReader"
        phx-update="ignore"
      >
      <div style="max-width: 1200px; margin: 0 auto;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
          <h1 style="font-size: 36px; font-weight: bold; margin: 0;">Canvas Data</h1>
          <a
            href="/draw"
            style="padding: 10px 20px; background: #6366f1; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;"
          >
            Back to Canvas
          </a>
        </div>

        <%= if @loading do %>
          <div style="text-align: center; padding: 60px;">
            <p style="font-size: 18px; color: #6b7280;">Loading canvas data...</p>
          </div>
        <% else %>
          <%= if @tldraw_data do %>
            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 32px;">
              <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">Pages</h3>
                <p style="font-size: 32px; font-weight: bold; margin: 0; color: #111827;"><%= length(@tldraw_data.pages) %></p>
              </div>

              <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">Total Shapes</h3>
                <p style="font-size: 32px; font-weight: bold; margin: 0; color: #111827;"><%= @tldraw_data.total_shapes %></p>
              </div>

              <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">Text Blocks</h3>
                <p style="font-size: 32px; font-weight: bold; margin: 0; color: #111827;"><%= length(@tldraw_data.text_content) %></p>
              </div>

              <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">Arrows</h3>
                <p style="font-size: 32px; font-weight: bold; margin: 0; color: #111827;"><%= @tldraw_data.shape_counts["arrow"] || 0 %></p>
              </div>
            </div>

            <!-- Pages List -->
            <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 32px;">
              <h2 style="font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Pages</h2>
              <div style="display: grid; gap: 12px;">
                <%= for page <- @tldraw_data.pages do %>
                  <div style="padding: 16px; background: #f9fafb; border-radius: 6px; border-left: 4px solid #6366f1;">
                    <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0;"><%= page.name %></h3>
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      <%= page.shape_count %> shapes
                    </p>
                  </div>
                <% end %>
              </div>
            </div>

            <!-- Shape Type Breakdown -->
            <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 32px;">
              <h2 style="font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Shape Types</h2>
              <div style="display: grid; gap: 8px;">
                <%= for {type, count} <- @tldraw_data.shape_counts |> Enum.sort_by(fn {_, c} -> -c end) do %>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 4px;">
                    <span style="font-weight: 500; text-transform: capitalize;"><%= type %></span>
                    <span style="background: #6366f1; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600;"><%= count %></span>
                  </div>
                <% end %>
              </div>
            </div>

            <!-- Text Content -->
            <%= if length(@tldraw_data.text_content) > 0 do %>
              <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 32px;">
                <h2 style="font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">All Text Content</h2>
                <div style="display: grid; gap: 12px;">
                  <%= for {text, idx} <- Enum.with_index(@tldraw_data.text_content, 1) do %>
                    <div style="padding: 16px; background: #f9fafb; border-radius: 6px;">
                      <span style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px; display: block;">Text <%= idx %></span>
                      <p style="margin: 0; font-size: 14px; line-height: 1.6;"><%= text %></p>
                    </div>
                  <% end %>
                </div>
              </div>
            <% end %>

            <!-- Raw JSON (collapsible) -->
            <details style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <summary style="font-size: 18px; font-weight: 600; cursor: pointer; user-select: none;">
                Raw JSON Data
              </summary>
              <pre style="margin-top: 16px; padding: 16px; background: #1f2937; color: #f9fafb; border-radius: 6px; overflow-x: auto; font-size: 12px;"><%= Jason.encode!(@tldraw_data.raw, pretty: true) %></pre>
            </details>
          <% else %>
            <div style="text-align: center; padding: 60px; background: white; border-radius: 8px;">
              <p style="font-size: 18px; color: #6b7280; margin-bottom: 20px;">No canvas data found.</p>
              <a
                href="/draw"
                style="padding: 12px 24px; background: #6366f1; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;"
              >
                Go Draw Something!
              </a>
            </div>
          <% end %>
        <% end %>
      </div>
      </div>
    </div>
    """
  end

  defp parse_tldraw_data(data) do
    # Extract store data
    store = data["store"] || %{}
    records = Map.values(store)

    # Get pages
    pages =
      records
      |> Enum.filter(fn record -> record["typeName"] == "page" end)
      |> Enum.map(fn page ->
        page_id = page["id"]
        shapes_on_page =
          records
          |> Enum.filter(fn r ->
            r["typeName"] == "shape" && r["parentId"] == page_id
          end)

        %{
          id: page_id,
          name: page["name"] || "Untitled",
          shape_count: length(shapes_on_page)
        }
      end)

    # Get all shapes
    shapes =
      records
      |> Enum.filter(fn record -> record["typeName"] == "shape" end)

    # Extract text content
    text_content =
      shapes
      |> Enum.filter(fn shape -> shape["type"] == "text" end)
      |> Enum.map(fn shape -> get_in(shape, ["props", "text"]) end)
      |> Enum.reject(&is_nil/1)
      |> Enum.reject(&(&1 == ""))

    # Count shapes by type
    shape_counts =
      shapes
      |> Enum.group_by(fn shape -> shape["type"] end)
      |> Enum.map(fn {type, group} -> {type, length(group)} end)
      |> Enum.into(%{})

    %{
      pages: pages,
      total_shapes: length(shapes),
      shape_counts: shape_counts,
      text_content: text_content,
      raw: data
    }
  end
end

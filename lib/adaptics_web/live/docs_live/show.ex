defmodule AdapticsWeb.DocsLive.Show do
  use AdapticsWeb, :live_view

  alias Adaptics.Documents
  alias Adaptics.Documents.Storage

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    document = Documents.get_document!(id)
    similar = Documents.find_similar(document)

    {:ok,
     socket
     |> assign(:page_title, document.file_name)
     |> assign(:document, document)
     |> assign(:grouped_attributes, group_attributes(document.attributes))
     |> assign(:similar_documents, similar)
     |> assign(:file_url, Storage.url(document.storage_key))}
  end

  defp status_badge_class("pending"), do: "bg-gray-100 text-gray-700"
  defp status_badge_class("uploaded"), do: "bg-blue-100 text-blue-700"
  defp status_badge_class("extracting"), do: "bg-yellow-100 text-yellow-700"
  defp status_badge_class("ready"), do: "bg-green-100 text-green-700"
  defp status_badge_class("error"), do: "bg-red-100 text-red-700"
  defp status_badge_class(_), do: "bg-gray-100 text-gray-700"

  defp format_file_size(bytes) when bytes < 1024, do: "#{bytes} B"
  defp format_file_size(bytes) when bytes < 1_048_576, do: "#{Float.round(bytes / 1024, 1)} KB"
  defp format_file_size(bytes), do: "#{Float.round(bytes / 1_048_576, 1)} MB"

  defp entity_type_label("person"), do: "People"
  defp entity_type_label("organization"), do: "Organizations"
  defp entity_type_label("location"), do: "Locations"
  defp entity_type_label("keyword"), do: "Keywords"
  defp entity_type_label("program"), do: "Programs"
  defp entity_type_label("performance_metric"), do: "Performance Metrics"
  defp entity_type_label("policy"), do: "Policies"
  defp entity_type_label("modal_language"), do: "Modal Language"
  defp entity_type_label(key), do: String.capitalize(key)

  defp entity_type_icon("person"), do: "hero-user"
  defp entity_type_icon("organization"), do: "hero-building-office"
  defp entity_type_icon("location"), do: "hero-map-pin"
  defp entity_type_icon("keyword"), do: "hero-tag"
  defp entity_type_icon("program"), do: "hero-rectangle-stack"
  defp entity_type_icon("performance_metric"), do: "hero-chart-bar"
  defp entity_type_icon("policy"), do: "hero-scale"
  defp entity_type_icon("modal_language"), do: "hero-chat-bubble-left-right"
  defp entity_type_icon(_), do: "hero-document-text"

  defp group_attributes(attributes) do
    attributes
    |> Enum.group_by(& &1.key)
    |> Enum.sort_by(fn {key, _} ->
      case key do
        "person" -> 0
        "organization" -> 1
        "location" -> 2
        "keyword" -> 3
        "program" -> 4
        "performance_metric" -> 5
        "policy" -> 6
        "modal_language" -> 7
        _ -> 8
      end
    end)
  end

  defp pdf?(document), do: String.ends_with?(document.file_name, ".pdf")

  defp image?(document) do
    ext = document.file_name |> String.downcase() |> Path.extname()
    ext in ~w(.jpg .jpeg .png .gif .webp .svg)
  end
end

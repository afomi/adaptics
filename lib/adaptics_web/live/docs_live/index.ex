defmodule AdapticsWeb.DocsLive.Index do
  use AdapticsWeb, :live_view

  alias Adaptics.Documents

  @impl true
  def mount(_params, _session, socket) do
    documents = Documents.list_documents()

    {:ok,
     socket
     |> assign(:page_title, "Docs")
     |> assign(:documents, documents)}
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
end

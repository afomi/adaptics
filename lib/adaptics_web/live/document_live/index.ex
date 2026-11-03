defmodule AdapticsWeb.DocumentLive.Index do
  use AdapticsWeb, :live_view

  alias Adaptics.Documents

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Documents")
     |> assign(:documents, Documents.list_documents())
     |> allow_upload(:pdf,
       accept: ~w(.pdf),
       max_entries: 5,
       max_file_size: 50_000_000,
       auto_upload: true
     )}
  end

  @impl true
  def handle_event("validate", _params, socket) do
    {:noreply, socket}
  end

  @impl true
  def handle_event("save", _params, socket) do
    uploaded_documents =
      consume_uploaded_entries(socket, :pdf, fn %{path: path}, entry ->
        binary = File.read!(path)

        case Documents.store_and_create(entry.client_name, entry.client_size, binary) do
          {:ok, document} ->
            Documents.extract_text_async(document)
            {:ok, document}

          {:error, reason} ->
            {:postpone, reason}
        end
      end)

    count = length(uploaded_documents)

    {:noreply,
     socket
     |> assign(:documents, Documents.list_documents())
     |> put_flash(:info, "#{count} document(s) uploaded successfully.")}
  end

  @impl true
  def handle_event("delete", %{"id" => id}, socket) do
    document = Documents.get_document!(id)
    {:ok, _} = Documents.delete_document(document)

    {:noreply,
     socket
     |> assign(:documents, Documents.list_documents())
     |> put_flash(:info, "Document deleted.")}
  end

  defp error_to_string(:too_large), do: "File is too large (max 50MB)"
  defp error_to_string(:too_many_files), do: "Too many files (max 5)"
  defp error_to_string(:not_accepted), do: "Only PDF files are accepted"
  defp error_to_string(err), do: "Error: #{inspect(err)}"

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

defmodule AdapticsWeb.DocumentLive.Show do
  use AdapticsWeb, :live_view

  alias Adaptics.Documents

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    document = Documents.get_document!(id)

    {:ok,
     socket
     |> assign(:page_title, document.file_name)
     |> assign(:document, document)
     |> assign(:grouped_attributes, group_attributes(document.attributes))
     |> assign(:attribute_form, to_form(Documents.change_attribute(%Documents.DocumentAttribute{})))
     |> assign(:schema_type_form, to_form(%{"schema_type" => document.schema_type || ""}))}
  end

  @impl true
  def handle_event("run_extraction", _params, socket) do
    document = socket.assigns.document

    case Documents.extract_entities_async(document) do
      {:ok, _job} ->
        {:noreply, put_flash(socket, :info, "Entity extraction queued.")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Failed to queue entity extraction.")}
    end
  end

  @impl true
  def handle_event("save_attribute", %{"document_attribute" => attr_params}, socket) do
    params = Map.put(attr_params, "document_id", socket.assigns.document.id)

    case Documents.create_attribute(params) do
      {:ok, _attr} ->
        {:noreply, reload_document(socket, "Attribute added.")}

      {:error, changeset} ->
        {:noreply, assign(socket, :attribute_form, to_form(changeset))}
    end
  end

  @impl true
  def handle_event("delete_attribute", %{"id" => id}, socket) do
    attribute = Documents.get_attribute!(id)
    {:ok, _} = Documents.delete_attribute(attribute)

    {:noreply, reload_document(socket, "Attribute deleted.")}
  end

  @impl true
  def handle_event("save_schema_type", %{"schema_type" => schema_type}, socket) do
    value = if schema_type == "", do: nil, else: schema_type

    case Documents.update_document(socket.assigns.document, %{schema_type: value}) do
      {:ok, _document} ->
        {:noreply, reload_document(socket, "Schema type updated.")}

      {:error, _changeset} ->
        {:noreply, put_flash(socket, :error, "Failed to update schema type.")}
    end
  end

  @impl true
  def handle_event("delete", _params, socket) do
    {:ok, _} = Documents.delete_document(socket.assigns.document)

    {:noreply,
     socket
     |> put_flash(:info, "Document deleted.")
     |> push_navigate(to: ~p"/documents")}
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

  defp source_badge_class("manual"), do: "bg-blue-100 text-blue-700"
  defp source_badge_class("extracted"), do: "bg-green-100 text-green-700"
  defp source_badge_class("llm"), do: "bg-purple-100 text-purple-700"
  defp source_badge_class(_), do: "bg-gray-100 text-gray-700"

  defp entity_type_label("person"), do: "People"
  defp entity_type_label("organization"), do: "Organizations"
  defp entity_type_label("location"), do: "Locations"
  defp entity_type_label("keyword"), do: "Keywords"
  defp entity_type_label("geocoded_location"), do: "Geocoded Locations"
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

  defp reload_document(socket, flash_message) do
    document = Documents.get_document!(socket.assigns.document.id)

    socket
    |> assign(:document, document)
    |> assign(:grouped_attributes, group_attributes(document.attributes))
    |> assign(:attribute_form, to_form(Documents.change_attribute(%Documents.DocumentAttribute{})))
    |> put_flash(:info, flash_message)
  end
end

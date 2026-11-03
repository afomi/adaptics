defmodule AdapticsWeb.SemanticAxesLive.Index do
  @moduledoc """
  Manage semantic axes (FC2.12): define poles + anchor phrases, compute the
  axis vector (requires the embedding backend), inspect quality metrics, and
  score a space's nodes onto computed axes for use in `/canvas` semantic
  layouts. Every action reports explicit success or failure — no silent
  no-ops.
  """

  use AdapticsWeb, :live_view

  alias Adaptics.Semantic
  alias Adaptics.Semantic.Axis
  alias Adaptics.Spaces

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Semantic Axes")
     |> assign(:form, to_form(Axis.changeset(%Axis{}, %{}), as: :axis))
     |> assign(:status, nil)
     |> load_axes()}
  end

  @impl true
  def handle_event("create_axis", %{"axis" => params}, socket) do
    params = split_examples(params)

    case Semantic.create_axis(params) do
      {:ok, axis} ->
        {:noreply,
         socket
         |> assign(:form, to_form(Axis.changeset(%Axis{}, %{}), as: :axis))
         |> assign(:status, {:ok, "Axis \"#{axis.name}\" created — compute it to derive the vector."})
         |> load_axes()}

      {:error, changeset} ->
        {:noreply,
         socket
         |> assign(:form, to_form(changeset, as: :axis))
         |> assign(:status, {:error, "Axis not saved — check the form."})}
    end
  end

  @impl true
  def handle_event("compute_axis", %{"id" => id}, socket) do
    axis = Semantic.get_axis!(id)

    case Semantic.compute_axis_vector(axis) do
      {:ok, computed} ->
        {:noreply,
         socket
         |> assign(:status, {:ok, "Computed \"#{computed.name}\" with #{computed.model} — pole separation #{format_metric(computed.metadata["pole_separation"])}."})
         |> load_axes()}

      {:error, :unavailable} ->
        {:noreply,
         assign(socket, :status, {:error, "Embedding backend unavailable — is Ollama running? (ollama pull #{Adaptics.Embeddings.model()})"})}

      {:error, reason} ->
        {:noreply, assign(socket, :status, {:error, "Compute failed: #{inspect(reason)}"})}
    end
  end

  @impl true
  def handle_event("score_nodes", %{"id" => id}, socket) do
    axis = Semantic.get_axis!(id)

    with {:ok, embed_result} <- embed_all_spaces(),
         {:ok, score_result} <- Semantic.score_nodes(axis) do
      {:noreply,
       socket
       |> assign(
         :status,
         {:ok,
          "Embedded #{embed_result.embedded} new node(s) (#{embed_result.failed} failed); " <>
            "scored #{score_result.scored}, skipped #{score_result.skipped} without embeddings."}
       )
       |> load_axes()}
    else
      {:error, reason} ->
        {:noreply, assign(socket, :status, {:error, "Scoring failed: #{inspect(reason)}"})}
    end
  end

  @impl true
  def handle_event("delete_axis", %{"id" => id}, socket) do
    axis = Semantic.get_axis!(id)
    {:ok, _} = Semantic.delete_axis(axis)

    {:noreply,
     socket
     |> assign(:status, {:ok, "Deleted \"#{axis.name}\"."})
     |> load_axes()}
  end

  # Embed un-embedded nodes across every space; stop at the first backend error.
  defp embed_all_spaces do
    Spaces.list_spaces()
    |> Enum.reduce_while({:ok, %{embedded: 0, failed: 0}}, fn space, {:ok, acc} ->
      case Semantic.embed_nodes(space) do
        {:ok, result} ->
          {:cont, {:ok, %{embedded: acc.embedded + result.embedded, failed: acc.failed + result.failed}}}

        {:error, reason} ->
          {:halt, {:error, reason}}
      end
    end)
  end

  defp load_axes(socket) do
    axes = Semantic.list_axes()
    counts = Map.new(axes, fn axis -> {axis.id, Semantic.score_count(axis)} end)

    socket
    |> assign(:axes, axes)
    |> assign(:score_counts, counts)
  end

  # Textareas hold one anchor phrase per line.
  defp split_examples(params) do
    params
    |> Map.update("positive_examples", [], &split_lines/1)
    |> Map.update("negative_examples", [], &split_lines/1)
  end

  defp split_lines(text) when is_binary(text) do
    text
    |> String.split("\n")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end

  defp split_lines(list) when is_list(list), do: list

  defp format_metric(nil), do: "—"
  defp format_metric(value) when is_float(value), do: :erlang.float_to_binary(value, decimals: 3)
  defp format_metric(value), do: to_string(value)
end

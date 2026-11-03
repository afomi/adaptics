defmodule AdapticsWeb.WorkflowRoomChannel do
  use AdapticsWeb, :channel

  def join("workflow_room:lobby", payload, socket) do
    if authorized?(payload) do
      {:ok, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (workflow_room:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end

  # def join("room:lobby", _message, socket) do
  #   {:ok, socket}
  # end

  def handle_in("mousemove", %{"x" => x, "y" => y}, socket) do
    IO.puts("heeeeeeeeeer #{x} #{y}")
    broadcast(socket, "mousemove", %{"x" => x, "y" => y})
    {:noreply, socket}
  end
end

defmodule AdapticspWeb.GameBoardLive do
  use AdapticsWeb, :live_view
  alias Phoenix.PubSub

  @topic_prefix "game:"
  @min_coord -1.0
  @max_coord  1.0
  @memo_max   160

  @impl true
  def mount(%{"id" => game_id} = _params, session, socket) do
    user = session["current_user"] || %{"id" => "guest"} # adapt to your auth
    topic = @topic_prefix <> to_string(game_id)

    if connected?(socket), do: PubSub.subscribe(MyApp.PubSub, topic)

    {:ok,
     socket
     |> assign(
       game_id: game_id,
       topic: topic,
       user_id: user["id"],
       points: [],        # [{x,y,z,team,user_id,memo,at}]
       balance: 100,      # example local balance
       world_supply: 21_000_000,
       form: %{"x" => "0.0", "y" => "0.0", "z" => "0.0", "memo" => ""}
     )}
  end

  @impl true
  def handle_event("place_dot", %{"dot" => params}, socket) do
    with {:ok, x} <- parse_coord(params["x"]),
         {:ok, y} <- parse_coord(params["y"]),
         {:ok, z} <- parse_coord(params["z"]),
         :ok      <- validate_memo(params["memo"]),
         true     <- socket.assigns.balance > 0 and socket.assigns.world_supply > 0
    do
      dot = %{
        x: clamp(x), y: clamp(y), z: clamp(z),
        team: params["team"] || "red",
        memo: params["memo"] || "",
        user_id: socket.assigns.user_id,
        at: System.system_time(:millisecond)
      }

      # persist if you have a DB (GameDot.create!(...)) – omitted here
      # broadcast to all viewers of this game
      PubSub.broadcast(MyApp.PubSub, socket.assigns.topic, {:dot_created, dot})

      # update locally and notify the client Three.js via push_event
      socket =
        socket
        |> update(:points, &[dot | &1])
        |> update(:balance, &(&1 - 1))
        |> update(:world_supply, &(&1 - 1))
        |> push_event("dot_created", %{dot: dot})

      {:noreply, assign(socket, :form, %{"x" => "0.0", "y" => "0.0", "z" => "0.0", "memo" => ""})}
    else
      {:error, :coord} ->
        {:noreply, put_flash(socket, :error, "x, y, z must be floats in [-1, 1].")}

      {:error, :memo} ->
        {:noreply, put_flash(socket, :error, "Memo must be ≤ #{@memo_max} chars.")}

      false ->
        {:noreply, put_flash(socket, :error, "Insufficient balance or world supply.")}
    end
  end

  @impl true
  def handle_info({:dot_created, dot}, socket) do
    # fan-in from other clients
    {:noreply,
     socket
     |> update(:points, &[dot | &1])
     |> push_event("dot_created", %{dot: dot})}
  end

  defp parse_coord(nil), do: {:error, :coord}
  defp parse_coord(str) do
    case Float.parse(to_string(str)) do
      {val, _} when val >= @min_coord and val <= @max_coord -> {:ok, val}
      _ -> {:error, :coord}
    end
  end

  defp validate_memo(m) when is_binary(m) and byte_size(m) <= @memo_max, do: :ok
  defp validate_memo(_), do: {:error, :memo}

  defp clamp(v) when v < @min_coord, do: @min_coord
  defp clamp(v) when v > @max_coord, do: @max_coord
  defp clamp(v), do: v

  @impl true
  def render(assigns) do
    ~H"""
    <div id="game-board" class="flex h-screen bg-slate-900 text-slate-100" phx-hook="GameBoard">
      <!-- Left panel -->
      <aside class="w-[380px] max-w-[46vw] p-4 space-y-4 border-r border-slate-800 overflow-y-auto">
        <header class="space-y-1">
          <h1 class="text-xl font-semibold">Coordination Dots</h1>
          <p class="text-slate-400 text-sm">
            Place dots in a 3D unit cube centered at the origin. Each dot costs 1 token.
          </p>
        </header>

        <!-- HUD -->
        <section class="grid grid-cols-2 gap-3 text-sm">
          <div class="p-3 rounded-xl bg-slate-800/50">
            <div class="text-slate-400">Your balance</div>
            <div id="balance" class="text-2xl hud-label"><%= @balance %></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-800/50">
            <div class="text-slate-400">World supply left</div>
            <div id="worldSupply" class="text-2xl hud-label"><%= @world_supply %></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-800/50">
            <div class="text-slate-400">Your dots</div>
            <div id="yourDots" class="text-2xl hud-label"><%= Enum.count(Enum.filter(@points, &(&1.user_id == @user_id))) %></div>
          </div>
          <div class="p-3 rounded-xl bg-slate-800/50">
            <div class="text-slate-400">Your score</div>
            <div id="yourScore" class="text-2xl hud-label">0.000</div>
          </div>
        </section>

        <!-- Place Dot Form -->
        <section>
          <h2 class="text-sm font-medium mb-2">Place a dot</h2>
          <.form for={@form} id="place-dot-form" phx-submit="place_dot">
            <div class="flex items-end gap-2">
              <div class="w-1/3">
                <label class="block text-slate-300 text-xs mb-1" for="x_input">x (-1..1)</label>
                <input id="x_input" name="dot[x]" type="number" step="0.001" min="-1" max="1" value={@form["x"]} class="w-full rounded-lg bg-slate-800 border border-slate-700 p-2" />
              </div>
              <div class="w-1/3">
                <label class="block text-slate-300 text-xs mb-1" for="y_input">y (-1..1)</label>
                <input id="y_input" name="dot[y]" type="number" step="0.001" min="-1" max="1" value={@form["y"]} class="w-full rounded-lg bg-slate-800 border border-slate-700 p-2" />
              </div>
              <div class="w-1/3">
                <label class="block text-slate-300 text-xs mb-1" for="z_input">z (-1..1)</label>
                <input id="z_input" name="dot[z]" type="number" step="0.001" min="-1" max="1" value={@form["z"]} class="w-full rounded-lg bg-slate-800 border border-slate-700 p-2" />
              </div>
            </div>

            <div class="mt-2">
              <label class="block text-slate-300 text-xs mb-1" for="teamSelect">Team / Color</label>
              <select id="teamSelect" name="dot[team]" class="w-full rounded-lg bg-slate-800 border border-slate-700 p-2">
                <option value="red">Red</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
                <option value="purple">Purple</option>
              </select>
            </div>

            <div class="mt-2">
              <label class="block text-slate-300 text-xs mb-1" for="memo_input">Memo (160 chars)</label>
              <textarea id="memo_input" name="dot[memo]" maxlength="160" rows="2" class="w-full rounded-lg bg-slate-800 border border-slate-700 p-2"><%= @form["memo"] %></textarea>
              <div class="text-[11px] text-slate-400 mt-1"><span id="memo_count"></span></div>
            </div>

            <div class="mt-3">
              <button id="place_dot_submit" class="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700">
                Place dot (1 token)
              </button>
            </div>
          </.form>
        </section>
      </aside>

      <!-- 3D canvas -->
      <main class="flex-1 relative">
        <div id="canvas-container" class="w-full h-full"></div>
        <div class="absolute left-3 bottom-3 text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-md">
          Tip: Orbit with mouse, Pan with right-drag, Zoom with wheel.
        </div>
      </main>
    </div>
    """
  end
end

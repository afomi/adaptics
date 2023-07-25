require IEx
# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     Adaptics.Repo.insert!(%Adaptics.SomeSchema{})
#
# We recommend using the bang functions (`insert!`, `update!`
# and so on) as they will fail if something goes wrong.
import Ecto.Query


Adaptics.Repo.delete_all Adaptics.Visual.Node
Adaptics.Repo.delete_all Adaptics.Visual.Link

defmodule Adaptics.Helper do
  def insert_node(record_data) do
    %Adaptics.Visual.Node{
      name: record_data["name"],
      description: record_data["description"],
      hash: record_data["hash"],
      wardley_x: :rand.uniform() * 100,
      wardley_y: :rand.uniform() * 100,
      wardley_text: record_data["name"]
    }
    |> Adaptics.Repo.insert()
  end

  def insert_link(record_data) do
    %Adaptics.Visual.Link{
      from_hash: record_data["from_hash"],
      to_hash: record_data["to_hash"]
    }
    |> Adaptics.Repo.insert()
  end
end

file_path = "unique_sources.json"
file_path
  |> File.read!()
  |> Jason.decode!()
  |> Enum.each(&Adaptics.Helper.insert_node/1)

file_path = "unique_components.json"
file_path
  |> File.read!()
  |> Jason.decode!()
  |> Enum.each(&Adaptics.Helper.insert_node/1)

file_path = "ivn_links.json"
file_path
  |> File.read!()
  |> Jason.decode!()
  |> Enum.each(&Adaptics.Helper.insert_link/1)

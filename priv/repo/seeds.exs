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
Adaptics.Repo.delete_all Adaptics.Visual.Node
Adaptics.Repo.delete_all Adaptics.Visual.Link

(1..100) |> Enum.each(fn i ->
  Adaptics.Repo.insert! %Adaptics.Visual.Node{
    name: "Name #{i}",
    description: "Description #{i}"
  }
end)

(1..100) |> Enum.each(fn i ->
  Adaptics.Repo.insert! %Adaptics.Visual.Link{
    name: "Name #{i}",
    description: "Description #{i}",
    from_id: Enum.random(1..100),
    to_id: Enum.random(1..100)
  }
end)

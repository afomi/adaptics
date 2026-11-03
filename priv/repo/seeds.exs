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
  def insert_source_node(record_data) do
    %Adaptics.Visual.Node{
      name: record_data["name"],
      description: record_data["description"],
      hash: record_data["hash"],
      kind: "source",
      wardley_x: :rand.uniform() * 100,
      wardley_y: :rand.uniform() * 100,
      z: :rand.uniform() * 100,
      wardley_text: record_data["name"]
    }
    |> Adaptics.Repo.insert()
  end

  def insert_component_node(record_data) do
    %Adaptics.Visual.Node{
      name: record_data["name"],
      description: record_data["description"],
      hash: record_data["hash"],
      kind: "component",
      wardley_x: :rand.uniform() * 100,
      wardley_y: :rand.uniform() * 100,
      z: :rand.uniform() * 100,
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

for path <- ["unique_sources.json", "unique_components.json", "ivn_links.json"] do
  if File.exists?(path) do
    records = path |> File.read!() |> Jason.decode!()
    case path do
      "unique_sources.json"    -> Enum.each(records, &Adaptics.Helper.insert_source_node/1)
      "unique_components.json" -> Enum.each(records, &Adaptics.Helper.insert_component_node/1)
      "ivn_links.json"         -> Enum.each(records, &Adaptics.Helper.insert_link/1)
    end
  end
end

# ── Generation Citizen seed data ───────────────────────────────────────────
# 6 civic orgs; Org 3 and Org 5 have multiple programs.
# Layout: two rows of three, 200px spacing.

alias Adaptics.GenerationCitizen
alias Adaptics.Spaces

gc_space = GenerationCitizen.get_or_create_space()

# Clear existing GC nodes so seeds are idempotent
existing = Spaces.list_nodes_for_space(gc_space)
Enum.each(existing, &Spaces.delete_node/1)

orgs = [
  %{
    "name"        => "Portland Youth Advocates",
    "org_type"    => "nonprofit",
    "website"     => "https://pya.example.org",
    "logo"        => "",
    "values"      => ["equity", "youth empowerment"],
    "programs"    => ["After-School Tutoring"],
    "regions"     => ["Portland"],
    "populations" => ["Youth"],
    "address"     => "123 NE Broadway, Portland, OR 97232",
  },
  %{
    "name"        => "Salem Community Health",
    "org_type"    => "nonprofit",
    "website"     => "https://sch.example.org",
    "logo"        => "",
    "values"      => ["health equity", "access"],
    "programs"    => ["Free Clinic"],
    "regions"     => ["Salem"],
    "populations" => ["Low-income adults", "Uninsured"],
    "address"     => "450 Commercial St SE, Salem, OR 97301",
  },
  # Multi-program org 1
  %{
    "name"        => "Oregon Literacy Council",
    "org_type"    => "nonprofit",
    "website"     => "https://olc.example.org",
    "logo"        => "",
    "values"      => ["education", "equity", "community"],
    "programs"    => ["Adult ESL Classes", "Family Reading Night", "Workforce Literacy"],
    "regions"     => ["Portland", "Salem", "Eugene"],
    "populations" => ["Adults", "Immigrants and Refugees", "Job Seekers"],
    "address"     => "811 SW Naito Pkwy, Portland, OR 97204",
  },
  %{
    "name"        => "Eugene Food Bank",
    "org_type"    => "nonprofit",
    "website"     => "https://efb.example.org",
    "logo"        => "",
    "values"      => ["food security", "dignity"],
    "programs"    => ["Weekly Food Pantry"],
    "regions"     => ["Eugene"],
    "populations" => ["Families", "Seniors", "Low-income adults"],
    "address"     => "770 Bailey Hill Rd, Eugene, OR 97402",
  },
  # Multi-program org 2
  %{
    "name"        => "Multnomah County Youth Services",
    "org_type"    => "government",
    "website"     => "https://multco.example.gov",
    "logo"        => "",
    "values"      => ["public service", "equity", "youth development"],
    "programs"    => ["Summer Youth Employment", "Juvenile Diversion", "Mental Health Outreach"],
    "regions"     => ["Portland"],
    "populations" => ["Youth", "At-risk youth"],
    "address"     => "421 SW 5th Ave, Portland, OR 97204",
  },
  %{
    "name"        => "Bend Immigrant Resource Center",
    "org_type"    => "nonprofit",
    "website"     => "https://birc.example.org",
    "logo"        => "",
    "values"      => ["inclusion", "belonging"],
    "programs"    => ["Legal Aid Clinics"],
    "regions"     => ["Bend"],
    "populations" => ["Immigrants and Refugees"],
    "address"     => "20 NW Lava Rd, Bend, OR 97703",
  },
]

# Grid layout: 3 columns × 2 rows, 220px × 100px spacing
orgs
|> Enum.with_index()
|> Enum.each(fn {org, i} ->
  col = rem(i, 3)
  row = div(i, 3)
  x = 80.0 + col * 220.0
  y = 80.0 + row * 120.0
  attrs = GenerationCitizen.org_attrs(org, x, y)
  {:ok, _node} = Spaces.create_node(gc_space, attrs)
end)

IO.puts("Seeded #{length(orgs)} Generation Citizen orgs into space '#{gc_space.slug}'")

# ── Semantic axes (FC2) — starter axes; vectors computed on demand at /axes ──

semantic_axes = [
  %{
    "name" => "Verbosity",
    "negative_pole" => "concise",
    "positive_pole" => "verbose",
    "negative_examples" => [
      "Brief and to the point.",
      "Says it in one sentence.",
      "Terse, economical phrasing with no filler."
    ],
    "positive_examples" => [
      "Long-winded and elaborate.",
      "Explains every detail at considerable length.",
      "Winding prose that circles the point repeatedly."
    ]
  },
  %{
    "name" => "Explicitness",
    "negative_pole" => "implicit",
    "positive_pole" => "explicit",
    "negative_examples" => [
      "Left unstated, implied between the lines.",
      "Assumes shared context without saying so.",
      "Hints at the conclusion without naming it."
    ],
    "positive_examples" => [
      "Spelled out step by step with nothing assumed.",
      "States its premises and conclusion directly.",
      "Defines every term before using it."
    ]
  }
]

Enum.each(semantic_axes, fn attrs ->
  case Adaptics.Semantic.get_axis_by_name(attrs["name"]) do
    nil ->
      {:ok, _axis} = Adaptics.Semantic.create_axis(attrs)
      IO.puts("Seeded semantic axis '#{attrs["name"]}'")

    _existing ->
      IO.puts("Semantic axis '#{attrs["name"]}' already present — skipped")
  end
end)

defmodule Mix.Tasks.Adaptics.ImportMuniCodes do
  @shortdoc "Import municipal-code chapters from ogenda's database as Nodes"

  @moduledoc """
  Reads the ingested provision trees from ogenda's Postgres (bills/provisions,
  see ~/workspace/ogenda INGEST.md § Municipal Codes) and imports one Node per
  chapter into the "#{Adaptics.MuniCodes.space_slug()}" Space.

      mix adaptics.import_muni_codes
      mix adaptics.import_muni_codes --ogenda-db ogenda_dev

  Idempotent: re-running updates chapters in place (keyed by
  metadata.code_ref). Embedding is NOT done here — run scoring from /axes or
  `Adaptics.Semantic.embed_nodes/1` afterwards.
  """

  use Mix.Task

  @bills [
    {"vacaville-muni-code", "vacaville"},
    {"fairfield-muni-code", "fairfield"},
    {"benicia-muni-code", "benicia"},
    {"rio-vista-muni-code", "rio-vista"}
  ]

  @impl Mix.Task
  def run(args) do
    {opts, _, _} = OptionParser.parse(args, strict: [ogenda_db: :string])
    ogenda_db = Keyword.get(opts, :ogenda_db, "ogenda_dev")

    Mix.Task.run("app.start")

    {:ok, conn} =
      Postgrex.start_link(
        hostname: "localhost",
        username: System.get_env("USER"),
        database: ogenda_db
      )

    space = Adaptics.MuniCodes.get_or_create_space()

    rows = Enum.flat_map(@bills, &load_chapter_rows(conn, &1))

    if rows == [] do
      Mix.raise("No chapters found in #{ogenda_db} — are the codes ingested? (mix ogenda.ingest_code)")
    end

    {:ok, summary} = Adaptics.MuniCodes.import_chapters(space, rows)

    per_city = Enum.frequencies_by(rows, & &1.city)

    Mix.shell().info(
      "Imported into space '#{space.slug}': #{summary.created} created, #{summary.updated} updated " <>
        "(#{Enum.map_join(per_city, ", ", fn {c, n} -> "#{c}: #{n} chapters" end)})"
    )

    GenServer.stop(conn)
  end

  # Loads all provisions for a bill and rolls sections up to their chapter
  # ancestor (Vacaville: title→chapter→section; Fairfield: chapter→article→
  # section — so we walk parents until we hit a chapter).
  defp load_chapter_rows(conn, {slug, city}) do
    %{rows: provision_rows} =
      Postgrex.query!(
        conn,
        """
        SELECT p.xml_id, p.parent_xml_id, p.node_type, p.enum, p.header, p.changed, p.position
        FROM provisions p JOIN bills b ON b.id = p.bill_id
        WHERE b.slug = $1
        ORDER BY p.position
        """,
        [slug]
      )

    provisions =
      Enum.map(provision_rows, fn [xml_id, parent, type, enum, header, changed, position] ->
        %{xml_id: xml_id, parent: parent, type: type, enum: enum, header: header, changed: changed, position: position}
      end)

    by_xml_id = Map.new(provisions, &{&1.xml_id, &1})
    chapters = provisions |> Enum.filter(&(&1.type == "chapter")) |> Enum.sort_by(& &1.position)
    sections = Enum.filter(provisions, &(&1.type == "section"))

    sections_by_chapter =
      sections
      |> Enum.group_by(&chapter_ancestor(&1, by_xml_id))
      |> Map.delete(nil)

    Enum.map(chapters, fn chapter ->
      chapter_sections =
        sections_by_chapter |> Map.get(chapter.xml_id, []) |> Enum.sort_by(& &1.position)

      parent = chapter.parent && by_xml_id[chapter.parent]

      %{
        city: city,
        enum: chapter.enum,
        header: chapter.header,
        parent_header: parent && parent.header,
        section_headings: Enum.map(chapter_sections, &String.trim("#{&1.enum} #{&1.header}")),
        changed_blobs: chapter_sections |> Enum.map(& &1.changed) |> Enum.reject(&is_nil/1)
      }
    end)
  end

  defp chapter_ancestor(provision, by_xml_id) do
    case by_xml_id[provision.parent] do
      nil -> nil
      %{type: "chapter", xml_id: xml_id} -> xml_id
      parent -> chapter_ancestor(parent, by_xml_id)
    end
  end
end

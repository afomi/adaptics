# USE CASES

Completed user-story scenarios with passing tests.
Each entry names the story, the test file(s) that cover it, and the route or module it lives in.
Stories are grouped by feature thread. Reference docs are listed under each thread.

---

## Foundation

### Story 20 — Codebase Audit
Every route tagged `core`, `experiment`, or `deprecated`; findings documented in `docs/audit.md`.
- **Test:** manual — `docs/audit.md` reviewed for completeness
- **Output:** `docs/audit.md`

### Story 21 — Data Model Documented
`Node`, `Edge`, `Space`, and `Layer` defined with attributes, relationships, and migration order.
- **Test:** manual — `DATA_MODEL.md` reviewed
- **Output:** `DATA_MODEL.md`

---

## Canvas Core

**Reference:** `DATA_MODEL.md`, `CONCEPT_INVENTORY.md`

### Story M1–M3 — Migrations: Spaces, Node space_id, links → edges
`create_spaces`, `add_space_id_to_nodes`, rename `links` → `edges` with `space_id`.
- **Tests:** `test/adaptics/spaces_test.exs`, `test/adaptics/visual_test.exs`

### Story 22 — Persist Node position and label
Node `x`, `y`, `name` stored and restored on reload.
- **Tests:** `test/adaptics/visual_test.exs`, `test/adaptics_web/live/canvas_live_test.exs`
- **Route:** `/canvas` (`CanvasLive`)

### Story 23 — Drag a Node and edit its label
Drag updates `x`/`y`; inline label editor saves on blur/Enter.
- **Tests:** `test/adaptics_web/live/canvas_live_test.exs`
- **Route:** `/canvas`

### Story 24 — Canvas resizes to viewport
Canvas fills viewport; resizes with window.
- **Tests:** manual browser test
- **Route:** `/canvas`

### Story 25 — Mouseover a Node triggers an event
`hover:node:{id}` emitted on the event bus on hover.
- **Tests:** `test/adaptics_web/live/canvas_live_test.exs`
- **Route:** `/canvas`

### Story 26 — Client-side event log
Every canvas action emits a typed event; EventLog panel shows stream.
- **Tests:** `test/adaptics/events_test.exs`
- **Route:** `/canvas`

### Story 27 — Persist events to backend
Client events POST to backend; retrievable by `space_id` in order.
- **Tests:** `test/adaptics/events_test.exs`

### Story 28 — Draw an Edge between two Nodes
Click source then target creates a directed edge stored with `from_id`/`to_id`.
- **Tests:** `test/adaptics/visual_test.exs`, `test/adaptics_web/live/canvas_live_test.exs`
- **Route:** `/canvas`

### Story 29 — Selection state machine
Click selects; shift-click multi-selects; background click or Escape clears.
- **Tests:** `test/adaptics_web/live/canvas_live_test.exs`
- **Route:** `/canvas`

### Story 30 — Projections
Switch between named Projections of a Space; saved and restored.
- **Tests:** `test/adaptics/projections_test.exs`, `test/adaptics_web/live/canvas_live_test.exs`
- **Route:** `/canvas`

---

## Documents & Wiki

**Reference:** `WIKI_ENTITIES.md`, `GOVERNANCE.md`

### Story 1 — Upload a PDF document
Drag-and-drop upload with progress; non-PDF and >50MB rejected.
- **Tests:** `test/adaptics_web/live/document_live_test.exs`
- **Route:** `/documents` (`DocumentLive`)

### Story 2 — Store documents locally in dev / S3 in production
Local adapter in dev, S3 adapter in prod; delete removes file.
- **Tests:** `test/adaptics/documents/storage/local_test.exs`

### Story 3 — Extract text from PDFs
Async `pdftotext` extraction; status: pending → uploaded → extracting → ready.
- **Tests:** `test/adaptics/documents/text_extractor_test.exs`, `test/adaptics/workers/extract_text_worker_test.exs`

### Story 4 — View document details and extracted text
Document show page renders file info, extracted text, processing indicator, delete.
- **Tests:** `test/adaptics_web/live/document_live_test.exs`
- **Route:** `/documents/:id`

### Story 5 — Document attributes with provenance tracking
Add/edit/delete key-value attributes with `source: "manual"`; schema.org type field.
- **Tests:** `test/adaptics/documents_test.exs`, `test/adaptics_web/live/document_live_test.exs`

### Story 6 — Documents context CRUD
`create_document`, `delete_document`, `list_documents` (desc by `inserted_at`).
- **Tests:** `test/adaptics/documents_test.exs`

### Story 7 — Entity extraction via NER
Oban job runs spaCy; stores person/org/location/keyword attributes; re-run replaces old.
- **Tests:** `test/adaptics/documents/entity_extractor_test.exs`, `test/adaptics/workers/extract_entities_worker_test.exs`, `test/adaptics/documents_test.exs`

### Story 8 — Geocode location entities
Geocoding job maps location entities to lat/lng via Nominatim; rate-limited.
- **Tests:** `test/adaptics/documents/geocoder_test.exs`, `test/adaptics/workers/geocode_addresses_worker_test.exs`

### Story 9 — Persistent background jobs with Oban
Extract → entities → geocode pipeline as retryable Oban jobs.
- **Tests:** `test/adaptics/workers/extract_text_worker_test.exs`

### Story 10 — Create and view wiki pages
Create pages with title + Markdown; list ordered by updated; slug routing.
- **Tests:** `test/adaptics/wiki_test.exs`, `test/adaptics_web/live/wiki_live_test.exs`
- **Route:** `/wiki`, `/wiki/:slug`

### Story 11 — Wiki links (`[[Page Name]]`)
`[[Page Name]]` renders as link; missing pages show `?` → create form; re-renders on creation.
- **Tests:** `test/adaptics/wiki/renderer_test.exs`, `test/adaptics/wiki_test.exs`

### Story 12 — Edit wiki pages with live preview
Edit form with debounced Markdown preview; saves as new revision.
- **Tests:** `test/adaptics_web/live/wiki_live_test.exs`
- **Route:** `/wiki/:slug/edit`

### Story 13 — Wiki revision history
History page: revisions newest-first; expand to see raw Markdown.
- **Tests:** `test/adaptics_web/live/wiki_live_test.exs`
- **Route:** `/wiki/:slug/history`

### Story 14 — Search wiki pages
Live search by title and body; clears to full list.
- **Tests:** `test/adaptics/wiki_test.exs`, `test/adaptics_web/live/wiki_live_test.exs`

### Story 15 — Governance metadata extraction
Extracts programs, performance metrics, policies, modal language from document text.
- **Tests:** `test/adaptics/documents/metadata_extractor_test.exs`, `test/adaptics/workers/extract_metadata_worker_test.exs`, `test/adaptics/documents_test.exs`

---

## Vectors of Intent

**Reference:** `INTENT_VECTORS.md`

### Story VI1 — A Node can point (heading + magnitude)
Node extended with `heading` (radians) and `magnitude`; nil by default; backward compatible.
- **Tests:** `test/adaptics/visual_test.exs` — "create_node/1 persists heading and magnitude", "heading and magnitude default to nil"

### Story VI2 — Query alignment to a goal
`aligned_to_goal/2` returns cosine alignment per node; ignores nodes without heading.
- **Tests:** `test/adaptics/visual_test.exs` — "aligned_to_goal/2 returns cosine alignment per node", "aligned_to_goal/2 ignores nodes without a heading"

---

## Generation Citizen Port

**Reference:** `PERSONAS.md` (P1/P2)

### Story GC1 — Define org Node attributes
Org schema: name, type, values, programs, regions, populations, website, logo.
- **Tests:** `test/adaptics/generation_citizen_test.exs`

### Story GC2 — Ingest org spreadsheet
Seed Nodes from spreadsheet into `generation-citizen` Space.
- **Tests:** `test/adaptics/generation_citizen_test.exs`

### Story GC3 — Network graph with filter panel
D3 network graph at `/gc` with filter panel (org type / values / programs / regions / populations).
- **Tests:** `test/adaptics_web/live/gc_live_test.exs`
- **Route:** `/gc`

---

## Scope + Fabric.js Canvas

### Story SC1 — The Scope
Conical Three.js visualization at `/scope`.
- **Tests:** `test/adaptics_web/controllers/page_controller_test.exs`
- **Route:** `/scope`

### Story FC1 — Fabric.js multiplayer canvas
Multiplayer canvas at `/sketch/:space_slug` via FabricCanvasLive.
- **Tests:** implicit via compile + route resolution
- **Route:** `/sketch/:space_slug`

---

## Sketch-Data + A-Frame

### Story SD1 — Sketch-data port
D3 canvas ported from sandbox `/infosynth` to `/sketch-data`; all modes, freeform views, edges, groups, selection, event log, export/import survive.
- **Implementation:** `priv/static/sketch-data.html` served raw via `PageController.sketch_data/2`
- **Route:** `/sketch-data`

### Story AF1 — A-Frame hello world
A-Frame scene at `/aframe` with Blender characters GLB (`priv/static/models/characters.glb`).
- **Route:** `/aframe`

---

## tldraw / .tldr File Integration

**Reference:** `.claude/inbox/done/from-tldraw-2026-05-22-tldraw-elixir-canvas-integration.md`

### Story TD1 — Parse .tldr files into structured Elixir data
`TldrawParser.parse_file/1` reads a `.tldr` JSON file into a `%Canvas{}` struct with pages and shapes.
- **Tests:** `test/adaptics/canvas/tldraw_parser_test.exs`
- **Module:** `Adaptics.Canvas.TldrawParser`

### Story TD2 — /tldraw route: load and display .tldr file contents
`TldrawLive` loads `tmp/adaptics.tldr`, watches for file changes, displays canvas summary.
- **Tests:** implicit via LiveView mount (see `DrawLive.Data`)
- **Route:** `/tldraw`

### Story TD3 — Search shapes by text content
`TldrawSearch.search_by_text/2` filters shapes by text match.
- **Tests:** `test/adaptics/canvas/tldraw_search_test.exs`
- **Module:** `Adaptics.Canvas.TldrawSearch`

### Story TD4 — Containment queries (frames as sets)
`TldrawSearch.children_of/2`, `descendants_of/2`, `parent_of/2` — frame containment hierarchy.
- **Tests:** `test/adaptics/canvas/tldraw_search_test.exs`
- **Module:** `Adaptics.Canvas.TldrawSearch`

---

## Tech Debt / Code Health

### TDX0 — Remove dead MouseLive scaffold
Dead `MouseLive` module and route removed.

### TDX1 — Add Credo
`{:credo, "~> 1.7"}` added; `mix credo --strict` baseline established.

### TDX2 — Revive NodeController + LinkController CRUD
`NodeHTML`/`LinkHTML` recreated with colocated templates; modernized to `~p` + `<.link>` + component forms; nil-hash crash guarded; related-links query fixed; orphaned templates deleted.
- **Tests:** `test/adaptics_web/controllers/node_controller_test.exs`, `test/adaptics_web/controllers/link_controller_test.exs`

### TDX3 — Modernize deprecated layout helpers
`live_flash` → `Phoenix.Flash.get`, `live_title_tag` → `<.live_title>`, `<%#` → `<%!--`; dead `templates/` tree deleted.

### TDX4 — Refactor CanvasController.parse_tldraw_data
Decomposed cyclomatic-20 / depth-5 function into focused helpers.
- **Tests:** `test/adaptics_web/controllers/page_controller_test.exs`

### TDX7 — Remove dead view tests
`error_view_test`, `layout_view_test`, `page_view_test` removed; suite green.
- **Tests:** full suite — 294 tests, 0 failures

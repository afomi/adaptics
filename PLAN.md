# PLAN

**Source of truth for tasks:** this file. Tasks are user-story scenarios with at least one
corresponding test, worked in dependency order. Inbox handoffs are drained here and archived to
`.claude/inbox/done/`. Concept/reference docs (PERSONAS, DATA_MODEL, INTENT_VECTORS, GOVERNANCE,
RHYTHMIC_INTERCHANGE, TRANSCRIPT_EXPLORER, etc.) are reference, not task lists — search them when relevant.

## Now

Single active thread (mid-session anchor): **BM — business as resource flow** (`/business`, stories
BM1–BM7 below; organization design as stocks and named flows of money, staff, talent, interest).
Started 2026-10-02: BM1–BM5 built (BM5 = combinable models: workspace, valid-by-construction links,
parts/whole). Product focus: the 80/20 model — name, ins, outs, amounts — authored quickly and combined
only when valid. Next: walk it on :4010, then BM8 (two coupled scales, e.g. business ↔ household) or BM6.
FC2 is paused, not done — its note follows.

Paused thread: **FC2 — dimensional canvas** (customizable axes over the
shared data model; stories FC2.1–FC2.14 below). Built 2026-08-14: data axes (FC2.1–FC2.6), semantic
axes via Ollama embeddings (FC2.7–FC2.12), freeform snapshots + comparison overlay (FC2.13–FC2.14),
/sketch-data localStorage migration (FC2.15). Remaining in-thread work: manual walkthrough on :4010.
After that: **VI3** (`/intent` projection) or remaining Credo items (TDX5/TDX6).
Concept docs: `TOPOLOGICAL_EMBEDDING_SPACES.md` (visualizing embedding spaces, maps vs diagrams).
The threads below under "Prioritized Start List" are the candidate next threads, each marked `next`,
`built`, or `done`. Completed story details live in `USE_CASES.md`.

## Prioritized Start List

Ordered by dependency and product value. Complete each before starting the next. Each `### Thread`
is a parallel candidate; the single active one is named under `## Now` above.

### Thread — Foundation
| # | Story | Persona | Status |
|---|---|---|---|
| 20 | Codebase audit → `docs/audit.md` | P4 | done ✓ |
| 21 | Data model documented → `DATA_MODEL.md` | P4 | done ✓ |

### Thread — Canvas Core (unblocks Stories 22–30)
| # | Story | Persona | Depends on |
|---|---|---|---|
| M1 | Migration: `create_spaces` | P4 | done ✓ |
| M2 | Migration: `add_space_id_to_nodes` | P4 | done ✓ |
| M3 | Migration: rename `links` → `edges`, add `space_id` | P4 | done ✓ |
| 22 | Persist Node position and label | P1 | done ✓ |
| 24 | Canvas resizes to viewport | P1 | done ✓ |
| 23 | Drag a Node and edit its label | P1 | done ✓ |
| 28 | Draw an Edge between two Nodes | P1 | done ✓ |
| 29 | Selection state machine | P1 | done ✓ |
| 26 | Client-side event log | P4 | done ✓ |
| 25 | Mouseover a Node triggers an event | P4 | done ✓ |
| 27 | Persist events to backend | P4 | done ✓ |
| 30 | Projections | P2 | done ✓ |

### Thread — Documents & Wiki (largely built)
| # | Story | Persona | Status |
|---|---|---|---|
| 1–9 | Document upload, extraction, NER, geocoding, Oban | P2/P4 | built |
| 10–14 | Wiki CRUD, links, edit, history, search | P1 | built |
| 15 | Governance metadata extraction | P2 | built |

### Thread — Generation Citizen Port — Civic Org Network Map
| # | Story | Persona | Depends on |
|---|---|---|---|
| GC1 | Define org Node attributes (name, type, values, programs, regions, populations, website, logo) | P4 | done ✓ |
| GC2 | Ingest org spreadsheet as seed Nodes into a `generation-citizen` Space | P4 | done ✓ |
| GC3 | Network graph page with filter panel (org type / values / programs / regions / populations) | P1/P2 | done ✓ |
| GC4 | Node detail on click: name, website, logo, programs list | P1 | GC3 |
| GC5 | Geographic map view: nodes positioned by address lat/lng | P2 | GC2 |
| GC6 | Mobile: constrain drag/touch to prevent spazzing | P1 | GC3 |

**Source:** `.claude/inbox/from-gtd-2026-04-24-generation-citizen-port.md`
**Reference data:** two Google Spreadsheets (org schema + org data)
**Key use cases:** gap analysis, service deserts, impact mapping, filtering

### Thread — The Scope + Fabric.js Canvas
| # | Story | Persona | Status |
|---|---|---|---|
| SC1 | The Scope: conical Three.js visualization at `/scope` | P1 | done ✓ |
| FC1 | Fabric.js multiplayer canvas at `/sketch/:space_slug` | P1 | done ✓ |
| FC2 | Typed canvas: customizable axes over shared data model | P1/P2 | built (see FC2.x) |

FC2 breakdown (dimensional canvas — sketch-data's Mode system as Projections; semantic axes per
cdcs_ex; embeddings via local Ollama `nomic-embed-text` behind `Adaptics.Embeddings`):

| # | Story | Persona | Status |
|---|---|---|---|
| FC2.1 | Axis layout spec: `Projections.Axis.normalize/1` + `resolve/2` | P4 | built |
| FC2.2 | Property schema inference: `Projections.Schema.analyze/1` + `suggest/1` | P4 | built |
| FC2.3 | /canvas renders axes projections: animated positions, axes drawn, drag gated | P1 | built |
| FC2.4 | Axis editor in projection selector with live preview + save | P1 | built |
| FC2.5 | Freeform round-trip: back to stored positions, drag re-enabled | P1 | built |
| FC2.6 | Suggested modes from schema analysis | P2 | built |
| FC2.7 | `Semantic.VectorMath` + `semantic_axes` schema (poles + anchors) | P4 | built |
| FC2.8 | `Adaptics.Embeddings` behaviour: Ollama + Fake adapters, graceful degradation | P4 | built |
| FC2.9 | Compute axis vectors from anchors + quality metrics (pole_separation, spreads) | P4 | built |
| FC2.10 | Node embeddings via `EmbedNodeWorker` (Oban); `node_axis_scores` scoring | P4 | built |
| FC2.11 | Layout kind `"semantic"`: nodes scatter in meaning-space on /canvas | P1/P2 | built |
| FC2.12 | Semantic axis CRUD UI at `/axes` (compute, score, quality metrics) | P1 | built |
| FC2.13 | Freeform positions stored per-projection: a view is a placement snapshot | P4 | built |
| FC2.14 | Comparison overlay: ghost-pairs, displacement arrows, agreement score | P1/P2 | built |
| FC2.15 | Migrate /sketch-data localStorage (nodes, views, modes) into Space + Projections | P2 | built |
| FC2.16 | Canvas space routing `/canvas/:space_slug`; /axes embeds+scores across all spaces | P1 | built |
| FC2.17 | Municipal codes application: `mix adaptics.import_muni_codes` (ogenda provisions → `muni-codes` Space, one Node per chapter), Permissiveness/Substance axes, starter projections | P2 | built |
| FC2.18 | `/topo` (+ `/topo/:space_slug`): Three.js 3D semantic-axis space — records as points on three selectable axes (radar-style spokes with pole labels), per-city toggles (one or both), hover detail | P1/P2 | built |
| FC2.19 | `/topo` Layers mode: stackable coordinate spaces — geographic layer (city lat/lng hubs) + semantic slices (2 axes each), reorderable stack, translation lines between adjacent layers | P1/P2 | built |
| FC2.20 | Embedding triangulation: per-model node embeddings + axis variants + scores; `Triangulation` (PRH mutual k-NN alignment, axis disagreement); `mix adaptics.triangulate`; /topo per-slice model selector (default stack: same axes, two models) — see `EMBEDDING_TRIANGULATION.md` | P2/P4 | built |
| FC2.21 | Topic modeling atop /topo: `Semantic.Topics` (deterministic cosine k-means + Gram-matrix 3D PCA + c-TF-IDF labels), `topic_models` per (space, embedding model), `mix adaptics.topics`, /topo "Topics" mode (atlas: like ordinances cluster cross-city; topic legend with solo, tethers, per-model) | P2/P4 | built |
| FC2.21 | /topo layer generalization + cocktail layers spike: layer contract (per-layer entity sets + own coordinate space) with typed `edgesBetween` (muni = identity edges, regression-free); `/topo/cocktails` — spirits / drinks / supporting-ingredients layers from vendored opendrinks + Mr. Boston JSON (`priv/data/cocktails/`, `Adaptics.Cocktails` classifier), hover-isolate highlighting, spirit sidebar, birds-eye/side camera presets, dataset toggle | P1/P2 | built |

Tests: `projections_axis_test.exs`, `projections_schema_test.exs`, `semantic_test.exs`, `cocktails_test.exs`,
`embeddings_test.exs`, `semantic_axes_live_test.exs`, extended `canvas_live_test.exs`.
Seeds: starter axes (Verbosity, Explicitness) in `priv/repo/seeds.exs`. Embedding model:
`qwen3-embedding:8b` via local Ollama (configured in `config :adaptics, Adaptics.Embeddings`);
app degrades gracefully without it (compute/score report unavailable; data axes unaffected).
FC2.15: /canvas offers "Import /sketch-data nodes + views" when the same-origin localStorage
holds sketch-data keys; `Adaptics.SketchDataImport` upserts idempotently (nodes by `sketch_id`
metadata, projections by "sketch: " name prefix); `log` scales degrade to linear, grid modes skip.

### Thread — Atlas (moved out)
Atlas (append-only public event stream → named projections → live read interface) was prototyped
here 2026-09-11 from `.claude/inbox/done/from-opensolano-2026-09-11-atlas.md`, then removed on
2026-09-21. It now lives in `~/workspace/indivisual`; work on it there.

### Thread — Vectors of Intent (lines as first-class agency)
| # | Story | Persona | Status |
|---|---|---|---|
| VI1 | Extend Node with `heading` + `magnitude` (a Node can point) | P4 | done ✓ |
| VI2 | Query `aligned_to_goal/2`: alignment of Node headings to a goal coordinate | P2 | done ✓ |
| VI3 | `/intent` projection: render arrows + alignment to a draggable goal | P1 | next |

**Source:** `~/workspace/visual-symbolic-language/NOTES.md` (pivoted in) + `INTENT_VECTORS.md`
**Concept:** A Node is a point; a *vector of intent* is a Node that also has a heading (direction) and magnitude (force). A **goal** is a coordinate the vectors align toward. Alignment = cosine(heading, direction-to-goal). Sits between Node (point) and Edge (A→B link).

### Thread — Sketch-Data Port + Visualization Consolidation
| # | Story | Persona | Status |
|---|---|---|---|
| SD1 | Port sketch-data (sandbox `/infosynth`) to `/sketch-data` | P1/P2 | done ✓ |
| AF1 | A-Frame hello world at `/aframe` with Blender characters GLB | P1 | done ✓ |

**SD1 source:** `.claude/inbox/done/from-sandbox-2026-06-15-sketch-data-handoff.md`
**AF1 source:** `.claude/inbox/done/from-blender-2026-06-14-aframe-hello-world.md`

`/sketch-data` is served raw from `priv/static/sketch-data.html` (the ~4k-line self-contained
D3 canvas is not heex-safe) via `PageController.sketch_data/2`. D3 v7 + d3-lasso load from CDN.
All modes, freeform views, edges, groups, selection, event log, and export/import survive the
port; persistence is still localStorage (Postgres migration is the future direction).

`/aframe` is served via `PageController.aframe/2` with layouts disabled, rendering a self-contained
A-Frame scene. Blender characters exported to `priv/static/models/characters.glb`.

#### Consolidation strategy (from sketch-data handoff — adopted, not yet executed)
Backlog. Sketch-data's Mode system maps to the adaptics **Projection** concept; its node schema
maps to **Node** + custom attributes; a freeform view maps to a saved `Projection` with `kind: "freeform"`.

1. **Port sketch-data as `/sketch-data`** — done (gives it a home without breaking anything).
2. **Promote `/canvas` (CanvasLive) + `/sketch/:slug` (FabricCanvasLive)** as the authoritative node
   canvas — these have Postgres persistence, the right schema, and Space/Projection architecture.
   Sketch-data's modes become Projections here. Sketch-data's localStorage migrates here.
3. **Deprecate `/ivn` and `/graph`** into Projections of the canvas once the Projection system matures.
4. **Unify `/3d`** (Three.js Wardley map) with the **intent-vector lens** — sketch-data's axis-declaration
   Mode system and the `heading/magnitude` fields (INTENT_VECTORS.md, VI1–VI3) converge here. `/3d`
   is the prototype; a unified intent-aware canvas is the target.
5. **Keep `/voxels`, `/splines`, `/pool`, `/simulation`, `/flow`** as standalone experiments.

### Thread — tldraw .tldr File Integration
| # | Story | Persona | Status |
|---|---|---|---|
| TD1 | Parse .tldr files into structured Elixir data | P4 | done ✓ |
| TD2 | /tldraw route: load and display .tldr file contents | P1 | done ✓ |
| TD3 | Search shapes by text content | P1/P2 | done ✓ |
| TD4 | Containment queries (frames-as-sets) | P2 | done ✓ |
| TD5 | Deduplication detection across frames | P2 | next |

**Source:** `.claude/inbox/from-tldraw-2026-05-22-tldraw-elixir-canvas-integration.md`
**Convention:** Frames = mathematical sets; containment = membership; nested frames = subsets; arrows = relations

### Thread — Multiplayer Coherence (RHYTHMIC_INTERCHANGE)
| # | Story | Persona | Depends on | Status |
|---|---|---|---|---|
| RI1 | Per-world `GenServer` fulcrum: single-writer canon + `accept/2` reducer between channel and broadcast | P4 | FC1 | next |
| RI2 | Rename client→server verbs from `object_modified` (write) to `propose_*` (offer); stamp facts with `version` | P4 | RI1 | |
| RI3 | Tier-1 fork: client-side divergent branch of an object, published → Tier-2 proposal | P1/P4 | RI2 | |
| RI4 | View-vs-Canon split: render canon ⊕ local lens; optimistic apply + reconcile on accept/reject | P1 | RI2 | |
| RI5 | Rejection-as-fork UX: refused proposal settles into a local fork, not an error | P1 | RI3, RI4 | |

**Source:** `RHYTHMIC_INTERCHANGE.md` (design exploration — constraints doc, not yet a build plan)
**Substrate (exists):** `lib/adaptics/canvas/canvas.ex` (PubSub + snapshot+version), `lib/adaptics_web/presence.ex`, `FabricCanvasLive`
**Concept:** N client runtimes + 1 opinionated server runtime as a distributed system. Clients own
*perception* (local) and *divergence* (fork); server owns the *canonical fact-line* (global). A
contribution crosses an explicit membrane — local, forked, or global — never a blind overwrite.

### Thread — Tech Debt / Code Health
| # | Story | Persona | Status |
|---|---|---|---|
| TDX0 | Remove dead `MouseLive` scaffold (no route/migration/hook; superseded by `FabricCanvasLive`) | P4 | done ✓ |
| TDX1 | Add Credo (`{:credo, "~> 1.7", only: [:dev, :test], runtime: false}`) | P4 | done ✓ |
| TDX2 | Revive + modernize `NodeController` + `LinkController` CRUD (Node/Link are core generic objects — kept, not deleted) | P4 | done ✓ |
| TDX7 | Remove dead view tests (`error_view_test`/`layout_view_test`/`page_view_test`) + fix stale assertions; suite green | P4 | done ✓ |
| TDX3 | Modernize deprecated layout helpers (`live_flash`→`Phoenix.Flash.get`, `live_title_tag`→`<.live_title>`, `<%#`→`<%!--`, drop `get_flash` import); delete dead legacy `templates/` tree | P4 | done ✓ |
| TDX4 | Refactor `CanvasController.parse_tldraw_data` (Credo: cyclomatic 20, nested depth 5) → decomposed into focused helpers; complexity/nesting/map_join cleared | P4 | done ✓ |
| TDX5 | Credo quick wins: `Enum.map_join/3`, `length(x) > 0` → `x != []`, missing `@moduledoc`, chained `Enum.reject` | P4 | partial |
| TDX6 | Fix `WorkflowRoomChannel`: group `handle_in/3` clauses, add `@impl true` to `join/3` | P4 | |

**Source:** `mix credo list` — 2 warnings, 11 refactoring, 6 readability (down from 58 at TDX1 baseline).
**Remaining items:** `map_join` in `TldrawParser`, `length >= 1` in `GCLive`, chained `Enum.reject` in `TldrawCanvas`+`DrawLive.Data`, `@moduledoc` on `Documents.Storage`, `Documents.Storage.Local`, `Documents.Storage.S3`, `WorkflowRoomChannel`, `Presence`.

**TDX2 (done):** Node + Link are core generic objects (per Ryan: "flexible enough to be generic
objects, or pointers to other data records … used for many different views"), so the CRUD UI was
*revived*, not deleted. Their view modules had been deleted (1.6→1.7 migration left half-done),
so `/nodes` and `/links` were raising. Recreated `NodeHTML`/`LinkHTML` with colocated templates
(`controllers/node_html/*`, `controllers/link_html/*`), modernized to `~p` + `<.link>` +
`<.simple_form>`/`<.input>`/`<.table>`/`<.list>`/`<.header>`/`<.back>`, fixed the related-links
query (`"links"` → `Visual.Link`/`edges`), guarded a latent nil-hash crash, deleted orphaned
`templates/node`+`templates/link`, modernized the `page/index.html.heex` nav, and migrated both
controller tests to `~p`. **Full suite: 294 tests, 0 failures.**

### Thread — Business as resource flow (`/business`)
A business as stocks (money, staff, talent, interest) and the named flows that cross its boundary.
The model is pure data + pure functions (`assets/js/business_model.js`); `assets/js/business.js`
draws one state, so the same model renders at many instants. Builds on `/org` (pure model fns,
stable identity), `toroidal_cash_flow.js` (money as closed flow), `EMPLOYMENT_INCOME_DECOUPLING.md`
(stocks/flows, friction), and touchpoints' Person → Tenure → JobDescription → Task → BPMN chain
(the eventual hook from staff to work). Tests: `node --test test/js/*.test.mjs` (model) +
`test/adaptics_web/controllers/business_page_test.exs` (page).

| # | Story | Persona | Status |
|---|---|---|---|
| BM1 | One in, one out: a business holding money, one input (Revenue) and one output (Spend); the stock changes by in − out each month | P1 | built (`business_model.test.mjs`) |
| BM2 | Stateful in time: scrub or play months; the same model renders at any instant (`stateAt` interpolates a simulated timeline) | P1 | built |
| BM3 | States side by side: the same business pinned at several named months, on one shared scale (`extents`), snapshots pinnable / renamable / removable | P1/P2 | built |
| BM4 | Named flows: several named inputs and outputs across money, staff, talent, interest, with couplings (payroll ∝ staff, revenue ∝ talent + interest), windows (one-off investment), constraint when a stock runs dry (red), non-conserved outputs (value delivered ◇), latent stocks drawn as ghosts; per-flow dials | P1/P2 | built (`business_model.test.mjs`, `business_page_test.exs`) |
| BM5 | Combinable models: a workspace of models (templates: one-in-one-out, café, household, landlord, startup) authored in the panel (name, starting stocks, inputs/outputs with resource + amount/mo). Link an output to another model's input with a share; only valid links are offered (same resource, two models, one source per input, Σ shares ≤ 100%), invalid ones shown with the reason; expectation gaps warn; suggested share matches what the receiver expected. `combine` is closed — the workspace is itself a model — viewed as **Parts** (arcs between models) or **Whole** (external flows only). Saved in localStorage; JSON copy/load with explicit errors | P1/P2 | built (`business_model.test.mjs` 20 tests, `business_page_test.exs`) |
| BM6 | Interest manifold: interest/talent as a latent field (a surface under the business), people as points with intent vectors (`INTENT_VECTORS.md`); flows of interest follow the manifold's gradient rather than a scalar rate | P2 | — |
| BM8 | Scale: households and businesses as peers — what each party shares (off / shared / full, as in `/network`); conservation checks across parties as the audit signal | P2 | — |
| BM7 | Org ↔ flows: staff stock decomposed into roles/teams (touchpoints Tenure/Task, `/org` roles); payroll and capacity per team | P4 | — |

### Thread — Cards: people & bots in space (`/cards`)
| # | Story | Persona | Status |
|---|---|---|---|
| CD1 | Cards (person/bot) stand on a plane; select one and fly it in x/y/z (WASD, E/Q, click-to-go) | P1 | built (`cards_page_test.exs`) |
| CD2 | A card opens into an iframe view of its URL (CSS3D layer over WebGL) | P1 | built |
| CD3 | Bot drives a card via `window.cards` (moveTo/moveBy/setUrl/open/close/add); emits `cards:*` DOM events | P4 | built |
| CD4 | Replay a VoteSmash crowd run: drop runner JSONL (or load the sample) → one card per agent, x = tour phase, each API call a packet to the VoteSmash wall; play / speed / scrub; rejected lines reported, never dropped | P4 | built (`cards_page_test.exs` + fixture contract) |
| CD5 | Follow a live crowd run (tail transcripts as the runner writes them) | P4 | next — blocked on votesmash slice 4 |
| CD6 | Card view shows the agent's browser-effector screenshots (replaces iframe; votesmash sends `frame-ancestors 'self'`) | P4 | blocked on votesmash slice 6 |

**Interface with votesmash:** transcript line contract v1 (required `v, ts, agent, seq, action, response.status`;
success = 2xx **and** `response.error` null) proposed in
`~/workspace/votesmash/.claude/inbox/from-adaptics-2026-09-23-agent-actions-and-transcripts.md`, alongside typed
`actions` on `GET /api/agent/tours/:id`. Fixture: `priv/static/fixtures/crowd_transcript_sample.jsonl`
(regenerate by hand if the contract changes; the ExUnit test pins its shape). Spec of record:
`~/workspace/votesmash/docs/AGENT_PARTICIPANTS.md`.

### Thread — Transcript Explorer (`/transcripts`, local only)
Browse Claude Code transcripts for projects in `~/workspace` — a personal, learn-as-we-go tool.
Tiny incremental steps; each one useful on its own.
Straight from the filesystem (`~/.claude/projects`, read-only); Postgres only if a step proves the filesystem too slow.
Routes exist in dev/test only (`router.ex`, `Mix.env()` guard), never in a release.
URLs use the working folder name: `/transcripts/adaptics/<session-uuid>#turn-N` (the `~/.claude/projects` folder prefix is added back only on disk).
Candidate thread, not active (`## Now` stays on BM).
Code: `lib/adaptics/transcripts.ex`, `lib/adaptics_web/live/transcripts_live.{ex,html.heex}`.
Synthetic fixtures (never real transcripts — they hold secrets): `test/fixtures/transcripts/`.

| # | Story | Status |
|---|---|---|
| TX1 | Browse: projects → sessions (title = `ai-title` or first prompt, size, age) → one session as prompts, answers and collapsed work ("Read ×2 · Edit") | built (`transcripts_test.exs`, `transcripts_live_test.exs`) |
| TX2 | Render answers as markdown (raw HTML in a transcript shown as code, never rendered); expand a work line to see each tool call's input | built (`transcripts_test.exs`, `transcripts_live_test.exs`) |
| TX3 | Session page is full width with a left sidebar table of contents: one link per turn (your message, first line, ≤80 chars; system prompts like `<task-notification>` by tag), current turn highlighted while scrolling, `h`/`l` jump between turns (`assets/js/transcript_toc.js`) | built (`transcripts_test.exs`, `transcripts_live_test.exs`) |
| TX3b | Sort projects by name (default), sessions, messages or recent (`?sort=`); message counts load in the background (`start_async`, ~2.6s over all transcripts); session page has "← Transcripts / project" top left | built (`transcripts_test.exs`, `transcripts_live_test.exs`) |
| TX3c | Sort a project's sessions by recent (default), title or messages; per-session message counts in the background | built (`transcripts_test.exs`, `transcripts_live_test.exs`) |
| TX4 | Search one project (`?q=`): your messages, answers and tool inputs (commands, file paths), case-insensitive; results by session → matching turns with a highlighted snippet, linking to `#turn-N`. Raw-file check first, only matching files parsed (~2s worst case on yakama-rpms) | built (`transcripts_test.exs`, `transcripts_live_test.exs`) |
| TX4b | Search across all projects from the index (`/transcripts?q=`): grouped by project → session → turn (first 5 turns per session, "+N more"); a lean line scan decodes only prompts and matching lines (~5s for a common word over all projects, ~2s for a rare one); shared `transcripts_live/search_hits.html.heex` | built (`transcripts_test.exs` incl. scan ≡ full-parse turn numbering, `transcripts_live_test.exs`) |
| TX5 | Live: an open session updates as the file grows | next |
| TX6 | Embeddings: one vector per *content* turn you typed (`classify/1` drops control like "proceed"/"commit and push", compaction summaries, interruptions and system tags; pasted text unwrapped) (qwen3-embedding:8b via Ollama), cached outside the repo at `~/.cache/adaptics/transcript_embeddings/<project>/<model>.jsonl` (incremental by turn id + text sha); `mix adaptics.transcripts.embed <project> [--k] [--model]` prints topics (`Semantic.Topics`: k-means + c-TF-IDF) with each topic's most typical messages. First target: jurisdictional | built (`transcripts/embeddings_test.exs`) |
| TX7 | Workflow axis: how we work ↔ what we work on, a semantic axis from anchor sentences (`transcripts/workflow.ex`); topics use the subject side; `--workflow-threshold`, `--include-workflow`. jurisdictional: 206 subject / 199 workflow, all 74 rule-based control messages on the workflow side. Default cutoff -0.03 (`Workflow.cutoff/0`). Anchors are written from jurisdictional's topics and untested on other projects. Credentials: `Embeddings.scrub/1` in `turn_records/2` removes token-shaped strings from everything derived (embeddings, topics, related, map); a token-only message is kind `:secret` and dropped. The session reader still shows raw transcripts | built (`transcripts/embeddings_test.exs`) |
| TX8 | Related turns: nearest turns from other sessions on the session page (`transcripts/related.ex`, cached by `snapshot.ex`) | built (`transcripts/related_test.exs`) |
| TX9 | Atlas: `/transcripts/:project/map`, a stable 3D topic map of turns (`transcripts/atlas.ex`, `transcript_map_live.ex`); fitted results saved beside the vectors as `.snapshot` files (private, atomic, fingerprinted), so an unchanged visit is ~60 ms instead of ~30 s. Recency uses recorded conversation timestamps (`Transcripts.last_activity/1`), not file mtimes | built (`transcript_atlas_model.test.mjs`, `transcripts/snapshot_test.exs`, `transcripts/activity_test.exs`) |
| TX10 | Input coverage: replace the silent 2,000-character cap (`@max_chars`; the cached sha covers only the truncated text). Compare first-2K against full prompts and token-aware overlapping chunks (start ~512–1,500 tokens); qwen3-embedding:8b publishes 32K context, so verify the effective Ollama limit first. Truncation must be visible, never silent; chunk hits aggregate back to their turn; version the input recipe in cache ids instead of overwriting the old cache. Test: a question whose answer sits past character 2,000 in a long prompt is found | next |
| TX11 | Threads: `/transcripts/:project/threads` (route before the session route), goal-oriented threads with status and timing, plus a stitched reader. Keep apart: themes vs threads, inferred status vs confirmed outcome, "no evidence found" vs a verified gap. Needs assistant answers embedded too (only your prompts are today) | later |

Reference, not current state (this table is): `TRANSCRIPT_EXPLORER.md` (background, vocabulary, interface ideas), `TRANSCRIPT_EXPLORER_IDEAS.md` (themes vs threads, status evidence, gap questions), `TRANSCRIPT_TOPICS_AND_TRANSFORMERS.md` (plain-language embeddings, chunking, retrieval approaches). The 2026-11-01 continuation handoff is drained into TX9–TX11 and archived at `docs/archive/TRANSCRIPT_EXPLORER_HANDOFF.md`.

Later ideas, once the basics feel good (see `TRANSCRIPT_EXPLORER.md`): forks and rewinds, subagent sidechains, interjections, files touched per turn, threads across sessions, handoff export.

Open questions (before threads):
- May a thread span projects by default, or only when linked explicitly?
- Do thread corrections write anything back (PLAN.md, inbox), or stay in the explorer?
- One long session navigated well first, or seeing across sessions?
- `thinking` blocks: never shown, on demand, or searchable but hidden?
- Retention: index everything forever, or roll old sessions up into summaries?

**Concept doc:** `TRANSCRIPT_EXPLORER.md` (reference).
**Source:** `.claude/inbox/done/from-iterm2-status-bar-2026-10-25-transcript-explorer.md`.

### Thread (Icebox) — Experiments (no schema, no persona yet)
| # | Story | Note |
|---|---|---|
| 16 | Three.js spline rings | experiment — `assets/js/balancing_rings.js` |
| 17 | Math nodes | experiment — `assets/js/math_nodes.js` |
| 18 | Hydrogen energy viz | experiment — `assets/js/hydrogen_energy.js` |
| 19 | NFT integration | experiment — ref `~/workspace/qart/` for BSV tx patterns |
| CO1 | Co-evolving characters/platform in game architecture | experiment — see `COEVOLUTION.md` |
| NET1 | `/network` — user-centric social network in 3D: you at center always active, connections ringed and sortable (strength / met / context / mutuals / name), each connection's network activatable off · shared-attributes · full, year timeline animates relationship development, click/auto-grow builds connections via mutuals; built 2026-09-13, test `test/adaptics_web/controllers/network_page_test.exs` | experiment — `assets/js/social_network.js`; shared Three.js helpers extracted from topo.js into `assets/js/three_stage.js` |
| ORG1 | `/org` — org topology in 3D: hierarchy as height, leadership center / user-facing edge; variables size × AI automation × headcount strategy (reallocate vs reduce) × meaningful-work identifiability; built 2026-09-13, test `test/adaptics_web/controllers/org_page_test.exs`, concept `HUMAN_AND_AI_LABOR.md` | experiment — `assets/js/org_topology.js`; model fns (`composeOrg`, `assignRoles`, `layoutOrg`) are pure and exported |
| CH1 | `/chladni` controls expanded (2026-10-28): plate mode — square-plate modes u = cos(nπx)cos(mπy) ± cos(mπx)cos(nπy) with n, m, sign, random, ~Hz (f ∝ n²+m²); sand re-forms in place on mode change; collapsible panel (drive, sustain, speed, grains 10k–150k, size, opacity, palette, trails, nodal-line overlay, volume, pause/scatter/save PNG); keys space/r/s/c/arrows. Auto + explore unchanged by default. Tests `test/js/chladni.test.mjs` (nodal symmetry, n=m− is flat, shake rule converges onto nodal lines), `chladni_page_test.exs`. Next: inverse control (CH2–CH5: aim at a point, move pucks, draw a target) and a playable plate with a resonance sweep (CH6–CH7) — pending in `.claude/inbox/from-adaptics-2026-10-30-chladni-inverse-control.md`. Other ideas: circular plate (Bessel modes, Chladni's law f ∝ (m+2n)²), light powder to antinodes (Faraday) | experiment — `assets/js/chladni.js` |
| RES1 | `/resonance` — collaboration as overlapping emanations: a person = position + vision (angle, shown as color) + reach; overlap × cos(Δvision) = resonance; gold/red interference field in one shader, resonant pairs attract and gain energy, dissonant repel and drain, orthogonal coexist; goals = fixed visions; optional Kuramoto influence with per-person stubbornness; five guided scenes (two visions → opposed → different-not-opposed → shared goal → team). Built 2026-10-28, tests `test/js/resonance_model.test.mjs`, `test/adaptics_web/controllers/resonance_page_test.exs`. Finding: with influence, factions sync internally while whole-team coherence stays low. Next ideas: visions with several facets (partial overlap of *what*, not just *where*), a time trail, people as intent vectors (`INTENT_VECTORS.md`) | experiment — `assets/js/resonance.js`, `assets/js/resonance_model.js` |
| UIM1 | `/ui-map` — the UI pyramid in D3: 9 layers from browser substrate (URL, DOM, a11y tree) through elements, components, patterns, views, operations (CRUD), features, to HCD tasks and needs; 81 pieces, 208 "made of" links; qualities (accessible, feedback, consistent, content, responsive, private) as rails across layers; Unfold builds bottom-up; hover = composition (blue) + reach (gold). Built 2026-10-28, tests `test/js/ui_map_model.test.mjs` (soundness: no upward uses, no cycles, no orphans), `test/adaptics_web/controllers/ui_map_page_test.exs`. Emerged so far: keystones Button · Empty message · Collection · Index view · Read · Versioning & audit; the accessibility tree is the most directly reused piece; composition goes sideways within substrate, patterns and features but not views or operations. Next: let people add pieces in the page; map an existing adaptics page onto it | experiment — `assets/js/ui_map.js`, `assets/js/ui_map_model.js` |
| NFT1 | BSV-native collaborative NFT with POW-20 mining + stateful canvas UTXO | experiment — see `collaborative-nft/COLLABORATIVE_NFT.md`; two competing designs (Seasonal Mined Canvas vs. Fractal Branch NFT), open design questions remain |

### Thread — Field Notes: Geo-Aware Spatial Capture
| # | Story | Persona | Depends on | Status |
|---|---|---|---|---|
| FN1 | Load `/field` with Three.js map + jurisdiction boundaries from jurisdictional.org API | P1 | — | next |
| FN2 | Geolocation hook — `watchPosition` → LiveView assign, dot on map | P1 | FN1 | |
| FN3 | `observations` schema + migration (lat, lng, body, image_urls, visibility, pinned_at) | P4 | — | |
| FN4 | Pin modal — press P or click Pin button → note + optional image upload to S3 | P1 | FN2, FN3 | |
| FN5 | Render own pins as markers on map; click to inspect | P1 | FN4 | |
| FN6 | Visibility toggle: private → public on an observation | P1 | FN5 | |
| FN7 | Public observations feed visible to all users | P1 | FN6 | |

**Goal:** demo-able field notes app — load the page, see yourself on a map with Solano County / Vacaville boundaries, press Pin, add a note or photo, see it persist.

**Map approach:** Three.js (`FullscreenMap` pattern from jurisdictional) + CSS2DRenderer for labels. Jurisdiction boundaries fetched from `jurisdictional.org/api/v1/jurisdictions/at_point?lat=&lng=` on page load and on location change.

**Seed location:** Vacaville, CA (lat: 38.3566, lng: -121.9877) as default center when geolocation is denied or pending.

**Coordinate system:** lng/lat → Three.js XY with a local origin offset (scene center = Vacaville). Same pattern as `FullscreenMap.initScene()` in jurisdictional — camera top-down, OrbitControls for zoom/pan.

**Reuse from jurisdictional:**
- `FullscreenMap` hook structure (init, animate, drawBaseLayers, event bus pattern)
- `levelZIndex` and color palette for boundary layers
- CSS2DRenderer for pin labels
- `juricode` API call pattern (address → jurisdictions → GeoJSON)

### Open Decisions
| Item | Question |
|---|---|
| Unity App | Port to WebXR or archive? |
| Hilbert.app | Standalone repo or Adaptics feature? |
| Blender-as-a-service | Needed? (park until Three.js proves insufficient) |
| afomi transactions | Adaptics feature or personal board? |

---


---
from: sandbox (ryanwold.net)
to: adaptics
created: 2026-06-15
status: pending
summary: Port sketch-data (sandbox/app/views/infosynth/index.html.erb) to adaptics as a first-class route /sketch-data. Full feature inventory and DRY opportunities flagged.
---

## What sketch-data is

Sketch-data is a client-side D3.js canvas visualization living at `/infosynth` in the sandbox Rails app.
It is the most complete prototype of the spatial-axes-as-semantics idea — nodes as typed objects, modes as declared axis configurations, freeform views as user-defined semantic arrangements.
It is the direct precursor to the intent-vector / Wardley-map work in adaptics and should live here as a named route `/sketch-data` (or `/sketch/:slug` if you want to serve multiple sketches).

The source file is a single large self-contained ERB:
`~/workspace/sandbox/app/views/infosynth/index.html.erb` (~4,074 lines)

Supporting documentation:
- `~/workspace/sandbox/app/views/infosynth/NOTES.md` — full architecture, mode config, LLM integration plan, class/instance future direction
- `~/workspace/sandbox/app/views/infosynth/README.md` — MVC mental model, Gherkin examples, persistence spec

---

## Feature inventory (what must survive the port)

### Node model
Fields: `id, name, r, category, date, value, baseX, baseY, x, y, group, hidden, fx, fy, tags`
Categories: fixed set `['A','B','C']` with `d3.schemeSet2` color scale.
Persistence: `localStorage` key `nodes_data_v1`. Scene export/import as JSON.

### Modes (the core idea — axes as semantics)
Each mode maps node properties to X/Y axes with specific scale types.

| Mode | X-Axis | Y-Axis | Notes |
|---|---|---|---|
| XY | `baseX` | `baseY` | Original seeded positions, axes hidden |
| Date | `date` (time scale) | `category` + jitter | Timeline with category bands |
| Timeline | `date` (time scale) | `value` (linear) | Classic time-series |
| Value | `value` (linear) | `category` + jitter | Value distribution by category |
| Category | `category` (ordinal) | rank within category | Categorical columns |
| Grid | grid col by ID | grid row by ID | Ordered grid layout |
| Groups | group center X | group center Y | Physics-based clustering |
| Freeform Views | `node.x` (saved) | `node.y` (saved) | User-defined, drag enabled |

Mode is persisted in `localStorage` key `last_mode_selection_v1`.

### Freeform Views
- User saves any mode as a named freeform snapshot (`localStorage` key `saved_views_v1`)
- Loading a view: restores saved x/y per node ID; new nodes fall back to current position
- Only mode where drag is enabled — all other modes show a "save view first" hint
- UI: `+` button creates, dropdown lists existing views, green chip shows active view

### Groups, Edges, Hulls
- Groups: user-assigned integer group IDs; convex hulls rendered per group
- Group centers: draggable/pinnable markers; persist in scene export
- Edges: k-nearest-neighbor within group, two color modes (same/complementary)
- Persistent edges: user-created connections (blue), persisted in `localStorage`
- All edges are SVG `<line>` elements in a dedicated `linkG` layer

### Selection
- Lasso (Shift+drag) via `d3-lasso`
- Box select (Alt+drag)
- Mobile: tap Lasso button then drag
- Selection toolbar: Connect All, Connect From (closest to lasso start), Circle Connect

### Editor panel
Right-side panel with four tabs:
- **Details**: name, id, category, value, date, radius, group, baseX/Y, freeform X/Y — edit and save
- **Groups**: list of groups, click to select all nodes in group
- **Nodes**: searchable full node list
- **Events**: event log with export

### Event log / playback
- Every interaction is logged as typed events (verb:noun:id)
- Play/Stop/Scrub controls for replaying the event sequence
- Export log as JSON

### Export/Import
- Scene: JSON with `meta.version`, nodes (serialized), groups (centers, pin, names)
- Nodes: JSON or CSV download; CSV import
- Visual: SVG and PNG export

### UI chrome
- Fixed header: mode select dropdown + freeform views dropdown + options + export/import + help
- Fixed bottom toolbar: edges menu, labels toggle, lasso, clear, reset, play controls, scrub slider
- Date range scrubbers (min/max) for filtering the timeline view
- Status bar: mode, force state, drag state, node count, groups, selected, filter counts
- Drag hint toast (non-freeform modes), undo toast, modes help modal

---

## How to port it

**Recommended approach:** Add a new route `/sketch-data` in adaptics pointing to a new LiveView or a plain controller action that renders the sketch-data HTML as a `.html.heex` template.
The entire JS/CSS is self-contained in the ERB — copy it into `lib/adaptics_web/controllers/page_html/sketch_data.html.heex` and add:

In `router.ex`:
```elixir
get "/sketch-data", PageController, :sketch_data
```

In `page_controller.ex`:
```elixir
def sketch_data(conn, _params), do: render(conn, :sketch_data)
```

The JS depends on:
- `d3.v7.min.js` (already referenced in sandbox via `javascript_include_tag`)
- `d3-lasso` (already referenced)
- Tailwind CDN (inline in the file; can be removed if adaptics already has Tailwind)

Check adaptics `assets/` for D3 — if absent, copy from `sandbox/public/javascripts/d3.v7.min.js` and `d3-lasso.js`.

**Longer term:** The Mode system maps cleanly to the adaptics `Projection` concept.
The node schema (`id, name, r, category, date, value, x, y, group, tags`) maps to adaptics `Node` plus custom attributes.
The freeform view maps to a saved `Projection` with `kind: "freeform"`.
Migrating persistence from localStorage to the adaptics Postgres/Ecto backend is the natural next step after the port.

---

## DRY opportunities: pages to consolidate in adaptics

The following adaptics pages overlap significantly with sketch-data or with each other.
Flag these for the user to decide which to DRY, deprecate, or promote.

### High overlap with sketch-data

| Page | Route | Overlap |
|---|---|---|
| `/ivn` | `page_html/nodes.html.heex` | Node graph with D3; same node+edge concept, different visual style. Could become a Mode or Projection of sketch-data. |
| `/canvas` (CanvasLive) | LiveView | Fabric.js canvas, persistent nodes/edges in Postgres. Closest structural sibling — this is where sketch-data's localStorage should eventually migrate. |
| `/sketch/:space_slug` (FabricCanvasLive) | LiveView | Per-space fabric canvas. Already has the Space/Node/Edge schema. Sketch-data modes could be Projections here. |
| `/gc` (GCLive) | LiveView | Generation Citizen network map — D3 force graph, node filtering, click-for-detail. Shares the "nodes + edges + groups + filter" pattern with sketch-data. |

### Spatial / 3D visualization overlap

| Page | Route | Overlap |
|---|---|---|
| `/3d` | `page_html/3d.html.heex` | Three.js Wardley map. Spatial axes (evolution, visibility) — this IS the intent-vector view. Sketch-data's axis-declaration model could unify with this. |
| `/splines` | `page_html/splines.html.heex` | Curve/path visualization. Lower overlap but shares the "spatial meaning" idea. |
| `/voxels` | `page_html/voxels.html.heex` | 3D grid — stackable three.js demo. Grid mode in sketch-data is a 2D version of this. |
| `/graph` | `page_html/graph.html.heex` | Graph visualization — likely D3 force-directed. Direct overlap with ivn and sketch-data groups mode. |

### Simulation / physics overlap

| Page | Route | Overlap |
|---|---|---|
| `/pool` | `page_html/pool.html.heex` | Physics simulation. Sketch-data Groups mode uses D3 force simulation — same underlying mechanic. |
| `/simulation` | `page_html/simulation.html.heex` | Another simulation. Review for consolidation. |
| `/flow` | `page_html/flow.html.heex` | Flow visualization — may overlap with timeline/value modes. |

### Suggested consolidation strategy

1. **Port sketch-data as `/sketch-data`** (this handoff) — gives it a home in adaptics without breaking anything.
2. **Promote `/canvas` and `/sketch/:slug` as the authoritative node canvas** — these have Postgres persistence, the right schema, and Space/Projection architecture. Sketch-data's modes become Projections here.
3. **Deprecate `/ivn` and `/graph`** into Projections of the canvas once the Projection system matures.
4. **Unify `/3d` with the intent-vector lens** — the spatial axis declaration in sketch-data's Mode system and the `heading/magnitude` fields in INTENT_VECTORS.md converge here. `/3d` is the prototype; a unified intent-aware canvas is the target.
5. **Keep `/voxels`, `/splines`, `/pool`, `/simulation`, `/flow`** as standalone experiments — they are explorations, not product pages.

---

## Acceptance

- [ ] `/sketch-data` renders the full sketch-data UI in adaptics with all modes functional
- [ ] D3 and d3-lasso assets are present and loaded
- [ ] localStorage persistence works (nodes, mode, views, edges, groups)
- [ ] Export/import (scene, CSV, SVG, PNG) works
- [ ] DRY opportunities reviewed with user and decisions recorded in PLAN.md

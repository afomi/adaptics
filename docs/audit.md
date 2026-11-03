# Codebase Audit

> Story 20 output. Every route tagged as `core`, `experiment`, or `deprecated`.
>
> **core** — has schema backing, active persona, and a story in PLAN.md
> **experiment** — JS-only prototype, no schema, no story with acceptance criteria
> **deprecated** — superseded by newer approach or dead-end (confirm before deleting)

---

## Route Audit

| Route | Controller / LiveView | JS | Template | Tag | Notes |
|---|---|---|---|---|---|
| `/` | PageController#index | — | `index.html.heex` | **core** | Home / nav hub |
| `/nodes` | NodeController (resources) | — | `templates/node/*.heex` | **core** | Node CRUD — old Phoenix 1.6 template style; superseded by canvas LiveView |
| `/links` | LinkController (resources) | — | `templates/link/*.heex` | **deprecated** | Link CRUD — rename to edges; old template style |
| `/ivn` | PageController#nodes | `nodes.js`, `force_directed_graph.js` | `page_html/nodes.html.heex` | **core** | D3 force-directed node graph; uses Node/Link schema |
| `/graph` | PageController#graph | `render_graph.js` | `page_html/graph.html.heex` | **core** | D3 graph view; uses Node/Link schema |
| `/splines` | PageController#splines | `render_splines.js` | `page_html/splines.html.heex` | **core** | Spline canvas; uses Node/Link schema |
| `/3d` | PageController#three_d | `voxels.js` (shared?) | `page_html/3d.html.heex` | **core** | Three.js Wardley map; uses wardley_x/y fields on Node |
| `/voxels` | PageController#voxels | `voxels.js` | `page_html/voxels.html.heex` | **experiment** | Stackable Three.js demo; uses Node/Link but no unique feature |
| `/flow` | PageController#flow | — | `page_html/flow.html.heex` | **experiment** | BPMN.js flow diagram; no schema backing |
| `/draw` | DrawLive | `tldraw_hook.js` | (LiveView inline) | **core** | tldraw canvas; persists to `tldraw_canvases` |
| `/draw/data` | CanvasController#data | — | — | **core** | JSON data view for tldraw canvas |
| `/draw/data/parse` | CanvasController#parse | — | — | **core** | Parse/import tldraw JSON |
| `/desktop` | DesktopLive | — | (LiveView) | **experiment** | Desktop-style LiveView; unclear purpose, no schema |
| `/value_stream` | ValueStreamLive | `value_stream.js` | (LiveView inline) | **core** | Value stream / Wardley map LiveView; hardcoded seed data — needs Space persistence |
| `/documents` | DocumentLive.Index | — | (LiveView) | **core** | Document upload and list |
| `/documents/:id` | DocumentLive.Show | — | (LiveView) | **core** | Document detail, attributes, entity extraction |
| `/docs` | DocsLive.Index | — | (LiveView) | **core** | Alternate document browser |
| `/docs/:id` | DocsLive.Show | — | (LiveView) | **core** | Document detail view (docs variant) |
| `/wiki` | WikiLive.Index | — | (LiveView) | **core** | Wiki page list |
| `/wiki/new` | WikiLive.Edit | — | (LiveView) | **core** | Create wiki page |
| `/wiki/:slug` | WikiLive.Show | — | (LiveView) | **core** | View wiki page |
| `/wiki/:slug/edit` | WikiLive.Edit | — | (LiveView) | **core** | Edit wiki page |
| `/wiki/:slug/history` | WikiLive.History | — | (LiveView) | **core** | Wiki revision history |
| `/games/:id` | GameBoardLive | `game.js` | (LiveView) | **experiment** | Game board LiveView; no schema backing |
| `/econ` | EconLive | — | (LiveView) | **experiment** | Economic model LiveView; no schema, no story |
| `/stage` | StageLive | `stage_hook.js` | (LiveView) | **experiment** | Stage hook LiveView; unclear purpose |
| `/pool` | PageController#pool | `pool.js` | `page_html/pool.html.heex` | **experiment** | Pool/billiards physics demo |
| `/vortex` | PageController#vortex | `vortex.js` | `page_html/vortex.html.heex` | **experiment** | Vortex canvas experiment |
| `/unwriter` | PageController#unwriter | `unwriter.js` | `page_html/unwriter.html.heex` | **experiment** | Text unwriter effect |
| `/ecosystem` | PageController#ecosystem | `render_ecosystem.js` | `page_html/ecosystem.html.heex` | **experiment** | Ecosystem visualization |
| `/clock` | PageController#clock | `clock.js` | `page_html/clock.html.heex` | **experiment** | Clock visualization |
| `/cubeviz` | PageController#cubeviz | `cubeviz.js` | `page_html/cubeviz.html.heex` | **experiment** | Cube 3D visualization |
| `/simulation` | PageController#simulation | `energy_simulation.js` | `page_html/simulation.html.heex` | **experiment** | Energy simulation |
| `/energy` | PageController#energy | `energy_physics.js` | `page_html/energy.html.heex` | **experiment** | Energy physics demo |
| `/angles` | PageController#angles | `angles.js` | `page_html/angles.html.heex` | **experiment** | Angles geometry demo |
| `/neighborhood` | PageController#neighborhood | `neighborhood.js` | `page_html/neighborhood.html.heex` | **experiment** | Neighborhood visualization |
| `/rings` | PageController#rings | `balancing_rings.js` | `page_html/rings.html.heex` | **experiment** | Three.js balancing rings (Story 16) |
| `/math` | PageController#math | `math_nodes.js` | `page_html/math.html.heex` | **experiment** | Math node editor (Story 17) |
| `/hydrogen` | PageController#hydrogen | `hydrogen_energy.js` | `page_html/hydrogen.html.heex` | **experiment** | Hydrogen energy viz (Story 18) |
| `/adaptics` | PageController#adaptics | — | `page_html/adaptics.html.heex` | **core** | Product info / about page |
| `/about` | PageController#about | — | `page_html/about.html.heex` | **core** | About page |
| `/timeline` | PageController#timeline | — | `page_html/timeline.html.heex` | **experiment** | Timeline format experiment |
| `/link` | PageController#link | — | `page_html/link_page.html.heex` | **deprecated** | Orphan link page; unclear purpose |

---

## JS Files Without a Route

These files exist in `assets/js/` but are not directly tied to a single route — shared utilities or unrouted experiments.

| File | Tag | Notes |
|---|---|---|
| `app.js` | **core** | Entry point; hooks registration, LiveView setup |
| `user_socket.js` | **core** | Phoenix channel socket |
| `physics/registry.js` | **core** | Physics object registry — used by math_nodes, energy |
| `physics/concepts.js` | **core** | Physics concepts — used by math_nodes, energy |
| `physics/compositions.js` | **core** | Physics compositions — used by math_nodes, energy |
| `stage_hook.js` | **experiment** | Hook for `/stage` |
| `tldraw_hook.js` | **core** | Hook for `/draw` |
| `value_stream.js` | **core** | Hook for `/value_stream` |

---

## Schema vs Route Coverage

| Schema Table | Backing Route(s) | Tag |
|---|---|---|
| `nodes` | `/ivn`, `/graph`, `/splines`, `/3d`, `/voxels`, `/nodes` | core |
| `links` | `/ivn`, `/graph`, `/splines`, `/3d`, `/voxels`, `/links` | core (rename to edges) |
| `tldraw_canvases` | `/draw`, `/draw/data` | core |
| `mice` | (no route — WebSocket channel only) | core |
| `documents` | `/documents`, `/docs` | core |
| `document_attributes` | `/documents/:id`, `/docs/:id` | core |
| `wiki_pages` | `/wiki/*` | core |
| `wiki_revisions` | `/wiki/:slug/history` | core |

**No schema backing (experiment routes):** `/vortex`, `/unwriter`, `/clock`, `/pool`, `/cubeviz`, `/simulation`, `/energy`, `/angles`, `/neighborhood`, `/rings`, `/math`, `/hydrogen`, `/ecosystem`, `/flow`, `/desktop`, `/games/:id`, `/econ`, `/stage`, `/timeline`

---

## Duplicate Templates

Two template directories exist for some routes — old Phoenix 1.6 style (`lib/adaptics_web/templates/page/`) and new 1.7 style (`lib/adaptics_web/controllers/page_html/`). Several templates appear in both.

| Template | Old location | New location | Action |
|---|---|---|---|
| `voxels.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `3d.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `graph.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `nodes.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `splines.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `flow.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `ecosystem.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `pool.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `vortex.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `unwriter.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `clock.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `cubeviz.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `game.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `index.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `sidebar.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |
| `link.html.heex` | `templates/page/` | — | Deprecated — delete |
| `value_stream.html.heex` | `templates/page/` | `controllers/page_html/` | Delete old |

Node and Link CRUD templates (`templates/node/`, `templates/link/`) are old-style with no new counterpart — keep until NodeController/EdgeController are migrated to LiveView.

---

## Summary

| Tag | Count | Action |
|---|---|---|
| core | 20 routes | Maintain and build on |
| experiment | 22 routes | Keep as playground; do not build schema on top of them until promoted |
| deprecated | 2 routes (`/links` CRUD, `/link` page) | Confirm and remove |

**Highest-value cleanup:** Delete `lib/adaptics_web/templates/page/` — all active templates have been moved to `controllers/page_html/`. Confirm before deleting.

**Next migration priority:** `create_spaces` → `add_space_id_to_nodes` → `rename_links_to_edges` (see DATA_MODEL.md).

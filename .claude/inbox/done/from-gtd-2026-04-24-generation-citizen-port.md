---
from: gtd
to: adaptics
date: 2026-04-24
subject: Port Generation Citizen features into Adaptics (1-2 pages)
---

## Task

Generation Citizen is a standalone civic org network map app. The goal is to port its core features into 1-2 Adaptics pages, replacing the custom app with Adaptics as the visualization platform.

## What Generation Citizen Does

1. **Network map** — interactive graph of Organizations (nodes) with edges showing relationships
2. **Filterable directory** — filter orgs by type, values, programs, regions served, populations served
3. **Geographic map** — pins for each org/program address on a Google Map with marker clustering
4. **Node detail** — each node shows website, logo, programs

**Data source:** Google Spreadsheet
- https://docs.google.com/spreadsheets/d/1NvC-CtSJDOtVtxIvfNlKp5IFug3KVXor7HMzG6g3gaw/edit#gid=0
- https://docs.google.com/spreadsheets/d/1lz0lO-4lzt-sQNvQuIa_7bckw1gYetn5D9ABcHUdAAU/edit#gid=1573956850

**Use cases to preserve:**
- Gap analysis (what orgs/services are missing?)
- Finding service deserts (geographic gaps)
- Impact mapping (relationships between orgs)
- Filtering by org type, values, programs, regions, populations

## Proposed Adaptics Implementation

### Page 1: Network Graph
- Ingest org data as Things (nodes) from a CSV/spreadsheet
- Render relationships as Connections (edges)
- Filtering panel: org type / values / programs / regions / populations
- Only show nodes matching active filters (hide unfiltered nodes)
- Cluster overlapping nodes
- Node detail on click: name, website, logo, programs

### Page 2: Geographic Map
- Plot org/program addresses as positioned nodes on a spatial canvas
- Marker clustering for dense areas
- Filter panel shared with Page 1
- State-level zoom

## Key Bugs to Avoid (from Generation Citizen)
- Node text overlapping — enforce smart alignment (see Adaptics icebox card)
- Nodes "spazzing" on mobile — constrain drag/animation on touch
- Links overlapping nodes — z-index / layout ordering

## Reference
- Generation Citizen repo/live site: Heroku instance `generation-citizen`
- Original Trello board: https://trello.com/b/FRiIw6iD/generation-citizen
- Generation Citizen handoff: `~/workspace/generation-citizen/.claude/inbox/from-gtd-2026-04-24-generation-citizen-board.md`

## Next Actions
- [ ] Review org spreadsheet schema — define Thing attributes (name, type, values, programs, regions, populations, website, logo)
- [ ] Ingest spreadsheet as seed data into Adaptics
- [ ] Build Page 1: network graph with filter panel
- [ ] Build Page 2: geographic map view
- [ ] Test filtering: only show filtered nodes
- [ ] Test mobile: no spazzing

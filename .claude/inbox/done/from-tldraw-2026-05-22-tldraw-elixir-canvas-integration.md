---
from: tldraw
to: adaptics
created: 2026-05-22
status: pending
summary: Plan for reading .tldr files in Elixir to enable search, containment-as-sets modeling, and alternative interfaces to tldraw canvases
---

## Context

We've been exploring how to pair tldraw (infinite canvas SDK) with adaptics/Elixir as a backend. tldraw has an excellent visual interface but the publishing license is $6k/year, so the focus is local use. The goal is three-fold:

1. **tldraw as the visual interface** — used locally for drawing, modeling, spatial arrangement
2. **Elixir reads .tldr files** — provides alternative interfaces like search, entity listing, relationship traversal
3. **Mathematical sets via spatial containment** — frames/boxes on the canvas define sets; containment = membership; arrows = relations between sets. This is a foundation for systems modeling as a collaborative, massively scalable interface.

### The deeper idea: canvas as shared ontology

Geographic maps force deduplication because physical space is unique — there's only one "corner of 5th and Main." Conceptual space doesn't share that constraint until concepts are made tangible via a medium. A pictographic canvas forces concepts to be made explicit: drawn, named, bounded, connected.

Three properties of maps that translate to conceptual modeling on canvas:
- **Zoom levels as nested frames** — high-level frames contain mid-level frames contain detail. This mirrors Beer's recursive system structure.
- **Position disambiguates** — same-named concepts in different frames are scoped by their containing set.
- **Duplication is detectable** — Elixir can flag same labels appearing in multiple places, forcing modelers to decide: same concept (link them) or different (rename one).

This connects to Beer's cybernetics: the canvas is the real-time feedback channel, boxes are variety attenuators, and Elixir maintains coherence across recursion levels.

## The .tldr file format

A `.tldr` file is JSON with MIME type `application/vnd.tldraw+json`. Structure:

```json
{
  "tldrawFileFormatVersion": 1,
  "schema": {
    "schemaVersion": 2,
    "sequences": { "com.tldraw.store": 4, "com.tldraw.shape.geo": 1, ... }
  },
  "records": [
    {
      "id": "shape:abc123",
      "typeName": "shape",
      "type": "frame",
      "x": 100,
      "y": 200,
      "rotation": 0,
      "index": "a1",
      "parentId": "page:page1",
      "isLocked": false,
      "opacity": 1,
      "props": { "w": 400, "h": 300, "name": "System 3", "color": "blue" },
      "meta": {}
    },
    {
      "id": "shape:def456",
      "typeName": "shape",
      "type": "geo",
      "parentId": "shape:abc123",
      "props": { "geo": "rectangle", "text": "Audit function", "w": 150, "h": 80 },
      ...
    },
    {
      "id": "binding:ghi789",
      "typeName": "binding",
      "type": "arrow",
      "fromId": "shape:arrow1",
      "toId": "shape:def456",
      "props": { ... }
    }
  ]
}
```

### Key concepts for parsing

- **Every record** has `id` (prefixed like `shape:`, `page:`, `binding:`, `asset:`) and `typeName`
- **Shapes** have `type` (the shape kind), `parentId` (page or another shape), `x`, `y`, `props`, `meta`
- **parentId** is the containment model: `"page:xxx"` = top-level, `"shape:xxx"` = nested inside a frame or group
- **Frames** (`type: "frame"`) are named containers with `props.name`, `props.w`, `props.h` — these are the "sets"
- **Groups** (`type: "group"`) are invisible containers — children linked by `parentId`
- **Bindings** represent connections (arrows between shapes) — `fromId` and `toId` link to shape IDs
- **13 default shape types**: arrow, bookmark, draw, embed, frame, geo, group, image, line, note, text, video, highlight
- **Geo shapes** have a `props.geo` subtype: rectangle, ellipse, triangle, diamond, pentagon, hexagon, octagon, star, rhombus, rhombus-2, oval, trapezoid, arrow-right, arrow-left, arrow-up, arrow-down, x-box, check-box, cloud, heart
- **Text content** lives in `props.text` (geo, note, text shapes) and `props.name` (frames)

### Containment hierarchy

To reconstruct the set hierarchy:
1. Find all records where `typeName === "shape"`
2. Build a tree from `parentId` references
3. Frames with `parentId` pointing to another frame = subset relationship
4. Shapes with `parentId` pointing to a frame = set membership
5. Bindings with `fromId`/`toId` = relations between elements

## Request

Build an Elixir module that can parse `.tldr` files and index them for search and structural queries. Suggested approach:

### Step 1: TldrawParser module

Create `lib/adaptics/canvas/tldraw_parser.ex` that:
- Reads a `.tldr` file from disk
- Decodes JSON with `Jason.decode!/1`
- Extracts and returns structured data: shapes, bindings, pages
- Builds the containment tree (parent-child hierarchy from `parentId` fields)
- Extracts all text content from shapes (`props.text`, `props.name`)

### Step 2: Search interface

Create `lib/adaptics/canvas/tldraw_search.ex` that:
- Full-text search across shape text content
- Filter by shape type (find all frames, all arrows, all notes)
- Spatial queries (shapes within a bounding box)
- Containment queries ("what's inside this frame?", "what set does this shape belong to?")
- Relationship traversal ("what does this shape connect to via arrows/bindings?")

### Step 3: Deduplication detection

- Flag shapes with identical text content across different frames
- Surface these as "possible shared concepts" that may need to be linked or disambiguated

### Step 4: Connect to existing adaptics infrastructure

Adaptics already has:
- `Adaptics.Canvas` context with PubSub and snapshot persistence (currently Fabric.js format)
- `Adaptics.Canvas.CanvasSnapshot` schema with `snapshot` (map), `version`, `saved_by`, `space_id`
- Document processing workers (text extraction, entity extraction, metadata extraction)
- Visual node/link models at `lib/adaptics/visual/`

The tldraw parser could either:
- Replace the Fabric.js canvas pipeline (store tldraw snapshots in `canvas_snapshots`)
- Run alongside it as a separate file-based workflow (read `.tldr` files from disk, index into Postgres)

### Convention: sets-as-frames

Establish and document the convention:
- A **frame** on the tldraw canvas represents a **mathematical set**
- Shapes inside a frame are **members** of that set
- A frame inside another frame is a **subset**
- Arrows between shapes/frames represent **relations** between sets or elements
- Frame `props.name` is the set's label
- This convention enables Elixir to treat the spatial canvas as a queryable formal model

## Relevant files

In tldraw repo (`~/workspace/tldraw`):
- `packages/tldraw/src/lib/utils/tldr/file.ts` — serialization/deserialization of .tldr files
- `packages/tlschema/src/shapes/TLFrameShape.ts` — frame shape type definition
- `packages/tlschema/src/shapes/TLBaseShape.ts` — base shape fields
- `packages/tlschema/src/records/TLShape.ts` — all default shape types
- `packages/editor/src/lib/editor/derivations/parentsToChildren.ts` — containment derivation logic

In adaptics repo (`~/workspace/adaptics`):
- `lib/adaptics/canvas/canvas.ex` — existing canvas context (PubSub, snapshot persistence)
- `lib/adaptics/canvas/canvas_snapshot.ex` — Ecto schema for snapshots
- `lib/adaptics/visual/node.ex` and `lib/adaptics/visual/link.ex` — existing graph models
- `lib/adaptics/documents/text_extractor.ex` — existing text extraction (pattern to follow)
- `lib/adaptics/documents/entity_extractor.ex` — existing entity extraction

## Acceptance

- An Elixir module can read a `.tldr` file and return a structured representation of shapes, containment hierarchy, and text content
- A search function can find shapes by text content
- A containment query can answer "what shapes are inside frame X?" and "what frame contains shape Y?"
- Duplicate labels across frames are surfaced
- There is a test with a sample `.tldr` file exercising these capabilities

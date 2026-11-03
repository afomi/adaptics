# Concept Inventory

> Canonical domain vocabulary for Adaptics.
> Every term used in personas, stories, and the data model should appear here.
> Synonyms and aliases are listed explicitly — use the **Canonical Term** in all artifacts.

---

## Canvas & Graph

| Concept | Canonical Term | Aliases / Retired Terms | Description | Schema Entity | Related Personas | Related Stories |
|---|---|---|---|---|---|---|
| A visual workspace containing nodes and edges | **Space** | Canvas, Board | The top-level container in which a Creator builds a concept map. Has a name, owner, and set of Nodes and Edges. | `spaces` (planned) | P1, P2, P3 | 20, 21, 22, 23, 24, 26, 27, 30 |
| A concept, object, or entity placed on a Space | **Node** | Thing, Card, Sticky, Object, Item | The primary unit of content on a Space. Has position (x, y), a label, a kind, and optional attributes. | `nodes` | P1, P2 | 22, 23, 25, 26, 28, 29 |
| A directed relationship between two Nodes | **Edge** | Connection, Link, Arrow, Relation | Connects a source Node to a target Node. Has a name/label and optional weight or type. | `links` → rename to `edges` | P1, P2 | 28 |
| A named, filterable view of a Space | **Projection** | View, Pivot, Lens | A saved configuration that filters, sorts, or arranges the Nodes and Edges in a Space. Different Projections reveal different perspectives on the same data. | `projections` (planned) | P1, P2, P3 | 30 |
| A grouping or overlay within a Space | **Layer** | Lane, Group, Overlay | A named subset of Nodes within a Space, used to organize by type, time, or role. | `layers` (planned) | P1, P3 | 21 |
| A visual and functional mode for reading the Space | **Lens** | Mode, View type | A Lens changes how the Space is annotated or interpreted — e.g. descriptive, action-oriented, contextual. Distinct from Projection (which filters data) — a Lens changes the reading mode. | (UI concept, no schema) | P1, P2 | — |

---

## Events & History

| Concept | Canonical Term | Aliases / Retired Terms | Description | Schema Entity | Related Personas | Related Stories |
|---|---|---|---|---|---|---|
| A discrete user or system action | **Event** | Action, Interaction, Log entry | A typed record of something that happened: `verb:noun:id[:json_blob]`. Examples: `create:node:123`, `move:node:123 from:0,0 to:10,20`. Foundation for history, undo, replay, and analytics. | `events` (planned) | P1, P2, P4 | 25, 26, 27 |
| An ordered sequence of Events for a Space | **Event Log** | History, Audit log, Timeline | The full ordered record of Events for a Space. Can be replayed to reconstruct state. | `events` (planned) | P1, P4 | 26, 27 |
| A derived view computed from the Event Log | **Projection** | (see Canvas section) | Projections are also the read-model derived from events — the current state is a projection of the event history. Same term, two related meanings. | — | P2 | 27, 30 |

---

## Documents & Intelligence

| Concept | Canonical Term | Aliases / Retired Terms | Description | Schema Entity | Related Personas | Related Stories |
|---|---|---|---|---|---|---|
| An uploaded file (currently PDF) | **Document** | File, Upload | A file ingested into Adaptics. Has a status lifecycle: `pending → uploaded → extracting → ready → error`. | `documents` | P2, P3 | 1, 2, 3, 4, 5, 6 |
| A key-value annotation on a Document or Node | **Attribute** | Metadata, Tag, Property | A structured key-value pair attached to a Document or Node. Has a `source` (manual, ner, geocoded, metadata_extractor). | `document_attributes` | P2 | 5, 7, 8, 15 |
| A named entity extracted from document text | **Entity** | NER result, Extracted concept | A Person, Organization, Location, or Keyword extracted by spaCy NER. Stored as Attributes with `source: "ner"`. | `document_attributes` (source=ner) | P2 | 7 |
| A geographic coordinate derived from a location entity | **Geocoded Location** | Coordinates, Lat/lng | Latitude and longitude resolved from a location Entity via Nominatim. Stored as an Attribute. | `document_attributes` (source=geocoded) | P2 | 8 |
| A governance term extracted from document text | **Metadata** | Governance metadata, Policy term | Programs, performance metrics, policies, and modal language extracted by pattern matching. Stored as Attributes. | `document_attributes` (source=metadata_extractor) | P2 | 15 |
| An asynchronous unit of background processing | **Job** | Worker, Task, Background job | An Oban-managed background job for text extraction, NER, geocoding, or metadata extraction. | Oban jobs table | P4 | 9 |

---

## Wiki

| Concept | Canonical Term | Aliases / Retired Terms | Description | Schema Entity | Related Personas | Related Stories |
|---|---|---|---|---|---|---|
| A wiki article with a title, slug, and Markdown body | **Wiki Page** | Page, Article, Note | A knowledge base entry. Has a slug, title, body (Markdown), and revision history. | `wiki_pages` | P1, P2 | 10, 11, 12, 13, 14 |
| A saved version of a Wiki Page body | **Revision** | Version, History entry | A point-in-time snapshot of a Wiki Page body, created on each save. | `wiki_revisions` | P1 | 13 |

---

## Drawing Canvas

| Concept | Canonical Term | Aliases / Retired Terms | Description | Schema Entity | Related Personas | Related Stories |
|---|---|---|---|---|---|---|
| A persisted tldraw drawing canvas | **Canvas** | Drawing, Board | A freeform drawing surface backed by tldraw. Stores raw tldraw JSON plus extracted text content and shape count. | `tldraw_canvases` | P1, P3 | — |

---

## Synonym / Collision Register

These terms appear in multiple places with inconsistent meaning. **Always use the canonical term.**

| Retired / Ambiguous Term | Use Instead | Notes |
|---|---|---|
| Thing | Node | Trello-era UI-friendly name; replaced by Node |
| Connection | Edge | Trello-era name; replaced by Edge |
| Link | Edge | Also collides with HTML hyperlink; Edge is unambiguous |
| Card | Node | UI nickname; use Node in code and specs |
| Sticky | Node | UI nickname for a draggable text node |
| Object | Node | Too generic |
| Canvas | Space or Canvas | Overloaded: use **Space** for the graph workspace, **Canvas** for the tldraw drawing surface |
| View | Projection or Lens | Overloaded: use **Projection** for data filters, **Lens** for reading modes |
| Metadata | Attribute | Use Attribute for all key-value annotations; Metadata only in the governance extraction context |

# Adaptics Personas

> These personas define the distinct classes of users Adaptics is designed to serve.
> Every user story should reference one of these personas by name.

---

## P1: Creator

**Role:** Knowledge worker, analyst, facilitator, or practitioner building concept maps, process models, or system diagrams.

**Responsibilities:**
- Creating and organizing Nodes and Edges on a canvas
- Naming and labeling concepts and relationships
- Sharing Spaces with collaborators or stakeholders

**Goals:**
- Express a mental model visually without friction
- See relationships between concepts emerge as a graph
- Build a map that communicates to others what they understand internally

**Context:**
- Works alone or in a small team
- Comes from a variety of domains: civic, business, education, research
- May or may not be technical
- Primary surfaces: `/draw`, `/ivn`, `/graph`, `/value_stream`

**Stories:** 22, 23, 24, 25, 28, 29, 30

---

## P2: Data-focused Creator

**Role:** Analyst, researcher, or engineer who brings structured data into Adaptics and works with it spatially.

**Responsibilities:**
- Importing datasets, documents, or external records into a Space
- Annotating objects with attributes and metadata
- Switching between projections to analyze the same data from different angles

**Goals:**
- Turn raw data (CSV, JSON, PDF, event logs) into a navigable visual structure
- Pivot between views without losing the underlying data
- Extract structured metadata automatically where possible

**Context:**
- More technical than P1; comfortable with data formats and schema concepts
- Uses documents pipeline, entity extraction, geocoding
- May build or configure projections
- Primary surfaces: `/documents`, `/docs`, `/wiki`, `/value_stream`, `/graph`

**Stories:** 7, 8, 9, 15, 30

---

## P3: Space Manager (Admin)

**Role:** Team lead, project manager, or product owner responsible for configuring and maintaining a shared Space.

**Responsibilities:**
- Defining Space defaults (layout, node types, allowed projections)
- Managing who has access to a Space
- Ensuring the Space stays organized and useful over time

**Goals:**
- Set up a Space that works for their team without requiring constant intervention
- Control the vocabulary and structure of the Space (node kinds, edge types)
- Publish or share finished Spaces with stakeholders

**Context:**
- Manages one or more Spaces on behalf of a team
- May delegate creation to P1/P2 users
- Primarily concerned with governance of the Space, not day-to-day content
- Primary surfaces: `/draw`, `/documents`, Space settings (planned)

**Stories:** 20, 21, 29

---

## P4: Super-admin

**Role:** Platform operator or developer responsible for the health and configuration of the Adaptics deployment.

**Responsibilities:**
- Managing all users, Spaces, and system-level settings
- Monitoring system health and background job queues
- Maintaining data integrity across the platform

**Goals:**
- Keep the platform running reliably
- Inspect and recover from errors in pipelines (document extraction, geocoding, etc.)
- Audit system behavior when issues are reported

**Context:**
- Technical; has access to `/dashboard` (LiveDashboard) and backend tooling
- May be the developer or a designated ops person
- Primary surfaces: `/dashboard`, Oban job queue, database

**Stories:** 9

---

## Vocabulary note

The product uses `Node` and `Edge` as the canonical data model terms.
In UI copy and user-facing language, `Node` may be presented as a card, concept, or object depending on context.
`Edge` may be presented as a connection or relationship.
These are presentation aliases — the underlying schema uses `Node` and `Edge`.

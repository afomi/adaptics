# Handoff: implement Atlas as a standalone Adaptics product

## Outcome

Implement a reusable, public-facing **Atlas** at `/atlas` in Adaptics. Atlas is not a project page or a geographic map widget. It is a composable interface for making a shared model of reality legible from an append-only public event stream.

The first target is civic/public-record context. The underlying model must also support activity from a public blockchain: a global event stream, independently produced source events, CQRS-style read models, and multiple named projections of the same event history.

## Product premise

```text
append-only source events
        ↓ normalize + preserve provenance
canonical event stream
        ↓ project
Atlas read models / topology / timeline / activity views
        ↓
people inspect, compare, annotate, and share a particular projection
```

The event log is the durable record. A projection is an explicitly named, reproducible read model, not a mutable substitute for source history. A lens changes how a projection is interpreted; it should not silently change the underlying events.

Adaptics already has useful foundations:

- `Adaptics.Event` / `Adaptics.Events`: immutable, space-scoped event persistence.
- `Adaptics.Projection` / `Adaptics.Projections`: named saved projections.
- `Space`, graph/canvas, timeline, document, and semantic-axis work.
- Phoenix LiveView and PubSub suitable for a live read interface.

Do not couple Atlas to the current canvas event payload or to a single blockchain. Instead, make an Atlas event envelope and event-source boundary that can adapt existing events, civic records, and later public-blockchain events.

## First slice: a working `/atlas`

Add a LiveView route at `/atlas` and build a usable, responsive three-region interface:

1. **Projection rail** — named projections/lenses, active source filters, and a clear truth/provenance legend.
2. **Atlas canvas** — a topological read model that can render entities and relationships. Geographic coordinates are optional metadata, not a hard dependency.
3. **Context reader + timeline** — an activity stream/timeline scrubber, selected-event details, entity relationships, source/provenance, and annotation affordance.

The initial screen should work with seed fixtures, not depend on a live blockchain or an external API. It must make the model coherent enough to demonstrate:

- selecting a projection changes the read model but not source events;
- scrubbing/selecting an event updates the reader and highlights affected entities;
- each displayed relationship/event exposes its source, observed time, and truth state;
- a deep link can reproduce the current projection and selected event;
- updates can arrive live through an internal event feed without resetting the reader state.

## Canonical event contract

Create a dedicated Atlas event/normalization boundary. The exact schema can evolve, but preserve these fields or their equivalents:

```text
event_id             stable, globally unique
source_id            source system / publisher / chain identifier
stream_id            source stream, account, topic, block, or collection
sequence             source ordering key; may be a block height + transaction index
event_type           namespaced verb, e.g. civic.plan.adopted or chain.tx.confirmed
occurred_at          source-asserted event time when available
observed_at          when Adaptics retrieved or accepted the event
actor_ref            optional public actor identifier
subject_refs         one or more affected entity identifiers
payload              original / normalized attributes
provenance           canonical URI, transaction ID, document reference, hash, signature, etc.
truth_state          observed | reported | proposed | adopted | delivered | superseded
```

Rules:

- Preserve raw source payload or a content-addressed reference; do not erase provenance during normalization.
- Ordering must be deterministic even when source timestamps collide or arrive late.
- Projections must be rebuildable from the event stream.
- Treat blockchain confirmation/finality as explicit state, not an implicit assumption.
- User annotations are separate events with their own authorship/provenance; they never overwrite source events.

## CQRS / projection design

Build the first read side behind a small interface rather than embedding query logic in the LiveView.

Suggested modules (names are flexible):

```text
Adaptics.Atlas.Event             canonical event struct and validation
Adaptics.Atlas.Source            source/adapter behaviour
Adaptics.Atlas.Stream            append/query interface for normalized events
Adaptics.Atlas.Projections       projection definitions and materialization
Adaptics.Atlas.Topology          entities, relationships, and affected-node derivation
AdapticsWeb.AtlasLive            `/atlas` read interface
```

Start with at least these named projections:

| Projection | Question it answers |
|---|---|
| Activity | What changed, in source order, and who/what did it affect? |
| Entity context | What events, relationships, sources, and unresolved items surround this entity? |
| Topology | Which entities are connected by the selected event window or source filter? |
| Provenance | What is observed directly, reported by a source, proposed, adopted, or delivered? |

An event may affect multiple entities. Do not reduce the read model to a single linear feed.

## UI behavior and accessibility

- Use existing Phoenix 1.8 layout and component conventions.
- Keep the activity feed keyboard navigable and readable without the canvas.
- Use color only as a secondary truth-state cue; include text and icons/labels.
- Respect `prefers-reduced-motion`; do not autoplay an event stream.
- Use URL state for at least `projection` and `event` so a specific context can be shared.
- Clearly label demo/fixture data and external-source status.

## Test-first acceptance criteria

1. `/atlas` renders via LiveView under the correct browser scope and uses the app layout/current scope conventions.
2. Canonical event validation rejects missing source identity, type, ordering information, or provenance.
3. A projection is deterministic: the same stream + projection definition produces the same entity/relationship read model.
4. Events with identical timestamps still sort deterministically.
5. A selected event deep link restores the projection and reader selection.
6. Annotation events remain distinct from source events and retain their author/source reference.
7. The Atlas UI has an accessible non-canvas activity/reader path.
8. Run the focused tests and `mix precommit` before handoff.

## Explicit non-goals for the first slice

- Do not ingest or index a real blockchain yet.
- Do not build a universal ontology or force all existing Adaptics events into the new envelope.
- Do not present inferred links as source facts.
- Do not implement collaborative annotation moderation in the initial UI; establish the event contract first.

## Reference implementation / design context

OpenSolano’s initial public Atlas pattern lives at:

- `/Users/ryan/workspace/opensolano/atlas/`
- `/Users/ryan/workspace/opensolano/assets/js/atlas.js`
- `/Users/ryan/workspace/opensolano/docs/ATLAS.md`
- `/Users/ryan/workspace/opensolano/docs/ATLAS_PUBLIC_GUIDE.md`

Reuse the underlying design principles—context through place, time, source-backed relationships, and annotations—but build a native Adaptics product rather than copying the Jekyll implementation.

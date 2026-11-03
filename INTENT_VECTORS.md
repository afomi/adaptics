# Intent Vectors — lines as first-class agency

Pivoted in from `~/workspace/visual-symbolic-language` (2026-06-06).
Extends `CONCEPT_INVENTORY.md` and `DATA_MODEL.md`.

## The idea

A **Node** in Adaptics is a *point* — it has a position (`x, y, z`) and a semantic projection (`wardley_x, wardley_y`).
An **Edge** is a *relation* between two existing Nodes (A → B).

Neither models the thing this concept is about: **the line itself as a vector of agency.**
An agent has an **origin** (where it stands) and a **heading** (where it points) and a **magnitude** (how hard it pushes).
A **goal** is a *coordinate* the vectors align toward — not necessarily a Node.

The interesting, queryable property is **alignment**: how directly a heading points at the goal.
This sits *between* Node (point) and Edge (A→B link): a vector that originates at a point and points at a coordinate.

## Wardley framing

A diagram is topological (only connections matter).
A **map** is geometric — position carries meaning.
Intent vectors add a third thing: **direction carries meaning too.** Where you point is a claim, the way coordinates are a claim.

## Data model (decision: extend Node)

Rather than a new entity, a Node gains two optional fields. *A point is a vector of zero declared intent* — so this is backward compatible.

```elixir
field :heading,   :float   # radians, direction in the map plane (atan2(dx, dz) convention, matching /3d)
field :magnitude, :float   # force / conviction; arrow length. nil = unset.
```

- `heading = nil` → the Node is a plain point (current behavior, unchanged).
- A "goal" is not stored on the Node; it is a coordinate supplied to a query or a projection. Goals can later be promoted to `kind: "goal"` Nodes whose position is the coordinate.

## Query interface (the M in MVC)

```
Visual.aligned_to_goal(nodes, {goal_x, goal_y}) ::
  [%{node: %Node{}, alignment: float, distance: float}]
```

- `alignment` = cosine similarity of the heading unit vector and the (node → goal) unit vector. Range [-1, 1].
- Nodes with `heading == nil` are excluded.
- Pure function over a list + coordinate — no DB dependency, trivially testable, reusable by any projection.

## View interface (the V in MVC)

`/intent` — a projection (Three.js, tldraw-styled) that renders each intent Node as an arrow from its origin along its heading, scaled by magnitude, colored/brightened by alignment to a draggable goal coordinate. The goal drag is the C; it mutates the query input, the model re-projects.

This is one V among many: the same Nodes already render under `/3d`, `/ivn`, `/splines`. Intent is just another lens.

## Convention (heading)

Heading is measured the same way the `/3d` renderer interprets the plane: angle around the vertical axis, `0` pointing toward +z, increasing toward +x — i.e. `atan2(dx, dz)`. Keep this consistent so headings authored in one view read correctly in another.

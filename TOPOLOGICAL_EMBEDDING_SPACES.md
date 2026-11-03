# Topological Embedding Spaces

Ways to visualize embedding spaces — and the difference between *exploring* a topology and *defining* one.

Reference doc. Related: `INTENT_VECTORS.md` (position and direction as claims), `DATA_MODEL.md` (Projections over a shared Node/Edge graph), PLAN.md thread FC2 (customizable axes), `~/workspace/cdcs_ex` (semantic axes reference implementation).

## The map/diagram distinction, applied to embeddings

Wardley's distinction: a **map** has defined coordinates — position carries meaning, and moving a point is a claim. A **diagram** is topological — only connections/adjacency matter, and layout is arbitrary aesthetics.

Embedding visualizations split cleanly along this line, and the split is a choice you make, not a property of the data:

| Technique | Coordinates defined by | Map or diagram? |
|---|---|---|
| Projection onto **semantic axes** (pole-anchored: verbose↔concise) | You — the axis definitions | **Map**. Axes are stable, nameable, contestable. Same axes work across datasets. |
| PCA | The data's variance structure | Weak map. Axes exist but are found, not named; PC1 means nothing until you interpret it. |
| UMAP / t-SNE | The optimizer | **Diagram**. Neighborhoods are real; absolute position and axes are meaningless. Distances between far clusters are lies. |
| Force-directed kNN graph | The physics simulation | **Diagram**. Pure topology; every re-run relaxes differently. |
| Similarity heatmap (matrix) | Row/column ordering | Neither — it drops space entirely and shows the metric directly. |

The interesting move, and the one adaptics is built for: **use diagram techniques to explore a topology, then promote what you find into defined axes — turning the diagram into a map.** UMAP shows you there's a cluster; you name the axis that separates it; now you have a coordinate system others can argue with. That promotion step is exactly what cdcs_ex's semantic axes do (axis vector = normalized difference of pole centroids; position = dot product), and what FC2's `"semantic"` layout kind brings to the canvas.

## A catalog of embedding visualizations

1. **Defined-axes scatter (the map).** Pick two semantic axes, project every item, plot. Coordinates mean something; the axes are the legend. Comparable across corpora and across time. This is cdcs_ex's `/explore/axes` and adaptics' FC2 semantic layout.
2. **Neighborhood atlas (the terrain).** UMAP/t-SNE to 2D, render density as terrain — contours, hillshading, cluster labels that appear progressively. Nomic Atlas and deepscatter are prior art. Topology only, but excellent for "what's even in here?"
3. **Similarity graph.** kNN edges over items, force layout. Good for spotting bridges and islands; bad for anything positional.
4. **Similarity matrix.** Items × items heatmap, ordered by an external structure (document order, hierarchy). Shows structural rhyme without pretending to be space.
5. **Trajectories.** A document's sections (or a conversation's turns) as an ordered path through projected space — direction and drift become visible. Pairs naturally with intent vectors (`heading`/`magnitude`).
6. **Vector fields / displacement.** Matched pairs across two corpora drawn as arrows from A's position to B's. Comparison as a field, not two overlaid blobs. (FC2.14's comparison overlay is this, for mental models.)
7. **Parallel planes (3D).** Two corpora on two planes in Three.js, correspondence lines between them — the "bunkbed" layout. Rotate to see alignment density; sparse regions on either plane are gaps.

## Worked example: two municipal codes

Say San José's and Oakland's municipal codes, embedded section-by-section (`nomic-embed-text` handles 8k tokens; a section is a natural unit; the hierarchy Title → Chapter → Section comes along as metadata). At least four distinct visualizations, in map→diagram order:

### 1. Shared-axes regulatory map (map)

Define axes with pole anchor phrases: **permissive ↔ restrictive**, **procedural ↔ substantive** (or penalty-bearing ↔ administrative). Project *both* codes' sections onto the same two axes; color by city.

Because the coordinates are defined, this supports real claims: "Oakland's noise ordinances sit measurably further toward *restrictive* than San José's." Filter to one chapter topic (zoning, animal control) and the two cities become two clouds whose displacement is the finding. Same-topic section pairs (matched by cross-corpus nearest-neighbor) drawn as arrows turn the comparison into a vector field — where does Oakland systematically sit relative to San José, per topic?

### 2. Semantic terrain atlas with Google-Maps zoom (diagram, done well)

UMAP the union of both corpora into 2D once (shared projection, so the two codes are comparable), then render as a **zoomable atlas**:

- **Zoom level 1 (city view):** density contours + top-level cluster labels — "Land Use," "Public Safety," "Business Licensing." These emerge from the embeddings, not the codes' own tables of contents — which makes divergence between emergent topics and official structure itself visible.
- **Zoom level 2 (neighborhood):** chapter-scale labels appear, individual sections resolve as points, colored by city.
- **Zoom level 3 (street):** section numbers and first lines as labels; click for full text.

Semantic zoom — label LOD tied to zoom scale, quadtree tiling for point culling — is exactly the Google Maps interaction grammar. Regions dense with only one city's color are "territory" the other city doesn't regulate. Three.js does this comfortably: instanced point sprites for 10⁴–10⁵ sections, `OrbitControls` constrained to pan/zoom, text sprites gated by camera distance. (Adaptics' `/civics` exploded-view and `/scope` pages already exercise the relevant Three.js patterns.)

### 3. Parallel-planes correspondence view (3D diagram)

Each code on its own plane, sections positioned by the shared UMAP; lines between cross-corpus nearest neighbors above a similarity threshold. Looking edge-on shows alignment density per region; a chapter with no lines to the other plane is unique regulation. This is the most legible "two mental models, one space" rendering — and generalizes beyond codes to any two people's concept graphs.

### 4. Structure-vs-structure heatmap (no space)

Rows = San José sections in official order, columns = Oakland's, cells = cosine similarity. Blocks on the diagonal mean the codes are organized similarly; bright off-diagonal blocks mean the same content lives in different places — organizational divergence, invisible in any scatter.

## Zoom as a first-class operation

Ryan's expand/contract (zoom-out ↔ zoom-in) note maps to three distinct mechanics worth keeping separate:

- **Geometric zoom** — same points, bigger pixels. Cheap, meaning-free.
- **Semantic zoom** — representation changes with scale: clusters → labeled groups → individual points → full text. This is the Google Maps trick, and it's what makes 30k sections navigable.
- **Re-projection zoom** — zooming *recomputes* the space: select a cluster, re-run UMAP (or pick finer axes) on just that subset, so local structure that global projection crushed becomes visible. The most powerful and the most disorienting; needs breadcrumbs ("you are inside: Land Use").

A useful discipline: geometric zoom for maps (coordinates must stay stable — that's what makes them maps), semantic and re-projection zoom for atlases/diagrams (where coordinates were arbitrary anyway).

## How this lands in adaptics

- **FC2.7–FC2.12 (in flight):** semantic axes as first-class rows; layout kind `"semantic"` renders the defined-axes map (#1) on `/canvas` for Nodes.
- **FC2.13–FC2.14:** comparison overlay = the displacement/vector-field view (#6) over any two Projections.
- **Natural next experiments** (not currently planned): a `/atlas` page — Three.js semantic-zoom terrain over node embeddings (#2); parallel-planes comparison for two Spaces (#3), which the deleted `bunkbed` experiment gestured at.
- **Live now (FC2.21):** the neighborhood atlas (#2, minus terrain rendering) runs as /topo's "Topics" mode — deterministic cosine k-means + c-TF-IDF labels + 3D PCA (Gram-matrix trick) over stored embeddings, fitted per embedding model (`mix adaptics.topics`). Like ordinances cluster across cities; points stay city-colored so cross-city adjacency is legible; topic legend solos a cluster. Methodological note learned the hard way: **identity tokens must not be in embedding text** — with the city name inside every record's text, clusters segregated by city token instead of subject matter (labels literally read "vacaville · ..."). Identity belongs in metadata (color, filters), content in the embedding.
- **Live now (FC2.17):** Vacaville + Fairfield municipal codes imported from ogenda's provision trees at chapter granularity into the `muni-codes` Space (`mix adaptics.import_muni_codes`) — visualization #1 runs at `/canvas/muni-codes` with Permissiveness (restrictive↔permissive) and Substance (procedural↔substantive) axes, city filters, data axes over ordinance-history years, and the comparison overlay for cross-city displacement.
- Municipal-code corpora beyond Solano County: `~/workspace/sandbox` also holds San José legislative body CSVs/JSON.

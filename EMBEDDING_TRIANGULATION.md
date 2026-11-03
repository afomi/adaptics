# Embedding Triangulation

Multiple embedding models surveying the same records — and a hypothesis about what their disagreement measures.

Reference doc. Related: `TOPOLOGICAL_EMBEDDING_SPACES.md` (maps vs diagrams, layered coordinate spaces), PLAN.md FC2.20, `tmp/2405.07987v5.txt` (Huh, Cheung, Wang & Isola, "The Platonic Representation Hypothesis", ICML 2024).

## The hypothesis

**Different embedding models will orient to the same law differently — and differently over time — reflecting the state of the information environment they were trained in, as a proxy for social preferences and discourse.**

A municipal code chapter is a fixed text. An embedding model's placement of it is not a property of the text alone; it is a property of the text *as seen through a training corpus* — a snapshot of an information environment. If two models trained on different corpora (or the same corpus at different times) place the same chapter differently, the displacement is a measurement of how the surrounding discourse differs, with the text held constant. A chapter on taxicab licensing should sit still; a chapter on encampment abatement, surveillance, or short-term rentals may move as the discourse around it moves.

## The Platonic Representation Hypothesis as the null

The PRH (arXiv:2405.07987) argues that representations across models — architectures, objectives, even modalities — are *converging* toward a shared statistical model of reality, with scale, data diversity, and simplicity bias as the driving pressures. They measure this with **mutual k-nearest-neighbor alignment**: the mean overlap between a datapoint's k nearest neighbors under model A and under model B (chosen over CKA because it captures neighborhood structure without basis assumptions).

This gives the triangulation hypothesis its proper statistical shape:

- **Null (PRH):** capable models converge; alignment should be high and disagreement should look like noise.
- **Signal:** *localized, systematic* divergence — records whose neighborhoods or axis positions consistently differ across models — marks content whose representation is **not pinned down by shared world-structure**. The PRH's own selective pressures explain why: representations converge where many tasks and much data constrain them; they stay loose where the training distributions differ. Contested, discourse-laden, era-marked content is exactly where corpora differ.

So per-record alignment is not just a quality metric — inverted, it is a **contestedness detector**. The PRH also predicts the confound to control: alignment increases with model capability, so cross-model comparisons should pair models of comparable competence (and longitudinal claims should compare same-family models across releases, not weak-vs-strong).

## Why comparison is legitimate (and where it isn't)

Raw embedding spaces are **not** directly comparable across models: different dimensionality, different basis, arbitrary rotation. Two measures survive this:

1. **Mutual k-NN alignment** (PRH's metric) — compares neighborhood *structure*, which is basis-free. Implemented in `Adaptics.Semantic.Triangulation.mutual_knn_alignment/3`; per-record overlap in [0,1], mean = the PRH alignment score.
2. **Anchored semantic-axis scores** — each model computes *its own* version of the same axis from the same anchor phrases (normalized pole-centroid difference, within that model's space), then projects its own embeddings onto it. Scores are model-internal cosines on a shared, *named* coordinate system — surveyed landmarks. Cross-model score deltas are directional and interpretable: "qwen reads Ch. 8.10 as more restrictive than nomic does." Implemented as axis `variants` + `Triangulation.axis_disagreement/4`.

What remains illegitimate: comparing raw coordinates or raw cosine *magnitudes* across models (per-model score distributions differ in spread — the /topo scales fit each model's observed range for exactly this reason). For stronger geometric claims, Procrustes alignment over shared records is the next tool up.

## Triangulation, literally

With two models, disagreement is a line (a displacement). With three or more, it becomes a *shape*: records where all models agree (tight simplex) vs. records where they scatter. "Two models agree, the third dissents" carries information about the dissenter's corpus. Locally available survey instruments (Ollama): `qwen3-embedding:8b` (4096d), `nomic-embed-text` (768d) — different families, different training recipes, which is what makes their agreement informative. A third point (e.g. `bge-m3`, or an API model) upgrades line to triangle.

The longitudinal version — the actual hypothesis — needs model *series*: the same family re-trained over years (e.g. successive releases). Then per-record trajectories of axis scores over model-vintage become the object of study: which chapters of a fixed 1979-era code *move* as the training era advances, and along which axes? Caveats to carry: release date ≠ training-cutoff cleanly; corpora are mixtures of eras; instruction-tuning changes embedding behavior independently of the corpus.

## Mechanics (FC2.20, built)

- `node_embeddings` — one row per (node, model); `nodes.embedding` remains the default-model cache.
- `semantic_axes.variants` — per-model axis vectors + quality metrics; anchors changing invalidates all of them.
- `node_axis_scores` unique on (node, axis, **model**).
- `Adaptics.Semantic`: `embed_space_with_model/3`, `compute_axis_variant/3`, `axis_vector_for/2`, `score_nodes_with_model/3`, `score_models_for_space/1`.
- `Adaptics.Semantic.Triangulation`: `mutual_knn_alignment/3` (PRH metric, per-record + mean), `axis_disagreement/4` (ranked deltas).
- `mix adaptics.triangulate [--space] [--models] [--k]` — embeds, surveys axes, scores, and prints the alignment report: mean mutual k-NN overlap, the ten least-aligned records, and top per-axis disagreements.
- `/topo` Layers mode: with ≥2 models scored, the default stack is the same two axes under two models — **displacement between adjacent layers is model disagreement**, per record, as translation lines. Every slice has a model selector (M).

## Readings of the first survey

Things to look for in the Vacaville/Fairfield chapter data:

- Do the least-aligned records cluster in topically "social" chapters (nuisance, camping, alarm/false-alarm policy, mobile-home rent) rather than mechanical ones (plumbing code adoptions)? That is the hypothesis's first informal test.
- Axis disagreement vs. neighborhood disagreement need not coincide: a chapter can keep its neighbors yet slide along *restrictive↔permissive* between models — pure orientation drift, arguably the cleaner discourse signal.
- Chapter-level text is long and averaged; section-level triangulation (future zoom-in) should sharpen localized divergence.
- **Identity-token confound (found and fixed in FC2.21):** when the city name sat inside every record's embedding text, both models "agreed" on a city-shaped structure that was an artifact of the token, not the law. Any triangulation corpus needs identity (jurisdiction, author, era markers) stripped from content text — otherwise model agreement partly measures shared tokenization of identity, inflating the PRH null.

# Pyramid Summaries and Multi-Scale Representation

## The pattern

Hierarchical summarization — each level is a complete, valid representation of the whole at different resolution.
The key property: each level stands alone.
You can stop at any level and have something coherent.

Distinct from:
- **Compression** — requires the full thing to reconstruct
- **Outlines** — indexes, not summaries

---

## Names across fields

### Information architecture / writing
- **Pyramid Principle** (Minto) — conclusion first, support below
- **Inverted pyramid** (journalism) — lead with most important, trail off
- **Progressive disclosure** (UX) — reveal detail on demand
- **Executive summary → body → appendix** — classic document structure

### Mathematics
- **Multiresolution analysis** — formal name; foundation of wavelet theory
- **Coarse-graining** — physics/complexity; collapse fine detail into aggregate behavior
- **Scale-space theory** — computer vision; same image at multiple resolutions
- **Renormalization** — physics; zoom out and re-describe the system with fewer variables

### Computer science
- **Lossy vs lossless compression** — pyramid summaries are intentionally lossy at each level
- **Mipmaps** — graphics; pre-computed texture at multiple resolutions
- **Merkle trees** — each node is hash of children; summary preserving integrity
- **Quadtrees / octrees** — spatial data at multiple resolutions
- **Approximation algorithms** — trading exactness for tractability

### Biology / cognition
- **Chunking** (Miller) — working memory organizes detail into higher-level units
- **Abstraction hierarchy** (Rasmussen) — cognitive systems engineering; maps directly to software/project understanding

### Unifying terms
- **Multi-scale representation**
- **Hierarchical abstraction**

---

## The lossiness question

What is preserved at each level?

| Type | Preserved | Example |
|---|---|---|
| Lossless per level | Integrity | Merkle tree |
| Lossless per level | Structure | Outline |
| Lossy but coherent | Meaning | Pyramid summary |
| Lossy but reconstructible | Detail (via coefficients) | Wavelet compression |

**Pyramid summaries are semantically lossless at each level** — meaning is complete even though detail is gone.
That's what distinguishes them from mere truncation.

---

## Applied to software / projects

Each level stands alone.
A new developer (or stakeholder) can stop at any level and have a coherent mental model.

| Level | Artifact |
|---|---|
| Top | README |
| +1 | Architecture doc |
| +2 | Module / context docs |
| +3 | Inline code comments |
| Full resolution | Source code |

This maps directly to the Adaptics product cycle:
- **Personas** = top of pyramid (who)
- **User stories** = next level (what and why)
- **Concept inventory** = vocabulary layer
- **Data model** = structural layer
- **Code** = full resolution

Each artifact should stand alone at its level of abstraction.

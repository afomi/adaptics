---
from: sandbox
to: adaptics
created: 2026-05-01
status: pending
summary: Prototype "The Scope" — a conical cybernetic interface for visualizing attribution graphs and information propagation
---

## Context

In sandbox, we developed a concept document (`DIGITAL_SCARCITY.md`) exploring how digital objects can now have physical scarcity via blockchains, and — more importantly — how to design the *tension* between scarcity and sharing (tensegrity).

The core social mechanic we identified: **attribution that pays**. Make the graph of propagation visible, and flow value back through it. When sharing automatically credits the creator *and* the sharer, generosity and self-interest align.

This led to a cybernetic interface concept called **The Scope** — a conical, layered visualization where:

- **Apex**: whole-system pulse (health, flow, activity)
- **Middle layers**: nested circles representing clusters, communities, topics. Circles breathe (expand/contract with activity). Hierarchical topic modeling made spatial.
- **Base**: individual nodes, transactions, attributions

Key design principles:
- Navigable governance — move up the cone to tune parameters, down to participate. The interface *is* the governance mechanism.
- Recursive viable systems (Beer's VSM) — each circle at each layer is its own viable system.
- Selective disclosure — the cone filters by layer, managing attention (Beer's Cybersyn insight).
- Real-time feedback — live attribution graph gives the system proprioception.

Circles are the core visual motif.

## Request

Build a LiveView prototype of The Scope interface. Start with:

1. A conical navigation structure — user can zoom between layers (apex → clusters → nodes)
2. Circles as the primary visual element — nested, overlapping, with size/opacity responding to activity
3. A simple data model to represent: nodes (creators/sharers), edges (attribution/propagation), and circles (topic clusters)
4. Real-time updates via LiveView (circles breathing, value flowing through edges)

Start simple — even mock data is fine. The goal is to get the *interaction model* right: the feeling of zooming into a living system.

## Relevant files

- `~/workspace/sandbox/DIGITAL_SCARCITY.md` — the full concept document with all the thinking behind this

## Acceptance

- A LiveView page that renders nested circles at multiple zoom levels
- User can navigate between at least 2-3 layers of the cone
- Circles respond to data (size, opacity, or animation based on activity)
- The interaction feels like exploring a living structure, not clicking through static pages

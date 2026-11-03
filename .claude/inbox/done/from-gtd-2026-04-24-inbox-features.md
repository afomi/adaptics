---
from: gtd
to: adaptics
date: 2026-04-24
subject: Inbox feature ideas and research from Adaptics Trello
---

## Core Feature Ideas (Inbox)

### Events, Interpreter, Projections (https://trello.com/c/6223bfe096e7bf45dfbc3847)
Three foundational subsystems:
- **Events** — user actions as typed events (see transformations card in backlog)
- **Interpreter** — process/execute events to mutate state
- **Projections** — derive views/representations from event history

**PM guidance:** This is the architecture backbone. Design the event schema first, then interpreter, then projections.

---

### infosynth — information sequencer synthesizer (https://trello.com/c/626c68b54fd1518ab580bca0)
A concept: sequence and synthesize information like a music synthesizer does with sound. Adaptics as an "information instrument."

**PM guidance:** Keep as a north-star concept. Could inform the Lenses feature and projection system.

---

### UI Object / Data Model (https://trello.com/c/5df15c9ae67d4b13f721b0d5)
Core UI data model needs to be defined and documented.

**Dev guidance:** Define `Thing` (node), `Connection` (edge), `Space` (canvas), `Layer`. Document in `docs/data-model.md`. Cross-reference schema.rb.

---

### Pivot based on an object's relationships or attributes (https://trello.com/c/5c3e330322d7754383183345)
Switch between views:
- Person-centric view
- Product-centric view
- Chart data in another dimension

**PM guidance:** This is the "Projections" feature. A Space is a view/projection of the underlying graph. Different pivots = different projections.

---

### Add a concept as text, then decorate into an object (https://trello.com/c/59053fa038f239c97e28b5d1)
Type text → promote it to a structured object by adding layers/attributes.

**Dev guidance:** Start with a text input that creates a Thing. Add attribute decoration as a follow-on story.

---

### Lenses — Descriptive text, action text, context (https://trello.com/c/624086aee182d5090e925b91)
A "Lens" is a way of reading/annotating the space — descriptive vs action vs contextual.

**PM guidance:** Lenses map to different user modes (viewing vs editing vs contextualizing). Design as a mode switcher or overlay system.

---

### Adaptics: draw a list of 10 objects as vertical row / horizontal row / boxed group / 3d packed balls (https://trello.com/c/5fde23fbe7475e2f4d9e86dc)
Layout algorithms for rendering sets of objects:
1. Vertical row
2. Horizontal row
3. Boxed group
4. 3D packed balls

**Dev guidance:** Implement as a `LayoutStrategy` enum. Each strategy takes a list of Things and returns x/y/z positions.

---

### collapse agile.pics into adaptics (https://trello.com/c/60bcea6e20732a43fd984684)
- [ ] Support mermaid.js

**Dev guidance:** agile.pics functionality (agile diagram rendering) should be absorbed into Adaptics. Mermaid.js is the entry point.

---

### Generate an org chart and stakeholder map from Adaptics (https://trello.com/c/6071f3fac9b60020d56022cb)
Adaptics should be able to export/render org charts and stakeholder maps natively.

**Dev guidance:** Define an org chart as a directed tree projection of the graph. Stakeholder map as a relationship web. Both are Projections.

---

### See a stream of events for 3D objects or ingested HTML pages (https://trello.com/c/5c461da30c549548b60812b3)
Event stream viewer — also relevant for Jurisdictional integration.

**PM guidance:** Ties to the EventLog in the transformations card. Cross-project: share event schema with Jurisdictional.

---

### Blender-as-a-service (https://trello.com/c/5c461d91b92930033cfe5f40)
Use Blender headlessly as a 3D rendering backend for Adaptics.

**PM guidance:** Long-term / speculative. Park in Icebox unless Three.js proves insufficient.

---

### Fog of War (https://trello.com/c/5fe017a34921bf4d37db2032)
Hide unexplored areas of a large space until navigated to.
- https://codepen.io/zyklus/pen/prvnb
- https://medium.com/@travnick/fog-of-war-282c8335a355
- https://discourse.threejs.org/t/fog-of-war-for-games/7988

**Dev guidance:** Implement as a visibility mask on the canvas. Reveal radius around the user's viewport.

---

### Improve brand styling and voice (https://trello.com/c/5e00471254a38b343bc166a4)
- [ ] Customize Bootstrap
- [ ] Fine tune homepage copy
- [ ] Assess, improve, and change call to action(s)

---

### Consider contacting this designer (https://trello.com/c/62c61481b446a4636426921b)
Reference: https://unsplash.com/photos/jBBRDWsT2Bs

---

### account for afomi transactions on ledger (https://trello.com/c/626c687f632c60047c72e540)
Financial/accounting card — afomi transactions need to be tracked.

**PM guidance:** Clarify if this is a Adaptics feature or an afomi business ops item. If the latter, move to Personal board.

---

## Research / Concepts

### parts are coming together to make a whole (https://trello.com/c/599a20e8c6c7ff21f4308a41)
Concept note — no action needed, archive if stale.

### movement and behavior across time (https://trello.com/c/599a20f058edd7e070119aaa)
Animation/temporal behavior of objects in the space. Ties to transformations card.

### dimensional editing (https://trello.com/c/599a20e28edf87ec47357feb)
Editing objects across multiple dimensions simultaneously.

### 3d force layout (https://trello.com/c/570345e301c85f679aee1011)
Reference: https://vida.io/documents/fDn4mDHX26H9hcyHu

### Model Phi Spiral in Adaptics (https://trello.com/c/5bf4ca7e2cd9b6053a4d8efb)
Render a golden ratio / Fibonacci spiral as a visual element.

### layers of vector fields in Three.js (https://trello.com/c/63c43dadaf3e530048dea9bb)
Visualize overlapping vector fields as layers.

### animate sankey (https://trello.com/c/62f4600f74205528e3355d8f)
Reference: https://observablehq.com/@chekos/animated-sankey

### projections into a sphere (https://trello.com/c/5cde428cfaed987a999867a5)
Attachments:
- https://trello.com/1/cards/5cde428cfaed987a999867a5/attachments/5cde428cfaed987a999867a6/download/Screen_Shot_2019-05-16_at_10.11.07_PM.png

### Create a Three.js page with platonic solids (https://trello.com/c/62e5597102c4e8617ca2a0fa)
- [ ] Create scene
- [ ] Add tetrahedron
- [ ] Add cube
- [ ] Add octahedron
- [ ] Add icosahedron

### Fabric.js on Elixir via Adaptics (https://trello.com/c/64a90b7727303c5650ca725c)
Explore Fabric.js as a 2D canvas layer within the Elixir/Adaptics stack.

---

## Design / Visual Reference Attachments

**Smaply persona/service maps (https://trello.com/c/5bec36689af227645bbb7755):**
- persona.png, personas.png, service-map-1/2/3.png, stakeholder-map.png
- Multiple screen shots from 2018-10-23
- All at: https://trello.com/c/5bec36689af227645bbb7755

**Affinity mapped features (https://trello.com/c/58f06fab8ec90b97f1d63b3f):**
- https://trello.com/1/cards/58f06fab8ec90b97f1d63b3f/attachments/58f06fab8ec90b97f1d63b40/download/2017-04-08_19.01.56.jpg

**Per project feature listing (https://trello.com/c/58f06f9061648b43e1a962b0):**
- https://trello.com/1/cards/58f06f9061648b43e1a962b0/attachments/58f06f9061648b43e1a962b1/download/2017-04-08_18.54.22.jpg

**Visual language PDF (https://trello.com/c/5c9d8bb2a9a9536252ae6f2e):**
- https://trello.com/1/cards/5c9d8bb2a9a9536252ae6f2e/attachments/5c9d8bb2a9a9536252ae6f30/download/6_visual_language.pdf

**Andric sketch (https://trello.com/c/5d43c4ea38051b6d6204b08f):**
- https://trello.com/1/cards/5d43c4ea38051b6d6204b08f/attachments/5d43c4ec34056e66dbf663e6/download/IMG_20190801_220622.jpg

**Screenshot 2020-01-04 (https://trello.com/c/5e1112d6325aac1dd0581da3):**
- https://trello.com/1/cards/5e1112d6325aac1dd0581da3/attachments/5e1112d6325aac1dd0581da4/download/Screen_Shot_2020-01-04_at_1.29.36_PM.png

**Adaptics screenshot 2022-01-16 (https://trello.com/c/61e4607e77930d4eec722844):**
- https://trello.com/1/cards/61e4607e77930d4eec722844/attachments/61e4607e77930d4eec72284f/download/Screen_Shot_2022-01-16_at_10.14.04_AM.png

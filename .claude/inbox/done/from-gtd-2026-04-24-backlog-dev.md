---
from: gtd
to: adaptics
date: 2026-04-24
subject: Backlog and active dev cards from Adaptics Trello
---

## Backlog Cards (ready or near-ready for dev)

### mouseover a card triggers an event (https://trello.com/c/5e004f9ef66eb51d12d225fd)
UI interaction: hovering a card should fire an event.
**Dev guidance:** Wire mouseover to the event bus. Emit `hover:card:id`.

---

### transformations of visual space over time (https://trello.com/c/598537a61edae339f2231a29)
Track and replay canvas transformations as an event log.

Checklists:
- [ ] Every UI click is an Event in the browser-side Event Log
- [ ] Create an EventLog text box showing Space load and all defaults
- [ ] Persist browser-side Events on the Backend

Event format: `verb:noun:id:custom_json_blob`
Examples:
- `create:space:id`
- `create:node:id`
- `move:node:id from:x,y,z to:x,y,z`

**Dev guidance:** This is a foundational event sourcing feature. Build the client-side EventLog first, then add persistence. Aligns with the "transformations over time" and "movement and behavior across time" ideas in the inbox.

---

### canvas resizes to viewport size (https://trello.com/c/5e004fb1fad4ea2d0d7ac1ce)
- [ ] Calculate full window size
- [ ] Zoom Three.js perspective to fill screen

**Dev guidance:** Handle `window.resize` event, recalculate renderer size and camera aspect ratio.

---

### enable User to update Record (Card) via Web (https://trello.com/c/59f6400bb9464c405c3f851b) — Design list
- [ ] Update a Thing's Name

**Dev guidance:** Inline edit on the card's label in the canvas, or a sidebar form.

---

### Draw an arrow (make a connection) (https://trello.com/c/57f162ee8b3c82f86c46a685) — Design list
Core interaction: connect two nodes with a directed edge.
**Dev guidance:** Click source node → click target node → render arrow. Store as an Edge in the data model.

---

### Selections (https://trello.com/c/5c18726442a6e67d06375f88) — Design list
Selection state machine:
- no selection
- select one Thing
- select many Things
- unselect one Thing
- unselect many Things

**Dev guidance:** Implement a `SelectionManager` with set-based state. Drive UI highlight from selection state.

---

### Persist X, Y, and Text Label of an Object (https://trello.com/c/5cb16aa6ed04d10a28f2078c) — Icebox
- [ ] Add Text to a Sticky
- [ ] Persist all 3 attributes (x, y, text)
- [ ] Add Text Marker
- [ ] Add Text Marker and Rectangle to Layer
- [ ] Move/Drag the Layer

Attachment: https://trello.com/1/cards/5cb16aa6ed04d10a28f2078c/attachments/5cbbfa250c0d0d366498a0aa/download/Screen_Shot_2019-04-20_at_10.05.29_PM.png

**Dev guidance:** Core persistence story — x/y/text is the minimum viable sticky. Build this before more complex attributes.

---

## Design Artifacts

**service-blueprint.png + PDFs (https://trello.com/c/5bec341a9fbf16043cf53e4d):**
- service-blueprint.png: https://trello.com/1/cards/5bec341a9fbf16043cf53e4d/attachments/5bec341a9fbf16043cf53e4e/download/service-blueprint.png
- service-map-3.pdf: https://trello.com/1/cards/5bec341a9fbf16043cf53e4d/attachments/5bec3428c0793b7b7cb21f5c/download/service-map-3.pdf
- stakeholder-map.pdf: https://trello.com/1/cards/5bec341a9fbf16043cf53e4d/attachments/5bec34391ae9a386db50e0c3/download/stakeholder-map.pdf

**service-map-full149.png (https://trello.com/c/580da25aa9a3e64cc87726eb):**
- https://trello.com/1/cards/580da25aa9a3e64cc87726eb/attachments/580da25aa9a3e64cc87726ec/download/service-map-full149.png

**Next action:** Download and commit to `docs/design/`.

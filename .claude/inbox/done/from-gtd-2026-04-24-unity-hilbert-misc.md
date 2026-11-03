---
from: gtd
to: adaptics
date: 2026-04-24
subject: Unity App, Hilbert, and miscellaneous Icebox items from Adaptics Trello
---

## Unity App Cards

These cards defined a Unity-based front-end for Adaptics. VR/Daydream-era work (2017–2018).

| Card | ID | Notes |
|---|---|---|
| enable User to login via Unity | 59f6400161b1d3d1aea41e2a | Auth in Unity client |
| enable User to edit card via Unity | 59f6401aa07677202c1a6f91 | Edit flow in Unity |
| enable User to view card via Unity | 59f64012aa1eb52000e25c9e | View flow in Unity |
| create rotating Visual Script (Unity/D3) | 59a6e2d66dc932e5f1ade5e4 | Recursive shape experiments |
| Magic Wand Mode — all elements moveable | 5a56f31e51c18d58a98a982f | Free-move mode |
| publish app and test with Daydream | 59f63fb9cb8d462eb897e876 | VR publish target |
| manage visual HUD separately from virtual space | 59f63fda9d944707032b8a12 | HUD layer separation |
| test undershadow | 5736471e7568ae46927a90a6 | Attachment: https://trello.com/1/cards/5736471e7568ae46927a90a6/attachments/573647297cf0a4155f9f91f6/download/hqdefault.jpg |

**PM guidance:** Unity/Daydream work is likely stale (Daydream deprecated 2019). Evaluate if any concepts are worth porting to a WebXR/Three.js approach. Otherwise archive the Unity list entirely.

---

## Hilbert.app

**Card (https://trello.com/c/5d5b394c75c43663e4c45aeb)**

A separate app concept — Hilbert curves / spatial indexing visualization.

Checklist:
- [ ] Host site hilbert.app
- [ ] Define Personas
- [ ] Write Use Cases

References:
- https://threejs.org/examples/webgl_lines_colors.html
- https://threejs.org/docs/#manual/en/introduction/Drawing-lines

**PM guidance:** Decide if Hilbert.app is a standalone project or a feature within Adaptics. If standalone, create `~/workspace/hilbert` and move there.

---

## Misc Icebox Items (selected)

### User can drag a Sticky and edit attributes (https://trello.com/c/5cb6b7ae265f2f8b6e7f915d)
Drag interaction + attribute editing based on currently selected Space.
**Dev guidance:** Core interaction. Ties to "Persist X, Y, and Text Label" card.

### enforce smart alignment (https://trello.com/c/5cb74c93f7dd7154ca4902e4)
10px margins or grid alignment for stickies.
**Dev guidance:** Implement as a snap-to-grid option in the layout engine.

### Meta-mapping interface (https://trello.com/c/5cb8fb515439781a13dc24b9)
Awareness of and navigation within the mapping space.
Attachment: https://trello.com/1/cards/5cb8fb515439781a13dc24b9/attachments (see card)
**PM guidance:** This is the "map of maps" / minimap feature. User needs spatial awareness at scale.

### User can add and manage Custom Attributes and Space/View Projections (https://trello.com/c/5cbcacc21a74a27f406b0d92)
User-controlled state + constrained views.
**Dev guidance:** Custom attributes are key/value pairs on a Thing. Projections filter/sort the space by those attributes.

### Stickies and connections — with Vinson (https://trello.com/c/5caecb2ad1e71882e96aa27d)
Collaborative session note with Vinson.

### Discuss startup collective (https://trello.com/c/5cbbe8f590987e43a7efb6de)
2-item checklist — business/org concept, not a dev task.

### Using Concept Maps allows for a common deliverable that adds value over time (https://trello.com/c/5cbbf302a0730b3477a24b35)
> A well-formed Concept Map is an implicit Data Structure, made of Nouns and Verbs and Desired States.

**PM guidance:** This is the core thesis of Adaptics. Should be in the README/docs as a guiding principle.

### move jurjen to adaptics (https://trello.com/c/634372b534c86a005c703d14)
Migrate jurjen (a separate tool/dataset?) into Adaptics.
**Dev guidance:** Clarify what jurjen is and where it lives before acting.

### Logos (https://trello.com/c/648ca9913a67764ba1b90ff8)
Prompt: `/imagine prompt: abstract logo, simple node graph, USA, vectorized`
**PM guidance:** AI-generated logo concept. Use as starting point for branding epic.

---

## Next Actions
- [ ] Decide on Unity list: archive or port to WebXR?
- [ ] Decide on Hilbert.app: standalone repo or Adaptics feature?
- [ ] Add core thesis ("Concept Maps as implicit data structure") to README
- [ ] Prioritize: Persist X/Y/Text → Drag Sticky → Custom Attributes → Projections

---
from: gtd
to: adaptics
date: 2026-04-24
subject: Full Icebox from Adaptics Trello — 129 cards, grouped by theme
---

## PM Guidance

The Icebox is a large backlog of ideas accumulated since ~2015. Many are stale references or photos.
Recommended approach: keep as a reference doc. Prioritize the thematic clusters below when planning sprints.

---

## Core Data Model / Architecture

| Card | ID | Notes |
|---|---|---|
| Space Manager can define Space defaults | 5df32a347167068d14a96378 | As a Space Manager — user story exists |
| UI Object/Data Model (see inbox) | — | Cross-ref inbox card |
| object + data = hydration | 553fb375796d69dcce799d28 | Objects get hydrated with data sources |
| data modeling | 553fb383f04566b4a3cf9294 | |
| data source | 5552c7740042be6f99dc8a6e | |
| add status flag and styling for each Object | 553e74952bc956b6e4594968 | |
| conditional links | 553e74a781d70fa7fe534a9b | |
| Characteristics of objects | 59bee0844d9ab5c571a8e860 | |
| coordinates on page | 5552c7709fe4ca10069ccd26 | |
| shape & representation | 5552c77220196a52c6dc3d9b | |
| last synced at / created at / updated at | 5552c776–5552c77a | Timestamp fields on objects |
| change Loads to just lists of defined Datasets | 5df32bc3309fc48dd5c609a7 | As a Space Manager |
| declare spacing up front vs. adjust on the fly | 553e750d4b4577444a3ade08 | Layout initialization |
| add x, y positions to objects and persist it | 587bf21a737753f387142700 | Core persistence — ties to Backlog card |
| Save / Re-load locations of visual objects | 58768c11 / 58768c1b | Persistence pair |
| Persist X, Y, and Text Label (see backlog) | — | Cross-ref backlog card |

---

## Projections / Views

| Card | ID | Notes |
|---|---|---|
| User can save a Projection | 57fb0c5a847f9f4059f28292 | |
| User can load and Update a Projection | 57fb0c5c660e7de28a72b521 | |
| New Feature: Projection: D3 Packing List | 57f16d21c6c8c3b6a70d31c4 | |
| Is a projection time bound? | 57fb1025f84fe1e6c25f85b0 | Design question |
| When does an update propagate backward? | 57fb1031b8bc6d6c87822a46 | Design question |
| When are artifacts meant to stay in sync? | 57fb10399b994c01f0ae67a8 | Design question |
| What happens when an item is added in one projection but un-placed? | 57fb1044e9b46f0bc3049330 | Queue? |
| Be able to filter an entire class of data out by tag/label | 57fb10823002dd2bc22b0fe3 | |
| Pivot based on relationships/attributes (see inbox) | — | Cross-ref inbox card |
| How are objects displayed & encoded onto the visual canvas? | 59174efe05031da286e8c548 | Define a Data Source |
| create Mindmapping view | 5bea5d8f922c06059a691d3f | |
| create Service Mapping view | 5bea5d8f96e3b88ee2bf211e | |
| create Wardley Mapping view | 5bea5d8f01c37662f8b411fc | |
| create Game View | 5bea5d9039524879866948b9 | |
| First Service Blueprint Projection | 57f1b921bc076f363a2a7f02 | |
| mapbox for non-map things | 598217470e22623411d973d6 | Use Mapbox layout for non-geographic data |
| Differentiate adaptics framework from specific Service model | 57f16d9619a73b3c59ebdc14 | Architecture boundary |
| publish a Space | 5c18412e07e77049239c7d16 | User can publish publicly |
| Version a space | 5c18408ed108c2156ffe4c4d | Event-driven versioning (TBD) |
| User can share a Space | 5c183f15ee98655abd05bdf8 | |

---

## Interactions / UX

| Card | ID | Notes |
|---|---|---|
| Green & Red Zones on a board | 57fb101bb457c71e5976da63 | Visual status zones |
| draw a 2x2 | 58796870afaaefab80107507 | 2x2 matrix layout |
| constrain dragging to snap canvas | 587a74b0ad08398b3353efa6 | Snap-to-grid drag |
| Re-load saved visual objects | 58768c1b | Persistence UX |
| change the colors up! | 587944604d2f817966f1c6b8 | Theming |
| Add spinner for data loading | 587959673a3073f3b7d569a0 | Loading state |
| make the data section scrollable (or pin the canvas) | 587978b280271fd5d8198574 | |
| add keyboard support | 5c18724b7dc52c830dc0132f | "e" to edit selected Thing |
| Drag and Drop API | 5aac4134c3735f8509b9176f | Native DnD API |
| Interaction Pattern - Convex Hull | 5a6c13ddc398d40da9e5d9e6 | Boundary shapes for new objects |
| Example: Add and Remove Nodes | 5a6c1433f11c85b985558f1b | Core node interaction |
| for an object: specify scale vs resize | 5817c205430b2c1e0ff8fc9a | Scale 2x/3x vs resize to new dimensions |
| build welcome screen | 5737a49d5f3eddc7ff38e42e | Onboarding |
| Theme: Improvements to the Navigation Bar | 5df15cb702fd9b69cc99c6ac | |
| add icons for Personas | 553adbef004a3178204504af | |

---

## Collaboration / Real-time

| Card | ID | Notes |
|---|---|---|
| make this real-time | 591cf06eb25a5e6f9b1915e6 | WebSockets |
| make this collaborative (multi-user) | 591cf0752ae4f85b22adee31 | Multi-user editing |
| Great calendar integration | 57fb108a8cee947418aceb2d | |
| Google Drive integration | 580003a180096ee0faedc064 | |
| ingest records from a Dataset into a local database | 587e76b70cb4326ff60e3cd6 | |
| Show Trello Cards in Adaptics Space | 5dedd8db729e77589c2f1cda | Use Adaptics to visualize Trello |

---

## Backend / Infrastructure

| Card | ID | Notes |
|---|---|---|
| Create a Lane for Backend | 5c1adfd75d50502ee0430a65 | Group backend stories |
| Create 4 Lanes, group as Channels | 5c1adfc95bbc7f02f3468c16 | |
| CRUD domains and view in a Gallery | 5c1850b4a8b4ec840c42f11e | |
| add UI to manage Things, Attributes, and Relationships | 5beafce7f46e5436d8dd4e0c | Admin UI |
| Admin can make a view display a record in specific UI treatment | 5beaf78d90316b0552ad0875 | Custom Ember components |
| Read SVG with Rasem gem | 57ffff1299b8af2d01ed3c3d | |
| enable D3 views | 57d2f9160b437cc8f3cc4917 | |
| WebSockets in Rails 5 | 581668de82980e5beb508ce6 | Ref: Heroku blog |
| Merge Landscape.generationcitizen.org into Adaptics | 5beaee28d4e935807bde2533 | |

---

## Product / Business Concepts

| Card | ID | Notes |
|---|---|---|
| consider service for nonprofits and small businesses | 57c3874308b992e34eeed610 | Market idea |
| 2x — what vs how (in product dev) | 572d9ca617c48cab782b807b | Product philosophy |
| Use Expand your Thinking as a go for Adaptics | 5ab0744d116c7a5fea185bbf | |
| show interaction, interplay, instantiation | 5c119b9ed138e529a213ba60 | Core demo story |
| Document Use Cases on the website | 5dedd5b95d73e669096a45b3 | |
| Using Concept Maps as common deliverable (see inbox) | — | Cross-ref inbox card |
| Make homepage more colorful — Brand inspiration: Airtable | 5c119c0acab3ca2ae154bef3 | |
| Wittle/Adaptics | 55541d228d67958397f7dac2 | Old branding? |
| Sacred Bits | 57db601602d9887b84c21b8d | Concept note |
| org orchestra — organizational orchestration | 57bf661888d37608d40ac041 | |
| Ikea Builder | 5bec35f1c4f8364f4b2dd4ba | Concept: guided assembly UX |
| 7 buttons that run different functions on source data | 5807c25964ab59d6d9f3d343 | |
| things (stickers) can have a task attached | 5807c2bb901f4ffe1adb05b9 | Sticker-task pairing |
| explicit structure/shape with behavior | 5807c0dfd9bed0075b29f91c | Align, Center, Color=X if Y |
| use Adaptics to show Tracker Stories, re-group, animate | 5917a79a9bab609ba1458ab3 | Pivot/animation between states |
| ui behavior — objects on canvas with drag/state | 5881b93cbe80ca96cb8478c2 | |

---

## Reference Links (archive as docs/references.md)

- Service Blueprints: https://www.cooper.com/journal/2014/08/service-blueprints-laying-the-foundation
- Beyond the Blueprint: https://www.cooper.com/journal/2014/11/beyond-the-blueprint-strategic-service-design-deliverables
- Python data viz landscape: https://dansaber.wordpress.com/2016/10/02/
- D3 force layout: https://bl.ocks.org/mbostock/e6f9e160585c153fa5ec543bd12b81e9
- Flash animation guide: http://www.adobe.com/devnet/flash/learning_guide/animation/part03.html
- Sketch API examples: http://developer.sketchapp.com/examples/code/user-interaction/
- Simulation (Wikipedia): https://en.wikipedia.org/wiki/Simulation
- Composability (Wikipedia): https://en.wikipedia.org/wiki/Composability
- Data Flow Diagram: https://en.wikipedia.org/wiki/Data_flow_diagram
- Structure Chart: https://en.wikipedia.org/wiki/Structure_chart
- Conceptual Model: https://en.wikipedia.org/wiki/Conceptual_model
- Loomio Working Groups: https://loomio.coop/working_groups.html
- Web Animation API: https://developer.mozilla.org/en-US/docs/Web/API/Animation
- Pipefy process mapping: http://www.pipefy.com/blog/business-process-management/how-to-map-your-processes-a-step-by-step-guide
- UX Mag primary election visuals: https://uxmag.com/articles/winning-the-primary-election
- Rasem gem: https://github.com/aseldawy/rasem
- ActionCable/WebSockets: https://blog.heroku.com/real_time_rails_implementing_websockets_in_rails_5_with_action_cable
- Animated Sankey: https://observablehq.com/@chekos/animated-sankey
- Representations of Knowledge: (card 580da348fc013d947c354520)
- D3 Animated Ecosystem: https://vida.io/documents/fDn4mDHX26H9hcyHu

---

## Photo/Screenshot Cards (archive — no action needed)

These are raw photo captures from 2016 whiteboard sessions and wireframes:
- 573e7bae, 573e7e24, 573e7e32, 573e7e4d, 573e7e74, 573e7eb5, 573e7e1c, 573e7e13, 573e7e00, 573e7d1a
- 572e5f81, 572e66900, 572e6588, 572e6699, 573d5a1e, 573d5a35
- 57fb0dcd (upload 10/9/2016)
- 5c103828 (yworlds.png)

---

## Next Actions
- [ ] Convert thematic clusters into GitHub milestones or epics
- [ ] Priority order: Data Model → Persist XY → Projections → Real-time → Views
- [ ] Archive photo cards — they're captured in this doc
- [ ] Evaluate Unity App list: port concepts to WebXR or archive

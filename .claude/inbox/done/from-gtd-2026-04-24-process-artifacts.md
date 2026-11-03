---
from: gtd
to: adaptics
date: 2026-04-24
subject: Process guidelines, artifacts, and project status from Adaptics Trello
---

## Current Status (In Progress list)

**Status card (https://trello.com/c/6343720dbea90a26221f086a)**
> "Currently a mis-mash of code, mostly NFTs and Three.js"
- [ ] Needs updating, or porting to new-adaptics.

**PM Guidance:** The codebase needs a clear audit and port to a clean new-adaptics foundation. This is the first priority before any feature work.

---

## Definition of Done

Working code that passes tests and fulfills the user story in the card can be deployed to develop.

---

## Card Lifecycle (INVEST model)

Cards should be:
- **Independent** · **Negotiable** · **Valuable** · **Estimatable** · **Small** · **Testable**

A card is ready when:
- [ ] It has a User Story written
- [ ] It has discrete, doable tasks as checklist items
- [ ] Tasks can be objectively determined as complete

Cards without user stories or checklists go to Icebox.

---

## Artifacts / Reference Links

| Artifact | Link |
|---|---|
| Schema | https://github.com/afomi/adaptics/blob/master/db/schema.rb |
| CircleCI | https://www.circleci.com/afomi/adaptics |
| Live site | https://www.adaptics.org |
| Screen designs | adaptics.sketch (locate file) |

**Personas (defined):**
- Creator
- Data-focused creator
- Administrator
- Super-admin

**Inspiration attachments:**
- Scout_Raven_Shopify_Apps: https://trello.com/1/cards/5bec34da01369f03eaea2cdb/attachments/5bec34da01369f03eaea2cdc/download/Scout_Raven_Shopify_Apps__1_.JPG
- yworlds.png: https://trello.com/1/cards/5bec34da01369f03eaea2cdb/attachments/5c13ebc1f3379d06762a5864/download/yworlds.png

---

## Epics

1. **Branding**
2. **Backend**
3. **Product Design**
4. **Add a Space that supports Processing** — reference: https://processing.org/tutorials/

---

## Label Descriptions

- **Mechanics label** — Work on the core mechanics of Adaptics
- **Three.js label** — Build out a compelling Three.js experience worthy of full Adaptics UI

---

## Next Actions
- [ ] Audit current codebase — identify what's NFT/Three.js and what's core Adaptics
- [ ] Port core to new-adaptics foundation
- [ ] Confirm personas are current (Creator, Data-focused creator, Admin, Super-admin)
- [ ] Locate and commit adaptics.sketch to repo or export to docs/

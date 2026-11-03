# Collaborative NFT

## Scope

This project is `BSV native only`.

Out of scope:

- BTC ordinals
- BTC covenant proposals
- cross-chain mirror designs as a core path

## Working Thesis

Build a BSV-native collaborative NFT where authorship is earned through proof-of-work and expressed through stateful on-chain art updates.

The core idea is:

- `POW-20` mining distributes participation rights.
- A singleton NFT or stateful art UTXO is the canonical artwork.
- Each accepted contribution consumes or locks mined tokens.
- The contributor's winning PoW hash deterministically shapes the visual result.
- The artwork becomes a live record of collective labor, not just collective voting.

This document is the working source of truth. We will refine it turn by turn.

## Why BSV Native

We are not designing for BTC ordinals or future BTC covenant proposals.

We are designing around the primitives already implied by the local miner and the POW-20 / Hash-to-Mint flow:

- mining work produces a verifiable winning hash
- token issuance already routes through BSV-native contract state
- BSV gives us actual smart-contract and state-machine room for a live evolving artifact

That means the interesting problem is not "how do we simulate a covenant."
It is "what state machine should the collaborative artwork actually be."

## Ground Truth From Local Miner

The local miner in `~/workspace/pow20-miner` does three important things:

1. Fetches a work item containing:
   - `challenge`
   - `currentLocation`
   - `difficulty`
   - `ticker`
   - `id`
2. Searches for an 8-byte nonce extension whose `SHA256d` hash satisfies the leading-zero difficulty target.
3. Submits:
   - `bsvContractLocation`
   - `nonce`
   - `tokenId`
   - `winningHash`

This is useful because the winning hash is already a scarce, user-earned, deterministic entropy source. We should use that directly inside the art system.

## Design Goal

Create something that feels inevitable in hindsight:

"You do not buy into the NFT. You mine and shape it."

The NFT should improve as a cultural object when more people participate. The collaboration mechanic should be legible enough that a newcomer can understand it in a minute.

## Design Aesthetic

### Seasonal Mined Canvas

The artwork should be designed as a time system as much as an image system.

Reference mood:

- the Four Seasons
- recurring natural phases
- accumulation, bloom, decay, freeze, thaw
- a work that is always alive at the chain tip but periodically crystallized into historical forms

The canvas should feel like a living climate, not a blank board with edits.

That implies two simultaneous views:

- `live view`: the continuously evolving state at chain tip
- `checkpoint view`: canonical frozen states that mark meaningful temporal boundaries

This gives the piece rhythm, memory, and collectible strata.

## Core Mechanic

We are currently exploring two strong candidate forms:

- `Seasonal Mined Canvas`: a singleton state object that evolves through patch contributions.
- `Fractal Branch NFT`: a script-enforced branching tree where each live endpoint can create six child nodes.

### Mined Canvas

Working concept:

- There is one evolving artwork.
- The artwork is represented by a contract state, not by a static image alone.
- Every accepted contribution adds a patch to the canvas.
- A patch is generated from two inputs:
  - user intent
  - mined entropy

User intent says what kind of move they want to make.
Mined entropy decides the exact aesthetic expression.

That gives us a balance:

- humans provide direction
- proof-of-work provides fairness, scarcity, and surprise

## Proposed Primitive Set

### 1. POW-20 Token = Ink

The POW-20 token is not just a currency. It is the right to modify the shared artifact.

Possible uses:

- burn tokens to place a patch
- lock tokens to reserve a layer or region
- stake tokens to challenge low-quality or malicious edits
- direct a portion of spent tokens to a treasury that later buys back rare outputs or funds prizes

### 2. Winning Hash = Brush DNA

Every winning hash can be mapped to visual parameters.

Examples:

- target region on the canvas
- brush family
- stroke count
- line thickness
- symmetry mode
- color palette index
- blend mode
- distortion amount
- animation seed

This makes each mined contribution feel earned and unique.

### 3. Singleton State Object = Canonical NFT

The collaborative NFT should be a single evolving state object with fields like:

- `epoch`
- `canvas_root`
- `patch_count`
- `style_seed`
- `treasury_balance`
- `contributor_root`
- `last_patch_hash`

The rendered image can be derived from the ordered patch log or from the current state root plus deterministic renderer rules.

## Initial Architecture

### Contracts / State Objects

#### A. POW-20 HTM Contract

Responsible for token mining and issuance.

We should treat this as an external primitive we plug into, not reinvent.

#### B. Canvas Contract

Responsible for:

- validating edit transactions
- updating artwork state
- enforcing patch sequencing
- routing token burn or lock mechanics
- optionally enforcing epoch transitions

#### C. Contributor Registry or Merkle Ledger

Tracks cumulative contribution weight for:

- royalties
- governance rights
- season rewards
- provenance

This may live inside the canvas state as a Merkle root instead of as a separate contract.

## Candidate Interaction Model

### Flow A: Mine, Then Paint

1. User mines POW-20.
2. User chooses an edit template such as:
   - add stroke
   - mutate region
   - add texture layer
   - vote to preserve current state
3. User spends or locks tokens to submit the edit.
4. The system derives exact patch parameters from the winning hash.
5. The canvas contract accepts the patch and updates state.
6. The renderer updates the canonical visual output.

This is simple and legible. It is the current frontrunner.

### Flow B: Mine for Turn Priority

Instead of spending tokens on every edit:

1. Users mine during an epoch.
2. The best or earliest valid proofs win edit slots.
3. Slot winners can place one patch each.
4. Token balance scales patch size or persistence.

This may create stronger drama and more event-like rounds.

### Flow C: Mine to Propose, Stake to Finalize

1. Mining creates proposal rights.
2. Proposed patches enter a candidate pool.
3. Token staking finalizes which proposals merge into the artwork.

This is richer, but also more complicated. It is likely better for v2 than v1.

## Branching Model Candidate

### Fractal Branch NFT

Second major concept:

Start with:

- one `genesis` transaction
- one second node, the `stem`

From the stem onward, every live endpoint can be expanded into exactly six additional child nodes.

This creates a base-6 fractal growth pattern:

- depth 0: genesis
- depth 1: stem
- depth 2: 6 nodes
- depth 3: 36 nodes
- depth 4: 216 nodes
- depth 5: 1,296 nodes

The artwork is not a mutable canvas. It is an expanding transaction tree.

The visual interface ingests the transaction graph, models parent-child relationships, and renders a tree-like structure in Three.js.

### Core Aesthetic

This model has a sharper native fit with Bitcoin:

- each branch is a transaction lineage
- each endpoint is a spendable UTXO
- growth is visible as actual spending history
- the final image is not stored as an image; it is implied by the chain graph

The object becomes a living fractal of ownership, work, and transaction causality.

### UTXO Model

Each live node is a contract UTXO.

To expand a node:

1. Spend the node UTXO.
2. Optionally consume or prove a POW-20 growth right.
3. Create six child node UTXOs.
4. Each child carries deterministic state derived from the parent.
5. The spent parent remains visible forever as historical transaction data, but is no longer a live endpoint.

This matches Bitcoin's UTXO model cleanly:

- unspent node = live branch tip
- spent node = historical branch segment
- child outputs = new growth frontier

### Node Contract State

Each node locking script should commit to enough state for both enforcement and rendering.

Candidate fields:

- `genesis_txid`
- `node_id`
- `parent_node_id`
- `path`
- `depth`
- `slot`
- `seed`
- `creator_address_or_pubkey`
- `created_height`
- `max_depth`
- `rules_version`

`path` should be base-6.

Examples:

- stem: `S`
- first child of stem: `S.0`
- sixth child of stem: `S.5`
- third child of the sixth child: `S.5.2`

This is human-readable and renderer-friendly.

### Node ID

Recommended derivation:

```text
node_id = SHA256(genesis_txid || path || rules_version)
```

Child IDs are therefore predictable before the expansion transaction is broadcast.

That lets the parent script enforce exactly which children are valid without relying on an off-chain indexer.

### Expansion Transaction

The expansion transaction should look like:

```text
inputs:
  0: parent_node_contract_utxo
  1: optional POW-20 spend / burn / lock proof
  n: funding inputs

outputs:
  0: child_node_contract(slot = 0)
  1: child_node_contract(slot = 1)
  2: child_node_contract(slot = 2)
  3: child_node_contract(slot = 3)
  4: child_node_contract(slot = 4)
  5: child_node_contract(slot = 5)
  6: optional change / fee handling output
```

Strictest version:

- exactly six child outputs
- child outputs must appear in slots `0..5`
- no skipped branches
- no arbitrary metadata output inside the enforced child prefix

More flexible version:

- allow one to six children
- parent state carries a child mask
- parent remains alive until all six slots are filled

The strict version is cleaner and more fractal. The flexible version is more collaborative but has a more complex state machine.

Current recommendation: start with the strict version.

### Script-Enforced Logic

The parent node script should enforce:

- the node has not exceeded `max_depth`
- the transaction creates exactly six valid child outputs
- every child output uses the same contract code hash
- every child has `parent_node_id = current.node_id`
- every child has `depth = current.depth + 1`
- every child has `slot` equal to its output index `0..5`
- every child has `path = current.path || "." || slot`
- every child has `seed = SHA256(parent.seed || expansion_entropy || slot)`
- all child satoshi values are at or above dust/minimum contract value
- optional protocol fee, treasury output, or author reward is present
- optional POW-20 burn/lock/proof is valid

The visual interface can reconstruct the graph independently, but it should not be responsible for deciding validity.
Validity belongs in Bitcoin script.

### POW-20 Integration

POW-20 can become the growth fuel.

Possible mechanics:

- spend fixed POW-20 amount to expand one endpoint into six children
- require a recent winning hash as `expansion_entropy`
- use hash rarity to affect branch length, color, thickness, or luminosity
- assign creator credit to the address that funded the expansion
- route part of the token spend to a treasury and part to burn

The cleanest artistic mapping:

- POW-20 proves labor
- script proves valid branching
- Three.js reveals the labor as a tree

### Expansion Entropy

Each expansion needs entropy.

Candidate source:

```text
expansion_entropy = SHA256d(pow20_solution || parent_node_id || creator_pubkey)
```

This makes each six-way branch deterministic, but individually expressive.

Renderer mappings:

- branch angle jitter
- hue family
- segment curvature
- bark or vein texture
- local gravitational pull
- growth speed animation
- rare glow or bloom effects

### Three.js Visual Interface

The interface should ingest the transaction graph and render it as a living tree.

Indexer responsibilities:

- start from `genesis_txid`
- find the stem transaction
- crawl child node outputs
- track which node UTXOs are spent or unspent
- derive parent-child edges from committed `parent_node_id`
- derive visual parameters from `path`, `seed`, and POW-20 proof data
- expose a graph model to the Three.js renderer

Renderer responsibilities:

- draw genesis as the root/origin
- draw the stem as the trunk
- draw every child edge as a branch segment
- pulse unspent endpoints as live growth tips
- fade spent nodes into historical wood/rings
- use instanced geometry for performance
- allow orbit, zoom, depth filtering, and path search

### Visual Grammar

Base visual rule:

Each node creates a branch endpoint in 3D space.
Each expansion emits six child branches arranged around a cone from the parent direction.

Suggested geometry:

- child `0`: upward / central continuation
- child `1`: upper-right spiral
- child `2`: lower-right spiral
- child `3`: lower-left spiral
- child `4`: upper-left spiral
- child `5`: inward / depth-axis branch

Use `seed` to add controlled organic variation.

The tree should not look like a flat org chart. It should feel botanical, crystalline, and chain-native.

### Branch Economics

Interesting economic options:

- early depth expansion is cheap, late depth expansion becomes expensive
- rare POW hashes create longer or brighter branches
- contributors own or receive credit for the subtree they opened
- terminal leaves at checkpoint heights become collectible "cuttings"
- a subtree can be sponsored, named, or curated

Concave scoring still matters:

```text
contributor_score = sqrt(total_growth_work) + subtree_depth_bonus + rare_hash_bonus
```

This rewards meaningful growth without letting pure spend dominate the entire tree.

### Checkpoints for the Branch Model

The earlier checkpoint aesthetic still works here, but changes form.

- `chain tip`: all current live endpoints
- `100k block checkpoint`: freeze the tree shape at that height
- `quarterly checkpoint`: mint a seasonal view of the tree
- `annual checkpoint`: compose the year's growth into a complete dendrochronology artifact

This model naturally supports growth rings.

The tree can literally show annual and 100k-block rings as layers in the trunk.

### Why This Might Be Better Than The Canvas

Advantages:

- much more Bitcoin-native
- the visual graph directly mirrors the transaction graph
- script enforcement is cleaner because each node is a UTXO
- branching gives a simple, memorable rule
- Three.js can make it spatial and alive

Tradeoffs:

- exponential growth needs depth limits or cost curves
- exactly-six branching may feel rigid unless the visual grammar is rich
- the script and output serialization must be designed carefully
- users need a clear reason to expand one endpoint instead of another

### Open Questions For Branch Model

1. Should each endpoint expand into exactly six children, or up to six children over time?
2. Should branch expansion require POW-20 spend, a fresh PoW solution, or both?
3. Should every child be immediately available to anyone, or owned/reserved by the expander?
4. What is the maximum depth per season or per year?
5. Does the tree ever prune, fruit, flower, or fossilize?
6. Should rare hashes mutate local branching geometry beyond the standard six-child rule?
7. Are checkpoint artifacts separate NFTs, or views over the same canonical tree?

## What Could Make It Remarkable

The project gets interesting if we avoid "collaborative canvas" as a generic trope and push toward a sharper behavior.

Current strongest directions:

### 1. The Artwork Is a Market of Scarcity

Every region of the canvas becomes harder or more expensive to alter once it accumulates history.

Result:

- early miners shape the base layers
- later miners must spend more to overwrite culturally important areas
- the image develops path dependence and memory

### 2. PoW Determines Aesthetic Power, Not Just Access

Not all valid proofs are equal.

We can derive a score from the winning hash beyond simple threshold validity.

Examples:

- deeper leading-zero rarity creates larger or more persistent edits
- rare bit patterns unlock unusual palettes or transformation modes
- "legendary hashes" can affect the entire canvas rather than a single region

This creates a collectible gradient inside participation itself.

### 3. Seasons Produce Fossils

The canvas evolves in seasons.

At the end of each season:

- the current state is frozen
- a season artifact is minted
- rewards are distributed to contributors
- a new canvas begins with inherited DNA from the prior season

This gives us both a live object and discrete collectible outputs.

### 4. Time Is Visible in the Object

The artwork should visibly encode multiple clocks at once:

- quarterly or seasonal checkpoints
- annual checkpoints
- block-height checkpoints every `100,000` blocks
- the ever-changing chain tip

This is strong because Bitcoin-scale time is not the same as calendar time.
The work can let both coexist:

- human time
- chain time

That dual-timeline quality is a real aesthetic asset, not just metadata.

### 5. Art Direction Comes From Human Constraints

Participants should not directly pick arbitrary pixels.

They should choose constrained gestures:

- carve
- bloom
- smear
- echo
- invert
- crystallize

The mined hash then instantiates that gesture. This is better art direction than freeform low-signal drawing.

## Recommended V1

### Seasonal Mined Canvas

This is the current best v1 candidate.

- one canvas per season
- the live work continues to evolve at chain tip throughout the season
- users mine POW-20 as usual
- users spend a fixed token amount to submit one patch
- each patch uses:
  - `gesture_type`
  - `winning_hash`
  - optional small user parameters
- the contract updates the ordered patch log root
- an off-chain renderer deterministically produces the image from the patch log
- season end mints a finalized artifact and resets for the next season
- annual boundaries mint a stronger summary artifact composed from the four seasonal states
- every `100,000` blocks the system emits a chain-time checkpoint snapshot

### Checkpoint Structure

The piece should have four layers of temporality:

1. `chain tip`
2. `100k block checkpoints`
3. `quarterly / seasonal checkpoints`
4. `annual checkpoints`

#### Chain Tip

The chain tip version is the living artwork.

- always mutable
- always current
- reflects the most recent accepted patches
- can be rendered as a dynamic web or wallet experience

#### Every 100k Blocks

Every `100,000` blocks, freeze a chain-native milestone.

This should feel different from quarter boundaries:

- less human
- more geological
- more Bitcoin-native

These checkpoints can be framed as strata, sediment, rings, or fossils in the render language.

#### Quarterly / Seasonal Checkpoints

Every quarter, freeze the state as a seasonal artifact.

Possible seasonal framing:

- spring = emergence / bloom / expansion
- summer = saturation / density / abundance
- autumn = fragmentation / harvest / drift
- winter = reduction / skeletal structure / silence

These should not just be labels. The renderer and allowed gesture palette should shift with the season.

#### Annual Checkpoints

Each year, compose an annual artifact from the four seasonal states plus the year's major block-height snapshots.

This annual artifact should feel archival and monumental:

- a bound volume
- a climate map
- a ledger of labor
- a formal summary of the year's collaborative authorship

This gives collectors distinct objects at different temporal scales.

Why this is good:

- simple mental model
- easy to explain
- strong link between labor and authorship
- deterministic rendering
- can be live without requiring arbitrary image data on-chain
- has a memorable temporal identity instead of generic "collaborative art"

## Economic Sketch

Possible defaults:

- `edit_cost`: fixed amount of POW-20 per patch
- `treasury_cut`: percentage of edit spend retained by protocol treasury
- `burn_ratio`: percentage permanently destroyed
- `author_credit`: cumulative score from accepted patches
- `season_rewards`: distributed by concave weighting such as `sqrt(total_spent)`

The concave weighting matters. Pure linear weighting will let a whale dominate aesthetics too easily.

## State Model Sketch

### Canvas State

- `season_id`
- `year_id`
- `epoch`
- `patch_root`
- `patch_count`
- `canvas_seed`
- `treasury_amount`
- `contributor_root`
- `locked_regions_root`
- `last_100k_checkpoint_height`
- `last_season_checkpoint_height`
- `last_annual_checkpoint_height`
- `finalized`

### Patch Record

- `patch_id`
- `contributor_pubkey_or_address`
- `gesture_type`
- `winning_hash`
- `token_amount`
- `region`
- `strength`
- `timestamp_or_height`

The renderer should be deterministic from this data plus global render rules.

## Open Questions

These are the key design questions we should refine next.

1. Should patches be fully on-chain data, or should on-chain state store only a Merkle root while patch bodies live in inscriptions / ordinals-style payloads?
2. Should `winning_hash` come directly from mined POW-20 issuance, or should users be allowed to mine specifically for the canvas with a dedicated challenge?
3. Should edits be first-come-first-served, epoch-batched, or auctioned by rarity of proof?
4. Should the artwork be abstract, typographic, cartographic, or game-like?
5. What exact contributor rights survive into secondary sales and future seasons?
6. How much should the render grammar change between spring, summer, autumn, winter?
7. Should 100k-block checkpoints mint separate collectible outputs, or only anchor archival state?
8. Does the annual artifact derive only from the four seasonal finals, or also from intra-season chain-time strata?

## Immediate Next Targets

The next good move is to choose one of these and harden it:

- exact transaction / state transition graph
- exact patch data model
- exact art direction language
- exact token economics

My current recommendation is:

1. lock the user experience
2. lock the patch primitive
3. lock the season structure
4. only then lock the contract layout

## Working Name Ideas

- Mined Canvas
- Hash Garden
- Proof of Gesture
- Work of Art
- Canvas Hash
- Fossil Season
- Labor Bloom

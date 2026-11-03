# Rhythmic Balanced Interchange

> "All motion is rhythmic and balanced. There is no unbalanced condition in the universe."
> — Walter Russell

A design exploration for a multiplayer, full-screen Three.js space in Adaptics, treated
honestly as a **distributed system**: many client runtimes, one server runtime, a network
between them, and no shared clock. The question this document exists to answer is not "how do
we sync state" — that is the easy, already-solved part. The question is:

**How do we give clients maximum creative agency while the server maintains an opinionated,
coherent whole — such that the relationship between a part and the whole is a *rhythmic balanced
interchange* rather than a fight over a single mutable truth?**

This is a constraints document, not a build plan. Tasks, if any, land in [PLAN.md](PLAN.md).

---

## 1. The constraints (given)

1. **Multiplayer via Phoenix Presence.** Who is here, and what each person is doing *right now*,
   is presence state — ephemeral, diff-broadcast, never persisted.
2. **Full-screen Three.js**, save for the site-wide header. The canvas is the world; the header is
   the only chrome. (The app already renders this way: `fixed inset-0 pt-10` in
   `FabricCanvasLive` — the `pt-10` is exactly "everything except the header.")
3. **Two runtimes, asymmetric authority.**
   - **Clients**: maximum creative agency. Free to render, interpret, deviate, fork.
   - **Server**: MUST maintain coherence. Opinionated. The conductor, not a database.
4. **Rhythmic balanced interchange.** Part ⇄ whole is a *two-way* exchange with give and take, not
   a one-way write. The server gives form; the client gives motion; neither overruns the other.

---

## 2. What already exists (the substrate)

We are not starting from zero. The honest grounding for this exploration:

| Capability | Where it lives | What it gives us |
|---|---|---|
| Presence | `AdapticsWeb.Presence` (`Phoenix.Presence`, pubsub `Adaptics.PubSub`) | who's here, per-user metadata, join/leave diffs |
| Per-space topic | `Adaptics.Canvas.topic/1` → `"fabric_canvas:<id>"` | one world = one topic |
| Sender-excluded broadcast | `Canvas.broadcast/2` → `Phoenix.PubSub.broadcast_from/4` | I never echo my own op back to myself |
| Op vocabulary | `{:canvas_object_added | _modified | _removed | _cursor_moved}` | the verbs of change |
| Snapshot persistence | `Canvas.save_snapshot/3`, monotonic `version` | the durable "official" state + version counter |
| Ephemeral cursors | `canvas:cursor_moved` → `canvas:remote_cursor`, per-user color | presence made spatial |

The gap between this and the constraint is precise: today the server is a **relay with a save
button**. It broadcasts whatever a client did and stores a flat snapshot. It holds no opinion. It
cannot say "no." It cannot reconcile two truths. There is no notion of *local vs. global*
contribution, and no notion that two observers might legitimately *perceive different worlds*.

That gap is the whole essay.

---

## 3. The distributed-system framing

Drop the "frontend/backend" words. There are **N+1 runtimes** that never share memory and never
share a clock:

```
   client runtime A ─┐
   client runtime B ─┤        ┌──────────────────────────┐
   client runtime C ─┼──ws────┤   server runtime (BEAM)   │
        …            │        │  one process per world    │
   client runtime N ─┘        │  holds the OPINION        │
                              └────────────┬─────────────┘
                                           │ persists
                                     ┌─────┴─────┐
                                     │  Postgres  │  (the slow, true, boring layer)
                                     └───────────┘
```

Three runtimes, three jobs, three tempos:

- **Client runtime** — *fast, local, creative, untrusted.* Owns a Three.js scene graph, a render
  loop at 60fps, an input pipeline, and a **local interpretation** of the shared world. It is
  allowed to be wrong, ahead, behind, or deliberately divergent. This is where agency lives.
- **Server runtime** — *authoritative, coherent, opinionated, single-writer per world.* One
  GenServer/LiveView-orchestrated process per world owns the **canonical sequence of accepted
  facts.** It does not render. It decides what is *true for the whole* and at what version.
- **Persistence runtime** — *slow, durable, indifferent.* Postgres. It remembers across restarts.
  It is not in the hot loop; it is the tide, not the wave.

The CAP-flavored stance, stated plainly: **within one world we choose consistency of the canonical
fact-line (the server is the single writer, so no split brain), and we choose availability of
*perception* (clients keep rendering and acting even when partitioned).** The reconciliation of
those two is §6.

---

## 4. The Russell move: balanced interchange, not write-through

Russell's physics is a metaphor we take literally as an architecture rule. A "rhythmic balanced
interchange" has two strokes — a giving and a regiving — around a still fulcrum. Map it:

- **The fulcrum** is the server's canonical version line. Still, central, the thing both strokes
  pivot around.
- **The outward stroke (client → server): a *proposal*, not a write.** A client never mutates the
  whole. It *offers* a change. The verb is `propose`, not `update`.
- **The inward stroke (server → clients): an *accepted fact*, not an echo.** The server decides,
  stamps a version, and regives a fact to everyone — including, distinctly, back to the proposer
  as confirmation/rejection.

The imbalance we are forbidding is **write-through**: client mutates → server stores → server
echoes. That is one stroke pretending to be a cycle. It looks fine with one user and tears with
many, because there is no fulcrum — every client is its own center, and the "whole" is just the
last writer to arrive.

So the core inversion:

> The client owns **motion and perception**. The server owns **form and fact**.
> A contribution is a *proposal across the membrane*, and the membrane has an opinion.

---

## 5. The central question: local, forked, or global?

You asked the real question: *is a contribution local-internal or global?* The answer is that
**there are three membranes a change can cross, and the act of crossing each one is a distinct,
first-class operation** — not an implementation detail.

### Tier 0 — Local / internal (perception)
The change never leaves the client runtime. You rotate the camera, you highlight a node, you run
a what-if, you nudge an object to see how it would look. This is **agency without contribution.**
It costs the whole nothing and the server never hears about it. *Most* of what a creative client
does should live here. Perception is sovereign and local by default.

> Crossing nothing. The world as *I* see it, including changes only I see.

### Tier 1 — Forked (a divergent branch of an object)
You don't like the shared `node-42`. You **fork** it. You now hold `node-42@fork:you` — a local
variant that diverges from canonical. Others don't see your fork unless you publish it. The
original keeps evolving under the server's opinion; your fork is a held breath. A fork is the
honest representation of "I disagree with the whole but I'm not overruling it." This is the
**edit-or-fork** instinct you named: *editing the shared object is a global act and requires the
server's consent; forking is a local act and requires no one's.*

> Crossing into a parallel line. Diverged, addressable, not yet imposed.

### Tier 2 — Global (an accepted fact)
You propose your change (or the publication of your fork) *to the whole*. The server applies its
opinion — accept, reject, transform, merge, supersede — and if accepted, stamps version `v+1` and
regives it to all. Now it is true for everyone. This is the only tier that mutates the canonical
line, and it is the only tier the server is allowed to refuse.

> Crossing into the fulcrum. Contributed, versioned, coherent, shared.

The rule that ties it together:

| Act | Membrane crossed | Who consents | Visible to |
|---|---|---|---|
| Look / nudge / simulate | none | no one | me |
| Fork an object | local→branch | no one | me (until published) |
| Edit the shared object | branch→canonical | **the server** | everyone, at a version |

**This reframes "update" out of existence at the object level.** You do not update `node-42`.
You either (a) perceive it differently (Tier 0), (b) fork it and evolve your branch (Tier 1), or
(c) propose that the canonical `node-42` advance to a new version (Tier 2). "Update in place" was
the write-through sin in disguise — it conflates perception, divergence, and contribution into one
lossy verb. Splitting them is what gives clients *maximum* agency (Tiers 0–1 are unconstrained)
while letting the server be *maximally opinionated* (Tier 2 is wholly its call).

---

## 6. Coherence vs. perception: the two truths

The hardest and most interesting consequence: **the whole has one canonical state, but observers
may legitimately perceive variants.** You said it — "what people perceive, which may be a variant."
We treat that as a feature, not a bug to be synced away.

Define two layers explicitly:

- **Canon** — the server's versioned, accepted fact-line. There is exactly one. It is coherent by
  construction (single writer). It is what the world *is*.
- **View** — what a given client renders. It is `Canon` composed with that client's local lens:
  its forks (Tier 1), its in-flight proposals not yet accepted, its perception-only state (Tier 0),
  its camera, its filters, its interpretation. There are N views. Each is internally consistent.
  None is wrong. A View is what the world *looks like from a seat in it.*

```
   View_A = Canon ⊕ lens_A          (Canon is shared; lenses differ)
   View_B = Canon ⊕ lens_B
   …
```

This is the rhythmic balance at the level of *meaning*: the server enforces one coherent score;
each player hears it from where they sit, with their own ornamentation. **Convergence is required
for Canon and forbidden for View.** A multiplayer system that forces every screen to be pixel-
identical has destroyed agency to buy a coherence it didn't need. A system with no Canon has
agency but no whole. The balance point is: *one canon, many faithful perceptions.*

Practical reconciliation when a proposal is in flight (the partition/latency case):
- The client **optimistically** applies its own proposal to its View immediately (agency: no
  waiting on the network to feel responsive).
- The server accepts/rejects against Canon.
- On **accept** at `v+1`, the optimistic View change is confirmed and reconciled to canonical form.
- On **reject** or **transform**, the client's View *rolls back to Canon* or *adopts the server's
  transformed version* — and, crucially, **may offer to keep the rejected change as a Tier-1 fork**
  instead of silently discarding it. The disagreement becomes a branch, not a loss. Nothing
  creative is ever destroyed by the server saying "no"; it is demoted from global to forked.

---

## 7. Where the server's "opinion" actually lives

"Opinionated server" is a vibe until it's a function. The opinion is a **reducer over proposals**:

```
   accept(canon_state, proposal)  ->  {:accept, canon_state', version'}
                                    | {:reject, reason}
                                    | {:transform, canon_state', applied_proposal'}
                                    | {:supersede, canon_state', superseded_ids}
```

The opinion is the body of that function, and it is where the project's *values* become code.
Candidate opinions (the point is that these are deliberate, not accidental):

- **Coherence invariants** — the whole must remain a valid graph / valid scene. A proposal that
  would orphan a node, create a cycle where cycles are forbidden, or collide two objects into the
  same identity is rejected or transformed. (This is the natural home for the project's existing
  thesis: *"a well-formed Concept Map is an implicit Data Structure."* The server is the thing that
  keeps it well-formed.)
- **Conservation / balance laws** — Russell again, taken as a rule: changes come in balanced pairs;
  energy added somewhere is accounted for somewhere. If an object grows, what gives? An opinionated
  server can *require* that contributions balance rather than merely accumulate.
- **Last-writer-loses, sometimes** — for genuinely conflicting global edits, the server may prefer
  *fork the loser* over *overwrite*, so simultaneous disagreement produces two branches and a
  visible tension to resolve, not a silent clobber.
- **Rate / authority shaping** — presence metadata (tenure, role) can weight whose proposals the
  server accepts directly vs. routes to fork. Agency is universal; *global* authority can be earned.

This reducer is the single writer. It runs in **one server process per world**, fed a serialized
stream of proposals, emitting a serialized stream of versioned facts. Serialization at the fulcrum
is what makes "one coherent canon" true without distributed locks.

---

## 8. Mapping to Phoenix / BEAM (grounded, not hand-wavy)

| Concept here | BEAM / Phoenix mechanism | Status |
|---|---|---|
| Who is here, doing what now | `Phoenix.Presence` (`AdapticsWeb.Presence`) | **exists** |
| One world = one topic | `Canvas.topic(space_id)` | **exists** |
| Inward stroke (fact → all) | `Phoenix.PubSub.broadcast_from` | **exists** (as echo; needs to carry version) |
| The fulcrum / single writer | a per-world `GenServer` owning canon + the `accept/2` reducer | **to design** |
| Outward stroke (proposal) | a distinct `propose` channel event, not `object_modified` | **to design** |
| Canon persistence + version | `Canvas.save_snapshot/3` already has monotonic `version` | **exists, repurpose** |
| Fork (Tier 1) | client-only branch; published forks become Tier-2 proposals | **to design** |
| Per-client View | the Three.js scene graph + a local lens layer over canon | client runtime |
| Catch-up after partition | request canon@version, diff against local View, reconcile | **to design** |

The migration from what exists is small and clean:
1. Rename the client→server verbs from `object_modified` (a write) to `propose_*` (an offer).
2. Insert the per-world `GenServer` between the channel and the broadcast, holding `accept/2`.
3. Stamp every outbound fact with `version`; clients reconcile View against it.
4. Add the fork tier as a purely client-side branch with an explicit "publish → propose" action.

Nothing about the Three.js / full-screen / Presence constraints changes. We are inserting an
*opinion* and a *membrane* into a pipe that currently has neither.

---

## 9. What people perceive — the felt experience

Because Views legitimately differ, the UI should *show the membrane*, so agency feels safe and the
whole feels alive:

- **Cursors and bodies** (Presence) — you always see *who* is here and roughly where their
  attention is. Already half-built (`canvas:remote_cursor`, per-user color).
- **In-flight proposals** — a change you've offered but the server hasn't ruled on renders in a
  distinct "pending / breathing" state in *your* View, and as a faint ghost in *others'* Views.
  The proposal is visible as a proposal, not as fact.
- **Forks as visible divergence** — your forked `node-42@fork:you` is rendered as a branch *beside*
  canon, not on top of it. You can see your disagreement next to the world's position. Tension is
  legible (cf. the project's `VIABLE_TENSION.md` instinct).
- **Acceptance as motion** — when the server accepts at `v+1`, the fact *arrives* into every View
  with a small animation: the inward stroke made perceptible. Coherence you can feel.
- **Rejection as fork, not as error** — a refused proposal doesn't flash red and vanish; it settles
  into a local fork. The server's "no" is generative.

---

## 10. Open tensions (honest unknowns)

- **Granularity of the fulcrum.** One `GenServer` per world is clean but bounds a world's write
  throughput to one process. For large worlds, does canon shard by region/layer (many fulcrums,
  weaker global coherence) or stay single (strong coherence, capped tempo)? Russell would say the
  whole has one center; engineering says it depends on N.
- **Garbage and the commons of forks.** If forking is free, forks proliferate. Do unpublished forks
  expire? Is there a cost to forking, or only to *publishing*? (Lean: forking free, publishing
  costs server attention.)
- **History vs. snapshot.** Canon currently persists as a flat versioned snapshot. A true fact-line
  wants an append-only **event log** (the project already has a client-side event-log instinct,
  Stories 26–27). Snapshot is the photo; the log is the film. Likely need both.
- **When is a variant a bug?** We celebrate divergent Views — but some divergence is just stale data
  after a dropped packet. Distinguishing *intended* divergence (fork, lens) from *accidental*
  divergence (missed a version) is the reconciler's real job.
- **Identity across fork/merge.** If `node-42` forks, evolves, and a fork is later accepted globally,
  is it still `node-42`, or `node-42`-superseded-by-`node-99`? Identity under branching is unsolved
  here and is the deepest modeling question.

---

## 11. One-paragraph thesis

Build the world as a distributed system of N client runtimes and one opinionated server runtime,
joined by Phoenix Presence and PubSub, rendered full-screen in Three.js. Give clients total agency
over **perception** (look, simulate, nudge — local, free) and over **divergence** (fork an object
into a private branch — local, free). Reserve for the server total authority over **the canonical
fact-line**: contributions are *proposals* that cross a membrane where an opinionated reducer
accepts, transforms, supersedes, or — generatively — refuses-into-a-fork, stamping each accepted
fact with a version it regives to all. The result is Russell's rhythmic balanced interchange made
into an architecture: one coherent whole that no single part can overrun, perceived faithfully and
differently by every part — where contribution is never a blind overwrite but always an explicit
crossing of a known membrane: *local, forked, or global.*

---

*Companion reading in-repo:* [VIABLE_TENSION.md](VIABLE_TENSION.md), [COEVOLUTION.md](COEVOLUTION.md),
[SYSTEMIC_INCOHERENCE.md](SYSTEMIC_INCOHERENCE.md), [INTENT_VECTORS.md](INTENT_VECTORS.md),
[GOVERNANCE.md](GOVERNANCE.md). Substrate in code: `lib/adaptics/canvas/canvas.ex`,
`lib/adaptics_web/presence.ex`, `lib/adaptics_web/live/fabric_canvas_live/index.ex`.

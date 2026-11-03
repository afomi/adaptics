---
from: iterm2-status-bar
to: adaptics
created: 2026-10-25
status: pending
summary: New candidate thread — Transcript Explorer, a local-only LiveView for navigating Claude Code transcripts by turn and thread
---

## Context

In an iterm2-status-bar session (the macOS sidebar listing iTerm2 windows per screen), Ryan asked to think out a web interface for LLM transcripts.
The shape he wants: sessions contain many turns, and turns contain many threads, topics and projects.
His first idea is a threaded, contextual interface, e.g. a horizontal tab view of turns.
The full exploration is appended below; it started as `TRANSCRIPT-EXPLORER.md` in iterm2-status-bar, and that copy has been deleted so this handoff is the only source.

Decisions already made with Ryan:

- **Home is adaptics**, not sandbox.
  adaptics already has Phoenix LiveView/.heex, Oban, local Ollama embeddings (`Adaptics.Embeddings.Ollama`), topic modeling (`Semantic.TopicModel`, `Topics`, `Triangulation`), projections/semantic axes and an events log, all of which map onto the design.
  sandbox is Rails and deploys to production with family finances, so it's the wrong neighbour for 4.3 GB of private transcripts.
- **Postgres**, not SQLite: `tsvector` full-text search; embeddings stored like `Semantic.NodeEmbedding`.
- **Local only.** The indexer and transcript routes start only when `~/.claude/projects` exists and the app is not running as a release.
  Transcript tables and data are never part of a deploy.
- **Candidate thread, not the active one.** `## Now` stays on BM (business as resource flow).
- The iterm2-status-bar side (showing each window's current turn title, ⌥-click opening the explorer) is built and tracked in iterm2-status-bar, not here.
  The sidebar derives window → session itself, so it never depends on a running Phoenix server.

Data findings (from `~/.claude/projects/` on 2026-10-22, read-only):

- 89 project folders, 1,628 session JSONL files, ~4.3 GB; one JSON record per line.
- Records form a tree via `uuid` / `parentUuid`: rewinds and edited prompts create forks (one 2,173-line gov-center session had 14 branch points).
- Useful fields: `sessionId`, `timestamp`, `cwd`, `gitBranch`, `version`, `permissionMode`, `isSidechain`.
- Record types: `user`, `assistant`, `system`, `attachment`, `ai-title` (a per-turn title), `last-prompt`, `queue-operation` (messages sent mid-turn), `file-history-snapshot` / `file-history-delta` (files touched).
- Content blocks: `text`, `thinking`, `tool_use`, `tool_result`, `image`.
- Sibling folders per project: `subagents/`, `tool-results/` (large outputs spilled to disk), `memory/`.

## Request

1. Add a **Transcript Explorer** thread to the `## Prioritized Start List` in `PLAN.md`, marked `next` and not active.
   Turn "A possible path" (in the appendix) into user stories with ids (e.g. TX1–TX7), each with at least one test.
   Leave out the sidebar-link story; it lives in iterm2-status-bar.
2. Save the appendix as a concept doc at the repo root, `TRANSCRIPT_EXPLORER.md`, matching the other concept docs, and list it as reference in PLAN.md.
3. Shape TX1 (index) concretely enough to start: schemas for projects / sessions / turns / steps / forks / artifacts, an incremental indexer (byte offset per file, append-only tail parsing) as an Oban job, and fixture JSONL under `test/fixtures/transcripts/`.
   Fixtures must be synthetic or scrubbed: real transcripts contain secrets.
4. Record the local-only guard (dev / `~/.claude/projects` present, never in a release) as an acceptance criterion on TX1.
5. Bring Ryan the open questions at the end of the appendix before starting on threads (TX5 and later).

## Relevant files

- adaptics: `PLAN.md`, `lib/adaptics/embeddings/ollama.ex`, `lib/adaptics/semantic/{topic_model,topics,triangulation,node_embedding}.ex`, `lib/adaptics/projections/`, `lib/adaptics/events.ex`, `config/config.exs` (Oban).
- Source data: `~/.claude/projects/<project-slug>/<session-id>.jsonl`, plus the `subagents/` and `tool-results/` folders beside them.
- Worked example of turns and threads: iterm2-status-bar session `72aa8e3f-ca36-4866-af6b-8d386d59bc53` (one turn with three threads, a "proceed" turn, and a mid-turn message that opened this one).

## Acceptance

- `PLAN.md` has a Transcript Explorer thread with TX stories, each naming its test; `## Now` is unchanged.
- `TRANSCRIPT_EXPLORER.md` exists at the adaptics root and PLAN.md links it as reference.
- TX1 names its schemas, the Oban indexer and the local-only guard, with synthetic fixtures planned.
- This file has been moved to `.claude/inbox/done/`.

---

## Appendix — Transcript Explorer concept doc


Status: exploration, not a plan yet.
Written 2026-10-22 from a mid-turn aside in an iterm2-status-bar session; handed to adaptics 2026-10-25.
Home: `~/workspace/adaptics` (Phoenix 1.8 + LiveView + Postgres + Oban + Ollama embeddings).
That aside is itself the use case: one session, one turn, and a brand-new thread started inside it.

### The ask

Process LLM (Claude Code) transcripts and give us a web interface that respects their real shape.
A session holds many turns.
Turns hold many threads, topics, words and projects.
The first idea to explore is (a): a more threaded, contextual interface — e.g. a horizontal tab view where turns are visible.

### What the data actually is

Ground truth from `~/.claude/projects/` on this machine:

- 89 project folders, 1,628 session files, ~4.3 GB.
- One JSONL file per session; one JSON record per line.
- Records are a **tree, not a list**: every record has `uuid` and `parentUuid`.
  A rewind or edited prompt creates a fork. One 2,173-line gov-center session had 14 branch points.
- Each record carries `sessionId`, `timestamp`, `cwd`, `gitBranch`, `version`, `permissionMode`.
- Record types include `user`, `assistant`, `system`, `attachment`, `ai-title`, `last-prompt`, `file-history-snapshot/delta`, `queue-operation`.
- Message content blocks: `text`, `thinking`, `tool_use`, `tool_result`, `image`.
- `ai-title` records give a short machine title per turn — a free first-pass label.
- `queue-operation` records are messages typed while a turn was running (like the one that started this doc).
- Sibling folders: `subagents/` (sidechain transcripts), `tool-results/` (large outputs spilled to disk), `memory/`.
- `file-history-*` records tell us which files a turn touched.

So the raw material already encodes project (cwd), time, branch (git), forks (parentUuid), sub-work (subagents), and artifacts (files).
We mostly need to *derive* turns and threads, not invent structure.

### Vocabulary

Getting the nouns right is most of the UX.

| Unit | Definition | Source |
|---|---|---|
| **Project** | A working directory | `cwd` / project folder |
| **Session** | One `claude` run, possibly resumed | `sessionId`, one JSONL |
| **Turn** | One human prompt plus all the work until the next prompt | `user` record with text, through to the next one |
| **Step** | One tool call and its result inside a turn | `tool_use` + `tool_result` |
| **Interjection** | A message sent mid-turn | `queue-operation` |
| **Fork** | A point where the tree branches (rewind / edit) | `parentUuid` with >1 child |
| **Sidechain** | Subagent work spawned from a step | `subagents/`, `isSidechain` |
| **Thread** | A line of intent that spans turns — and sometimes sessions and projects | Derived (see below) |
| **Artifact** | Something a turn produced or touched: file, diff, commit, URL, port, doc | `tool_use` inputs, file-history |

The key distinction: **sessions are containers; threads are meaning.**
Today's tools show us containers.
What we want to navigate is threads.

This session is a clean example:

```
session 72aa8e3f (iterm2-status-bar)
├─ turn 1  "review, DRY, windows behind sidebar"
│   ├─ thread A  up to date        (a)
│   ├─ thread B  DRY               (b)
│   └─ thread C  reserve space     (c)
├─ turn 2  "proceed"
│   ├─ thread A' Swift 6 / tests / split   (continues A+B)
│   └─ interjection → thread D  transcript explorer   ← new, different project in spirit
```

One turn carries three threads; a two-word turn continues two of them; an interjection opens a fourth that doesn't belong to this repo at all.

### Where iterm2-status-bar fits

The sidebar is the **live "now"** layer; the web app is the **"then" and "across"** layer.

The sidebar already knows window → cwd → project and whether the session is running.
Small, high-value additions:

- **Map window → Claude session.** The newest JSONL in the cwd's project folder, modified while the window's process is `claude`, is almost always the live session.
- **Show the current turn's `ai-title` under the row**, e.g. `iterm2-status-bar — claude` / `↳ Swift 6 tests`.
  That turns the sidebar from "which terminal" into "what is each terminal doing".
- **Turn count / state badge**: `12 turns · waiting on you` vs `running · 3 subagents`.
  "Waiting on you" is the most useful signal across 30 windows.
- **Click-through**: ⌥-click a row opens the web explorer at that session's latest turn.
- **Threads section** (later): open threads that span windows, e.g. "transcript explorer — 2 sessions".

The sidebar stays thin.
It reads a small index the supporting app maintains; it never parses 4 GB itself.

### Supporting applications

```
~/.claude/projects/**.jsonl
        │  FSEvents (tail-follow; files are append-only)
        ▼
  ┌──────────────┐     ┌────────────────────────┐
  │   Indexer    │────▶│ Postgres (tsvector)    │
  │ (Oban) turns │     │ projects, sessions,    │
  │ forks, steps │     │ turns, steps, threads, │
  │ artifacts    │     │ artifacts, embeddings  │
  └──────┬───────┘     └──────────┬─────────────┘
         │ labeler (batch, cheap model)│
         ▼                             ▼
   thread suggestions        Web UI (Phoenix LiveView)
                                       ▲
                           iterm2-status-bar reads a tiny
                           "live sessions" view / JSON
```

- **Indexer.** Incremental: remember byte offset per file, parse only new lines.
  Builds turns from the parent tree, marks forks, attaches sidechains, extracts artifacts.
- **Labeler.** Asynchronous, batch, cheap model.
  Proposes thread boundaries and names; never blocks the UI; its output is a *suggestion*.
- **Web UI.** Phoenix LiveView in adaptics: `.heex` templates, live updates as sessions append, no SPA build.
- **Storage.** adaptics' Postgres: `tsvector` full-text search, embeddings stored the way `Semantic.NodeEmbedding` already stores them.
- **Reuse in adaptics.** `Adaptics.Embeddings.Ollama` (local embeddings), `Semantic.TopicModel` / `Topics` / `Triangulation` (thread suggestions), projections and semantic axes (thread lanes, plotting turns), the events log (corrections), Oban (indexing).
- **Local-only.** Transcripts contain secrets, paths and client data; nothing leaves the machine unless explicitly exported.
  The indexer and transcript routes start only when `~/.claude/projects` exists and the app is not running as a release.
  Transcript tables and data are never part of a deploy.
- **Sidebar independence.** iterm2-status-bar derives window → session → current `ai-title` itself, by tail-reading the newest JSONL in the cwd's project folder.
  adaptics is only the click-through target, so the sidebar never depends on a running Phoenix server.

### Deriving threads

No single signal is enough; combine and let the human correct.

Strong signals:

- Explicit structure in the prompt: `a) … b) … c)`, "separately", "also", numbered asks.
- Files touched: turns editing the same files are probably the same thread.
- `cwd` and `gitBranch` changes.
- Interjections (`queue-operation`) are often new threads.
- "proceed", "yes", "do it" continue whatever the previous turn proposed.

Softer signals:

- `ai-title` similarity between turns.
- Prompt embeddings, clustered within a project, then across projects.
- Time gaps (overnight = likely new thread, unless "continue").

Human in the loop — this is where the UX earns trust:

- Every derived thread shows *why* ("same files: main.swift, build-app.sh").
- Split, merge, rename, recolor by drag or keyboard.
- Corrections are stored and win over the labeler forever.
- A thread can span sessions and projects; a turn can belong to more than one thread.

### Interface ideas

#### A. The turn rail (the horizontal tab view)

A session is a horizontal rail of turns.
Each turn is a tab-like chip: its `ai-title`, colored by thread, width hinting at how much work it took.
The selected turn expands below.

```
iterm2-status-bar · session 72aa8e3f · main · 2 turns · ● waiting on you
┌────────────────────────────┬───────────────┬──────────────────────┐
│ ▌review · DRY · reserve    │ ▌proceed      │ ◆ transcript explorer│  ← interjection chip
│ A B C   34 steps  ✓ build  │ A' 41 steps   │ D  (this doc)        │
└────────────────────────────┴───────────────┴──────────────────────┘
  ▲ selected
──────────────────────────────────────────────────────────────────────
 YOU   gm, please review this app and a) ensure it is up to date b) DRY
       c) separately … windows don't maximize behind the sidebar

 WORK  ▸ read 6 files   ▸ edited main.swift, demo.swift, README …   ▸ build ✓
       ▸ AppleScript test ✗ → fixed → ✓ (36 windows)

 ANSWER  All three are done …   [threads: A B C]  [files: 7]  [diff]
```

Design notes:

- Prompt is the headline; the final answer is prominent; the work in between is collapsed into a sentence ("read 6 files, edited 2, tests ✓").
  Expand to see individual steps, then individual tool output.
- Failures stay visible even when collapsed (`✗ → fixed`): they are the most informative part of a turn.
- Interjections get their own chip, marked ◆, attached to the turn they interrupted.
- Long sessions (160+ turns) don't fit as tabs.
  The rail becomes a **minimap**: thin colored ticks, zoomable, with a scrubber.
  Hover a tick → title; click → jump.
  Collapse runs of same-thread turns into one segment ("A ×12").
- Forks show as a small ⑂ on the chip; clicking it reveals the abandoned branch as a stacked tab behind.

#### B. Thread lanes (the subway map)

Across sessions, time runs left→right and each thread is a colored line.
Turns are stations.
A thread that hops sessions or projects is drawn as a line changing tracks.

```
          Oct 20         Oct 21                 Oct 22
sidebar   ──A──A──────────────────────A──A'──A'─────
                                            ╲
explorer                                      D────────?
gov-center ──────B──B──B──⑂──B────────
                          ╲─B (abandoned)
```

Good for: "what was I doing across everything this week", "where did this idea come from".
Click a line → thread view.

#### C. Thread view (stitched transcript)

Pick a thread; read only its turns, in order, across sessions and projects, with thin dividers saying where each came from.
This is what you would hand to someone else, or to the next session.

- **Export as handoff `.md`**: prompts, decisions, final answers, files touched, open questions.
  That fits the existing `/handoff` and `.claude/inbox/` convention directly.
- **"Resume here"**: copy `claude --resume <session>` or fork from a specific turn.

#### D. Search and ask

- Full-text search across prompts, answers, tool inputs and file paths; facets for project, thread, tool, file, date, branch.
- Results land on the turn, with the match highlighted inside the collapsed work.
- "Where did we decide X?" returns turns, not paragraphs — the turn is the unit of citation.

#### E. Artifacts view

Per project or thread: every file touched, commit made, URL opened, port served, doc written — each linked back to the turn that made it.
"Who changed `build-app.sh` and why" becomes one click.

### Interaction details that matter

- **Keyboard first**: `h/l` previous/next turn, `j/k` steps, `[ ]` threads, `/` search, `t` assign to thread.
- **Stable URLs** for project / session / turn / step, so links can live in PLAN.md, issues and handoffs.
- **Live sessions** update in place (LiveView); a pulsing chip for the running turn, a clear "waiting on you" state.
- **Reading comfort**: thinking blocks hidden by default; tool output truncated with "show all"; diffs rendered as diffs.
- **Honest summaries**: any collapsed or LLM-written line links to the raw records it summarizes.

### States to design for

- Running turn (streaming, steps appearing).
- Very long sessions; compaction boundaries (context summarized — show as a seam, not a gap).
- Subagents: nested mini-rails under the step that spawned them, collapsed by default.
- Forks and abandoned branches.
- Denied tool calls and errors.
- Images and large spilled tool results.
- Sessions resumed days later (same session id, big time gap — probably a new thread).

### A possible path

Each step is a user story with at least one test, in dependency order.

1. **Index** — As a user, I can see every project and session with turn counts and last activity.
   Test: fixture JSONL → expected turns, forks and interjections.
2. **Turn rail + reading view** — As a user, I can open a session and move turn by turn, with work collapsed.
   Test: a turn's step summary ("read N, edited M, tests ✓") from fixtures.
3. **Live** — As a user, a running session updates without reload.
   Test: appending lines to a fixture updates the turn in place.
4. **Sidebar link** — As a user, the iTerm sidebar shows each window's current turn title and opens it in the explorer.
   Test: window cwd + newest JSONL → session id.
5. **Search** — As a user, I can find the turn where something was said or a file was touched.
6. **Threads (suggested)** — As a user, I see proposed threads with reasons and can split, merge and rename them.
7. **Thread view + handoff export.**
8. **Thread lanes** across sessions and projects.

Steps 1–4 are useful without any LLM labeling at all.

### Open questions for us

- Is a thread allowed to span projects by default, or only when we link it explicitly?
- Should corrections to threads write anything back (e.g. into PLAN.md or the inbox), or stay in the explorer?
- Which matters more first: navigating one long session well (A), or seeing across sessions (B)?
- How much of `thinking` do we want visible — never, on demand, or searchable but hidden?
- Retention: index everything forever, or roll up old sessions into thread summaries?

# Transcript explorer continuation prompt

Session wrapped 2026-11-01. Workspace: `/Users/ryan/workspace/adaptics`.

Continue from the existing local work. Nothing from this session was committed
or pushed. The worktree contains extensive unrelated changes and untracked
files predating this session; inspect carefully and preserve them. Do not bulk
stage the repository. The user requested a handoff and is ending the session;
this file records candidate next work for a later resumption.

## User direction

Adaptics' transcript browser is an exploration of how to use personal chat logs
with embeddings. The user wants common themes, questions about gaps, project
threads with status/length/timing, and eventual question answering with source
evidence. Indivisual's atlas is a visual reference for time controls and linked
views; it is at `~/workspace/indivisual`, not `~/workplace/indivisual`.

Read:

- [TRANSCRIPT_EXPLORER.md](TRANSCRIPT_EXPLORER.md): current behavior and background.
- [TRANSCRIPT_EXPLORER_IDEAS.md](TRANSCRIPT_EXPLORER_IDEAS.md): brainstorm covering
  themes versus threads, status evidence, timing metrics, gap questions, views,
  suggested routes, persistence, and an iteration sequence. This is exploratory,
  not approval to implement the entire roadmap.
- [TRANSCRIPT_TOPICS_AND_TRANSFORMERS.md](TRANSCRIPT_TOPICS_AND_TRANSFORMERS.md):
  follow-up explainer requested by the user, with plain-language scenarios,
  transformer/embedding mechanics, and additional approaches beyond fixed
  chunks. Includes context-enriched passages, concept records, hierarchical
  retrieval, reranking, late chunking, and multi-vector late interaction.

## Priority: replace the 2,000-character cutoff thoughtfully

The user's final request was to explicitly address **2K characters versus 32K
or more tokens**, saying that more text would be preferable. They were told:
preserving more text should help long requests and evidence, but a single vector
for a long conversation can blur multiple topics. **No input-limit change has
been implemented yet.** Treat this as a priority on resumption.

Current facts:

- `Adaptics.Transcripts.Embeddings` has `@max_chars 2_000`.
- `turn_records/2` slices each unwrapped human prompt before embedding and before
  supplying text to the atlas/related reader. The full original remains in the
  transcript and session reader.
- This is our chosen character cap, not a vector-math library limit. The math
  consumes numeric vectors; input limits belong to the embedding model/backend.
- Only human prompts are currently embedded. Assistant answers and tool output
  are not, so current retrieval cannot establish whether work was completed.
- The configured model is `qwen3-embedding:8b`, producing 4,096-dimensional
  vectors. Qwen's published context is **32K tokens**:
  [official model repository](https://github.com/QwenLM/Qwen3-Embedding).
- Local Ollama `/api/show` reported `qwen3.context_length: 40960` and
  `qwen3.embedding_length: 4096`. Metadata, published context, and effective
  server/request limits can differ. Verify effective behavior before choosing
  a larger limit; don't equate tokens, characters, or vector dimensions.

Suggested experiment:

1. Preserve full source text and role information in the indexing path. Keep
   display previews separate from embedding input limits.
2. Compare the present first-2,000-character baseline with longer prompt inputs
   and token-aware chunks. Include questions whose relevant material appears
   late in a long prompt, not just the existing short photo example.
3. Try overlapping chunks as an initial experiment, perhaps 512–1,500 tokens
   with modest overlap. Those are starting hypotheses, not proven optimal
   settings. Respect model limits even for a single unusually long message.
4. Consider separate prompt and assistant-answer chunks, with links to their
   parent turn. Preserve conversational context when retrieving an answer.
5. Compare one long vector against chunk retrieval. More complete coverage is
   desirable; putting several independent asks into one vector may dilute them.
   Parent-turn vectors or summaries can be a complementary navigation layer.
6. Verify overflow/truncation behavior explicitly. Reject oversized input or
   make any truncation visible rather than silently losing the tail.
7. Aggregate chunk hits back to source turns so one long message doesn't occupy
   every result. Keep role, offsets, and source links for citation.
8. Version the embedding input recipe: limits, chunking/overlap, model, any
   text cleanup, and tokenizer. Extend cache IDs and metadata for chunks while
   retaining original turn navigation. Do not silently overwrite the old cache
   with incompatible inputs.

Today the embedding SHA covers the truncated input; edits only after character
2,000 do not change that vector. A new recipe must address that explicitly.
Moving to chunked/full-text coverage will require embedding additional material;
measure throughput and expose incremental progress. Keep everything local unless
the user explicitly chooses a different backend. Neither real transcript text
nor derived caches belong in the repository or synthetic test fixtures.

## What is built

- `/transcripts`: project list, search, counts, sorts.
- `/transcripts/:project`: sessions, project search, link to the atlas.
- `/transcripts/:project/:session_uuid#turn-N`: source reader and **More like
  this**, showing cosine-ranked turns from other sessions, model/dimensions,
  coverage, and links to originals. Repeated source text is suppressed.
- `/transcripts/:project/map`: Three.js topic cloud, message selector and reader,
  nearest-match highlights/links, histogram, time scrubber, and playback.
  `?turn=<session_uuid>%23<number>` focuses a message.
- Semantic space uses PCA coordinates. The time mode replaces height with
  message time. Scrubbing reveals messages without recomputing the layout;
  future points remain faint. Topic labels are provisional c-TF-IDF terms.
- A versioned semantic workflow ↔ subject axis filters control messages from
  topics and related results. Its anchors lean toward jurisdictional/software;
  assess generalization before using it across all projects.
- Structural noise is excluded; control prompts are embedded by the CLI so the
  semantic axis can score them. Keep workflow events available for future
  thread-status inference even when they aren't useful topic exemplars.

Useful local example:

`http://localhost:4010/transcripts/jurisdictional/map?turn=9a6b8b9f-6df0-46d1-ab3f-3399ad4c6c88%2339`

That message about resized headshots retrieved missing production images,
missing individual profile images, the portrait importer, and avatar sizing in
other sessions. Measured cosines were roughly 0.627, 0.620, 0.612, and 0.589.
URL-heavy messages also showed noisier, path-dominated results; compare input
cleanup rather than assuming those scores establish a shared thread.

## Persistence and performance

Embeddings already persist as JSONL, keyed by session/turn and input SHA:

`~/.cache/adaptics/transcript_embeddings/<project>/<sanitized-model>.jsonl`

Run preparation explicitly:

```sh
mix adaptics.transcripts.embed jurisdictional --k 10
```

Options include `--model`, `--examples`, `--workflow-threshold`, and
`--include-workflow`. Browsing does not call Ollama.

The slow atlas load was recomputing k-means/PCA on every visit. Profiling found
about 2.3 seconds loading the index and 23.4 seconds fitting/projecting it.
`Adaptics.Transcripts.Snapshot` now saves parsed related indexes and fitted atlas
results beside the vector JSONL as `.snapshot` files. They include the vectors
needed for full-dimensional nearest-neighbor ranking, while only point/reader
data is sent to the browser.

- Fingerprints cover source paths and file metadata, vector/axis file metadata,
  root/workspace configuration, processing module versions, model, and view/k.
- Writes use private mode `0600`, temporary files, and atomic rename. Corrupt
  snapshots rebuild. A source change during a build prevents saving that result.
- Concurrent requests in one application share a build via a global lock.
  Separate unconnected BEAM processes may still build independently.
- Observed first builds took about 27–31 seconds; unchanged reads took 53–58 ms
  server-side. Browser verification measured an unchanged second visit at 739 ms.
- Changed source data still triggers an expensive rebuild. Active jurisdictional
  logs changed during profiling, explaining some repeat cold builds across
  processes; do not promise every navigation is subsecond.
- Fingerprints use file size/mtime/ctime/inode, with second-resolution stat
  timestamps. Same-size in-place edits within one second are an edge case worth
  revisiting if stronger freshness guarantees become necessary.

A future improvement could show an explicitly stale snapshot immediately while
refreshing it in the background, or optimize the pure Elixir vector math/PCA.
Neither is implemented. Don't increase input size and assume caching alone will
keep first builds cheap as the number of chunks grows.

## Recency fix

The user noticed all projects displaying “8m ago.” The page was using JSONL file
modification times; many files shared Oct 31 at 6:55:28 PM despite conversation
timestamps being days apart. The process responsible for rewriting them was
not identified.

Project/session display and recent sorting now use recorded main-conversation
user/assistant timestamps via `Transcripts.last_activity/1`. It tail-reads files,
expands backward when needed, ignores meta/sidechain/bookkeeping timestamps,
and leaves missing times unknown. File timestamps remain useful for cache
invalidation. Search results use the same recorded activity dates.

Browser checks showed distinct ages across 52 projects. Listing them took about
180–250 ms in the server benchmark. Live transcript tailing is not implemented;
refresh to pick up new activity.

## Theatre Studio console fix

`assets/js/stage_hook.js` previously imported `@theatre/studio` eagerly through
the shared bundle but initialized it only on a button click. That produced the
console warning even on transcript pages.

It now dynamically imports and initializes Studio hidden when the stage mounts,
before `getProject("Stage Scene")`, which requires Studio when no saved state is
provided. The Studio button restores/hides the editor. Transcript pages leave
the Studio module unevaluated. Browser verification covered both behaviors.

## Validation and practical notes

Latest relevant check: **42 Elixir tests, 0 failures**:

```sh
mix test test/adaptics/transcripts_test.exs test/adaptics/transcripts \
  test/adaptics_web/live/transcripts_live_test.exs \
  test/adaptics_web/components/site_nav_test.exs
```

Also passed earlier in the session:

```sh
node --test test/js/transcript_atlas_model.test.mjs
mix esbuild default
mix tailwind default
git diff --check
```

The JS file has two tests covering stable coordinates while scrubbing and
timestamp edge cases. Snapshot tests cover reuse, invalidation, model/k
separation, corrupt-file recovery, concurrent builds, and private permissions.
Activity tests cover touched files, bookkeeping, incomplete JSONL, long tails,
and unknown timestamps. Existing unrelated compiler warnings remain.

Development uses port **4010** (`.envrc`), not the framework's default 4000.
An existing server was used. Browser scripts in `tmp/` use Playwright from
`/Users/ryan/workspace/playcap/node_modules/playwright/index.mjs`. A preview
screenshot is at `tmp/captures/transcript-atlas.png`; it predates the last recency
and snapshot changes. These are local debug artifacts, not test fixtures.

When automating a LiveView button, wait for
`[data-phx-main].phx-connected` with `state: 'attached'`. A click before connection
can be ignored. The stage's fixed layout can make its connected root have no
visible box, so waiting for that root to be visible is unreliable.

## Where to look

- `lib/adaptics/transcripts.ex`: parsing, prompt scan, activity timestamps.
- `lib/adaptics/transcripts/{embeddings,workflow,related,atlas,snapshot}.ex`.
- `lib/mix/tasks/adaptics.transcripts.embed.ex`.
- `lib/adaptics_web/live/transcripts_live.{ex,html.heex}`.
- `lib/adaptics_web/live/transcript_map_live.ex`.
- `assets/js/transcript_atlas{,_model}.js`, `assets/css/app.css`.
- `assets/js/stage_hook.js`: Studio import/initialization fix.
- `assets/js/app.js` and `lib/adaptics_web/router.ex`: hook/route registration;
  both also contain preexisting unrelated changes.
- `test/adaptics/transcripts/`, `test/adaptics/transcripts_test.exs`,
  `test/adaptics_web/live/transcripts_live_test.exs`.

After addressing input coverage, the brainstorm recommends a project Threads
table plus stitched reader, then a timeline mode. Suggested URL:
`/transcripts/:project/threads`, registered before the dynamic session route.
Distinguish themes from goal-oriented threads, inferred status from confirmed
outcomes, and “no evidence found” from a verified gap. Question answering should
retrieve full turns and later developments, cite evidence, and expose uncertainty.

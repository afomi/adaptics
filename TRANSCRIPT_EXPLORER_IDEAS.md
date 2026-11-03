# Where the transcript explorer could go

2026-10-31 · Brainstorm for iteration, not an implementation commitment.

Companion to [TRANSCRIPT_EXPLORER.md](TRANSCRIPT_EXPLORER.md). The current
explorer already provides source reading, keyword search, prompt embeddings,
related turns, and a Three.js atlas with a time scrubber. The next opportunity
is to move from finding similar messages to understanding the work across them.

The questions driving this:

- What do I keep working on, within a project and across projects?
- Which threads are moving, waiting, finished, or coming back?
- How long and involved is each thread? When did it receive attention?
- What did we ask for, and where is the evidence of an answer or result?
- What should I revisit when returning to a project?

## 1. Themes, threads, and evidence

These deserve different treatment:

| Thing | Example | What it tells us |
|---|---|---|
| Theme | Officials' images | A recurring subject; may contain many independent goals |
| Thread | Get officials' photos working in production | A line of intent with developments, decisions, and possible closure |
| Episode | An evening spent fixing image imports | A period of activity within a thread |
| Turn | One request, the work, and the answer | The basic unit we inspect and cite |
| Evidence | A request, failure, test result, acceptance, or artifact | Why we believe something about a thread |

A theme can contain several threads. A thread can touch several themes and
span sessions. A single turn can participate in several threads. Session
boundaries and cluster boundaries should remain visible without defining all
the meaning.

The embedding example gives us a useful starting point: a message about resizing
headshots retrieves missing production images, a portrait importer, and avatar
sizing from other sessions. Those are related subjects. We still need to decide
whether they belong to one effort, several efforts, or a parent and its subtasks.

Suggestion: let clustering propose themes, let similarity propose thread
membership, and let the reader confirm or correct the grouping. Show a few
representative messages before asking anyone to trust a generated name.

## 2. A project threads page

My preferred next surface is `/transcripts/:project/threads`, linked beside
Sessions and Atlas. It should answer “where are we?” before requiring a tour
through the cloud.

Start with a sortable table and a timeline mode over the same data. A row might
look like this; the values below are illustrative, not measured results:

| Thread | State and evidence | Size | Timing | Suggested follow-up |
|---|---|---|---|---|
| Officials' photos | Verification missing; import was reported complete | 18 unique turns / 4 sessions | Oct 20–27; last seen 4 days ago | Find evidence that images appeared in production |
| Jurisdiction identifiers | Open question about special districts | 12 unique turns / 3 sessions | Three activity episodes | Review boundary versus agency distinction |
| Avatar sizes | Acceptance found for one part | 7 unique turns / 2 sessions | Latest activity Oct 27 | Check whether upload behavior was included |

Useful columns and controls:

- Name, a one-sentence intent, and representative source turns.
- Status, the evidence behind it, and whether it was inferred or confirmed.
- Unique turns, repeated occurrences, sessions, and text volume.
- First mention, latest activity, activity days, and periods of attention.
- Open questions, dependencies, and the last substantive development.
- Filters for theme, state, dates, project, and uncertain membership.
- Sorting by recent activity, first mention, size, recurrence, or unresolved asks.

Prefer a few useful columns initially; the others can live in the expanded row.
The page should also show index freshness and coverage. A missing session or an
unindexed answer can change the apparent status of a thread.

Opening a thread gives a chronological, stitched reader across sessions. Its
header contains intent, current interpretation, last development, and remaining
questions. Each claim links to the original turn. Keep source session dividers,
and offer the surrounding turns when the grouping omitted needed context.

## 3. What “status” can honestly mean

Separate three things that are easy to conflate:

| Dimension | Possible values | Evidence |
|---|---|---|
| Work state | Proposed, underway, waiting, blocked, reported complete, verified complete, unknown | Requests, attempts, dependencies, explicit completion, verification, acceptance |
| Activity | Recent, quiet, resumed after a gap | Message timestamps |
| Confidence in the interpretation | Suggested, evidence reviewed, user confirmed | Provenance and corrections |

“Quiet for two weeks” is an observation. “Abandoned” needs stronger evidence.
“The assistant said done” is different from a user confirming the result or an
observed verification. “Tests passed” may verify one part of a larger request.

Some interesting patterns to surface:

- **Reopened:** a completion claim followed by the same complaint or request.
- **Waiting on a decision:** options were offered and no choice was found.
- **Waiting on another project:** an explicit handoff or dependency was mentioned.
- **Partly complete:** several asks were made and only some have results.
- **Superseded:** a later decision explicitly replaces an earlier approach.
- **Unclear:** there is not enough evidence to assign a useful state.

Each inferred state should have a short explanation, supporting turns, and any
contradicting evidence. A user can correct it. Preserve the history of changes
rather than silently rewriting earlier interpretations.

Workflow messages remain useful here. “Proceed,” “commit and push,” and “check
the inbox” may be poor topic exemplars but important events in a thread's life.
Retain them in the record and cautiously attach them through conversational
context. A message such as “proceed with 1 and 3” should not be assigned to every
topic in the preceding answer.

## 4. Length, timing, and attention

There are several legitimate measures of thread length. Show their units.

| Measure | Why it helps | Limit |
|---|---|---|
| Unique prompts / turns | How much conversation a thread generated | Rewinds and copied prompts inflate occurrence counts |
| Human words and assistant words, separately | How much was asked and explained | Volume does not establish importance or progress |
| Sessions and activity days | How distributed the work was | A session can contain many unrelated threads |
| Calendar span | First to latest mention | Includes nights, interruptions, and unrelated work |
| Activity episodes and return gaps | Whether the thread was sustained or repeatedly revisited | Depends on an explicit grouping rule |
| Observed response intervals | How long recorded exchanges took | Can include unattended agent execution and missing records |
| Tool calls / touched files | How much recorded activity accompanied discussion | Counts say little about quality or completion |

For an optional estimate of attention, group nearby events into episodes using
a visible gap threshold. Try 5, 15, and 30 minutes against real sessions before
choosing a default. Label the result as estimated recorded activity, not human
work hours. Avoid measuring a turn's duration as the time until the next prompt.

Overlapping sessions make totals tricky. For a project total, union overlapping
intervals rather than summing them. For turns assigned to several threads, show
shared membership or an allocation rule; the thread totals may otherwise exceed
the project's total. Unknown timestamps remain unknown.

Interesting views could include “long conversations with little closure,”
“short threads with clear decisions,” and “questions returning every few days.”
These are prompts for investigation, not productivity scores.

## 5. Seeing common themes

Go beyond the biggest cluster. A useful theme card could show:

- A readable name with representative messages and counterexamples.
- Related threads, unresolved asks, and explicit decisions.
- Distinct sessions, activity days, and unique messages supporting the theme.
- A small timeline showing when it was discussed and when it returned.
- Its share of substantive conversation in the selected period.

This would let us distinguish a long pasted specification from a theme that
appears in six separate sessions. Count repeated source occurrences separately
from distinct expressions of an idea.

Possible lenses:

| Lens | Question |
|---|---|
| Recurring | What keeps coming back across sessions? |
| Emerging | What has appeared or grown in the selected period? |
| Persistent | What has stayed present over several periods? |
| Revisited | Which earlier topics have returned after a gap? |
| Adjacent | Which themes often appear in the same turns or episodes? |
| Across projects | Which concerns recur in otherwise different projects? |

Cross-project examples might include image handling, authentication, imports,
agent coordination, interface design, or data quality. These are candidate
categories to examine, not findings already established by the index.

Use a project × theme matrix for comparison. Offer absolute counts and within-
project shares so a large project's transcript volume does not dominate every
comparison. Assess whether the current workflow axis generalizes before using
it across all projects: its subject anchors currently lean toward jurisdictional
and software work.

Theme names and identities need to survive re-clustering. Give confirmed themes
stable identities, retain their exemplars, and propose membership changes on a
new index revision. A cluster number or a PCA coordinate is not a durable ID.

## 6. Asking about gaps

“Gap” needs a reference: a request, goal, checklist, expected outcome, or earlier
promise. An empty area in embedding space alone does not establish missing work.

| Kind of gap | Example question | Evidence to look for |
|---|---|---|
| Unanswered ask | Which of my questions received no substantive answer? | Request, following replies, later revisits |
| Incomplete scope | We asked for four image sizes; which were addressed? | Individual asks mapped to results |
| Missing verification | Did we ever confirm the images appeared in production? | Completion claim plus later observation or acceptance |
| Unclosed decision | Did we choose between these approaches? | Options, explicit choice, later references |
| Unresolved dependency | Which handoffs have no follow-up in the available logs? | Handoff, receiving project, acknowledgment or outcome |
| Repeated problem | What did we call fixed that I reported again? | Earlier closure claim and later complaint |
| Plan versus discussion | Which goals in this supplied plan have no evidence of work? | A chosen reference plan and relevant turns |
| Missing context | Is this thread actually continued in another project? | Cross-project retrieval and explicit references |

A gap result should include the original ask, the best candidate answer or
outcome, what remains uncertain, and a follow-up question. It should make its
search scope visible: projects, dates, indexed material, and whether replies
were inspected.

Prefer “No verification found in the indexed conversations through Oct 31” to
“This was never verified.” The record may omit offline work, another tool, or
the relevant branch of a rewound session.

One possible thread visualization is an evidence row:

`request → proposal → attempt → verification → acceptance`

Show the stages that matter for that thread, supported by clickable turns. A
missing stage is a candidate question, not automatically a defect. A conceptual
discussion may need a decision but no implementation or test run.

## 7. Questions worth supporting

Start with questions we can check manually:

- “What are the recurring themes in jurisdictional over the last two weeks?”
- “What changed in our thinking about officials' photos?”
- “Where did we settle on the image sizes, and was that decision later changed?”
- “Which requests appear to remain open?”
- “What was promised before the handoff, and what happened afterward?”
- “Which threads took several sessions, and what caused them to reopen?”
- “What should I read to resume this project after a week away?”
- “Across projects, where have we already solved a similar problem?”
- “Given this checklist, what has evidence of completion and what is uncertain?”

Useful answer shapes include a sourced explanation, a chronology, a comparison,
or a table of asks and outcomes. The answer should expose the supporting turns
and disagreements instead of giving a single smooth summary that hides them.

Embeddings retrieve candidates. Keyword search supplies exact identifiers and
phrases. The answer process then reads the full turns and adjacent context,
checks later mentions, and produces a cited interpretation. Asking whether a
decision was superseded must search beyond the earliest matching passage.

The current prompt-only, first-2,000-character vectors cannot establish outcomes.
Next indexing experiments could add separate vectors for assistant answers,
long-message chunks, and extracted asks or decisions. Keep their source roles
and offsets. Summaries can help retrieval but should lead back to original text.
Raw tool output can stay out of the default semantic index while selected test,
error, and artifact evidence is available on demand.

## 8. Views over the same project record

| View | What it is good for |
|---|---|
| Thread table | Compare status, size, timing, and unresolved work |
| Thread lanes | See bursts, returns, handoffs, and concurrent work over time |
| Theme matrix / cards | Compare recurring concerns and their supporting threads |
| Existing 3D atlas | Explore semantic neighborhoods and unexpected connections |
| Evidence / gaps view | Review unanswered asks and uncertain closure |
| Stitched reader | Understand one thread in source order |
| Ask view | Pose a question within the selected scope |

The lanes are probably the most useful next visual. Put time horizontally,
threads vertically, and turns at their actual dates. Lightly group nearby turns
into episodes. Leave long pauses visible. A connecting line expresses continuity
of intent, not continuous work during the interval. Selecting an episode opens
its turns and evidence in the reader.

Reuse the atlas's temporal controls, with explicit meanings:

- **Date range:** activity inside a chosen interval.
- **As of:** the state supported by evidence available at a chosen instant.
- **Playback:** move that instant through the record.

An as-of view must not use later completion evidence to label an earlier thread
done. Even names or memberships learned from later conversations should be
identified as retrospective if we use them to organize an earlier view.

In 3D, try coloring by theme or by status, with a mode switch and a clear legend.
Keep time position and semantic position distinguishable. A selected thread can
highlight its points, its gaps in time, and its neighbors. Link the table, lanes,
and cloud through the same selected thread and reader.

Suggested navigation: keep the existing Sessions and Atlas pages, add Threads
with `?view=list` or `?view=timeline`, and open a stable thread detail URL such as
`/transcripts/:project/threads/:thread_id`. Theme and gap filters could initially
be modes within Threads. Separate pages can follow when they earn the space.
Keep selections and filters shareable in the URL. Static subroutes need to be
registered before the existing `/:project/:id` session route.

## 9. A small structure underneath

We can grow this without treating every cluster as a permanent thread:

| Record | Minimum useful contents |
|---|---|
| Source turn | Project, session, prompt UUID when available, display turn number, timestamps, role-aware text, source hash |
| Theme | Stable ID, name, exemplars, proposed and confirmed memberships |
| Thread | Stable ID, intent, scope, member turns, grouping reasons |
| Thread event | Ask, decision, attempt, verification, acceptance, dependency, or correction; source links |
| State observation | State as of a time, evidence, uncertainty, whether user confirmed |
| Index revision | Source coverage, model, input recipe, axis and clustering versions |

Use source UUIDs for durable internal identity where possible; keep `#turn-N`
for today's reader links and remap them after rescans. Branches and rewinds need
explicit handling before claiming a single authoritative sequence. A repeated
prompt can be visually collapsed without deleting its separate source occurrence
or counting it as an independent corroboration.

Corrections deserve persistence outside regenerable embedding caches. Keep
transcripts read-only; record rename, split, merge, membership, and status
corrections locally. Those corrections should survive a new model or reindex.
No automatic edits to project plans or inboxes are needed for this exploration.

Index incrementally in the background and show progress. Visiting a view should
use prepared data; asking a question can explicitly run retrieval and synthesis.
Keep the current local-only boundary and make any future synthesis backend an
explicit choice rather than silently sending transcript content elsewhere.

## 10. An iteration sequence

1. **Make one project's thread candidates reviewable.** Use jurisdictional,
   show proposed groups and their evidence, and let us name, split, merge, or
   reject them. Compare raw and path-reduced embedding inputs on real examples.
2. **Add the table and lanes.** Start with observed counts and dates, plus
   unknown or manually confirmed status. Reuse the reader and temporal lens.
3. **Add evidence events and suggested state.** Inspect replies and local
   context. Surface completion claims, open asks, and later contradictions.
4. **Add scoped questions and gap review.** Begin with unanswered asks and
   missing verification. Return evidence even when a reliable answer is absent.
5. **Compare themes across projects.** Reuse reviewed exemplars and stable IDs;
   validate grouping and workflow filtering on several different projects first.

The smallest useful next slice is a Threads table plus a thread reader, with a
timeline mode immediately behind it. That makes the current embeddings easier
to evaluate and creates a place for status and questions to accumulate.

For evaluation, choose a small hand-reviewed set of real questions: some with
clear answers, some superseded decisions, some multi-part asks, and some whose
answers genuinely cannot be established from the logs. Include noisy URL-heavy
prompts and rewinds. Check whether retrieval finds the needed evidence, whether
citations support the answer, and whether the system admits uncertainty.

We will know this is useful when returning to a project makes it easy to answer:
“Here are the main efforts, here is where each stands in the available record,
and here are the few questions I should resolve next.”

## Choices to revisit as we try it

- Should a confirmed thread span projects, or should cross-project themes link
  separate project threads by default? Start with project threads and offer
  explicit links across projects.
- Which states actually help us? Start with open, waiting, reported complete,
  verified complete, and unknown; add nuance when the evidence warrants it.
- How much automatic grouping feels trustworthy? Start with suggestions and
  representative turns, then preserve the corrections we make.
- Should asking about gaps use a standing project goal? Let the user select or
  supply the reference; keep unconstrained “what is missing?” exploratory.
- What should the home page emphasize? Try recent thread developments and
  unresolved questions beside common themes, instead of leading with volume.

## Current code to build on

- [Transcript parsing and reading](lib/adaptics/transcripts.ex)
- [Embedding cache and topic fitting](lib/adaptics/transcripts/embeddings.ex)
- [Workflow axis](lib/adaptics/transcripts/workflow.ex)
- [Related-turn retrieval](lib/adaptics/transcripts/related.ex)
- [Atlas data](lib/adaptics/transcripts/atlas.ex)
- [Atlas LiveView](lib/adaptics_web/live/transcript_map_live.ex)
- [Three.js atlas](assets/js/transcript_atlas.js)
- [Existing exploration](TRANSCRIPT_EXPLORER.md) and [project threads](PLAN.md)

---
from: adaptics
to: adaptics
created: 2026-10-30
status: pending
summary: Follow-up for /chladni — inverse control (pick where the sand or an object should go; the page searches for the notes that put it there), plus a playable plate with a frequency sweep
---

## Context

`/chladni` (`assets/js/chladni.js`) is a Three.js port of George Savva's genuary-2022 sand piece.
On 2026-10-28 it gained a third mode, **plate**, and a controls panel (story CH1 in PLAN.md, Icebox).

What exists to build on:

- `plateMode(x, y, n, m, sign)` = `cos(nπx)·cos(mπy) + sign·cos(mπx)·cos(nπy)` on the unit square; the sand settles where it is 0.
- `chordField(x, y, f1, f2, f3)` is Savva's field for the auto and explore modes.
- `plateHz(n, m)` gives an audible tone ∝ n² + m², clamped at 3,500 Hz.
- The **shake rule** in `renderChladni` → `shake()`: each grain hops in a random direction by `field · N(0,1) · 0.4 · w · decay · drive · 2(1.5 − w)`, reflecting at the plate edges.
  Grains stall where |field| is small, so they collect on nodal lines.
- The renderer returns `{ settings, setMode, setPlate, mode }`; the page keeps it as `window.chladniField`.
- Tests: `test/js/chladni.test.mjs` covers nodal symmetries, that n = m with − is flat, and that the shake rule converges onto nodal lines.
  `test/adaptics_web/controllers/chladni_page_test.exs` checks every control in the panel.
- The pure functions are exported from `chladni.js`, which imports `three`.
  Before adding search code, move them to `assets/js/chladni_model.js` (as `/business` and `/resonance` do), so the model can be tested without the renderer.

Ryan chose these two directions from the conversation on 2026-10-28.
He did not want the "cancellation is where structure forms" metaphor pursued.

## Request

### Primary — inverse control: "put the sand there"

Today you choose the notes and the sand follows.
Flip it: you choose where the sand (or one object) should go, and the page searches for the notes.
Prior art to read first:

- Zhou et al., *Controlling the motion of multiple objects on a Chladni plate*, Nature Communications (2018), Aalto University.
- Latifi, Wijaya & Zhou, *Motion of heavy particles on a submerged Chladni plate*, PRL (2019).

Verify both citations before relying on them.

One modeling note to check in a test before building on it: the shake rule is a random walk whose step size is ∝ |u|.
For such a walk the steady-state density should be roughly ∝ 1/u², and a grain's expected drift should point toward lower |u|.
Measure this with the existing rule; don't assume it.

Stories, in dependency order (each needs at least one test in `test/js/`):

| # | Story | Test idea |
|---|---|---|
| CH2 | **Aim at a point.** Click the plate; the page ranks the (n, m, ±) modes whose nodal lines pass nearest that point, previews the top few as nodal overlays, and plays the best. | For a point known to be nodal, e.g. any (t, t) with sign −, the best mode has u ≈ 0 there. The ranking is deterministic. |
| CH3 | **Move one object.** Drop a puck (a single heavy grain, drawn larger) and a goal. Each step, the page picks the mode whose predicted displacement best moves the puck toward the goal (greedy, with predictions from Monte Carlo runs of the shake rule), plays it, and shows the chosen sequence as a strip of notes. | With fixed seeds, the puck reaches within ε of the goal in fewer than K steps from several start/goal pairs. A puck that starts at the goal stays there. |
| CH4 | **Move several objects independently.** Two or three pucks, each with its own goal; choose the mode that minimizes the summed distance to the goals (the Aalto 2018 idea). | Two pucks with crossing paths both arrive. The sequence differs from running each puck alone. |
| CH5 | **Draw a target shape.** Paint a mask; search single modes, then short sequences, for the most sand inside it. Show the score. | A mask drawn from a mode's own nodal set picks that mode back. |

### Companion — play the plate

| # | Story | Test idea |
|---|---|---|
| CH6 | **Play it like an instrument.** Keys map to modes (rows = n, columns = m, shift = sign), so playing a melody changes the figure. Hold a key to sustain. | The key → (n, m, sign) mapping is a pure function and round-trips. |
| CH7 | **Sweep through resonance.** One frequency slider instead of n and m. The plate responds strongly only near a mode's frequency (a resonance curve, e.g. a Lorentzian around each `plateHz`), so sweeping makes the figure dissolve and re-form, and the response curve is drawn beside the slider. | The response peaks at each mode's frequency and is low halfway between neighboring modes. |

### Constraints

- Keep auto, explore and plate behaving as they do now; the new work is new modes or panel sections.
- Keep the search code pure and fast, in `chladni_model.js`. The renderer only animates the chosen sequence.
- Follow the repo conventions: one attribute per line in `.heex`, one sentence per line in text, `node --test test/js/*.test.mjs` for model tests.
- Never start the dev server; ask Ryan to (`mix phx.server`, port 4010).

## Open questions for Ryan

1. Is the target a point, an object (a puck) or a drawn shape first?
   I suggest a puck (CH3): it is the clearest "I told it where to go, and it went".
2. Should the search be visible (candidate modes flashing, a sequence strip) or invisible (the puck just goes)?
3. For CH7, should sound be on by default? The sweep is the most musical part.

## Acceptance

- CH2–CH5 (and CH6–CH7 if Ryan wants them) are in PLAN.md as stories under the Icebox `/chladni` entry, or as their own thread, each with a named test.
- The open questions are answered, or recorded in PLAN.md as still open.
- This file has been moved to `.claude/inbox/done/`.

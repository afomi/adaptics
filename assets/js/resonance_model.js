/**
 * /resonance — the model. Pure data + pure functions; resonance.js draws it.
 *
 * A person is a source: a position, a *vision* (an angle on the color wheel)
 * and a *reach* (how far the vision emanates). A goal is a vision that does
 * not move. Where two fields overlap, their visions meet:
 *
 *   overlap(a, b)   how much the fields share space        0..1
 *   alignment(a, b) cos of the angle between the visions   -1..1
 *   resonance(a, b) overlap × alignment                    -1..1
 *
 * Resonant (> 0) pairs attract and feed each other energy; dissonant (< 0)
 * pairs repel and drain it; orthogonal visions coexist without help or harm.
 * Optionally visions drift toward overlapping neighbors (Kuramoto coupling),
 * resisted by each person's stubbornness.
 *
 * Tests: node --test test/js/resonance_model.test.mjs
 */

const TAU = Math.PI * 2;

export const RESONANT = 0.3; // alignment above this reads as resonant
export const DISSONANT = -0.3; // below this, dissonant; between, independent
export const TOUCHING = 0.05; // overlap below this: the fields don't meet

export const DEFAULTS = {
  attract: 1.6, // force per unit resonance (negative resonance repels)
  personalSpace: 0.9, // distance under which people push apart regardless
  goalPull: 1.2, // extra attraction toward aligned goals
  damping: 2.4,
  center: 0.04, // weak pull back toward the middle, so nobody drifts away
  gain: 1.2, // energy target rises this much per unit of resonance
  drain: 1.6, // and falls this much per unit of dissonance
  settle: 0.8, // how fast energy eases toward its target (per second)
  coupling: 0.9, // how fast visions drift toward overlapping neighbors
};

// -- relations ---------------------------------------------------------------

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Gaussian fields: 1 when co-located, ~0.37 at the combined reach. */
export function overlap(a, b) {
  const d = distance(a, b);
  return Math.exp(-(d * d) / (a.reach * a.reach + b.reach * b.reach));
}

export function alignment(a, b) {
  return Math.cos(a.vision - b.vision);
}

export function resonance(a, b) {
  return overlap(a, b) * alignment(a, b);
}

/** "resonant" | "dissonant" | "independent" | "apart" */
export function relation(a, b) {
  if (overlap(a, b) < TOUCHING) return "apart";
  const al = alignment(a, b);
  if (al > RESONANT) return "resonant";
  if (al < DISSONANT) return "dissonant";
  return "independent";
}

/** Every pair whose fields meet, strongest first. */
export function pairs(entities) {
  const out = [];
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i];
      const b = entities[j];
      if (a.kind === "goal" && b.kind === "goal") continue;
      const o = overlap(a, b);
      if (o < TOUCHING) continue;
      out.push({ a: a.id, b: b.id, overlap: o, alignment: alignment(a, b), resonance: o * alignment(a, b), relation: relation(a, b) });
    }
  }
  return out.sort((p, q) => Math.abs(q.resonance) - Math.abs(p.resonance));
}

// -- dynamics ----------------------------------------------------------------

/**
 * Advance the world by dt seconds. `move` turns forces on, `influence` lets
 * visions drift. Goals and the entity being dragged (`held`) stay put.
 * Returns a new array; inputs are not mutated.
 */
export function step(entities, dt, { move = true, influence = false, held = null, params = {} } = {}) {
  const p = { ...DEFAULTS, ...params };
  const next = entities.map((e) => ({ ...e }));

  for (let i = 0; i < next.length; i++) {
    const a = entities[i];
    if (a.kind === "goal") continue;

    let fx = -p.center * a.x;
    let fy = -p.center * a.y;
    let gain = 0;
    let loss = 0;
    let drift = 0;

    for (let j = 0; j < entities.length; j++) {
      if (i === j) continue;
      const b = entities[j];
      const d = Math.max(distance(a, b), 1e-3);
      const ux = (b.x - a.x) / d;
      const uy = (b.y - a.y) / d;
      const o = overlap(a, b);
      const r = o * alignment(a, b);

      let f = p.attract * r;
      if (b.kind === "goal" && r > 0) f += p.goalPull * r;
      if (d < p.personalSpace) f -= (p.personalSpace - d) * 3;
      fx += f * ux;
      fy += f * uy;

      if (r > 0) gain += r;
      else loss -= r;
      drift += o * Math.sin(b.vision - a.vision);
    }

    const e = next[i];
    if (move && a.id !== held) {
      e.vx = (a.vx + fx * dt) * Math.exp(-p.damping * dt);
      e.vy = (a.vy + fy * dt) * Math.exp(-p.damping * dt);
      e.x = a.x + e.vx * dt;
      e.y = a.y + e.vy * dt;
    } else {
      e.vx = 0;
      e.vy = 0;
    }

    // Energy eases toward what the current overlaps support: 1 alone, more
    // with resonance, less with dissonance — so leaving a clash recovers.
    const target = clamp(1 + p.gain * gain - p.drain * loss, 0.2, 2.4);
    e.energy = a.energy + (target - a.energy) * (1 - Math.exp(-p.settle * dt));

    if (influence) {
      e.vision = wrap(a.vision + p.coupling * (1 - a.stubbornness) * drift * dt);
    }
  }

  return next;
}

/**
 * Where each person is turned: toward the resonant others (and goals) that
 * pull on them most, weighted by resonance. null when nothing resonates.
 */
export function heading(entities, id) {
  const a = entities.find((e) => e.id === id);
  let hx = 0;
  let hy = 0;
  for (const b of entities) {
    if (b.id === id) continue;
    const r = resonance(a, b);
    if (r <= 0) continue;
    const d = Math.max(distance(a, b), 1e-3);
    hx += (r * (b.x - a.x)) / d;
    hy += (r * (b.y - a.y)) / d;
  }
  const m = Math.hypot(hx, hy);
  return m < 0.02 ? null : { x: hx / m, y: hy / m, strength: m };
}

// -- reading the field -------------------------------------------------------

/**
 * Whole-field readout: total constructive and destructive resonance across
 * meeting pairs, and coherence — how aligned everyone's visions are
 * (Kuramoto order parameter: 1 = one vision, 0 = spread around the wheel).
 */
export function readout(entities) {
  const all = pairs(entities);
  const people = entities.filter((e) => e.kind === "person");
  const cx = people.reduce((s, e) => s + Math.cos(e.vision), 0);
  const cy = people.reduce((s, e) => s + Math.sin(e.vision), 0);

  return {
    constructive: all.reduce((s, q) => s + Math.max(q.resonance, 0), 0),
    destructive: all.reduce((s, q) => s + Math.max(-q.resonance, 0), 0),
    coherence: people.length ? Math.hypot(cx, cy) / people.length : 0,
    strongest: all.find((q) => q.relation === "resonant") || null,
    strained: all.filter((q) => q.relation === "dissonant").sort((p, q) => p.resonance - q.resonance)[0] || null,
  };
}

// -- building worlds ---------------------------------------------------------

const NAMES = ["Ada", "Bo", "Cy", "Dee", "Eli", "Fen", "Gus", "Hal", "Ivy", "Jo", "Kai", "Lu"];
const GOALS = ["North Star", "Harbor", "Commons", "Summit"];

export function person(id, x, y, vision, overrides = {}) {
  return { id, kind: "person", name: id, x, y, vx: 0, vy: 0, vision: wrap(vision), reach: 2.2, energy: 1, stubbornness: 0.3, ...overrides };
}

export function goal(id, x, y, vision, overrides = {}) {
  return { id, kind: "goal", name: id, x, y, vx: 0, vy: 0, vision: wrap(vision), reach: 3.2, energy: 1, stubbornness: 1, ...overrides };
}

/** The next unused name for a person or goal. */
export function nextName(entities, kind) {
  const pool = kind === "goal" ? GOALS : NAMES;
  const used = new Set(entities.map((e) => e.id));
  return pool.find((n) => !used.has(n)) || `${kind === "goal" ? "Goal" : "P"}${entities.length + 1}`;
}

const deg = (d) => (d * Math.PI) / 180;

/** Guided scenes, in the order they unfold the idea. */
export const SCENES = [
  {
    id: "two",
    title: "Two visions",
    hint: "Each dot is a person. Its color is their vision; its glow is how far that vision reaches. Drag Bo into Ada's field: similar visions glow gold where they overlap, and both grow. Then turn Bo's vision dial.",
    build: () => [person("Ada", -2.6, 0, deg(20)), person("Bo", 2.6, 0.4, deg(50))],
    move: true,
  },
  {
    id: "opposed",
    title: "Opposed",
    hint: "Same two people, opposite visions. The overlap turns red, they push apart and both lose energy. Hold Bo in place by dragging: the strain doesn't go away while they share space.",
    build: () => [person("Ada", -1.4, 0, deg(20)), person("Bo", 1.4, 0.3, deg(200))],
    move: true,
  },
  {
    id: "different",
    title: "Different, not opposed",
    hint: "Visions a quarter-turn apart. They overlap but neither help nor hurt — no pull, no strain. Independent work side by side. Turn either dial toward the other and watch it tip into resonance.",
    build: () => [person("Ada", -1.2, 0, deg(20)), person("Bo", 1.2, 0, deg(110))],
    move: true,
  },
  {
    id: "goal",
    title: "A shared goal",
    hint: "A goal (◆) is a vision that doesn't move. People aligned with it drift in and orbit; Dee sees it differently and is pushed to the edge, losing energy. Turn Dee's dial toward the goal's color.",
    build: () => [
      goal("North Star", 0, 0, deg(40)),
      person("Ada", -3.5, 2, deg(25)),
      person("Bo", 3.4, 2.4, deg(60)),
      person("Cy", -2.8, -3, deg(80)),
      person("Dee", 3, -2.6, deg(230)),
    ],
    move: true,
  },
  {
    id: "team",
    title: "A team",
    hint: "Seven people, two goals. Factions form around what they share. Turn on Influence: visions drift toward their neighbors, and the gold grows — yet whole-team coherence can stay low, because each faction found its own vision. Drag a bridge-builder between them, or raise someone's stubbornness to keep their vision.",
    build: () => [
      goal("North Star", -3, 1.5, deg(30)),
      goal("Harbor", 3.2, -1.2, deg(200)),
      person("Ada", -1, 3, deg(10)),
      person("Bo", 1.5, 3.2, deg(70)),
      person("Cy", -4, -2, deg(140)),
      person("Dee", 0.4, -0.6, deg(185)),
      person("Eli", 4.2, 2, deg(250)),
      person("Fen", -1.6, -3.4, deg(300), { stubbornness: 0.9 }),
      person("Gus", 2.6, -3.6, deg(215)),
    ],
    move: true,
  },
];

// -- small helpers -----------------------------------------------------------

export function wrap(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

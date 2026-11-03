// Pure-model tests for /resonance. Run: node --test test/js/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  overlap,
  alignment,
  resonance,
  relation,
  pairs,
  step,
  heading,
  readout,
  person,
  goal,
  nextName,
  wrap,
  SCENES,
} from "../../assets/js/resonance_model.js";

const deg = (d) => (d * Math.PI) / 180;
const run = (world, seconds, opts) => {
  for (let t = 0; t < seconds; t += 0.02) world = step(world, 0.02, opts);
  return world;
};
const byId = (world, id) => world.find((e) => e.id === id);

test("overlap is 1 when co-located and fades with distance", () => {
  const a = person("A", 0, 0, 0);
  assert.equal(overlap(a, person("B", 0, 0, 0)), 1);
  assert.ok(overlap(a, person("B", 2, 0, 0)) > overlap(a, person("C", 4, 0, 0)));
  assert.ok(overlap(a, person("D", 20, 0, 0)) < 1e-6);
});

test("relation: resonant, dissonant, independent, or apart", () => {
  const a = person("A", 0, 0, deg(0));
  assert.equal(relation(a, person("B", 1, 0, deg(20))), "resonant");
  assert.equal(relation(a, person("B", 1, 0, deg(180))), "dissonant");
  assert.equal(relation(a, person("B", 1, 0, deg(90))), "independent");
  assert.equal(relation(a, person("B", 30, 0, deg(0))), "apart");
  assert.ok(Math.abs(alignment(a, person("B", 0, 0, deg(90)))) < 1e-9);
});

test("resonant people move together and gain energy", () => {
  let world = [person("A", -2, 0, deg(10)), person("B", 2, 0, deg(30))];
  const before = Math.abs(world[0].x - world[1].x);
  world = run(world, 4);
  assert.ok(Math.abs(byId(world, "A").x - byId(world, "B").x) < before);
  assert.ok(byId(world, "A").energy > 1);
});

test("dissonant people push apart and lose energy, then recover once apart", () => {
  let world = [person("A", -1, 0, deg(0)), person("B", 1, 0, deg(180))];
  world = run(world, 1);
  assert.ok(Math.abs(byId(world, "A").x - byId(world, "B").x) > 2);
  const drained = byId(world, "B").energy;
  assert.ok(drained < 1);
  world = run(world, 12);
  assert.ok(byId(world, "B").energy > drained);
});

test("orthogonal visions neither attract nor drain", () => {
  let world = [person("A", -1.5, 0, deg(0)), person("B", 1.5, 0, deg(90))];
  world = run(world, 2, { params: { center: 0 } });
  assert.ok(Math.abs(byId(world, "A").x - -1.5) < 0.05);
  assert.ok(Math.abs(byId(world, "A").energy - 1) < 0.01);
});

test("goals and the held person stay put", () => {
  let world = [goal("G", 0, 0, deg(0)), person("A", 2, 0, deg(0)), person("B", -2, 0, deg(0))];
  world = run(world, 2, { held: "B" });
  assert.deepEqual([byId(world, "G").x, byId(world, "G").y], [0, 0]);
  assert.equal(byId(world, "B").x, -2);
  assert.ok(byId(world, "A").x < 2);
});

test("with influence, visions converge — unless stubborn", () => {
  const start = [
    person("A", -0.8, 0, deg(0)),
    person("B", 0.8, 0, deg(80)),
    person("C", 0, 1, deg(140), { stubbornness: 1 }),
  ];
  const still = run(start, 6, { move: false });
  const drifted = run(start, 6, { move: false, influence: true });

  assert.equal(readout(still).coherence, readout(start).coherence);
  assert.ok(readout(drifted).coherence > readout(start).coherence);
  assert.ok(Math.abs(byId(drifted, "C").vision - deg(140)) < 1e-9); // fully stubborn: unchanged
});

test("heading points at the strongest resonance, or nowhere", () => {
  const world = [person("A", 0, 0, deg(0)), person("B", 1, 0, deg(10)), person("C", -1, 0, deg(180))];
  const h = heading(world, "A");
  assert.ok(h.x > 0.99);
  assert.equal(heading([person("A", 0, 0, 0), person("B", 1, 0, deg(180))], "A"), null);
});

test("readout sums constructive and destructive resonance", () => {
  const world = [person("A", 0, 0, deg(0)), person("B", 1, 0, deg(0)), person("C", 0, 1, deg(180))];
  const r = readout(world);
  assert.ok(Math.abs(r.constructive - resonance(world[0], world[1])) < 1e-9);
  assert.ok(r.destructive > 0);
  assert.equal(r.strongest.relation, "resonant");
  assert.equal(r.strained.relation, "dissonant");
  assert.equal(pairs(world).length, 3);
});

test("scene ids match the page's buttons (resonance.html.heex)", () => {
  assert.deepEqual(SCENES.map((s) => s.id), ["two", "opposed", "different", "goal", "team"]);
});

test("scenes build valid worlds with unique ids", () => {
  for (const scene of SCENES) {
    const world = scene.build();
    assert.equal(new Set(world.map((e) => e.id)).size, world.length, scene.id);
    assert.ok(world.every((e) => e.vision >= 0 && e.vision < Math.PI * 2), scene.id);
    assert.ok(scene.hint.length > 40, scene.id);
  }
});

test("names and angles", () => {
  assert.equal(nextName([person("Ada", 0, 0, 0)], "person"), "Bo");
  assert.equal(nextName([], "goal"), "North Star");
  assert.ok(Math.abs(wrap(-Math.PI / 2) - (3 * Math.PI) / 2) < 1e-12);
});

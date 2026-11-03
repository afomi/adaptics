// Pure-model tests for /ui-map. Run: node --test test/js/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, NODES, QUALITIES, validate, composition, reach, usedBy, emergence } from "../../assets/js/ui_map_model.js";

test("the map is sound: known ids, nothing uses a higher layer, no cycles, no orphans", () => {
  assert.deepEqual(validate(), []);
});

test("validate catches upward uses, cycles and unknown ids", () => {
  const bad = [
    { id: "a", level: 0, uses: ["b"] },
    { id: "b", level: 1, uses: ["c"] },
    { id: "c", level: 1, uses: ["b"] },
    { id: "d", level: 2, uses: ["nope"] },
  ];
  const problems = validate(bad).join("\n");
  assert.match(problems, /a \(L0\) uses higher b/);
  assert.match(problems, /b is in a cycle/);
  assert.match(problems, /d uses unknown nope/);
});

test("every layer has pieces, and qualities span real layers", () => {
  for (const l of LEVELS) assert.ok(NODES.some((n) => n.level === l.id), l.name);
  for (const q of QUALITIES) assert.ok(q.from >= 0 && q.to < LEVELS.length && q.from <= q.to, q.id);
});

test("composition goes down, reach goes up", () => {
  assert.ok(composition("accordion").has("details"));
  assert.ok(composition("accordion").has("dom"));
  assert.ok(reach("button").has("delete"));
  assert.ok(reach("button").has("competence"));
  assert.ok(usedBy("details").includes("accordion-item"));
  assert.ok(!composition("button").has("accordion"));
});

test("unfolding reveals keystones layer by layer", () => {
  const low = emergence(1);
  assert.deepEqual(low.layers.map((l) => l.name), ["Substrate", "Elements"]);
  assert.ok(low.nodes < emergence().nodes);
  // what emerges across the whole pyramid (pins the current map; update with the data)
  const all = emergence();
  assert.equal(all.keystones.find((k) => k.level === 1).label, "Button");
  assert.equal(all.reused[0].label, "Accessibility tree");
  assert.ok(all.lateral.some((x) => x.from === "master-detail" && x.to === "collection"));
});

// Physics checks for /chladni. Run: node --test test/js/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { plateMode, chordField, plateHz } from "../../assets/js/chladni.js";

test("plate modes: the − family is nodal along the diagonal, the + family along the anti-diagonal", () => {
  for (const [n, m] of [[1, 2], [3, 5], [2, 7]]) {
    for (const t of [0.1, 0.37, 0.8]) {
      assert.ok(Math.abs(plateMode(t, t, n, m, -1)) < 1e-12);
      if ((n + m) % 2 === 1) assert.ok(Math.abs(plateMode(t, 1 - t, n, m, 1)) < 1e-12);
    }
  }
});

test("n = m with the − sign is flat (no pattern); swapping n and m mirrors the figure", () => {
  assert.ok(Math.abs(plateMode(0.3, 0.6, 4, 4, -1)) < 1e-12);
  assert.ok(Math.abs(plateMode(0.2, 0.7, 3, 5, 1) - plateMode(0.7, 0.2, 3, 5, 1)) < 1e-12);
});

test("plate tone grows with n² + m² and is clamped", () => {
  assert.ok(plateHz(1, 2) < plateHz(3, 5));
  assert.equal(plateHz(16, 16), 3500);
});

test("the shake rule drives sand onto the nodal lines", () => {
  // same rule as the page: hop ∝ local amplitude, random direction, reflect at edges
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const grains = Array.from({ length: 4000 }, () => [rand(), rand(), rand()]);
  const meanAmp = () => grains.reduce((s, [x, y]) => s + Math.abs(plateMode(x, y, 3, 5, -1)), 0) / grains.length;

  const before = meanAmp();
  for (let step = 0; step < 300; step++) {
    for (const g of grains) {
      const [x, y, w] = g;
      const a = plateMode(x, y, 3, 5, -1) * 0.5 * (rand() * 2 - 1) * 0.4 * w;
      const th = rand() * 2 * Math.PI;
      let nx = x + Math.sin(th) * 2 * a * (1.5 - w);
      let ny = y + Math.cos(th) * 2 * a * (1.5 - w);
      nx = nx < 0 ? -nx : nx > 1 ? 2 - nx : nx;
      ny = ny < 0 ? -ny : ny > 1 ? 2 - ny : ny;
      g[0] = nx; g[1] = ny;
    }
  }
  const after = meanAmp();
  assert.ok(after < before * 0.5, `mean |u| ${before.toFixed(3)} → ${after.toFixed(3)}`);
});

test("chord field (Savva) vanishes on the plate's edges", () => {
  for (const t of [0, 0.25, 1]) assert.ok(Math.abs(chordField(t, 0, 3, 10, 9)) < 1e-12);
});

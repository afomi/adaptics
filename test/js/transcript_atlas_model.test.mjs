import { test } from "node:test";
import assert from "node:assert/strict";
import { position, revealed, timeExtent, timeBins } from "../../assets/js/transcript_atlas_model.js";

const points = [
  { at: 100, position: [-0.2, 0.5, 0.7] },
  { at: 200, position: [0.4, -0.8, 0.1] },
  { at: null, position: [0, 0, 0] }
];

test("scrubbing reveals messages without changing their coordinates", () => {
  const before = points.map(p => position(p, "semantic", timeExtent(points)));
  assert.deepEqual(points.map(p => revealed(p, 150)), [true, false, true]);
  assert.deepEqual(points.map(p => position(p, "semantic", timeExtent(points))), before);
  assert.deepEqual(position(points[0], "time", [100, 200]), [-0.2, -1, 0.7]);
  assert.deepEqual(position(points[1], "time", [100, 200]), [0.4, 1, 0.1]);
});

test("time extents and density handle missing dates, one instant, and both boundaries", () => {
  assert.deepEqual(timeExtent(points), [100, 200]);
  assert.deepEqual(timeBins(points, 2), [1, 1]);
  assert.deepEqual(timeExtent([]), [0, 0]);
  assert.deepEqual(timeBins([{ at: 100 }], 2), [1, 0]);
  assert.deepEqual(position(points[0], "time", [100, 100]), [-0.2, 0, 0.7]);
  assert.deepEqual(position(points[2], "time", [100, 200]), [0, 0, 0]);
});

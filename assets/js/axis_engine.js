// AxisEngine — FC2.3
// Client half of the axis layout system. The server (Adaptics.Projections.Axis)
// resolves a Projection's layout into per-node VALUES and DOMAINS; this module
// maps values to pixels, generates ticks, applies jitter, and tweens positions.
// Deliberately dependency-free (no d3) to match canvas_hook's hand-rolled SVG.

export const MARGIN = { top: 60, right: 60, bottom: 60, left: 80 };

// Deterministic per-id jitter in [-1, 1] so re-renders don't shuffle nodes.
function jitterFor(id, salt) {
  const x = Math.sin((Number(id) + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function makeScale(axis, rangeStart, rangeEnd) {
  const domain = axis.domain || [];

  if (axis.scale === "ordinal") {
    const n = Math.max(domain.length, 1);
    const band = (rangeEnd - rangeStart) / n;
    const index = new Map(domain.map((v, i) => [v, i]));
    return (value) => {
      const i = index.has(value) ? index.get(value) : 0;
      return rangeStart + (i + 0.5) * band;
    };
  }

  // linear / time: numeric domain
  let [min, max] = domain.length === 2 ? domain : [0, 1];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return (value) => rangeStart + ((value - min) / (max - min)) * (rangeEnd - rangeStart);
}

function niceTicks(min, max, count = 5) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = (span / count) / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const niceStep = step * mult;
  const start = Math.ceil(min / niceStep) * niceStep;
  const ticks = [];
  for (let v = start; v <= max + niceStep / 1e6; v += niceStep) {
    ticks.push(Math.round(v / niceStep) * niceStep);
  }
  return ticks;
}

function formatTick(value, scale) {
  if (scale === "time") {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (Math.abs(value) >= 1000) return value.toLocaleString();
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export const AxisEngine = {
  // Tick marks for one resolved axis: [{value, label}] with value in domain units.
  ticks(axis) {
    const domain = axis.domain || [];
    if (axis.scale === "ordinal") {
      return domain.map((v) => ({ value: v, label: String(v) }));
    }
    if (domain.length < 2) return [];
    return niceTicks(domain[0], domain[1]).map((v) => ({
      value: v,
      label: formatTick(v, axis.scale),
    }));
  },

  // Pixel positions for every node under a resolved axes/semantic layout.
  // Returns { placed: Map(id -> {x, y}), unplaced: [id] } where x/y are the
  // node CENTER in SVG coordinates. Nodes lacking a value on either axis are
  // unplaced (the caller parks them dimmed at the margin).
  targets(resolved, viewport) {
    const { width, height } = viewport;
    const xScale = makeScale(resolved.x, MARGIN.left, width - MARGIN.right);
    // SVG y grows downward; domain grows upward.
    const yScale = makeScale(resolved.y, height - MARGIN.bottom, MARGIN.top);

    const placed = new Map();
    const unplaced = [];

    for (const id of viewport.nodeIds) {
      const key = String(id);
      const xv = resolved.x.values[key];
      const yv = resolved.y.values[key];
      if (xv === undefined || yv === undefined) {
        unplaced.push(id);
        continue;
      }
      const jx = (resolved.x.jitter || 0) * jitterFor(id, 1);
      const jy = (resolved.y.jitter || 0) * jitterFor(id, 2);
      placed.set(id, { x: xScale(xv) + jx, y: yScale(yv) + jy });
    }

    return { placed, unplaced, xScale, yScale };
  },

  // rAF tween from each node's current x/y to targets. Calls onFrame() every
  // frame after mutating node.x/y, and onDone() at the end. Returns a cancel fn.
  tween(nodes, targetsById, { duration = 600, onFrame, onDone } = {}) {
    const start = performance.now();
    const from = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    let cancelled = false;

    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function frame(now) {
      if (cancelled) return;
      const t = Math.min((now - start) / duration, 1);
      const e = ease(t);
      for (const n of nodes) {
        const target = targetsById.get(n.id);
        if (!target) continue;
        const f = from.get(n.id);
        n.x = f.x + (target.x - f.x) * e;
        n.y = f.y + (target.y - f.y) * e;
      }
      if (onFrame) onFrame(t);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else if (onDone) {
        onDone();
      }
    }

    requestAnimationFrame(frame);
    return () => {
      cancelled = true;
    };
  },
};

// Loopy-style causal feedback simulation of the 2025–2026 US tariff cycle.
// Nodes are stocks (0..1); arrows carry +/- polarity; clicking a node's top or
// bottom half injects an up/down pulse that propagates with decay, Nicky
// Case's LOOPY interaction model.

const INK = "#0b0b0b";
const INK_SECONDARY = "#52514e";
const INK_MUTED = "#898781";
const ARROW = "#c3c2b7";
const SURFACE = "#fcfcfb";
const POLARITY_UP = "#2a78d6"; // diverging cool pole: increase / "+"
const POLARITY_DOWN = "#e34948"; // diverging warm pole: decrease / "−"

const TYPE_COLORS = {
  policy: "#2a78d6",
  market: "#eb6834",
  household: "#1baf7a",
  legal: "#eda100",
};

const NODES = [
  { id: "tariff", label: "Tariff Rate", sub: "IEEPA duties, Apr 2025", type: "policy", x: 0.11, y: 0.20 },
  { id: "imports", label: "Import Costs", sub: "paid at the border", type: "market", x: 0.34, y: 0.12 },
  { id: "treasury", label: "Treasury Revenue", sub: "$168B / 330k importers", type: "policy", x: 0.62, y: 0.10 },
  { id: "prices", label: "Consumer Prices", sub: "shelf prices", type: "market", x: 0.47, y: 0.38 },
  { id: "households", label: "Household Budgets", sub: "≈ −$2,500 / family / yr", type: "household", x: 0.78, y: 0.38 },
  { id: "demand", label: "Consumer Demand", sub: "store traffic", type: "household", x: 0.85, y: 0.70 },
  { id: "margins", label: "Retailer Margins", sub: "Walmart, Target, TJX…", type: "market", x: 0.60, y: 0.85 },
  { id: "refunds", label: "Importer Refunds", sub: "$2.9B → Walmart, Aug 2026", type: "policy", x: 0.36, y: 0.68 },
  { id: "rollbacks", label: "Price Rollbacks", sub: "11,000 items, temporary", type: "market", x: 0.30, y: 0.44 },
  { id: "pushback", label: "Legal + Political Pushback", sub: "suits, elections", type: "legal", x: 0.14, y: 0.50 },
  { id: "scotus", label: "Court Rulings", sub: "SCOTUS, Feb 2026", type: "legal", x: 0.13, y: 0.80 },
];

// polarity: +1 same-direction influence, -1 inverse. curve bows the arrow
// perpendicular to its chord. inactive links draw dashed and drop pulses
// (the proposed-but-unenacted consumer rebate).
const LINKS = [
  { from: "tariff", to: "imports", polarity: +1, curve: 20 },
  { from: "imports", to: "treasury", polarity: +1, curve: 24 },
  { from: "imports", to: "prices", polarity: +1, curve: -14 },
  { from: "imports", to: "margins", polarity: -1, curve: -170 },
  { from: "prices", to: "households", polarity: -1, curve: 20 },
  { from: "households", to: "demand", polarity: +1, curve: 30 },
  { from: "demand", to: "margins", polarity: +1, curve: 30 },
  { from: "prices", to: "pushback", polarity: +1, curve: 22 },
  { from: "pushback", to: "scotus", polarity: +1, curve: 24 },
  { from: "scotus", to: "tariff", polarity: -1, curve: 26 },
  { from: "scotus", to: "refunds", polarity: +1, curve: 26 },
  { from: "treasury", to: "refunds", polarity: +1, curve: -120 },
  { from: "refunds", to: "margins", polarity: +1, curve: 24 },
  { from: "margins", to: "rollbacks", polarity: +1, curve: 40 },
  { from: "rollbacks", to: "prices", polarity: -1, curve: 16 },
  { from: "refunds", to: "households", polarity: +1, curve: -60, inactive: true, note: "H.R. 7865 — proposed" },
];

const BUMP = 0.3;
const DECAY = 0.72;
const MIN_STRENGTH = 0.1;
const PULSE_SPEED = 170; // px per second along the arc

export function renderTariffLoop(containerId) {
  const container = document.getElementById(containerId);
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const nodes = NODES.map((n) => ({ ...n, value: 0.5, flash: 0, phase: Math.random() * Math.PI * 2 }));
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const links = LINKS.map((l) => ({ ...l, active: !l.inactive }));
  let pulses = [];
  let hovered = null;
  let hoverHalf = null;
  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
  }
  resize();
  window.addEventListener("resize", resize);

  const px = (n) => ({ x: n.x * width, y: n.y * height });
  const baseRadius = () => Math.min(width, height) * 0.048;
  const radius = (n, t) =>
    baseRadius() * (0.62 + 0.75 * n.value) + Math.sin(t * 1.7 + n.phase) * 1.2 + n.flash * 5;

  function arcPoints(link) {
    const a = px(nodeById[link.from]);
    const b = px(nodeById[link.to]);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const cp = { x: mx - (dy / len) * link.curve, y: my + (dx / len) * link.curve };
    return { a, b, cp, len };
  }

  const bezier = (p, t) => {
    const u = 1 - t;
    return {
      x: u * u * p.a.x + 2 * u * t * p.cp.x + t * t * p.b.x,
      y: u * u * p.a.y + 2 * u * t * p.cp.y + t * t * p.b.y,
    };
  };

  function emit(fromId, sign, strength) {
    if (strength < MIN_STRENGTH) return;
    for (const l of links) {
      if (l.from === fromId && l.active) {
        pulses.push({ link: l, t: 0, sign, strength });
      }
    }
  }

  function bump(node, sign, strength) {
    node.value = Math.min(1, Math.max(0, node.value + sign * BUMP * strength));
    node.flash = 1;
  }

  function inject(nodeId, sign) {
    const n = nodeById[nodeId];
    if (!n) return;
    bump(n, sign, 1);
    emit(nodeId, sign, 1);
  }

  function reset() {
    pulses = [];
    for (const n of nodes) {
      n.value = 0.5;
      n.flash = 0;
    }
  }

  function setRebate(on) {
    const l = links.find((x) => x.note);
    if (l) l.active = on;
  }

  function step(dt) {
    const arrived = [];
    for (const p of pulses) {
      const geom = arcPoints(p.link);
      p.t += (PULSE_SPEED / geom.len) * dt;
      if (p.t >= 1) arrived.push(p);
    }
    pulses = pulses.filter((p) => p.t < 1);
    for (const p of arrived) {
      const target = nodeById[p.link.to];
      const outSign = p.sign * p.link.polarity;
      bump(target, outSign, p.strength);
      emit(target.id, outSign, p.strength * DECAY);
    }
    for (const n of nodes) n.flash = Math.max(0, n.flash - dt * 2.5);
  }

  function drawLink(l, t) {
    const geom = arcPoints(l);
    const from = nodeById[l.from];
    const to = nodeById[l.to];
    const r0 = radius(from, t);
    const r1 = radius(to, t) + 6;
    const t0 = Math.min(0.4, r0 / geom.len);
    const t1 = 1 - Math.min(0.4, r1 / geom.len);
    ctx.strokeStyle = l.active ? ARROW : "#e1e0d9";
    ctx.lineWidth = 2;
    ctx.setLineDash(l.active ? [] : [6, 6]);
    ctx.beginPath();
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const pt = bezier(geom, t0 + ((t1 - t0) * i) / steps);
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const tip = bezier(geom, t1);
    const before = bezier(geom, t1 - 0.03);
    const ang = Math.atan2(tip.y - before.y, tip.x - before.x);
    ctx.fillStyle = l.active ? ARROW : "#e1e0d9";
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x - 11 * Math.cos(ang - 0.44), tip.y - 11 * Math.sin(ang - 0.44));
    ctx.lineTo(tip.x - 11 * Math.cos(ang + 0.44), tip.y - 11 * Math.sin(ang + 0.44));
    ctx.closePath();
    ctx.fill();

    const mid = bezier(geom, 0.5);
    const col = l.polarity > 0 ? POLARITY_UP : POLARITY_DOWN;
    ctx.fillStyle = SURFACE;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.font = "700 13px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(l.polarity > 0 ? "+" : "−", mid.x, mid.y + 0.5);
    if (l.note) {
      ctx.fillStyle = INK_MUTED;
      ctx.font = "italic 11px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.fillText(l.active ? "enacted!" : l.note, mid.x, mid.y + 22);
    }
  }

  function drawPulse(p) {
    const geom = arcPoints(p.link);
    const pt = bezier(geom, p.t);
    const col = p.sign > 0 ? POLARITY_UP : POLARITY_DOWN;
    const s = 5 + 6 * p.strength;
    ctx.fillStyle = col;
    ctx.beginPath();
    if (p.sign > 0) {
      ctx.moveTo(pt.x, pt.y - s);
      ctx.lineTo(pt.x - s * 0.85, pt.y + s * 0.7);
      ctx.lineTo(pt.x + s * 0.85, pt.y + s * 0.7);
    } else {
      ctx.moveTo(pt.x, pt.y + s);
      ctx.lineTo(pt.x - s * 0.85, pt.y - s * 0.7);
      ctx.lineTo(pt.x + s * 0.85, pt.y - s * 0.7);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawNode(n, t) {
    const c = px(n);
    const r = radius(n, t);
    const col = TYPE_COLORS[n.type];
    ctx.fillStyle = col + "26";
    ctx.strokeStyle = col;
    ctx.lineWidth = n === hovered ? 3 : 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (n.flash > 0) {
      ctx.strokeStyle = col + Math.floor(n.flash * 160).toString(16).padStart(2, "0");
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r + 6 + (1 - n.flash) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = INK;
    ctx.font = "600 13px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const words = n.label.split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > 12 && line) {
        lines.push(line);
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
    }
    lines.push(line);
    lines.forEach((ln, i) => {
      ctx.fillText(ln, c.x, c.y + (i - (lines.length - 1) / 2) * 15);
    });
    ctx.fillStyle = INK_SECONDARY;
    ctx.font = "11px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(n.sub, c.x, c.y + r + 14);

    if (n === hovered) {
      ctx.font = "700 15px system-ui, -apple-system, 'Segoe UI', sans-serif";
      ctx.fillStyle = hoverHalf === "up" ? POLARITY_UP : INK_MUTED + "88";
      ctx.fillText("▲", c.x, c.y - r - 14);
      ctx.fillStyle = hoverHalf === "down" ? POLARITY_DOWN : INK_MUTED + "88";
      ctx.fillText("▼", c.x, c.y + r + 30);
    }
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const l of links) drawLink(l, t);
    for (const p of pulses) drawPulse(p);
    for (const n of nodes) drawNode(n, t);
  }

  function hitTest(mx, my, t) {
    for (const n of nodes) {
      const c = px(n);
      if (Math.hypot(mx - c.x, my - c.y) <= radius(n, t) + 6) return n;
    }
    return null;
  }

  let mouse = { x: -1, y: -1 };
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });
  canvas.addEventListener("mouseleave", () => {
    mouse = { x: -1, y: -1 };
  });
  canvas.addEventListener("click", () => {
    if (!hovered) return;
    inject(hovered.id, hoverHalf === "up" ? +1 : -1);
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    step(dt);
    hovered = hitTest(mouse.x, mouse.y, t);
    hoverHalf = hovered && mouse.y < px(hovered).y ? "up" : "down";
    canvas.style.cursor = hovered ? "pointer" : "default";
    draw(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { inject, reset, setRebate };
}

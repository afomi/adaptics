// Factor: an expression like 3^8 is expanded into its factors, then reduced
// pairwise into a tree of product boxes ("3 × 3 | 9" → "9 × 9 | 81"), after
// the whiteboard sketch. Boxes are draggable and their arrows follow; dropping
// one open box onto another multiplies them. Strategies compare the shape of
// the same computation: balanced (log depth), chain (left fold), shared (a DAG
// that reuses identical products, i.e. repeated squaring).

import * as d3 from "d3";

const INK = "#1b1b1b";
const INK_MUTED = "#898781";
const RESULT_FILL = "#e9e9e7";
const BOX_FILL = "#ffffff";
const HIGHLIGHT = "#2a78d6";
const FONT = "22px 'Patrick Hand', system-ui, sans-serif";

const BOX_H = 44;
const PAD = 14;
const ROW_GAP = 110;
const LEAF_GAP = 26;
const MAX_LEAVES = 64;
const MAX_FACTORIZE = 10n ** 12n;

// ---------- parsing ----------

// "3^8" → [3n × 8], "2^3 x 5" → [2n,2n,2n,5n], "360" → prime factors.
export function parseExpression(text) {
  const src = String(text).trim();
  if (!src) throw new Error("enter an expression, e.g. 3^8");

  const terms = src.split(/\s*(?:x|×|\*|·)\s*/i).filter(Boolean);

  if (terms.length === 1 && /^\d+$/.test(terms[0])) {
    const n = BigInt(terms[0]);
    if (n < 2n) throw new Error("pick a number ≥ 2");
    if (n > MAX_FACTORIZE) throw new Error("too large to factor here (max 10^12)");
    return primeFactors(n);
  }

  const leaves = [];
  for (const term of terms) {
    const m = term.match(/^(\d+)(?:\s*\^\s*(\d+))?$/);
    if (!m) throw new Error(`can't read “${term}”`);
    const base = BigInt(m[1]);
    const exp = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < exp; i++) leaves.push(base);
    if (leaves.length > MAX_LEAVES) throw new Error(`at most ${MAX_LEAVES} factors`);
  }
  if (leaves.length === 0) throw new Error("nothing to multiply");
  return leaves;
}

function primeFactors(n) {
  const out = [];
  let d = 2n;
  while (d * d <= n) {
    while (n % d === 0n) {
      out.push(d);
      n /= d;
    }
    d += d === 2n ? 1n : 2n;
  }
  if (n > 1n) out.push(n);
  return out;
}

// ---------- graph construction ----------

// Returns { nodes, edges }. nodes: {id, value, kind, level, a, b}; edges:
// {from, to, slot} where slot 0/1 is the left/right operand.
export function buildGraph(leafValues, strategy) {
  const nodes = [];
  const edges = [];
  const edgeKeys = new Set();
  let seq = 0;

  const leaf = (value) => {
    const node = { id: `n${seq++}`, value, kind: "leaf", level: 0 };
    nodes.push(node);
    return node;
  };
  const edge = (from, to, slot) => {
    const key = `${from.id}>${to.id}#${slot}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from: from.id, to: to.id, slot });
  };
  const memo = new Map();
  const product = (a, b, level, share) => {
    const key = `${a.value}×${b.value}`;
    let node = share ? memo.get(key) : null;
    if (!node) {
      node = { id: `n${seq++}`, value: a.value * b.value, kind: "product", level, a: a.value, b: b.value };
      nodes.push(node);
      if (share) memo.set(key, node);
    }
    edge(a, node, 0);
    edge(b, node, 1);
    return node;
  };

  const leaves = leafValues.map(leaf);

  if (strategy === "chain") {
    let acc = leaves[0];
    for (let i = 1; i < leaves.length; i++) acc = product(acc, leaves[i], i, false);
  } else if (strategy === "balanced" || strategy === "shared") {
    const share = strategy === "shared";
    let current = leaves;
    let level = 1;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        if (i + 1 < current.length) next.push(product(current[i], current[i + 1], level, share));
        else next.push(current[i]); // odd one out carries down
      }
      current = next;
      level++;
    }
  }
  // "manual": leaves only — the user composes by dropping boxes on each other.

  return { nodes, edges, makeProduct: (a, b) => product(a, b, Math.max(a.level, b.level) + 1, false) };
}

// ---------- rendering ----------

const measureCtx = document.createElement("canvas").getContext("2d");
function textWidth(s) {
  measureCtx.font = FONT;
  return measureCtx.measureText(s).width;
}

function sizeNode(node) {
  if (node.kind === "leaf") {
    node.leftText = String(node.value);
    node.leftW = textWidth(node.leftText) + PAD * 2;
    node.rightW = 0;
  } else {
    node.leftText = `${node.a} × ${node.b}`;
    node.rightText = String(node.value);
    node.leftW = textWidth(node.leftText) + PAD * 2;
    node.rightW = textWidth(node.rightText) + PAD * 2;
  }
  node.w = node.leftW + node.rightW;
  node.h = BOX_H;
}

function layout(graph) {
  const { nodes, edges } = graph;
  nodes.forEach(sizeNode);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const incoming = d3.group(edges, (e) => e.to);

  // leaves in a row, products centered under their operands
  let x = 0;
  for (const n of nodes.filter((n) => n.kind === "leaf")) {
    n.x = x + n.w / 2;
    x += n.w + LEAF_GAP;
  }
  for (const n of nodes.filter((n) => n.kind === "product")) {
    const ins = incoming.get(n.id) || [];
    n.x = d3.mean(ins, (e) => byId.get(e.from).x);
  }
  for (const n of nodes) n.y = n.level * ROW_GAP;

  // push apart overlaps within each row
  for (const row of d3.group(nodes, (n) => n.level).values()) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++) {
      const min = row[i - 1].x + row[i - 1].w / 2 + LEAF_GAP + row[i].w / 2;
      if (row[i].x < min) row[i].x = min;
    }
  }
}

// Straight arrow from the bottom of `s` into the top of `t`, landing offset
// toward the source (the sketch's arrows meet the box at different points).
// Two edges between the same pair (shared a×a) bow apart.
function arrowPath(s, t, bow) {
  const sx = s.x;
  const sy = s.y + s.h / 2;
  const reach = t.w / 2 - 12;
  const tx = t.x + Math.max(-reach, Math.min(reach, (s.x - t.x) * 0.45 + bow * 0.4));
  const ty = t.y - t.h / 2 - 3;
  if (!bow) return `M${sx},${sy}L${tx},${ty}`;
  const mx = (sx + tx) / 2 + bow;
  const my = (sy + ty) / 2;
  return `M${sx},${sy}Q${mx},${my} ${tx},${ty}`;
}

export function renderFactor(containerId, ui) {
  const container = document.getElementById(containerId);
  const input = document.getElementById(ui.input);
  const errorEl = document.getElementById(ui.error);
  const statsEl = document.getElementById(ui.stats);
  const strategyButtons = document.querySelectorAll(`[data-${ui.strategyAttr}]`);

  const svg = d3.select(container).append("svg").attr("width", "100%").attr("height", "100%");

  svg
    .append("defs")
    .append("marker")
    .attr("id", "factor-arrow")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 8)
    .attr("refY", 5)
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("orient", "auto-start-reverse")
    .append("path")
    .attr("d", "M1,1L9,5L1,9")
    .attr("fill", "none")
    .attr("stroke", "context-stroke")
    .attr("stroke-width", 1.6);

  const viewport = svg.append("g");
  const edgeLayer = viewport.append("g");
  const sepLayer = viewport.append("g");
  const nodeLayer = viewport.append("g");

  const zoom = d3.zoom().scaleExtent([0.2, 4]).on("zoom", (e) => viewport.attr("transform", e.transform));
  svg.call(zoom).on("dblclick.zoom", null);

  let strategy = "balanced";
  let leafValues = [];
  let graph = null;
  let history = []; // manual combines, for undo

  function byId() {
    return new Map(graph.nodes.map((n) => [n.id, n]));
  }

  function openNodes() {
    const consumed = new Set(graph.edges.map((e) => e.from));
    return graph.nodes.filter((n) => !consumed.has(n.id));
  }

  function lineage(id) {
    const ids = new Set([id]);
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      for (const e of graph.edges) {
        if (e.to === cur && !ids.has(e.from)) {
          ids.add(e.from);
          stack.push(e.from);
        }
      }
    }
    return ids;
  }

  function redrawEdges() {
    const lookup = byId();
    const pairCount = d3.rollup(graph.edges, (v) => v.length, (e) => `${e.from}>${e.to}`);
    edgeLayer
      .selectAll("path.edge")
      .data(graph.edges, (e) => `${e.from}>${e.to}#${e.slot}`)
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "edge")
          .attr("fill", "none")
          .attr("stroke-width", 2)
          .attr("stroke-linecap", "round")
          .attr("marker-end", "url(#factor-arrow)")
      )
      .attr("stroke", (e) => (lookup.get(e.from).kind === "leaf" ? INK_MUTED : INK))
      .attr("d", (e) => {
        const doubled = pairCount.get(`${e.from}>${e.to}`) > 1;
        const bow = doubled ? (e.slot === 0 ? -28 : 28) : 0;
        return arrowPath(lookup.get(e.from), lookup.get(e.to), bow);
      });

    // "×" between neighbouring leaves while they still sit in their row
    const leaves = graph.nodes.filter((n) => n.kind === "leaf");
    const seps = [];
    for (let i = 1; i < leaves.length; i++) {
      const a = leaves[i - 1];
      const b = leaves[i];
      if (Math.abs(a.y - b.y) < 2 && b.x > a.x) seps.push({ id: b.id, x: (a.x + a.w / 2 + b.x - b.w / 2) / 2, y: a.y });
    }
    sepLayer
      .selectAll("text")
      .data(seps, (d) => d.id)
      .join("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", INK)
      .style("font", FONT)
      .text("×");
  }

  function redrawNodes() {
    const sel = nodeLayer
      .selectAll("g.node")
      .data(graph.nodes, (n) => n.id)
      .join((enter) => {
        const g = enter.append("g").attr("class", "node").style("cursor", "grab");
        g.append("rect").attr("class", "left");
        g.append("rect").attr("class", "right");
        g.append("line").attr("class", "divider");
        g.append("rect").attr("class", "frame");
        g.append("text").attr("class", "left-text");
        g.append("text").attr("class", "right-text");
        return g;
      });

    sel.attr("transform", (n) => `translate(${n.x - n.w / 2},${n.y - n.h / 2})`);

    sel
      .select("rect.left")
      .attr("width", (n) => n.leftW)
      .attr("height", (n) => n.h)
      .attr("fill", BOX_FILL);
    sel
      .select("rect.right")
      .attr("x", (n) => n.leftW)
      .attr("width", (n) => n.rightW)
      .attr("height", (n) => n.h)
      .attr("fill", RESULT_FILL);
    sel
      .select("line.divider")
      .attr("x1", (n) => n.leftW)
      .attr("x2", (n) => n.leftW)
      .attr("y2", (n) => n.h)
      .attr("stroke", INK)
      .attr("stroke-width", 2.5)
      .attr("display", (n) => (n.rightW ? null : "none"));
    sel
      .select("rect.frame")
      .attr("width", (n) => n.w)
      .attr("height", (n) => n.h)
      .attr("rx", 7)
      .attr("fill", "none")
      .attr("stroke", INK)
      .attr("stroke-width", (n) => (n.kind === "leaf" ? 1.5 : 3))
      .attr("stroke-dasharray", (n) => (n.kind === "leaf" ? "3 4" : null));
    sel
      .select("text.left-text")
      .attr("x", (n) => n.leftW / 2)
      .attr("y", (n) => n.h / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", INK)
      .style("font", FONT)
      .text((n) => n.leftText);
    sel
      .select("text.right-text")
      .attr("x", (n) => n.leftW + n.rightW / 2)
      .attr("y", (n) => n.h / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", INK)
      .style("font", FONT)
      .text((n) => n.rightText || "");

    sel
      .on("mouseenter", (_, n) => highlight(lineage(n.id)))
      .on("mouseleave", () => highlight(null))
      .on("dblclick", (_, n) => removeProduct(n))
      .call(drag);
  }

  function highlight(ids) {
    nodeLayer
      .selectAll("g.node")
      .attr("opacity", (n) => (!ids || ids.has(n.id) ? 1 : 0.25))
      .select("rect.frame")
      .attr("stroke", (n) => (ids && ids.has(n.id) ? HIGHLIGHT : INK));
    edgeLayer.selectAll("path.edge").attr("opacity", (e) => (!ids || (ids.has(e.to) && ids.has(e.from)) ? 1 : 0.15));
  }

  // ---------- drag, and drop-to-multiply ----------

  function dropTarget(n) {
    const open = new Set(openNodes().map((o) => o.id));
    if (!open.has(n.id)) return null;
    return graph.nodes.find(
      (o) => o !== n && open.has(o.id) && Math.abs(o.x - n.x) < (o.w + n.w) / 2 && Math.abs(o.y - n.y) < o.h
    );
  }

  const drag = d3
    .drag()
    .on("start", function () {
      d3.select(this).raise().style("cursor", "grabbing");
    })
    .on("drag", function (event, n) {
      n.x += event.dx;
      n.y += event.dy;
      d3.select(this).attr("transform", `translate(${n.x - n.w / 2},${n.y - n.h / 2})`);
      const target = dropTarget(n);
      nodeLayer
        .selectAll("g.node")
        .select("rect.frame")
        .attr("stroke", (o) => (o === target ? HIGHLIGHT : INK));
      redrawEdges();
    })
    .on("end", function (_, n) {
      d3.select(this).style("cursor", "grab");
      const target = dropTarget(n);
      if (target) combine(target, n);
      else redrawNodes();
    });

  function combine(a, b) {
    // left operand is whichever sits further left
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    const node = graph.makeProduct(left, right);
    sizeNode(node);
    node.x = (left.x + right.x) / 2;
    node.y = Math.max(left.y, right.y) + ROW_GAP;
    history.push(node.id);
    render();
  }

  function removeProduct(n) {
    if (n.kind !== "product") return;
    if (graph.edges.some((e) => e.from === n.id)) return; // only open products
    graph.nodes = graph.nodes.filter((o) => o !== n);
    graph.edges = graph.edges.filter((e) => e.to !== n.id);
    history = history.filter((id) => id !== n.id);
    render();
  }

  function undo() {
    const id = history[history.length - 1];
    const n = id && graph.nodes.find((o) => o.id === id);
    if (n) removeProduct(n);
  }

  // ---------- stats + lifecycle ----------

  function renderStats() {
    const products = graph.nodes.filter((n) => n.kind === "product");
    const open = openNodes();
    const depth = d3.max(graph.nodes, (n) => n.level) || 0;
    const total = leafValues.reduce((acc, v) => acc * v, 1n);
    const lines = [
      `${leafValues.length} factor${leafValues.length === 1 ? "" : "s"}`,
      `${products.length} multiplication${products.length === 1 ? "" : "s"}`,
      `depth ${depth}`,
      open.length === 1 ? `= ${open[0].value}` : `${open.length} open · target ${total}`,
    ];
    statsEl.textContent = lines.join("  ·  ");
  }

  function render() {
    redrawEdges();
    redrawNodes();
    renderStats();
  }

  function fit() {
    const { width, height } = container.getBoundingClientRect();
    const x0 = d3.min(graph.nodes, (n) => n.x - n.w / 2);
    const x1 = d3.max(graph.nodes, (n) => n.x + n.w / 2);
    const y0 = d3.min(graph.nodes, (n) => n.y - n.h / 2);
    const y1 = d3.max(graph.nodes, (n) => n.y + n.h / 2) + (strategy === "manual" ? ROW_GAP * 2 : 0);
    const top = 190; // leave room for the header
    const k = Math.min(1.4, (width - 80) / (x1 - x0), (height - top - 60) / (y1 - y0));
    const tx = width / 2 - ((x0 + x1) / 2) * k;
    const ty = top - y0 * k;
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
  }

  function rebuild() {
    graph = buildGraph(leafValues, strategy);
    history = [];
    layout(graph);
    nodeLayer.selectAll("*").remove();
    edgeLayer.selectAll("*").remove();
    sepLayer.selectAll("*").remove();
    render();
    fit();
  }

  function setExpression(text) {
    try {
      leafValues = parseExpression(text);
      errorEl.textContent = "";
    } catch (err) {
      errorEl.textContent = err.message;
      return;
    }
    const url = new URL(window.location);
    url.searchParams.set("e", text.trim());
    window.history.replaceState(null, "", url);
    rebuild();
  }

  function markStrategy() {
    strategyButtons.forEach((b) => b.classList.toggle("active", b.dataset[ui.strategyAttr] === strategy));
  }

  function setStrategy(next) {
    strategy = next;
    markStrategy();
    if (leafValues.length) rebuild();
  }

  input.addEventListener("change", () => setExpression(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") setExpression(input.value);
  });
  strategyButtons.forEach((b) => b.addEventListener("click", () => setStrategy(b.dataset[ui.strategyAttr])));
  window.addEventListener("resize", () => graph && fit());

  const initial = new URLSearchParams(window.location.search).get("e") || input.value || "3^8";
  input.value = initial;

  const start = () => {
    markStrategy();
    setExpression(initial);
  };
  // measure text only once the hand-drawn font is available
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else start();

  return { setExpression, setStrategy, undo, relayout: rebuild };
}

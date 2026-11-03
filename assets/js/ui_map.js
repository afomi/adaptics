/**
 * /ui-map — the UI pyramid, drawn with D3.
 *
 * Levels stack bottom-up inside a tapering pyramid; each node links down to
 * what it is made of (same-level uses arc above their layer). Unfold builds
 * the pyramid one layer at a time; hovering a node lights its composition
 * (below, blue) and its reach (above, gold); the side panel reports what
 * emerges. Cross-cutting qualities run as rails beside the pyramid.
 *
 * The model (ui_map_model.js) is pure; this file draws it.
 */

import * as d3 from "d3";
import { LEVELS, NODES, QUALITIES, node, usedBy, composition, reach, emergence } from "./ui_map_model.js";

const LENS_FILL = { web: "#13233d", both: "#231d3d", hcd: "#3a2418" };
const LENS_STROKE = { web: "#2f4f80", both: "#5b4a9a", hcd: "#8a5530" };
const DOWN = "#6cb4ff"; // composition
const UP = "#ffc95c"; // reach

export function renderUiMap(containerId, ui) {
  const container = document.getElementById(containerId);
  const $ = (id) => document.getElementById(ui[id]);
  const top = LEVELS.length - 1;

  const W = 1100;
  const H = 860;
  const margin = { left: 120, right: 200, top: 40, bottom: 30 };
  const inner = W - margin.left - margin.right;
  const bandH = (H - margin.top - margin.bottom) / LEVELS.length;
  const yOf = (level) => H - margin.bottom - (level + 0.5) * bandH;
  const widthOf = (level) => inner * (1 - (0.62 * level) / top); // taper toward the top
  const cx = margin.left + inner / 2;

  // node positions: spread evenly across their layer's width
  const pos = new Map();
  for (const l of LEVELS) {
    const here = NODES.filter((n) => n.level === l.id);
    const w = widthOf(l.id) * 0.92;
    here.forEach((n, i) => {
      pos.set(n.id, {
        x: cx - w / 2 + (here.length === 1 ? w / 2 : (i * w) / (here.length - 1)),
        y: yOf(l.id),
        labelBelow: i % 2 === 1,
      });
    });
  }

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%")
    .style("display", "block")
    .style("font-family", "system-ui, sans-serif");

  // -- layers -------------------------------------------------------------------
  const bands = svg
    .append("g")
    .selectAll("g")
    .data(LEVELS)
    .join("g")
    .attr("class", "band");

  bands
    .append("path")
    .attr("d", (l) => {
      const y0 = yOf(l.id) + bandH / 2;
      const y1 = yOf(l.id) - bandH / 2;
      const w0 = widthOf(l.id - 0.5) / 2;
      const w1 = widthOf(l.id + 0.5) / 2;
      return `M${cx - w0},${y0} L${cx + w0},${y0} L${cx + w1},${y1} L${cx - w1},${y1} Z`;
    })
    .attr("fill", (l) => LENS_FILL[l.lens])
    .attr("stroke", (l) => LENS_STROKE[l.lens])
    .attr("stroke-width", 0.6);

  bands
    .append("text")
    .attr("x", margin.left - 14)
    .attr("y", (l) => yOf(l.id) + 4)
    .attr("text-anchor", "end")
    .attr("fill", "#c8cbe0")
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .text((l) => `${l.id} · ${l.name}`);

  // -- qualities: rails beside the pyramid -------------------------------------
  const rails = svg
    .append("g")
    .selectAll("g")
    .data(QUALITIES)
    .join("g")
    .attr("class", "rail")
    .style("cursor", "default");

  rails
    .append("rect")
    .attr("x", (_, i) => W - margin.right + 24 + i * 28)
    .attr("width", 8)
    .attr("rx", 4)
    .attr("y", (q) => yOf(q.to) - bandH / 2 + 4)
    .attr("height", (q) => (q.to - q.from + 1) * bandH - 8)
    .attr("fill", "#3b3f5c");

  rails
    .append("text")
    .attr("transform", (q, i) => `translate(${W - margin.right + 38 + i * 28},${yOf(q.to) - bandH / 2 + 8}) rotate(90)`)
    .attr("fill", "#8f93ad")
    .attr("font-size", 10.5)
    .text((q) => q.label);

  rails.append("title").text((q) => `${q.label}: ${q.note}`);

  // -- edges ----------------------------------------------------------------------
  const links = NODES.flatMap((n) => n.uses.map((u) => ({ from: n.id, to: u, level: n.level, lateral: node(u).level === n.level })));

  const edgePath = (e) => {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (e.lateral) {
      const lift = 18 + Math.abs(a.x - b.x) * 0.15;
      return `M${a.x},${a.y} Q${(a.x + b.x) / 2},${Math.min(a.y, b.y) - lift} ${b.x},${b.y}`;
    }
    const my = (a.y + b.y) / 2;
    return `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;
  };

  const edges = svg
    .append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("d", edgePath)
    .attr("stroke", "#8890b8")
    .attr("stroke-width", 0.7)
    .attr("stroke-dasharray", (e) => (e.lateral ? "3 3" : null));

  // -- nodes ----------------------------------------------------------------------
  const nodes = svg
    .append("g")
    .selectAll("g")
    .data(NODES)
    .join("g")
    .attr("class", "node")
    .attr("transform", (n) => `translate(${pos.get(n.id).x},${pos.get(n.id).y})`)
    .style("cursor", "pointer");

  nodes
    .append("circle")
    .attr("r", (n) => 3.5 + Math.sqrt(usedBy(n.id).length) * 2)
    .attr("fill", (n) => (n.level >= 7 ? "#f2a66b" : n.level >= 5 ? "#b9a4ff" : "#8ec5ff"))
    .attr("stroke", "#0b0d18")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", (n) => (n.id.startsWith("ex-") ? "2 2" : null));

  nodes
    .append("text")
    .attr("y", (n) => (pos.get(n.id).labelBelow ? 18 : -11))
    .attr("text-anchor", "middle")
    .attr("fill", "#e4e6f2")
    .attr("font-size", 10.5)
    .attr("paint-order", "stroke")
    .attr("stroke", "#0b0d18")
    .attr("stroke-width", 3)
    .text((n) => n.label);

  nodes.append("title").text((n) => n.note);

  // -- unfold, hover, select ------------------------------------------------------
  let upTo = top;
  let pinned = null;
  let timer = null;

  function visible(level) {
    return level <= upTo;
  }

  function paint(focus = pinned) {
    const down = focus ? composition(focus) : null;
    const up = focus ? reach(focus) : null;
    const lit = (id) => !focus || id === focus || down.has(id) || up.has(id);

    bands.transition().duration(400).style("opacity", (l) => (visible(l.id) ? 1 : 0.12));

    nodes
      .transition()
      .duration(400)
      .style("opacity", (n) => (!visible(n.level) ? 0 : lit(n.id) ? 1 : 0.18))
      .style("pointer-events", (n) => (visible(n.level) ? "all" : "none"));

    nodes
      .select("circle")
      .attr("fill", (n) => {
        if (focus && n.id === focus) return "#ffffff";
        if (focus && down.has(n.id)) return DOWN;
        if (focus && up.has(n.id)) return UP;
        return n.level >= 7 ? "#f2a66b" : n.level >= 5 ? "#b9a4ff" : "#8ec5ff";
      });

    edges
      .transition()
      .duration(400)
      .attr("stroke", (e) => {
        if (!focus) return "#8890b8";
        if ((e.from === focus || down.has(e.from)) && (down.has(e.to) || e.to === focus)) return DOWN;
        if ((e.to === focus || up.has(e.to)) && up.has(e.from)) return UP;
        return "#8890b8";
      })
      .style("opacity", (e) => {
        if (!visible(node(e.from).level)) return 0;
        if (!focus) return 0.22;
        const onDown = (e.from === focus || down.has(e.from)) && (down.has(e.to) || e.to === focus);
        const onUp = (e.to === focus || up.has(e.to)) && up.has(e.from);
        return onDown || onUp ? 0.85 : 0.04;
      });

    showLevel();
    showEmergence();
    showSelection(focus);
  }

  function showLevel() {
    const l = LEVELS[upTo];
    $("level").textContent = `Up to ${l.id} · ${l.name}`;
    $("levelNote").textContent = l.note;
    $("slider").value = upTo;
  }

  function showEmergence() {
    const e = emergence(upTo);
    const li = (items) => items.map((t) => `<li>${t}</li>`).join("");

    $("emergence").innerHTML = `
      <p>${e.nodes} pieces · ${e.edges} uses.</p>
      <h4>Keystone of each layer</h4>
      <ol>${li(e.keystones.map((k) => `<b>${k.label}</b> <span>(${LEVELS[k.level].name}, ${k.reach} above lean on it)</span>`))}</ol>
      <h4>Most directly reused</h4>
      <ol>${li(e.reused.map((k) => `<b>${k.label}</b> <span>(${k.usedBy} direct users)</span>`))}</ol>
      <h4>Built from its own layer</h4>
      <p>${e.lateral.length ? e.lateral.map((x) => `${node(x.from).label} → ${node(x.to).label}`).join(" · ") : "Nothing yet."}</p>`;
  }

  function showSelection(id) {
    const box = $("selection");
    if (!id) {
      box.innerHTML = "<p class='muted'>Hover a piece to see what it's made of (blue) and what leans on it (gold). Click to pin.</p>";
      return;
    }
    const n = node(id);
    const names = (ids) => ids.map((x) => node(x).label).join(", ") || "—";
    box.innerHTML = `
      <h3>${n.label}</h3>
      <p class="muted">${LEVELS[n.level].name}</p>
      <p>${n.note}</p>
      <p><b style="color:${DOWN}">Made of</b> ${names(n.uses)} <span class="muted">(${composition(id).size} in all)</span></p>
      <p><b style="color:${UP}">Used by</b> ${names(usedBy(id))} <span class="muted">(${reach(id).size} in all)</span></p>`;
  }

  nodes
    .on("mouseenter", (_, n) => paint(n.id))
    .on("mouseleave", () => paint())
    .on("click", (ev, n) => {
      ev.stopPropagation();
      pinned = pinned === n.id ? null : n.id;
      paint();
    });
  svg.on("click", () => {
    pinned = null;
    paint();
  });

  function setLevel(level) {
    upTo = Math.max(0, Math.min(top, level));
    if (pinned && node(pinned).level > upTo) pinned = null;
    paint();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    $("play").textContent = "▶ Unfold";
  }

  $("slider").max = top;
  $("slider").addEventListener("input", (ev) => {
    stop();
    setLevel(Number(ev.target.value));
  });
  $("play").addEventListener("click", () => {
    if (timer) return stop();
    setLevel(0);
    $("play").textContent = "❚❚ Pause";
    timer = setInterval(() => (upTo >= top ? stop() : setLevel(upTo + 1)), 1400);
  });

  paint();
  return { setLevel, select: (id) => ((pinned = id), paint()) };
}

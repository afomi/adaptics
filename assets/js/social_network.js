/**
 * /network — a user-centric social network in 3D.
 *
 * You sit at the origin and are always active. Your connections ring you on
 * the ground plane; each connection's own network fans out one hop further
 * and one layer up (hop count is height, the /topo layer idea reused). The
 * ring can be sorted by tie strength, when you met, context, mutuals, or
 * name, and distance from you can follow tie strength.
 *
 * Two animations:
 *   (a) development — scrub or play the year: relationships arrive from the
 *       outside as they begin and their ties thicken over the first years.
 *   (b) building — click a second-hop person (or let auto-grow do it) to be
 *       introduced through the mutual: they fly in to your ring and become a
 *       connection whose own network can then be activated.
 *
 * Each connection's network is activated to a customizable extent:
 *   off     — nothing beyond the person
 *   shared  — only the part of their network that overlaps with you on the
 *             attributes you enable (context, interests, place)
 *   full    — everyone they know
 *
 * Model functions (generateNetwork, tieStrength, sortConnections,
 * networkOf, layoutNetwork) are pure and exported for testing.
 */

import * as THREE from "three";
import { createStage, makeSprite, hashString, hexColor, mulberry32 } from "./three_stage.js";

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const CONTEXTS = {
  family:    { label: "Family",    color: 0xfb7185 },
  work:      { label: "Work",      color: 0x38bdf8 },
  community: { label: "Community", color: 0x4ade80 },
  school:    { label: "School",    color: 0xa78bfa },
  online:    { label: "Online",    color: 0x22d3ee },
};
const CONTEXT_KEYS = Object.keys(CONTEXTS);

const INTERESTS = [
  "cycling", "jazz", "gardening", "civics", "chess", "climbing",
  "cooking", "film", "open source", "sailing", "birding", "ceramics",
];
const PLACES = ["Vacaville", "Fairfield", "Davis", "Oakland", "Sacramento", "Portland"];
const NAMES = [
  "Ada", "Bao", "Cleo", "Dev", "Esme", "Femi", "Gus", "Hana", "Ivo", "Juno",
  "Kai", "Lena", "Malik", "Nia", "Omar", "Priya", "Quinn", "Rosa", "Sef", "Tova",
  "Uma", "Vik", "Wren", "Xia", "Yusuf", "Zora", "Arlo", "Bea", "Cyrus", "Dara",
  "Eli", "Freya", "Gil", "Hollis", "Ines", "Jae", "Kofi", "Lior", "Mira", "Noor",
  "Otis", "Pia", "Rafi", "Sana", "Theo", "Ursa", "Vera", "Wes", "Yara", "Zeke",
  "Amara", "Bram", "Cai", "Dot", "Ezra", "Fen", "Greta", "Hugo", "Isla", "Jude",
];

export const YEAR_MIN = 1998;
export const YEAR_MAX = 2026;

const YOU_COLOR = 0xfacc15;
const HOP_HEIGHT = 1.5;
const RING_NEAR = 3.2;
const RING_FAR = 6.8;
const RING_FLAT = 5.0;
const FAN_OUT = 2.6;

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/**
 * A procedural, seeded network. `people` are everyone you could ever reach;
 * `connected` names the initial first-hop set. Every person has their own
 * `links` (their network), built by affinity: shared context strongly, shared
 * interest or place weakly — so mutuals arise naturally.
 */
export function generateNetwork(seed = 7, { firstDegree = 14, pool = 48 } = {}) {
  const rand = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const sample = (arr, n) => {
    const copy = [...arr];
    const out = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
    return out;
  };

  const you = {
    id: "you",
    name: "You",
    attrs: { context: null, interests: sample(INTERESTS, 3), place: PLACES[0] },
  };

  const people = {};
  const names = sample(NAMES, pool);
  for (let i = 0; i < pool; i++) {
    const id = `p${i}`;
    people[id] = {
      id,
      name: names[i],
      attrs: {
        context: pick(CONTEXT_KEYS),
        interests: sample(INTERESTS, 2 + Math.floor(rand() * 2)),
        place: rand() < 0.55 ? you.attrs.place : pick(PLACES),
      },
      since: YEAR_MIN + Math.floor(rand() * (YEAR_MAX - YEAR_MIN)),
      strength: 0.25 + rand() * 0.75,
      links: new Set(),
      introducedBy: null,
    };
  }

  // Everyone's own network, by affinity.
  const ids = Object.keys(people);
  for (const id of ids) {
    const p = people[id];
    const want = 3 + Math.floor(rand() * 5);
    const scored = ids
      .filter((o) => o !== id)
      .map((o) => {
        const q = people[o];
        let a = rand() * 0.4;
        if (q.attrs.context === p.attrs.context) a += 0.9;
        if (q.attrs.interests.some((x) => p.attrs.interests.includes(x))) a += 0.4;
        if (q.attrs.place === p.attrs.place) a += 0.25;
        return [o, a];
      })
      .sort((x, y) => y[1] - x[1]);
    for (const [o] of scored.slice(0, want)) {
      p.links.add(o);
      people[o].links.add(id);
    }
  }

  const connected = ids.slice(0, firstDegree);
  return { you, people, connected };
}

/** Tie strength at a given year: 0 before you met, ramping to full over ~4 years. */
export function tieStrength(person, year) {
  if (person.since > year) return 0;
  return person.strength * Math.min(1, (year - person.since + 2) / 4);
}

export const SORTS = {
  strength: { label: "Tie strength" },
  since:    { label: "When we met" },
  context:  { label: "Context" },
  mutuals:  { label: "Mutual connections" },
  name:     { label: "Name" },
};

/** Sort first-hop ids for the ring. `mutuals(id)` counts shared links with your other connections. */
export function sortConnections(ids, people, year, key, mutuals) {
  const tie = (id) => tieStrength(people[id], year);
  const by = {
    strength: (a, b) => tie(b) - tie(a) || a.localeCompare(b),
    since: (a, b) => people[a].since - people[b].since || a.localeCompare(b),
    context: (a, b) =>
      CONTEXT_KEYS.indexOf(people[a].attrs.context) - CONTEXT_KEYS.indexOf(people[b].attrs.context) ||
      tie(b) - tie(a) ||
      a.localeCompare(b),
    mutuals: (a, b) => mutuals(b) - mutuals(a) || tie(b) - tie(a) || a.localeCompare(b),
    name: (a, b) => people[a].name.localeCompare(people[b].name),
  };
  return [...ids].sort(by[key] || by.strength);
}

/**
 * The visible part of one person's network for an activation level.
 * "shared" keeps only people who overlap with you on an enabled attribute.
 */
export function networkOf(person, you, level, sharedAttrs, people) {
  if (level === "off") return [];
  const out = [];
  for (const id of person.links) {
    const q = people[id];
    if (level === "full") { out.push(id); continue; }
    const shared =
      (sharedAttrs.context && q.attrs.context === person.attrs.context) ||
      (sharedAttrs.interests && q.attrs.interests.some((x) => you.attrs.interests.includes(x))) ||
      (sharedAttrs.place && q.attrs.place === you.attrs.place);
    if (shared) out.push(id);
  }
  return out.sort((a, b) => people[a].name.localeCompare(people[b].name));
}

/**
 * Full layout for a state: node targets (position, scale, color, hop) and the
 * edge list. Pure — no THREE objects, just numbers and ids.
 */
export function layoutNetwork(model, state) {
  const { you, people } = model;
  const { year, sort, distanceByStrength, activation, sharedAttrs } = state;
  const connected = [...state.connected];

  const mutuals = (id) => {
    let n = 0;
    for (const o of connected) if (o !== id && people[o].links.has(id)) n++;
    return n;
  };
  const order = sortConnections(connected, people, year, sort, mutuals);

  const nodes = { you: { x: 0, y: 0, z: 0, scale: 1.6, color: YOU_COLOR, hop: 0, angle: 0, r: 0 } };
  const edges = [];
  const anchorsOf = {}; // hop-2 id → [hop-1 id, ...]

  order.forEach((id, i) => {
    const p = people[id];
    const t = tieStrength(p, year);
    const angle = -Math.PI / 2 + (i / order.length) * Math.PI * 2;
    const r = distanceByStrength ? RING_FAR - (RING_FAR - RING_NEAR) * t : RING_FLAT;
    const present = t > 0;
    nodes[id] = {
      x: Math.cos(angle) * r,
      y: 0,
      z: Math.sin(angle) * r,
      scale: present ? 0.7 + t * 0.6 : 0,
      color: CONTEXTS[p.attrs.context].color,
      hop: 1,
      angle,
      r,
      tie: t,
      mutuals: mutuals(id),
      present,
    };
    if (present) edges.push({ a: "you", b: id, color: CONTEXTS[p.attrs.context].color, weight: 0.25 + t * 0.75, kind: "tie" });
  });

  // Triads among connections.
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const a = order[i], b = order[j];
      if (people[a].links.has(b) && nodes[a].present && nodes[b].present) {
        edges.push({ a, b, color: 0x475569, weight: 0.35, kind: "triad" });
      }
    }
  }

  // Second hop: each activated connection fans its (filtered) network outward and up.
  for (const id of order) {
    if (!nodes[id].present) continue;
    const level = activation[id] || "off";
    const net = networkOf(people[id], you, level, sharedAttrs, people).filter((q) => !state.connected.has(q));
    net.forEach((q, k) => {
      (anchorsOf[q] ||= []).push({ anchor: id, k, n: net.length });
    });
  }

  for (const [q, anchors] of Object.entries(anchorsOf)) {
    let x = 0, z = 0;
    for (const { anchor, k, n } of anchors) {
      const a = nodes[anchor];
      const spread = n <= 1 ? 0 : (k / (n - 1) - 0.5) * Math.min(1.1, 0.28 * n);
      const ang = a.angle + spread;
      const rr = a.r + FAN_OUT;
      x += Math.cos(ang) * rr;
      z += Math.sin(ang) * rr;
    }
    x /= anchors.length;
    z /= anchors.length;
    const p = people[q];
    nodes[q] = {
      x,
      y: HOP_HEIGHT,
      z,
      scale: 0.55,
      color: CONTEXTS[p.attrs.context].color,
      hop: 2,
      anchors: anchors.map((a) => a.anchor),
      present: true,
    };
    for (const { anchor } of anchors) {
      edges.push({ a: anchor, b: q, color: nodes[anchor].color, weight: 0.3, kind: "reach" });
    }
  }

  return { nodes, edges, order };
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const lerp = (a, b, t) => a + (b - a) * t;
const LEVELS = ["off", "shared", "full"];
const LEVEL_GLYPH = { off: "○", shared: "◐", full: "●" };
const BG_COLOR = new THREE.Color(0x0b1020);

export function renderSocialNetwork(containerId, ui = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const model = generateNetwork(7);
  const state = {
    year: YEAR_MAX,
    sort: "strength",
    distanceByStrength: true,
    connected: new Set(model.connected),
    activation: {},
    sharedAttrs: { context: true, interests: true, place: false },
    viewpoint: "orbit",
    autoGrow: false,
    playing: false,
  };
  // A couple of networks start activated so the second hop is visible on load.
  state.activation[model.connected[0]] = "full";
  state.activation[model.connected[2]] = "shared";

  const { scene, camera, renderer, controls, tooltip } = createStage(container, {
    fog: [30, 70],
    cameraPosition: [9, 9, 12],
  });
  controls.target.set(0, 0.4, 0);
  controls.maxPolarAngle = Math.PI * 0.49;

  const world = new THREE.Group();
  scene.add(world);

  // Ground rings for the ring radii and the second-hop layer.
  function ring(radius, y, color, opacity) {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    }
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
  }
  world.add(ring(RING_NEAR, 0, 0x334155, 0.5));
  world.add(ring(RING_FLAT, 0, 0x334155, 0.35));
  world.add(ring(RING_FAR, 0, 0x334155, 0.5));
  world.add(ring(RING_FAR + FAN_OUT, HOP_HEIGHT, 0x1e293b, 0.6));

  // "You": always active — an emissive core with a pulsing halo.
  const youMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 18),
    new THREE.MeshStandardMaterial({ color: YOU_COLOR, emissive: YOU_COLOR, emissiveIntensity: 0.9, roughness: 0.3 })
  );
  world.add(youMesh);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.5, 48),
    new THREE.MeshBasicMaterial({ color: YOU_COLOR, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.01;
  world.add(halo);
  const youLabel = makeSprite("You", hexColor(YOU_COLOR), 1.1);
  youLabel.position.set(0, 0.75, 0);
  world.add(youLabel);

  // People nodes: one mesh + label each (≤ ~60 nodes, so no instancing needed).
  const sphereGeo = new THREE.SphereGeometry(0.16, 18, 14);
  const nodeObjs = {}; // id → { mesh, label, cur: {x,y,z,scale}, color: Color, seen }
  function ensureNode(id) {
    if (nodeObjs[id]) return nodeObjs[id];
    const p = model.people[id];
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1, transparent: true });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.userData.id = id;
    mesh.visible = false;
    world.add(mesh);
    const label = makeSprite(p.name, hexColor(CONTEXTS[p.attrs.context].color), 0.8);
    label.visible = false;
    world.add(label);
    const obj = {
      mesh, label,
      cur: { x: 0, y: 0, z: 0, scale: 0 },
      color: new THREE.Color(CONTEXTS[p.attrs.context].color),
      seen: false,
    };
    nodeObjs[id] = obj;
    return obj;
  }

  // Edges: one LineSegments buffer, positions follow animated node positions.
  const MAX_EDGES = 600;
  const linePos = new Float32Array(MAX_EDGES * 6);
  const lineCol = new Float32Array(MAX_EDGES * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })
  );
  lines.frustumCulled = false;
  world.add(lines);

  let layout = layoutNetwork(model, state);
  let hover = null; // hovered person id (canvas or sidebar)
  let flash = {};   // id → time of last connect, for an arrival pulse

  // -------------------------------------------------------------------------
  // Apply state → targets
  // -------------------------------------------------------------------------
  function apply() {
    layout = layoutNetwork(model, state);
    for (const [id, n] of Object.entries(layout.nodes)) {
      if (id === "you") continue;
      const obj = ensureNode(id);
      obj.target = n;
      if (!obj.seen && n.scale > 0) {
        // Enter from the outside (hop 1) or from the anchor (hop 2).
        if (n.hop === 2 && n.anchors?.length) {
          const a = layout.nodes[n.anchors[0]];
          obj.cur = { x: a.x, y: a.y, z: a.z, scale: 0 };
        } else {
          obj.cur = { x: n.x * 2.2, y: 0.4, z: n.z * 2.2, scale: 0 };
        }
        obj.seen = true;
      }
    }
    // Nodes that dropped out of the layout fade in place.
    for (const [id, obj] of Object.entries(nodeObjs)) {
      if (!layout.nodes[id]) {
        obj.target = { ...obj.cur, scale: 0, hop: obj.target?.hop ?? 2 };
        obj.seen = false;
      }
    }
    renderSidebar();
    renderStats();
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  function connect(id) {
    if (state.connected.has(id) || !model.people[id]) return;
    const p = model.people[id];
    const anchors = layout.nodes[id]?.anchors || [];
    p.since = state.year;
    p.strength = 0.5 + hashString(id) * 0.4;
    p.introducedBy = anchors[0] || null;
    state.connected.add(id);
    state.activation[id] = "off";
    flash[id] = clock.getElapsedTime();
    apply();
  }

  function cycleActivation(id) {
    const cur = state.activation[id] || "off";
    state.activation[id] = LEVELS[(LEVELS.indexOf(cur) + 1) % LEVELS.length];
    apply();
  }

  function setAllActivation(level) {
    for (const id of state.connected) state.activation[id] = level;
    apply();
  }

  function autoGrowStep() {
    // Introduce the reachable person with the most mutual paths to you.
    const candidates = Object.entries(layout.nodes)
      .filter(([id, n]) => n.hop === 2)
      .sort(([a, na], [b, nb]) => nb.anchors.length - na.anchors.length || hashString(a) - hashString(b));
    if (candidates.length) connect(candidates[0][0]);
  }

  // -------------------------------------------------------------------------
  // Sidebar (sorted connections with per-person activation)
  // -------------------------------------------------------------------------
  const sidebar = ui.sidebar ? document.getElementById(ui.sidebar) : null;

  function renderSidebar() {
    if (!sidebar) return;
    sidebar.innerHTML = "";
    for (const id of layout.order) {
      const p = model.people[id];
      const n = layout.nodes[id];
      const level = state.activation[id] || "off";
      const row = document.createElement("div");
      row.className = "net-row" + (n.present ? "" : " net-row-future") + (hover === id ? " net-row-hover" : "");
      row.dataset.id = id;
      row.innerHTML =
        `<span class="net-swatch" style="background:${hexColor(CONTEXTS[p.attrs.context].color)}"></span>` +
        `<span class="net-name">${p.name}</span>` +
        `<span class="net-bar"><span style="width:${Math.round(n.tie * 100)}%;background:${hexColor(CONTEXTS[p.attrs.context].color)}"></span></span>` +
        `<span class="net-since">${p.since}</span>` +
        `<button class="net-level net-level-${level}" title="Network: ${level}">${LEVEL_GLYPH[level]}</button>`;
      row.addEventListener("mouseenter", () => { hover = id; });
      row.addEventListener("mouseleave", () => { if (hover === id) hover = null; });
      row.querySelector(".net-level").addEventListener("click", (e) => { e.stopPropagation(); cycleActivation(id); });
      row.addEventListener("click", () => cycleActivation(id));
      sidebar.appendChild(row);
    }
  }

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  const statsEl = ui.stats ? document.getElementById(ui.stats) : null;
  function renderStats() {
    if (!statsEl) return;
    const present = layout.order.filter((id) => layout.nodes[id].present);
    const reach = Object.values(layout.nodes).filter((n) => n.hop === 2).length;
    const activated = layout.order.filter((id) => (state.activation[id] || "off") !== "off").length;
    const avg = present.length ? present.reduce((s, id) => s + layout.nodes[id].tie, 0) / present.length : 0;
    const row = (k, v) => `<div class="net-stat"><span>${k}</span><span>${v}</span></div>`;
    statsEl.innerHTML =
      row("Year", state.year) +
      row("Connections", `${present.length} / ${layout.order.length}`) +
      row("Networks activated", activated) +
      row("Reach (second hop)", reach) +
      row("Avg tie strength", avg.toFixed(2));
  }

  // -------------------------------------------------------------------------
  // Controls wiring
  // -------------------------------------------------------------------------
  const el = (id) => (id ? document.getElementById(id) : null);
  const sortSel = el(ui.sort);
  const distanceChk = el(ui.distance);
  const yearSlider = el(ui.year);
  const yearValue = el(ui.yearValue);
  const playBtn = el(ui.play);
  const activateAll = el(ui.activateAll);
  const sharedBox = el(ui.shared);
  const viewpointBox = el(ui.viewpoint);
  const growBtn = el(ui.grow);

  if (sortSel) {
    sortSel.innerHTML = Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
    sortSel.value = state.sort;
    sortSel.addEventListener("change", () => { state.sort = sortSel.value; apply(); });
  }
  if (distanceChk) {
    distanceChk.checked = state.distanceByStrength;
    distanceChk.addEventListener("change", () => { state.distanceByStrength = distanceChk.checked; apply(); });
  }
  function setYear(y) {
    state.year = Math.round(y);
    if (yearSlider) yearSlider.value = String(state.year);
    if (yearValue) yearValue.textContent = String(state.year);
    apply();
  }
  if (yearSlider) {
    yearSlider.min = String(YEAR_MIN);
    yearSlider.max = String(YEAR_MAX);
    yearSlider.value = String(state.year);
    yearSlider.addEventListener("input", () => { state.playing = false; syncPlay(); setYear(Number(yearSlider.value)); });
  }
  if (yearValue) yearValue.textContent = String(state.year);
  function syncPlay() {
    if (!playBtn) return;
    playBtn.textContent = state.playing ? "Pause" : "Play the years";
    playBtn.classList.toggle("net-btn-active", state.playing);
  }
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (!state.playing && state.year >= YEAR_MAX) setYear(YEAR_MIN);
      state.playing = !state.playing;
      syncPlay();
    });
  }
  if (activateAll) {
    activateAll.addEventListener("click", (e) => {
      const b = e.target.closest("[data-level]");
      if (b) setAllActivation(b.dataset.level);
    });
  }
  if (sharedBox) {
    sharedBox.querySelectorAll("input[data-attr]").forEach((cb) => {
      cb.checked = !!state.sharedAttrs[cb.dataset.attr];
      cb.addEventListener("change", () => { state.sharedAttrs[cb.dataset.attr] = cb.checked; apply(); });
    });
  }
  if (viewpointBox) {
    viewpointBox.addEventListener("click", (e) => {
      const b = e.target.closest("[data-viewpoint]");
      if (!b) return;
      setViewpoint(b.dataset.viewpoint);
    });
  }
  function syncViewpoint() {
    if (!viewpointBox) return;
    viewpointBox.querySelectorAll("[data-viewpoint]").forEach((b) =>
      b.classList.toggle("net-btn-active", b.dataset.viewpoint === state.viewpoint));
  }
  if (growBtn) {
    growBtn.addEventListener("click", () => {
      state.autoGrow = !state.autoGrow;
      growBtn.textContent = state.autoGrow ? "Stop growing" : "Auto-grow connections";
      growBtn.classList.toggle("net-btn-active", state.autoGrow);
    });
  }

  // -------------------------------------------------------------------------
  // Viewpoint: orbit around you, or first-person from your node looking out.
  // -------------------------------------------------------------------------
  const orbitSaved = new THREE.Vector3();
  let yaw = 0, pitch = -0.05, dragging = false, lastX = 0, lastY = 0, lastDrag = -10;

  function setViewpoint(v) {
    if (v === state.viewpoint) return;
    if (v === "first") {
      orbitSaved.copy(camera.position);
      controls.enabled = false;
      // Start looking the way the camera was already facing.
      yaw = Math.atan2(-camera.position.x, -camera.position.z) + Math.PI;
      pitch = -0.05;
    } else {
      controls.enabled = true;
      camera.position.copy(orbitSaved);
      controls.target.set(0, 0.4, 0);
    }
    state.viewpoint = v;
    syncViewpoint();
  }
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (state.viewpoint !== "first") return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener("pointerup", () => { dragging = false; });
  window.addEventListener("pointermove", (e) => {
    if (!dragging || state.viewpoint !== "first") return;
    yaw -= (e.clientX - lastX) * 0.005;
    pitch = Math.max(-0.6, Math.min(0.9, pitch + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
    lastDrag = clock.getElapsedTime();
  });

  // -------------------------------------------------------------------------
  // Canvas hover / click
  // -------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let canvasHover = null;

  function pickAt(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = Object.values(nodeObjs).filter((o) => o.mesh.visible).map((o) => o.mesh);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.id : null;
  }

  function tooltipHtml(id) {
    const p = model.people[id];
    const n = layout.nodes[id];
    const ctx = CONTEXTS[p.attrs.context];
    const lines = [
      `<b style="color:${hexColor(ctx.color)}">${p.name}</b> · ${ctx.label}`,
      `${p.attrs.place} · ${p.attrs.interests.join(", ")}`,
    ];
    if (n.hop === 1) {
      lines.push(`Met ${p.since} · tie ${n.tie.toFixed(2)} · ${n.mutuals} mutual`);
      if (p.introducedBy) lines.push(`Introduced by ${model.people[p.introducedBy].name}`);
      lines.push(`<i>Network: ${state.activation[id] || "off"} · click to cycle</i>`);
    } else {
      lines.push(`Reachable via ${n.anchors.map((a) => model.people[a].name).join(", ")}`);
      lines.push(`<i>Click to connect</i>`);
    }
    return lines.join("<br>");
  }

  renderer.domElement.addEventListener("mousemove", (event) => {
    if (dragging) return;
    const id = pickAt(event);
    canvasHover = id;
    if (id) {
      const rect = renderer.domElement.getBoundingClientRect();
      tooltip.innerHTML = tooltipHtml(id);
      tooltip.style.display = "block";
      tooltip.style.left = event.clientX - rect.left + 14 + "px";
      tooltip.style.top = event.clientY - rect.top + 10 + "px";
    } else {
      tooltip.style.display = "none";
    }
  });
  renderer.domElement.addEventListener("mouseleave", () => { canvasHover = null; tooltip.style.display = "none"; });
  renderer.domElement.addEventListener("click", (event) => {
    const id = pickAt(event);
    if (!id) return;
    if (layout.nodes[id]?.hop === 2) connect(id);
    else cycleActivation(id);
  });

  // -------------------------------------------------------------------------
  // Frame loop
  // -------------------------------------------------------------------------
  const clock = new THREE.Clock();
  const dummyColor = new THREE.Color();
  let growAccum = 0;
  let playAccum = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsedTime();
    const k = 1 - Math.exp(-dt * 3.4);

    if (state.playing) {
      playAccum += dt;
      if (playAccum > 0.45) {
        playAccum = 0;
        if (state.year >= YEAR_MAX) { state.playing = false; syncPlay(); }
        else setYear(state.year + 1);
      }
    }
    if (state.autoGrow) {
      growAccum += dt;
      if (growAccum > 1.6) { growAccum = 0; autoGrowStep(); }
    }

    const active = hover || canvasHover;
    const highlightSet = active ? neighborhood(active) : null;

    // You.
    const pulse = 1 + Math.sin(t * 2.2) * 0.08;
    youMesh.scale.setScalar(pulse);
    halo.scale.setScalar(1 + ((t * 0.6) % 1) * 1.6);
    halo.material.opacity = 0.55 * (1 - ((t * 0.6) % 1));

    // Nodes.
    for (const [id, obj] of Object.entries(nodeObjs)) {
      const g = obj.target;
      if (!g) continue;
      const c = obj.cur;
      c.x = lerp(c.x, g.x, k); c.y = lerp(c.y, g.y, k); c.z = lerp(c.z, g.z, k);
      c.scale = lerp(c.scale, g.scale, k);
      const visible = c.scale > 0.02;
      obj.mesh.visible = visible;
      obj.label.visible = visible && (g.hop === 1 || active === id || (highlightSet && highlightSet.has(id)));
      if (!visible) continue;
      const bob = Math.sin(t * 1.1 + hashString(id) * 6.28) * 0.04;
      obj.mesh.position.set(c.x, c.y + bob, c.z);
      obj.mesh.scale.setScalar(c.scale);
      obj.label.position.set(c.x, c.y + bob + 0.45 * c.scale + 0.2, c.z);
      const dim = highlightSet && !highlightSet.has(id);
      const since = flash[id] !== undefined ? t - flash[id] : 99;
      const flashAmt = since < 1.2 ? (1 - since / 1.2) : 0;
      obj.mesh.material.color.copy(obj.color);
      obj.mesh.material.emissive.copy(obj.color).multiplyScalar(0.25 + flashAmt * 0.9 + (active === id ? 0.4 : 0));
      obj.mesh.material.opacity = dim ? 0.25 : 1;
      obj.label.material.opacity = dim ? 0.15 : 0.95;
    }

    // Edges.
    let v = 0;
    const put = (x, y, z, col) => {
      linePos[v * 3] = x; linePos[v * 3 + 1] = y; linePos[v * 3 + 2] = z;
      lineCol[v * 3] = col.r; lineCol[v * 3 + 1] = col.g; lineCol[v * 3 + 2] = col.b;
      v++;
    };
    const posOf = (id) => (id === "you" ? { x: 0, y: 0, z: 0 } : nodeObjs[id]?.cur);
    for (const e of layout.edges) {
      if (v / 2 >= MAX_EDGES) break;
      const pa = posOf(e.a), pb = posOf(e.b);
      if (!pa || !pb) continue;
      const scale = (e.b === "you" || e.a === "you") ? 1 : Math.min(nodeObjs[e.a]?.cur.scale ?? 1, nodeObjs[e.b]?.cur.scale ?? 1);
      if (scale < 0.02) continue;
      let w = e.weight * Math.min(1, scale);
      if (e.kind === "tie") w *= 0.85 + 0.15 * Math.sin(t * 2.2 + hashString(e.b) * 6.28);
      if (highlightSet) w *= highlightSet.has(e.a) && highlightSet.has(e.b) ? 1.4 : 0.15;
      dummyColor.setHex(e.color).lerp(BG_COLOR, 1 - Math.min(1, w));
      put(pa.x, pa.y, pa.z, dummyColor);
      put(pb.x, pb.y, pb.z, dummyColor);
    }
    lineGeo.setDrawRange(0, v);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // Camera.
    if (state.viewpoint === "first") {
      if (!dragging && t - lastDrag > 2) yaw += dt * 0.12;
      camera.position.set(0, 0.45, 0);
      camera.lookAt(Math.sin(yaw) * Math.cos(pitch), 0.45 + Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    } else {
      controls.update();
    }
    renderer.render(scene, camera);
  }

  /** Ids lit up when hovering `id`: itself, you, and its direct links in the layout. */
  function neighborhood(id) {
    const set = new Set([id, "you"]);
    for (const e of layout.edges) {
      if (e.a === id) set.add(e.b);
      if (e.b === id) set.add(e.a);
    }
    return set;
  }

  syncPlay();
  syncViewpoint();
  apply();
  frame();

  return {
    state,
    model,
    apply,
    connect,
    cycleActivation,
    setAllActivation,
    setYear,
    setViewpoint,
    layout: () => layout,
  };
}

/**
 * Org Topology — an animated Three.js model of an organization's shape under AI.
 *
 * The organization is a cone. Leadership sits at the center and top,
 * user-facing staff at the outer edge and bottom, administrative staff in the
 * band between. The vertical axis is hierarchy: one layer per rung, so a
 * flatter organization is literally shorter.
 *
 * Variables (the "matrix of considerations"):
 *   size          small (1–10) · medium (<100) · large (hundreds) · xl (2000+)
 *   ai            0..1 — how much administrative and coordination work is automated
 *   strategy      reallocate (headcount stable, freed staff move to new work)
 *                 or reduce (freed staff leave)
 *   meaningful    0..1 — how readily meaningful new work can be identified;
 *                 reallocation is only viable to this extent, the remainder
 *                 shows up as unassigned staff
 *
 * Hypothesis rendered: as AI rises, layers collapse, the admin band thins,
 * emergent roles appear, human-to-human contact thickens at the edge while
 * human-to-AI contact thickens in the admin band.
 *
 * Every node keeps a stable identity across parameter changes, so a person
 * freed from administration visibly travels to their new role instead of
 * being replaced by a new dot.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ---------------------------------------------------------------------------
// Parameters and palette
// ---------------------------------------------------------------------------

const BG = 0x0b0e1a;
const LAYER_GAP = 1.5;
const GOLDEN = 2.399963229728653;

export const SIZES = {
  small:  { label: "Small",       headcount: 8,    lead: 1,   admin: 2,    baseLayers: 2, minLayers: 1 },
  medium: { label: "Medium",      headcount: 60,   lead: 4,   admin: 20,   baseLayers: 4, minLayers: 2 },
  large:  { label: "Large",       headcount: 400,  lead: 20,  admin: 160,  baseLayers: 6, minLayers: 3 },
  xl:     { label: "Extra large", headcount: 2400, lead: 100, admin: 1100, baseLayers: 8, minLayers: 3 },
};

// Share of administrative work that automation can absorb at ai = 1, and the
// share of leadership/management rungs that disappear when layers collapse.
const ADMIN_AUTOMATABLE = 0.75;
const LEAD_COLLAPSIBLE = 0.4;

export const ROLES = {
  leadership: { label: "Leadership",      color: 0xe8a33d },
  admin:      { label: "Administrative",  color: 0x6f86d6 },
  edge:       { label: "User-facing",     color: 0xe86f5a },
  emergent:   { label: "Emergent work",   color: 0x5ad19a },
  unassigned: { label: "Unassigned",      color: 0x4a4f63 },
  removed:    { label: "Departed",        color: 0x000000 },
};

const AGENT_COLOR = 0x4fd1e8;
const PUBLIC_COLOR = 0xf0c9a8;
const H2H_COLOR = new THREE.Color(0xe86f5a);
const H2AI_COLOR = new THREE.Color(0x4fd1e8);

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------------------
// Model — pure functions from parameters to a layout, so they can be tested
// and reasoned about without a renderer.
// ---------------------------------------------------------------------------

/**
 * Composition of the org for a parameter set. Counts are integers; the sum of
 * the role counts equals headcount (reallocate) or headcount minus departed
 * (reduce).
 */
export function composeOrg({ size, ai, strategy, meaningful }) {
  const def = SIZES[size];
  const base = {
    lead: def.lead,
    admin: def.admin,
    edge: def.headcount - def.lead - def.admin,
  };

  const leadRemaining = Math.max(1, Math.round(base.lead * (1 - LEAD_COLLAPSIBLE * ai)));
  const adminRemaining = Math.round(base.admin * (1 - ADMIN_AUTOMATABLE * ai));
  const freed = (base.lead - leadRemaining) + (base.admin - adminRemaining);

  let emergent = 0;
  let toEdge = 0;
  let unassigned = 0;
  let removed = 0;
  if (strategy === "reallocate") {
    const placed = Math.round(freed * meaningful);
    emergent = Math.round(placed * 0.6);
    toEdge = placed - emergent;
    unassigned = freed - placed;
  } else {
    removed = freed;
  }

  const layers = Math.max(
    def.minLayers,
    Math.round(def.baseLayers - (def.baseLayers - def.minLayers) * ai)
  );

  const edge = base.edge + toEdge;
  const headcount = def.headcount - removed;
  const agents = Math.ceil((adminRemaining + emergent) * ai * 0.5);
  const h2hRate = 0.3 + 0.6 * ai;
  const h2h = Math.round(edge * h2hRate);
  const h2ai = Math.round((adminRemaining + emergent) * ai);

  return {
    base,
    headcount,
    layers,
    height: (layers - 1) * LAYER_GAP,
    counts: { leadership: leadRemaining, admin: adminRemaining, edge, emergent, unassigned, removed },
    freed,
    agents,
    contacts: { h2h, h2ai },
    viability: freed === 0 ? 1 : (freed - unassigned - removed) / freed,
  };
}

/**
 * Assign each of the baseline headcount a role for this composition. Identity
 * is positional: index 0.. are leadership by seniority, then admin, then edge.
 * Freed staff are the most junior leaders and the most senior admins — the
 * middle of the cone hollows out first.
 */
export function assignRoles(size, comp) {
  const def = SIZES[size];
  const roles = new Array(def.headcount);
  const { base, counts } = comp;

  for (let i = 0; i < def.headcount; i++) {
    if (i < base.lead) roles[i] = i < counts.leadership ? "leadership" : "freed";
    else if (i < base.lead + base.admin) {
      const a = i - base.lead;
      roles[i] = a >= base.admin - counts.admin ? "admin" : "freed";
    } else roles[i] = "edge";
  }

  // Distribute freed staff into their destinations in a stable order.
  const order = [];
  for (let i = 0; i < roles.length; i++) if (roles[i] === "freed") order.push(i);
  let k = 0;
  const take = (n, role) => { for (let j = 0; j < n && k < order.length; j++, k++) roles[order[k]] = role; };
  take(counts.emergent, "emergent");
  take(counts.edge - base.edge, "edge");
  take(counts.unassigned, "unassigned");
  take(counts.removed, "removed");
  while (k < order.length) roles[order[k++]] = "unassigned";

  return roles;
}

/** Radius of the outer edge for a given headcount. */
export function orgRadius(headcount) {
  return 2.4 + Math.sqrt(headcount) * 0.42;
}

/**
 * Position, color and scale for one node. `rank` is the node's position
 * within its role band (0 = most senior / innermost).
 */
function placeNode({ role, rank, rankCount, layers, R, angle, jitter }) {
  const leadLayers = Math.max(1, Math.floor(layers * 0.3));
  const adminLayers = Math.max(1, layers - 1 - leadLayers);
  const frac = rankCount <= 1 ? 0 : rank / (rankCount - 1);
  let r, layer;

  switch (role) {
    case "leadership":
      r = 0.4 + frac * R * 0.18;
      layer = layers - 1 - Math.min(leadLayers - 1, Math.floor(frac * leadLayers));
      break;
    case "admin":
      r = R * (0.3 + frac * 0.32);
      layer = layers <= 2 ? 0 : Math.max(1, adminLayers - Math.floor(frac * adminLayers));
      break;
    case "emergent":
      r = R * (0.48 + frac * 0.36);
      layer = layers <= 2 ? 0 : 1;
      break;
    case "unassigned":
      r = R * (0.62 + frac * 0.06);
      layer = 0;
      break;
    case "removed":
      r = R * 1.6;
      layer = -2;
      break;
    default: // edge
      r = R * (0.72 + frac * 0.28);
      layer = 0;
  }

  const y = layer * LAYER_GAP + jitter.y * 0.25;
  const a = angle + jitter.a * 0.08;
  return {
    x: Math.cos(a) * (r + jitter.r * R * 0.02),
    y,
    z: Math.sin(a) * (r + jitter.r * R * 0.02),
    scale: role === "removed" ? 0 : role === "unassigned" ? 0.75 : 1,
    color: ROLES[role].color,
    layer,
    angle: a,
    r,
  };
}

/** Full target layout for a parameter set: one entry per baseline node. */
export function layoutOrg(params, jitters) {
  const comp = composeOrg(params);
  const roles = assignRoles(params.size, comp);
  const R = orgRadius(SIZES[params.size].headcount);

  const counts = {};
  const ranks = new Array(roles.length);
  roles.forEach((role, i) => {
    ranks[i] = counts[role] || 0;
    counts[role] = ranks[i] + 1;
  });

  const nodes = roles.map((role, i) =>
    placeNode({
      role,
      rank: ranks[i],
      rankCount: counts[role],
      layers: comp.layers,
      R,
      angle: i * GOLDEN,
      jitter: jitters[i],
    })
  );
  nodes.forEach((n, i) => { n.role = roles[i]; });

  return { comp, roles, nodes, R };
}

// ---------------------------------------------------------------------------
// Scene helpers
// ---------------------------------------------------------------------------

function makeLabelSprite(text, colorHex, width = 4.6) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = "500 44px Palatino, 'Iowan Old Style', Georgia, serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
  ctx.fillText(text.toUpperCase(), 256, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.85, depthWrite: false })
  );
  sprite.scale.set(width, width * 0.1875, 1);
  return sprite;
}

function makeRing(radius, color, opacity) {
  const pts = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );
}

function buildGround(R) {
  const group = new THREE.Group();
  group.add(makeRing(R * 0.22, ROLES.leadership.color, 0.35));
  group.add(makeRing(R * 0.3, ROLES.admin.color, 0.25));
  group.add(makeRing(R * 0.64, ROLES.admin.color, 0.25));
  group.add(makeRing(R * 0.7, ROLES.edge.color, 0.3));
  group.add(makeRing(R * 1.02, ROLES.edge.color, 0.45));
  return group;
}

/**
 * Band labels. They live outside the rotating world group and are placed each
 * frame relative to the camera, so on screen Administrative always reads
 * directly below Leadership and User-facing below and to the right.
 */
function buildBandLabels(R) {
  const group = new THREE.Group();
  const lead = makeLabelSprite("Leadership", ROLES.leadership.color, R * 0.5);
  const admin = makeLabelSprite("Administrative", ROLES.admin.color, R * 0.6);
  const edge = makeLabelSprite("User-facing", ROLES.edge.color, R * 0.6);
  group.add(lead, admin, edge);
  group.userData = { lead, admin, edge, R };
  return group;
}

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function placeBandLabels(labels, camera, target) {
  const { lead, admin, edge, R } = labels.userData;
  // Screen-down in world space is the horizontal direction toward the camera;
  // screen-right is forward × up.
  _fwd.subVectors(target, camera.position);
  _fwd.y = 0;
  if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
  _fwd.normalize();
  _right.crossVectors(_fwd, _up).normalize();
  const down = _fwd.clone().negate();

  lead.position.set(0, -0.35, 0).addScaledVector(down, R * 0.08);
  admin.position.set(0, -0.35, 0).addScaledVector(down, R * 0.47);
  edge.position.set(0, -0.35, 0).addScaledVector(down, R * 0.62).addScaledVector(_right, R * 0.62);
}

/** A vertical hierarchy axis with one tick per layer. Rebuilt on layer change. */
function buildAxis(layers, R) {
  const group = new THREE.Group();
  const x = -R * 1.18;
  const top = (layers - 1) * LAYER_GAP;
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, 0),
        new THREE.Vector3(x, Math.max(top, 0.01), 0),
      ]),
      new THREE.LineBasicMaterial({ color: 0xa8a090, transparent: true, opacity: 0.6 })
    )
  );
  for (let l = 0; l < layers; l++) {
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x - 0.25, l * LAYER_GAP, 0),
          new THREE.Vector3(x + 0.25, l * LAYER_GAP, 0),
        ]),
        new THREE.LineBasicMaterial({ color: 0xa8a090, transparent: true, opacity: 0.6 })
      )
    );
  }
  const label = makeLabelSprite(`${layers} layer${layers === 1 ? "" : "s"}`, 0xa8a090, 3.2);
  label.position.set(x, top + 0.6, 0);
  group.add(label);
  return group;
}

// ---------------------------------------------------------------------------
// Scene assembly
// ---------------------------------------------------------------------------

export function renderOrgTopology(containerId, ui = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const params = { size: "small", ai: 0, strategy: "reallocate", meaningful: 0.7 };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 40, 120);

  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.1,
    400
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.49;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff2dc, 1.1);
  key.position.set(18, 30, 12);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.4);
  fill.position.set(-20, 10, -15);
  scene.add(fill);

  const world = new THREE.Group();
  scene.add(world);

  // --- people ---------------------------------------------------------------
  const MAX_PEOPLE = Math.max(...Object.values(SIZES).map((s) => s.headcount));
  const people = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }),
    MAX_PEOPLE
  );
  people.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  world.add(people);

  // --- AI agents ------------------------------------------------------------
  const MAX_AGENTS = MAX_PEOPLE;
  const agents = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.16, 0),
    new THREE.MeshStandardMaterial({
      color: AGENT_COLOR,
      emissive: AGENT_COLOR,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    }),
    MAX_AGENTS
  );
  agents.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  agents.count = 0;
  world.add(agents);

  // --- the public (people outside the org, at the edge) ----------------------
  const publicMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.11, 8, 8),
    new THREE.MeshStandardMaterial({ color: PUBLIC_COLOR, roughness: 0.8, transparent: true, opacity: 0.8 }),
    MAX_PEOPLE
  );
  publicMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  publicMesh.count = 0;
  world.add(publicMesh);

  // --- contact lines --------------------------------------------------------
  const MAX_LINES = MAX_PEOPLE * 2;
  const linePos = new Float32Array(MAX_LINES * 2 * 3);
  const lineCol = new Float32Array(MAX_LINES * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(
    lineGeo,
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 })
  );
  lines.frustumCulled = false;
  world.add(lines);

  // --- static furniture, rebuilt on size / layer change ---------------------
  let ground = null;
  let labels = null;
  let axis = null;
  let axisLayers = -1;

  // --- per-node animation state --------------------------------------------
  const rand = mulberry32(20260913);
  const jitters = Array.from({ length: MAX_PEOPLE }, () => ({
    y: rand() - 0.5,
    a: rand() - 0.5,
    r: rand() - 0.5,
    phase: rand() * Math.PI * 2,
  }));
  const cur = Array.from({ length: MAX_PEOPLE }, () => ({
    x: 0, y: 0, z: 0, scale: 0, color: new THREE.Color(0x000000),
  }));
  const tgt = Array.from({ length: MAX_PEOPLE }, () => ({
    x: 0, y: 0, z: 0, scale: 0, color: new THREE.Color(0x000000),
  }));

  let layout = null;
  let contacts = { h2h: [], h2ai: [] }; // index pairs into people / agents / public
  let agentSlots = [];                  // { angle, r, y }
  let publicSlots = [];                 // { angle, r }
  let cameraTarget = { dist: 30, height: 12 };

  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();

  // -------------------------------------------------------------------------
  // Apply parameters: compute a new layout and set every node's target.
  // -------------------------------------------------------------------------
  function apply() {
    layout = layoutOrg(params, jitters);
    const { comp, nodes, R } = layout;
    const def = SIZES[params.size];

    // People targets.
    for (let i = 0; i < MAX_PEOPLE; i++) {
      const t = tgt[i];
      if (i < nodes.length) {
        const n = nodes[i];
        t.x = n.x; t.y = n.y; t.z = n.z; t.scale = n.scale;
        t.color.setHex(n.color);
      } else {
        t.scale = 0;
        t.x = cur[i].x; t.y = cur[i].y; t.z = cur[i].z;
      }
    }
    // Nodes entering from nothing start at the center, not at (0,0,0) mid-air.
    for (let i = 0; i < nodes.length; i++) {
      if (cur[i].scale === 0 && nodes[i].scale > 0 && !cur[i].seen) {
        cur[i].x = 0; cur[i].y = comp.height; cur[i].z = 0;
        cur[i].color.copy(tgt[i].color);
        cur[i].seen = true;
      }
    }

    // AI agents hover over the admin band, evenly spaced by angle.
    agentSlots = [];
    const agentY = comp.layers <= 2 ? LAYER_GAP * 0.7 : LAYER_GAP * 1.6;
    for (let a = 0; a < comp.agents; a++) {
      const angle = a * GOLDEN + 0.7;
      const r = R * (0.36 + ((a * 7) % 5) * 0.06);
      agentSlots.push({ angle, r, y: agentY });
    }

    // The public: one outside contact per h2h link, sitting just past the edge.
    contacts = { h2h: [], h2ai: [] };
    publicSlots = [];
    const edgeIdx = [];
    const insideIdx = [];
    nodes.forEach((n, i) => {
      if (n.role === "edge") edgeIdx.push(i);
      if (n.role === "admin" || n.role === "emergent") insideIdx.push(i);
    });
    const h2hStep = comp.contacts.h2h === 0 ? Infinity : edgeIdx.length / comp.contacts.h2h;
    for (let k = 0; k < comp.contacts.h2h; k++) {
      const i = edgeIdx[Math.min(edgeIdx.length - 1, Math.floor(k * h2hStep))];
      if (i === undefined) break;
      const n = nodes[i];
      publicSlots.push({ angle: n.angle + jitters[i].a * 0.15, r: R * 1.12 + jitters[i].r * 0.4 });
      contacts.h2h.push([i, publicSlots.length - 1]);
    }
    const h2aiStep = comp.contacts.h2ai === 0 ? Infinity : insideIdx.length / comp.contacts.h2ai;
    for (let k = 0; k < comp.contacts.h2ai && agentSlots.length > 0; k++) {
      const i = insideIdx[Math.min(insideIdx.length - 1, Math.floor(k * h2aiStep))];
      if (i === undefined) break;
      // Nearest agent by angle.
      let best = 0;
      let bestD = Infinity;
      const na = ((nodes[i].angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      agentSlots.forEach((s, j) => {
        const sa = ((s.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const d = Math.min(Math.abs(na - sa), Math.PI * 2 - Math.abs(na - sa));
        if (d < bestD) { bestD = d; best = j; }
      });
      contacts.h2ai.push([i, best]);
    }

    // Furniture.
    if (!ground || ground.userData.R !== R) {
      if (ground) world.remove(ground);
      ground = buildGround(R);
      ground.userData.R = R;
      world.add(ground);
      if (labels) scene.remove(labels);
      labels = buildBandLabels(R);
      scene.add(labels);
      cameraTarget = { dist: R * 3.0 + 6, height: R * 0.9 + 4 };
      if (!camera.userData.placed) {
        camera.position.set(cameraTarget.dist * 0.7, cameraTarget.height, cameraTarget.dist * 0.7);
        camera.userData.placed = true;
      }
    }
    if (!axis || axisLayers !== comp.layers || axis.userData.R !== R) {
      if (axis) world.remove(axis);
      axis = buildAxis(comp.layers, R);
      axis.userData.R = R;
      axisLayers = comp.layers;
      world.add(axis);
    }
    controls.target.set(0, comp.height * 0.45, 0);

    renderStats(comp, def);
  }

  // -------------------------------------------------------------------------
  // Stats panel
  // -------------------------------------------------------------------------
  const statsEl = ui.stats ? document.getElementById(ui.stats) : null;

  function renderStats(comp, def) {
    if (!statsEl) return;
    const c = comp.counts;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const row = (label, value, color) =>
      `<div class="org-stat"><span class="org-stat-swatch" style="background:${color ? `#${color.toString(16).padStart(6, "0")}` : "transparent"}"></span><span>${label}</span><span class="org-stat-value">${value}</span></div>`;
    const rows = [
      row("Headcount", `${comp.headcount} / ${def.headcount}`),
      row("Layers", `${comp.layers} (${comp.height.toFixed(1)} tall)`),
      row(ROLES.leadership.label, c.leadership, ROLES.leadership.color),
      row(ROLES.admin.label, c.admin, ROLES.admin.color),
      row(ROLES.edge.label, c.edge, ROLES.edge.color),
      row(ROLES.emergent.label, c.emergent, ROLES.emergent.color),
      row(ROLES.unassigned.label, c.unassigned, ROLES.unassigned.color),
      row(ROLES.removed.label, c.removed, 0x2a2e3c),
      row("AI agents", comp.agents, AGENT_COLOR),
      row("Human ↔ human (edge)", comp.contacts.h2h, ROLES.edge.color),
      row("Human ↔ AI (admin)", comp.contacts.h2ai, AGENT_COLOR),
      row("Freed staff in meaningful work", comp.freed === 0 ? "—" : pct(comp.viability)),
    ];
    statsEl.innerHTML = rows.join("");
  }

  // -------------------------------------------------------------------------
  // Controls wiring
  // -------------------------------------------------------------------------
  const el = (id) => (id ? document.getElementById(id) : null);
  const sizeButtons = ui.sizeButtons ? el(ui.sizeButtons) : null;
  const aiSlider = el(ui.aiSlider);
  const aiValue = el(ui.aiValue);
  const meaningfulSlider = el(ui.meaningfulSlider);
  const meaningfulValue = el(ui.meaningfulValue);
  const strategyButtons = ui.strategyButtons ? el(ui.strategyButtons) : null;
  const playBtn = el(ui.playBtn);

  function syncButtons(group, attr, value) {
    if (!group) return;
    group.querySelectorAll(`[data-${attr}]`).forEach((b) => {
      b.classList.toggle("org-btn-active", b.dataset[attr] === value);
    });
  }

  if (sizeButtons) {
    sizeButtons.addEventListener("click", (e) => {
      const b = e.target.closest("[data-size]");
      if (!b) return;
      params.size = b.dataset.size;
      syncButtons(sizeButtons, "size", params.size);
      apply();
    });
    syncButtons(sizeButtons, "size", params.size);
  }
  if (strategyButtons) {
    strategyButtons.addEventListener("click", (e) => {
      const b = e.target.closest("[data-strategy]");
      if (!b) return;
      params.strategy = b.dataset.strategy;
      syncButtons(strategyButtons, "strategy", params.strategy);
      apply();
    });
    syncButtons(strategyButtons, "strategy", params.strategy);
  }
  if (aiSlider) {
    aiSlider.value = String(Math.round(params.ai * 100));
    aiSlider.addEventListener("input", () => {
      params.ai = clamp01(Number(aiSlider.value) / 100);
      if (aiValue) aiValue.textContent = `${Math.round(params.ai * 100)}%`;
      apply();
    });
    if (aiValue) aiValue.textContent = `${Math.round(params.ai * 100)}%`;
  }
  if (meaningfulSlider) {
    meaningfulSlider.value = String(Math.round(params.meaningful * 100));
    meaningfulSlider.addEventListener("input", () => {
      params.meaningful = clamp01(Number(meaningfulSlider.value) / 100);
      if (meaningfulValue) meaningfulValue.textContent = `${Math.round(params.meaningful * 100)}%`;
      apply();
    });
    if (meaningfulValue) meaningfulValue.textContent = `${Math.round(params.meaningful * 100)}%`;
  }

  let playing = false;
  let playT = 0;
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Play AI adoption";
      playBtn.classList.toggle("org-btn-active", playing);
    });
  }

  // -------------------------------------------------------------------------
  // Frame loop
  // -------------------------------------------------------------------------
  const clock = new THREE.Clock();
  let lastApplied = -1;

  // Scripted camera orbit: tween the polar angle (0 = top-down) around the
  // controls target over a duration. Used by capture scenarios; harmless when idle.
  let orbit = null; // { fromPhi, toPhi, start, duration }
  const spherical = new THREE.Spherical();
  const offset = new THREE.Vector3();

  function orbitTo(polar, durationMs = 3000) {
    offset.subVectors(camera.position, controls.target);
    spherical.setFromVector3(offset);
    orbit = {
      fromPhi: spherical.phi,
      toPhi: Math.max(0.05, Math.min(controls.maxPolarAngle, polar)),
      start: clock.getElapsedTime(),
      duration: durationMs / 1000,
    };
  }

  function tickOrbit(t) {
    if (!orbit) return;
    const u = Math.min(1, (t - orbit.start) / orbit.duration);
    const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    offset.subVectors(camera.position, controls.target);
    spherical.setFromVector3(offset);
    spherical.phi = lerp(orbit.fromPhi, orbit.toPhi, eased);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    if (u >= 1) orbit = null;
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsedTime();

    if (playing) {
      playT += dt;
      const ai = (1 - Math.cos(playT * 0.35)) / 2; // 0 → 1 → 0, ~18 s per cycle
      const stepped = Math.round(ai * 100);
      if (stepped !== lastApplied) {
        lastApplied = stepped;
        params.ai = stepped / 100;
        if (aiSlider) aiSlider.value = String(stepped);
        if (aiValue) aiValue.textContent = `${stepped}%`;
        apply();
      }
    }

    const k = 1 - Math.exp(-dt * 3.2);
    const R = layout ? layout.R : 10;

    // People.
    for (let i = 0; i < MAX_PEOPLE; i++) {
      const c = cur[i];
      const g = tgt[i];
      c.x = lerp(c.x, g.x, k);
      c.y = lerp(c.y, g.y, k);
      c.z = lerp(c.z, g.z, k);
      c.scale = lerp(c.scale, g.scale, k);
      c.color.lerp(g.color, k);
      const bob = Math.sin(t * 1.3 + jitters[i].phase) * 0.05;
      dummy.position.set(c.x, c.y + 0.18 + bob, c.z);
      const s = c.scale < 0.01 ? 0.0001 : c.scale;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      people.setMatrixAt(i, dummy.matrix);
      people.setColorAt(i, c.color);
    }
    people.instanceMatrix.needsUpdate = true;
    if (people.instanceColor) people.instanceColor.needsUpdate = true;

    // Agents.
    agents.count = agentSlots.length;
    agentSlots.forEach((s, j) => {
      const spin = t * 0.9 + j;
      dummy.position.set(
        Math.cos(s.angle) * s.r,
        s.y + Math.sin(t * 1.7 + j) * 0.12,
        Math.sin(s.angle) * s.r
      );
      dummy.rotation.set(0, spin, 0);
      dummy.scale.set(1, 1.4, 1);
      dummy.updateMatrix();
      agents.setMatrixAt(j, dummy.matrix);
    });
    agents.instanceMatrix.needsUpdate = true;

    // Public.
    publicMesh.count = publicSlots.length;
    publicSlots.forEach((s, j) => {
      dummy.position.set(Math.cos(s.angle) * s.r, 0.11 + Math.sin(t + j) * 0.03, Math.sin(s.angle) * s.r);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      publicMesh.setMatrixAt(j, dummy.matrix);
    });
    publicMesh.instanceMatrix.needsUpdate = true;

    // Contact lines follow the animated positions so they never lag the nodes.
    let v = 0;
    const put = (x, y, z, col, pulse) => {
      linePos[v * 3] = x; linePos[v * 3 + 1] = y; linePos[v * 3 + 2] = z;
      tmpColor.copy(col).multiplyScalar(pulse);
      lineCol[v * 3] = tmpColor.r; lineCol[v * 3 + 1] = tmpColor.g; lineCol[v * 3 + 2] = tmpColor.b;
      v++;
    };
    contacts.h2h.forEach(([i, p], n) => {
      const c = cur[i];
      const s = publicSlots[p];
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + n * 0.7);
      put(c.x, c.y + 0.18, c.z, H2H_COLOR, pulse);
      put(Math.cos(s.angle) * s.r, 0.11, Math.sin(s.angle) * s.r, H2H_COLOR, pulse);
    });
    contacts.h2ai.forEach(([i, a], n) => {
      const c = cur[i];
      const s = agentSlots[a];
      if (!s) return;
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.1 + n * 0.9);
      put(c.x, c.y + 0.18, c.z, H2AI_COLOR, pulse);
      put(Math.cos(s.angle) * s.r, s.y, Math.sin(s.angle) * s.r, H2AI_COLOR, pulse);
    });
    lineGeo.setDrawRange(0, v);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // Camera eases toward the framing for the current org size.
    const want = new THREE.Vector3().subVectors(camera.position, controls.target);
    const wantLen = want.length();
    const wantDist = cameraTarget.dist;
    if (Math.abs(wantLen - wantDist) > 0.5) {
      want.setLength(lerp(wantLen, wantDist, 1 - Math.exp(-dt * 1.5)));
      camera.position.copy(controls.target).add(want);
    }

    tickOrbit(t);
    world.rotation.y += dt * 0.04;
    controls.update();
    if (labels) placeBandLabels(labels, camera, controls.target);
    renderer.render(scene, camera);
  }

  apply();
  frame();

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return {
    params,
    apply,
    set(patch) { Object.assign(params, patch); apply(); },
    compose: () => composeOrg(params),
    orbitTo,
  };
}

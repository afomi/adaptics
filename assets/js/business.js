/**
 * /business — a Three.js workspace of businesses as resource flow.
 *
 * Each model (a café, a household, a landlord…) is a platform holding one
 * column per stock. Named inputs arrive from the left, named outputs leave to
 * the right; particles ride each flow at a speed and density set by its rate.
 * Models combine by linking an output to another model's input — an arc
 * carries that share across. Latent stocks (interest) are ghosts.
 *
 * Two dials on the view:
 *   layout  parts  every model, with link arcs between them
 *           whole  the combination as one business — only the flows that
 *                  still cross its outer boundary
 *   view    single     one instant; scrub or play the months
 *           snapshots  the same workspace at several named months, on one
 *                      shared scale, so states are directly comparable
 *
 * The model (business_model.js) is pure; this file draws and edits. The
 * workspace is saved in this browser and exports/imports as JSON.
 *
 * Returned API (window.business): { workspace, select, addModel, link,
 * setTime, setLayout, setView, pin, load }.
 */

import * as THREE from "three";
import { createStage, makeSprite, hexColor } from "./three_stage.js";
import {
  RESOURCES,
  TEMPLATES,
  flowsOf,
  resourcesOf,
  isCoupled,
  simulate,
  stateAt,
  extents,
  depletedAt,
  netFlows,
  instantiate,
  modelById,
  validLinks,
  validateWorkspace,
  linkOptions,
  suggestShare,
  linkId,
  combine,
  projectState,
  wholeSpec,
  wholeState,
  updateModel,
  removeModel,
  renameFlow,
  removeFlow,
  setLink,
  defaultWorkspace,
  parseWorkspace,
} from "./business_model.js";

const BG = 0x0b0e1a;
const STORAGE_KEY = "adaptics.business.workspace.v1";
const PLATFORM_R = 2.6;
const COLUMN_MAX_H = 4.2;
const PORT_X = 6.2;
const MODEL_GAP = 20;
const ROW_GAP = 18;
const PARTICLES_PER_FLOW = 14;
const CONSTRAINED_COLOR = 0xff4d4d;
const SELECTED_COLOR = 0xe8b84a;

const fmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------------------------------------------------------------------------
// Geometry for one state of one model
// ---------------------------------------------------------------------------

/** Where each stock's column stands: a row across the platform, facing the viewer. */
function columnPositions(resources) {
  const positions = {};
  const spacing = 1.1;
  const offset = ((resources.length - 1) * spacing) / 2;
  resources.forEach((r, i) => {
    positions[r] = new THREE.Vector3(i * spacing - offset, 0, 0);
  });
  return positions;
}

/** Ports fan out in an arc on their side, one per named flow. */
function portPositions(flows) {
  const positions = {};
  for (const direction of ["in", "out"]) {
    const side = flows.filter((f) => f.direction === direction);
    const sign = direction === "in" ? -1 : 1;
    side.forEach((flow, i) => {
      const u = side.length === 1 ? 0 : i / (side.length - 1) - 0.5;
      positions[flow.name] = new THREE.Vector3(
        sign * (PORT_X - Math.abs(u) * 1.6),
        0.6 + (side.length === 1 ? 1.2 : (0.5 - Math.abs(u)) * 1.4),
        u * Math.min(12, side.length * 1.7)
      );
    });
  }
  return positions;
}

/** Height of a column: sqrt-scaled against the timeline maximum. */
function columnHeight(value, max) {
  if (!max) return 0.02;
  return Math.max(0.02, Math.sqrt(Math.max(0, value) / max) * COLUMN_MAX_H);
}

/** Particles riding a curve; shared by flows and links. */
function makeParticles(group, count, color) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true })
    );
    p.userData.u = i / count;
    group.add(p);
    list.push(p);
  }
  return list;
}

function moveParticles(particles, curve, intensity, color, dt) {
  const speed = 0.08 + 0.45 * intensity;
  const visible = Math.ceil(particles.length * Math.sqrt(intensity));
  particles.forEach((p, i) => {
    p.visible = i < visible && intensity > 0.002;
    if (!p.visible) return;
    p.userData.u = (p.userData.u + speed * dt) % 1;
    p.position.copy(curve.getPointAt(p.userData.u));
    p.material.opacity = 0.25 + 0.75 * Math.sin(p.userData.u * Math.PI);
    p.material.color.setHex(color);
  });
}

function disposeGroup(group) {
  group.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
}

/**
 * Build the scene objects for one model. Returns a group plus `apply(state)`
 * to move columns, labels and flow intensities to a state, `animate(dt)` to
 * advance particles, and `portAt(name)` for link arcs.
 */
function buildBusiness(spec, ext, { compact = false } = {}) {
  const group = new THREE.Group();
  const resources = resourcesOf(spec);
  const flows = flowsOf(spec);
  const columns = columnPositions(resources);
  const ports = portPositions(flows);
  const pickables = [];

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(PLATFORM_R, PLATFORM_R * 1.05, 0.18, 64),
    new THREE.MeshStandardMaterial({ color: 0x1a2036, roughness: 0.8, metalness: 0.1 })
  );
  platform.position.y = -0.09;
  platform.userData = { kind: "model" };
  group.add(platform);
  pickables.push(platform);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(PLATFORM_R, 0.025, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0xd8d2c0, transparent: true, opacity: 0.35 })
  );
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  const columnObjs = {};
  for (const r of resources) {
    const def = RESOURCES[r];
    const geometry = new THREE.CylinderGeometry(0.42, 0.42, 1, 32, 1, !def.latent);
    geometry.translate(0, 0.5, 0);
    const material = def.latent
      ? new THREE.MeshBasicMaterial({ color: def.color, wireframe: true, transparent: true, opacity: 0.45 })
      : new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.45, metalness: 0.15, emissive: def.color, emissiveIntensity: 0.12 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(columns[r]);
    mesh.userData = { kind: "stock", resource: r };
    group.add(mesh);
    pickables.push(mesh);

    // Ceiling ring marks the timeline maximum, so a column reads as a fill level.
    const ceiling = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.012, 6, 40),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.3 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.copy(columns[r]).setY(COLUMN_MAX_H);
    group.add(ceiling);

    const label = makeSprite("", hexColor(def.color), 0.8);
    group.add(label);
    columnObjs[r] = { mesh, label, height: 0.02, target: 0.02 };
  }

  const flowObjs = {};
  for (const flow of flows) {
    const def = RESOURCES[flow.resource];
    const port = ports[flow.name];
    const top = columns[flow.resource].clone().setY(1.2);
    const mid = port.clone().lerp(top, 0.5).setY(Math.max(port.y, top.y) + 1.2);
    const curve = new THREE.CatmullRomCurve3(flow.direction === "in" ? [port, mid, top] : [top, mid, port]);

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.035, 6, false),
      new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.18 })
    );
    group.add(tube);

    const bead = new THREE.Mesh(
      flow.conserved === false ? new THREE.OctahedronGeometry(0.22) : new THREE.SphereGeometry(0.2, 20, 14),
      new THREE.MeshStandardMaterial({ color: def.color, emissive: def.color, emissiveIntensity: 0.25 })
    );
    bead.position.copy(port);
    bead.userData = { kind: "flow", name: flow.name };
    group.add(bead);
    pickables.push(bead);

    const label = makeSprite("", "#d8dcec", 0.7);
    label.visible = !compact;
    label.userData.anchor = { port, sign: flow.direction === "in" ? -1 : 1 };
    group.add(label);

    const particles = makeParticles(group, PARTICLES_PER_FLOW, def.color);
    flowObjs[flow.name] = { flow, curve, tube, bead, label, particles, intensity: 0, constrained: false };
  }

  let titleSprite = makeSprite("", "#e8e4d4", 1.3);
  titleSprite.position.set(0, COLUMN_MAX_H + 1.4, 0);
  group.add(titleSprite);

  let state = null;

  function setText(sprite, text, color, scale) {
    if (sprite.userData.text === text) return sprite;
    const fresh = makeSprite(text, color, scale);
    fresh.position.copy(sprite.position);
    fresh.visible = sprite.visible;
    fresh.userData.text = text;
    fresh.userData.anchor = sprite.userData.anchor;
    group.remove(sprite);
    sprite.material.map.dispose();
    sprite.material.dispose();
    group.add(fresh);
    return fresh;
  }

  function apply(next, title) {
    state = next;
    for (const r of resources) {
      const obj = columnObjs[r];
      const value = next.stocks[r] || 0;
      obj.target = columnHeight(value, ext.stocks[r]);
      obj.label = setText(obj.label, `${RESOURCES[r].label} ${fmt(value)}`, hexColor(RESOURCES[r].color), 0.8);
    }
    for (const obj of Object.values(flowObjs)) {
      const f = next.flows[obj.flow.name] || { rate: 0, constrained: false };
      obj.intensity = Math.min(1, f.rate / (ext.flows[obj.flow.name] || 1));
      obj.constrained = f.constrained;
      const unit = RESOURCES[obj.flow.resource].unit;
      const text = `${obj.flow.name} ${fmt(f.rate)} ${unit}/mo${f.constrained ? " !" : ""}`;
      obj.label = setText(obj.label, text, f.constrained ? hexColor(CONSTRAINED_COLOR) : "#d8dcec", 0.7);
      // Labels sit outside their port, reading away from the model, so they never cross its tubes.
      const { port, sign } = obj.label.userData.anchor;
      obj.label.position.copy(port).add(new THREE.Vector3(sign * (obj.label.scale.x / 2 + 0.35), 0, 0));
      obj.tube.material.opacity = 0.06 + 0.3 * obj.intensity;
      obj.bead.material.emissive.setHex(f.constrained ? CONSTRAINED_COLOR : RESOURCES[obj.flow.resource].color);
      obj.bead.scale.setScalar(0.6 + 0.8 * Math.sqrt(obj.intensity));
    }
    if (title !== undefined) titleSprite = setText(titleSprite, title, "#e8e4d4", 1.3);
  }

  function animate(dt) {
    for (const r of resources) {
      const obj = columnObjs[r];
      obj.height += (obj.target - obj.height) * Math.min(1, dt * 6);
      obj.mesh.scale.y = obj.height;
      obj.label.position.copy(columns[r]).setY(obj.height + 0.35);
    }
    for (const obj of Object.values(flowObjs)) {
      const color = obj.constrained ? CONSTRAINED_COLOR : RESOURCES[obj.flow.resource].color;
      moveParticles(obj.particles, obj.curve, obj.intensity, color, dt);
    }
  }

  function highlight(on) {
    rim.material.color.setHex(on ? SELECTED_COLOR : 0xd8d2c0);
    rim.material.opacity = on ? 0.9 : 0.35;
  }

  const portAt = (name) => (ports[name] ? group.localToWorld(ports[name].clone()) : null);

  return { group, spec, apply, animate, highlight, portAt, pickables, state: () => state };
}

/** An arc carrying a link's share from one model's output port to another's input port. */
function buildLink(scene, p0, p1, resource, compact) {
  const group = new THREE.Group();
  const lift = 2.4 + p0.distanceTo(p1) * 0.12;
  const mid = p0.clone().lerp(p1, 0.5);
  mid.y = Math.max(p0.y, p1.y) + lift;
  const curve = new THREE.CatmullRomCurve3([p0, mid, p1]);
  const color = RESOURCES[resource].color;
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 64, 0.06, 8, false),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
  );
  group.add(tube);
  const particles = makeParticles(group, PARTICLES_PER_FLOW + 6, color);
  let label = makeSprite("", hexColor(color), 0.75);
  label.position.copy(mid).add(new THREE.Vector3(0, 0.45, 0));
  label.visible = !compact;
  group.add(label);
  scene.add(group);

  let intensity = 0;
  let constrained = false;
  return {
    group,
    apply(text, nextIntensity, nextConstrained) {
      intensity = nextIntensity;
      constrained = nextConstrained;
      tube.material.opacity = 0.15 + 0.45 * intensity;
      if (label.userData.text !== text) {
        const fresh = makeSprite(text, nextConstrained ? hexColor(CONSTRAINED_COLOR) : hexColor(color), 0.75);
        fresh.position.copy(label.position);
        fresh.visible = label.visible;
        fresh.userData.text = text;
        group.remove(label);
        label.material.map.dispose();
        label.material.dispose();
        group.add(fresh);
        label = fresh;
      }
    },
    animate(dt) {
      moveParticles(particles, curve, intensity, constrained ? CONSTRAINED_COLOR : color, dt);
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function renderBusiness(containerId, ids = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const el = (key) => (ids[key] ? document.getElementById(ids[key]) : null);

  const { scene, camera, renderer, controls, tooltip } = createStage(container, {
    background: BG,
    fog: [50, 140],
    far: 260,
    cameraPosition: [0, 9, 17],
  });

  const grid = new THREE.GridHelper(300, 150, 0x1c2238, 0x141a2c);
  grid.position.y = -0.2;
  scene.add(grid);

  const app = {
    ws: null,
    selected: null,
    layout: "parts",
    view: "single",
    t: 0,
    playing: false,
    notice: null,
    combined: null,
    timeline: [],
    linkExt: {},
    members: {}, // id → { timeline, ext }
    whole: null, // { spec, timeline, ext }
    instances: [],
    links: [],
    frameKey: null,
  };

  // --- persistence ---------------------------------------------------------

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(app.ws));
    } catch (_) {
      // Storage unavailable (private window, blocked); the page works without it.
    }
  }

  function restore() {
    let text = null;
    try {
      text = localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      text = null;
    }
    if (!text) return defaultWorkspace();
    const parsed = parseWorkspace(text);
    if (parsed.ok) return parsed.workspace;
    app.notice = `Saved workspace couldn't be read (${parsed.error}); started from the example.`;
    return defaultWorkspace();
  }

  // --- model ---------------------------------------------------------------

  function recompute() {
    const ws = app.ws;
    app.combined = combine(ws);
    app.timeline = simulate(app.combined);
    app.linkExt = extents(app.timeline).flows;
    app.members = {};
    for (const m of ws.models) {
      const timeline = app.timeline.map((s) => projectState(ws, app.combined, s, m.id));
      app.members[m.id] = { timeline, ext: extents(timeline) };
    }
    const spec = wholeSpec(ws, app.combined);
    const timeline = app.timeline.map((s) => wholeState(spec, s));
    app.whole = { spec, timeline, ext: extents(timeline) };
  }

  /** Apply an edit: save, re-simulate, redraw panel and scene. */
  function commit(ws) {
    app.ws = ws;
    if (!modelById(ws, app.selected)) app.selected = ws.models[0]?.id ?? null;
    app.t = Math.min(app.t, ws.months);
    save();
    recompute();
    renderPanel();
    rebuild();
  }

  // --- scene ---------------------------------------------------------------

  function rebuild() {
    for (const inst of app.instances) {
      scene.remove(inst.group);
      disposeGroup(inst.group);
    }
    for (const link of app.links) {
      scene.remove(link.group);
      disposeGroup(link.group);
    }
    app.instances = [];
    app.links = [];

    const columns =
      app.layout === "whole" ? [{ whole: true }] : app.ws.models.map((m) => ({ id: m.id }));
    const rows =
      app.view === "single" ? [{ t: null, name: null }] : app.ws.snapshots.map((s) => ({ t: s.t, name: s.name }));
    const compact = app.view !== "single" || columns.length > 2;
    const spread = columns.length === 1;
    const offsetX = ((spread ? rows.length : columns.length) - 1) * MODEL_GAP / 2;

    rows.forEach((row, r) => {
      const byId = {};
      columns.forEach((col, c) => {
        const spec = col.whole ? app.whole.spec : modelById(app.ws, col.id);
        const ext = col.whole ? app.whole.ext : app.members[col.id].ext;
        const inst = buildBusiness(spec, ext, { compact });
        inst.col = col;
        inst.row = row;
        inst.group.position.set((spread ? r : c) * MODEL_GAP - offsetX, 0, spread ? 0 : -r * ROW_GAP);
        inst.group.updateMatrixWorld(true);
        scene.add(inst.group);
        app.instances.push(inst);
        if (col.id) byId[col.id] = inst;
      });

      if (app.layout === "parts") {
        for (const l of app.combined.links) {
          const a = byId[l.from.model];
          const b = byId[l.to.model];
          if (!a || !b) continue;
          const resource = modelById(app.ws, l.from.model).outputs.find((f) => f.name === l.from.flow).resource;
          const link = buildLink(scene, a.portAt(l.from.flow), b.portAt(l.to.flow), resource, compact);
          link.def = l;
          link.row = row;
          app.links.push(link);
        }
      }
    });

    applyAll();
    const key = `${app.layout}|${app.view}|${columns.length}|${rows.length}`;
    if (key !== app.frameKey) frame(spread ? rows.length : columns.length, spread ? 1 : rows.length);
    app.frameKey = key;
  }

  function applyAll() {
    for (const inst of app.instances) {
      const t = inst.row.t ?? app.t;
      const name = inst.col.whole
        ? `Whole · ${app.ws.models.length} model${app.ws.models.length === 1 ? "" : "s"}`
        : modelById(app.ws, inst.col.id).name;
      const title = inst.row.name ? `${name} · ${inst.row.name}` : name;
      const timeline = inst.col.whole ? app.whole.timeline : app.members[inst.col.id].timeline;
      inst.apply(stateAt(timeline, t), title);
      inst.highlight(!inst.col.whole && inst.col.id === app.selected);
    }
    for (const link of app.links) {
      const t = link.row.t ?? app.t;
      const f = stateAt(app.timeline, t).flows[linkId(link.def)] || { rate: 0, constrained: false };
      const max = app.linkExt[linkId(link.def)] || 1;
      const unit = RESOURCES[modelById(app.ws, link.def.from.model).outputs.find((x) => x.name === link.def.from.flow).resource].unit;
      const text = `${Math.round(link.def.share * 100)}% ${link.def.from.flow} → ${link.def.to.flow} · ${fmt(f.rate)} ${unit}/mo`;
      link.apply(text, Math.min(1, f.rate / max), f.constrained);
    }
    renderStats();
    syncTime();
  }

  /**
   * Fit `across` models side by side (and `deep` rows behind) into the part of
   * the canvas the panel leaves free: distance from the horizontal field of
   * view, then slide the view so the scene centres in the free area.
   */
  function frame(across, deep) {
    const halfWidth = ((across - 1) * MODEL_GAP) / 2 + PORT_X + 6;
    const depth = Math.max(0, (deep - 1) * ROW_GAP);
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect;
    const panel = document.querySelector(".biz-panel");
    const free = panel ? Math.max(0.4, 1 - (panel.offsetWidth + 24) / container.clientWidth) : 1;
    const distance = Math.max(16, halfWidth / (tanHalf * free)) + depth * 0.15;
    const shift = -(1 - free) * tanHalf * distance;
    controls.target.set(shift, 1.6, -depth / 2);
    camera.position.set(shift, 1.6 + distance * 0.42 + depth * 0.5, distance * 0.92);
    // Fog follows the framing so back rows of a snapshot grid stay legible.
    scene.fog.near = distance * 1.2 + depth;
    scene.fog.far = distance * 3 + depth * 2;
  }

  // --- panel ---------------------------------------------------------------

  function renderPanel() {
    renderModels();
    renderEditor();
    renderIssues();
    renderSnapshots();
    markActive("layouts", "layout", app.layout);
    markActive("views", "view", app.view);
  }

  function renderModels() {
    const box = el("models");
    if (!box) return;
    box.innerHTML = app.ws.models
      .map(
        (m) =>
          `<button class="biz-chip${m.id === app.selected ? " biz-chip-active" : ""}" data-model="${m.id}">${esc(m.name)}</button>`
      )
      .join("");
  }

  function resourceSelect(value) {
    return (
      `<select data-f="resource">` +
      Object.entries(RESOURCES)
        .map(([key, def]) => `<option value="${key}"${key === value ? " selected" : ""}>${def.label}</option>`)
        .join("") +
      `</select>`
    );
  }

  function amountCell(flow, linkedRate) {
    if (linkedRate !== null) return `<span class="biz-amount-note">${fmt(linkedRate)} via link</span>`;
    if (isCoupled(flow)) {
      const of = [...new Set(flow.terms.flatMap((t) => t.of))].join(", ");
      return (
        `<span class="biz-amount-note" title="Rate scales with ${esc(of)}">∝ ${esc(of)}</span>` +
        `<input type="number" data-f="scale" min="0" max="500" step="5" value="${Math.round((flow.scale ?? 1) * 100)}" title="Scale %">`
      );
    }
    return `<input type="number" data-f="base" min="0" step="0.1" value="${flow.base ?? 0}" title="Per month">`;
  }

  function renderEditor() {
    const box = el("editor");
    if (!box) return;
    const m = modelById(app.ws, app.selected);
    if (!m) {
      box.innerHTML = `<p class="biz-empty">No models yet — add one above.</p>`;
      return;
    }
    const links = validLinks(app.ws);
    const unit = (f) => RESOURCES[f.resource].unit;

    const stocks = resourcesOf(m)
      .map(
        (r) =>
          `<label class="biz-stock-field">${RESOURCES[r].label}` +
          `<input type="number" data-stock="${r}" min="0" step="1" value="${m.stocks[r] ?? 0}">` +
          `<span>${RESOURCES[r].unit}</span></label>`
      )
      .join("");

    const inputs = m.inputs
      .map((f) => {
        const link = app.ws.links.find((l) => l.to.model === m.id && l.to.flow === f.name);
        const applied = link && links.includes(link);
        const linkedRate = applied
          ? stateAt(app.members[m.id].timeline, 0).flows[f.name]?.rate ?? 0
          : null;
        const options = linkOptions(app.ws, m.id, f.name)
          .map((o) => {
            const value = `${o.from.model}|${o.from.flow}`;
            const selected = link && link.from.model === o.from.model && link.from.flow === o.from.flow;
            const disabled = !o.ok && !selected;
            const text = disabled ? `${o.label} — ${o.reason}` : `${o.label} (${fmt(o.rate)} ${unit(f)}/mo)`;
            return `<option value="${esc(value)}"${selected ? " selected" : ""}${disabled ? " disabled" : ""}>${esc(text)}</option>`;
          })
          .join("");
        const share = link
          ? `<input type="number" data-f="share" min="1" max="100" step="1" value="${Math.round(link.share * 100)}" title="Share of the source">%`
          : "";
        return (
          `<div class="biz-flowbox" data-dir="in" data-flow="${esc(f.name)}">` +
          `<div class="biz-flow-row"><input data-f="name" value="${esc(f.name)}" aria-label="Input name">` +
          `${resourceSelect(f.resource)}${amountCell(f, linkedRate)}` +
          `<button class="biz-x" data-action="remove-flow" title="Remove">×</button></div>` +
          `<div class="biz-feed${link && !applied ? " biz-feed-bad" : ""}">fed by ` +
          `<select data-f="source"><option value="">outside</option>${options}</select>${share}</div>` +
          `</div>`
        );
      })
      .join("");

    const outputs = m.outputs
      .map((f) => {
        const feeds = links.filter((l) => l.from.model === m.id && l.from.flow === f.name);
        const used = feeds.reduce((s, l) => s + l.share, 0);
        const feedText = feeds.length
          ? feeds
              .map((l) => `→ ${esc(modelById(app.ws, l.to.model).name)} · ${esc(l.to.flow)} ${Math.round(l.share * 100)}%`)
              .join("<br>") + (used < 0.995 ? `<br>→ outside ${Math.round((1 - used) * 100)}%` : "")
          : "→ outside";
        return (
          `<div class="biz-flowbox" data-dir="out" data-flow="${esc(f.name)}">` +
          `<div class="biz-flow-row"><input data-f="name" value="${esc(f.name)}" aria-label="Output name">` +
          `${resourceSelect(f.resource)}${amountCell(f, null)}` +
          `<button class="biz-x" data-action="remove-flow" title="Remove">×</button></div>` +
          `<div class="biz-feed">${feedText}${f.conserved === false ? " · ◇ not conserved" : ""}</div>` +
          `</div>`
        );
      })
      .join("");

    box.innerHTML =
      `<div class="biz-ed-head"><input class="biz-ed-name" data-model-name value="${esc(m.name)}" aria-label="Model name">` +
      `<button class="biz-btn biz-btn-quiet" data-action="remove-model">Remove</button></div>` +
      `<div class="biz-subhead">Holds at month 0</div><div class="biz-stocks">${stocks}</div>` +
      `<div class="biz-subhead">Inputs <button class="biz-add" data-action="add-flow" data-dir="in">+ input</button></div>${inputs}` +
      `<div class="biz-subhead">Outputs <button class="biz-add" data-action="add-flow" data-dir="out">+ output</button></div>${outputs}`;
  }

  function renderIssues() {
    const box = el("issues");
    if (!box) return;
    const items = validateWorkspace(app.ws).map((i) => ({ level: i.level, text: i.text }));
    for (const m of app.ws.models) {
      const month = depletedAt(app.members[m.id].timeline, "money");
      if (month !== null) items.push({ level: "warning", text: `${m.name} runs out of money at month ${month}` });
    }
    if (app.notice) items.unshift({ level: "error", text: app.notice });
    box.innerHTML = items.length
      ? items.map((i) => `<div class="biz-issue biz-issue-${i.level}">${esc(i.text)}</div>`).join("")
      : `<div class="biz-issue biz-issue-ok">Valid: every link joins matching flows, nothing over-allocated.</div>`;
  }

  function renderStats() {
    const stats = el("stats");
    if (!stats) return;
    const whole = app.layout === "whole" || !app.selected;
    const spec = whole ? app.whole.spec : modelById(app.ws, app.selected);
    const timeline = whole ? app.whole.timeline : app.members[app.selected].timeline;
    const state = stateAt(timeline, app.t);
    const net = netFlows(spec, state);
    const head = whole
      ? `Whole · ${spec.inputs.length} in, ${spec.outputs.length} out, ${app.combined.links.length} link${app.combined.links.length === 1 ? "" : "s"} inside`
      : `${spec.name} · month ${app.t.toFixed(1)}`;
    const rows = resourcesOf(spec).map((r) => {
      const def = RESOURCES[r];
      const n = net[r] || 0;
      return (
        `<div class="biz-stat"><span class="biz-swatch" style="background:${hexColor(def.color)}"></span>` +
        `${def.label}${def.latent ? " <em>latent</em>" : ""}` +
        `<span class="biz-stat-value">${fmt(state.stocks[r] || 0)} ${def.unit}</span>` +
        `<span class="biz-net ${n >= 0 ? "up" : "down"}">${n >= 0 ? "+" : ""}${fmt(n)}/mo</span></div>`
      );
    });
    stats.innerHTML = `<div class="biz-stat-head">${esc(head)}</div>${rows.join("")}`;
  }

  function renderSnapshots() {
    const box = el("snapshots");
    if (!box) return;
    box.innerHTML = app.ws.snapshots
      .map(
        (s, i) =>
          `<div class="biz-snap" data-index="${i}"><input class="biz-snap-name" value="${esc(s.name)}" aria-label="Snapshot name">` +
          `<span class="biz-snap-t">m${s.t}</span><button class="biz-x" title="Remove">×</button></div>`
      )
      .join("");
  }

  function markActive(key, attr, value) {
    el(key)?.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("biz-btn-active", b.dataset[attr] === value);
    });
  }

  function syncTime() {
    const slider = el("time");
    if (slider) {
      slider.max = String(app.ws.months);
      slider.value = String(app.t);
    }
    const value = el("timeValue");
    if (value) value.textContent = `month ${app.t.toFixed(1)} of ${app.ws.months}`;
  }

  // --- edits ---------------------------------------------------------------

  function editFlow(dir, name, fn) {
    const listKey = dir === "in" ? "inputs" : "outputs";
    commit(
      updateModel(app.ws, app.selected, (m) => {
        m[listKey] = m[listKey].map((f) => (f.name === name ? fn({ ...f }) : f));
        return m;
      })
    );
  }

  function uniqueFlowName(m, dir, base) {
    const names = new Set((dir === "in" ? m.inputs : m.outputs).map((f) => f.name));
    let name = base;
    for (let i = 2; names.has(name); i++) name = `${base} ${i}`;
    return name;
  }

  function onEditorChange(event) {
    const target = event.target;
    const m = modelById(app.ws, app.selected);
    if (!m) return;
    if (target.hasAttribute("data-model-name")) {
      commit(updateModel(app.ws, m.id, (x) => ({ ...x, name: target.value.trim() || x.name })));
      return;
    }
    if (target.dataset.stock) {
      const value = Math.max(0, Number(target.value) || 0);
      commit(updateModel(app.ws, m.id, (x) => ({ ...x, stocks: { ...x.stocks, [target.dataset.stock]: value } })));
      return;
    }
    const box = target.closest(".biz-flowbox");
    if (!box) return;
    const { dir, flow } = box.dataset;
    const field = target.dataset.f;
    if (field === "name") {
      const name = target.value.trim();
      const list = dir === "in" ? m.inputs : m.outputs;
      if (!name || (name !== flow && list.some((f) => f.name === name))) {
        target.value = flow;
        target.setCustomValidity(name ? `${m.name} already has ${dir === "in" ? "an input" : "an output"} named "${name}"` : "A flow needs a name");
        target.reportValidity();
        target.setCustomValidity("");
        return;
      }
      commit(renameFlow(app.ws, m.id, dir, flow, name));
    } else if (field === "resource") {
      editFlow(dir, flow, (f) => ({ ...f, resource: target.value }));
    } else if (field === "base") {
      editFlow(dir, flow, (f) => ({ ...f, base: Math.max(0, Number(target.value) || 0) }));
    } else if (field === "scale") {
      editFlow(dir, flow, (f) => ({ ...f, scale: Math.max(0, Number(target.value) || 0) / 100 }));
    } else if (field === "source") {
      const to = { model: m.id, flow };
      if (!target.value) {
        commit(setLink(app.ws, to, null));
      } else {
        const [model, ...rest] = target.value.split("|");
        const from = { model, flow: rest.join("|") };
        const cleared = setLink(app.ws, to, null);
        commit(setLink(app.ws, to, from, suggestShare(cleared, from, to) ?? 0.01));
      }
    } else if (field === "share") {
      const link = app.ws.links.find((l) => l.to.model === m.id && l.to.flow === flow);
      if (!link) return;
      const share = Math.min(1, Math.max(0.01, (Number(target.value) || 0) / 100));
      commit(setLink(app.ws, link.to, link.from, share));
    }
  }

  function onEditorClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const m = modelById(app.ws, app.selected);
    if (!m) return;
    const action = button.dataset.action;
    if (action === "remove-model") {
      commit(removeModel(app.ws, m.id));
    } else if (action === "add-flow") {
      const dir = button.dataset.dir;
      const listKey = dir === "in" ? "inputs" : "outputs";
      const name = uniqueFlowName(m, dir, dir === "in" ? "Input" : "Output");
      commit(updateModel(app.ws, m.id, (x) => ({ ...x, [listKey]: [...x[listKey], { name, resource: "money", base: 1 }] })));
    } else if (action === "remove-flow") {
      const box = button.closest(".biz-flowbox");
      commit(removeFlow(app.ws, m.id, box.dataset.dir, box.dataset.flow));
    }
  }

  // --- API -----------------------------------------------------------------

  function select(id) {
    if (!modelById(app.ws, id)) return;
    app.selected = id;
    renderModels();
    renderEditor();
    applyAll();
  }

  function addModel(templateKey) {
    if (!TEMPLATES[templateKey]) return null;
    const model = instantiate(app.ws, templateKey);
    app.selected = model.id;
    commit({ ...app.ws, models: [...app.ws.models, model] });
    return model.id;
  }

  function link(fromModel, fromFlow, toModel, toFlow, share) {
    const from = { model: fromModel, flow: fromFlow };
    const to = { model: toModel, flow: toFlow };
    const cleared = setLink(app.ws, to, null);
    commit(setLink(app.ws, to, from, share ?? suggestShare(cleared, from, to) ?? 0.01));
  }

  function setTime(t) {
    app.t = Math.max(0, Math.min(app.ws.months, t));
    applyAll();
  }

  function setLayout(layout) {
    app.layout = layout === "whole" ? "whole" : "parts";
    markActive("layouts", "layout", app.layout);
    rebuild();
  }

  function setView(view) {
    app.view = view === "snapshots" ? "snapshots" : "single";
    markActive("views", "view", app.view);
    rebuild();
  }

  function pin(name) {
    const t = Math.round(app.t);
    const snapshots = [...app.ws.snapshots, { t, name: name || `Month ${t}` }].sort((a, b) => a.t - b.t);
    commit({ ...app.ws, snapshots });
  }

  /** Load workspace JSON; returns { ok, error } so callers can say what happened. */
  function load(text) {
    const parsed = parseWorkspace(text);
    if (!parsed.ok) return parsed;
    app.notice = null;
    app.selected = parsed.workspace.models[0]?.id ?? null;
    commit(parsed.workspace);
    return { ok: true, models: parsed.workspace.models.length };
  }

  // --- wiring --------------------------------------------------------------

  const templateSelect = el("template");
  if (templateSelect) {
    templateSelect.innerHTML = Object.entries(TEMPLATES)
      .map(([key, t]) => `<option value="${key}">${esc(t.label)}</option>`)
      .join("");
  }
  el("add")?.addEventListener("click", () => addModel(templateSelect?.value || "simple"));
  el("models")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-model]");
    if (chip) select(chip.dataset.model);
  });
  el("editor")?.addEventListener("change", onEditorChange);
  el("editor")?.addEventListener("click", onEditorClick);
  el("layouts")?.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => setLayout(b.dataset.layout)));
  el("views")?.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  el("time")?.addEventListener("input", (e) => {
    app.playing = false;
    if (el("play")) el("play").textContent = "Play months";
    setTime(Number(e.target.value));
  });
  el("play")?.addEventListener("click", () => {
    app.playing = !app.playing;
    if (app.playing && app.t >= app.ws.months) setTime(0);
    if (app.playing && app.view !== "single") setView("single");
    el("play").textContent = app.playing ? "Pause" : "Play months";
  });
  el("pin")?.addEventListener("click", () => pin());
  el("snapshots")?.addEventListener("change", (e) => {
    const row = e.target.closest("[data-index]");
    if (!row) return;
    const i = Number(row.dataset.index);
    commit({ ...app.ws, snapshots: app.ws.snapshots.map((s, j) => (j === i ? { ...s, name: e.target.value } : s)) });
  });
  el("snapshots")?.addEventListener("click", (e) => {
    const row = e.target.closest("[data-index]");
    if (!row || !e.target.closest("button")) return;
    const i = Number(row.dataset.index);
    commit({ ...app.ws, snapshots: app.ws.snapshots.filter((_, j) => j !== i) });
  });

  const jsonBox = el("json");
  const jsonStatus = el("jsonStatus");
  const say = (text, ok) => {
    if (!jsonStatus) return;
    jsonStatus.textContent = text;
    jsonStatus.className = ok ? "biz-json-ok" : "biz-json-bad";
  };
  // Fill the box when opened, but never over text someone has typed or pasted.
  jsonBox?.addEventListener("input", () => (jsonBox.dataset.edited = "1"));
  el("jsonPanel")?.addEventListener("toggle", (e) => {
    if (e.target.open && jsonBox && jsonBox.dataset.edited !== "1") jsonBox.value = JSON.stringify(app.ws, null, 2);
  });
  el("copy")?.addEventListener("click", async () => {
    const text = JSON.stringify(app.ws, null, 2);
    if (jsonBox) jsonBox.value = text;
    try {
      await navigator.clipboard.writeText(text);
      say(`Copied ${app.ws.models.length} models, ${app.ws.links.length} links.`, true);
    } catch (err) {
      say(`Couldn't copy (${err.message}); the JSON is in the box above.`, false);
    }
  });
  el("load")?.addEventListener("click", () => {
    const result = load(jsonBox?.value || "");
    if (result.ok && jsonBox) delete jsonBox.dataset.edited;
    say(result.ok ? `Loaded ${result.models} models.` : result.error, result.ok);
  });
  el("reset")?.addEventListener("click", () => {
    app.notice = null;
    app.selected = null;
    commit(defaultWorkspace());
    say("Reset to the example.", true);
  });

  // Hover: name and value of a stock, flow or model under the pointer.
  // Click (without dragging) on a platform selects that model.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const pickables = app.instances.flatMap((inst) => inst.pickables.map((m) => ({ m, inst })));
    const hits = raycaster.intersectObjects(pickables.map((p) => p.m), false);
    // Prefer columns and ports over the platform beneath them.
    const hit = hits.find((h) => h.object.userData.kind !== "model") || hits[0];
    return hit ? { ...pickables.find((p) => p.m === hit.object), rect } : null;
  }

  renderer.domElement.addEventListener("pointermove", (event) => {
    const hit = pick(event);
    if (!hit) {
      tooltip.style.display = "none";
      return;
    }
    const { inst, m: mesh, rect } = hit;
    const state = inst.state();
    const data = mesh.userData;
    let html;
    if (data.kind === "stock") {
      const def = RESOURCES[data.resource];
      html =
        `<strong>${esc(inst.spec.name)} · ${def.label}</strong>${def.latent ? " · latent" : ""}<br>` +
        `${fmt(state.stocks[data.resource] || 0)} ${def.unit} at month ${state.t.toFixed(1)}`;
    } else if (data.kind === "flow") {
      const flow = flowsOf(inst.spec).find((f) => f.name === data.name);
      const f = state.flows[data.name];
      html =
        `<strong>${esc(flow.name)}</strong> · ${flow.direction === "in" ? "input" : "output"} of ${RESOURCES[flow.resource].label.toLowerCase()}<br>` +
        `${fmt(f.rate)} ${RESOURCES[flow.resource].unit}/mo` +
        (f.constrained ? ` (wanted ${fmt(f.demanded)} — stock exhausted)` : "") +
        (flow.conserved === false ? "<br>not conserved: measured, depletes nothing" : "");
    } else {
      html = inst.col.whole
        ? `<strong>Whole</strong> · the workspace as one business`
        : `<strong>${esc(inst.spec.name)}</strong> · click to edit`;
    }
    tooltip.innerHTML = html;
    tooltip.style.display = "block";
    tooltip.style.left = `${event.clientX - rect.left + 14}px`;
    tooltip.style.top = `${event.clientY - rect.top + 14}px`;
  });

  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!downAt || Math.hypot(event.clientX - downAt[0], event.clientY - downAt[1]) > 5) return;
    const hit = pick(event);
    if (hit?.inst.col.id) select(hit.inst.col.id);
  });

  // --- loop ----------------------------------------------------------------

  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(0.05, clock.getDelta());
    if (app.playing) {
      const next = app.t + dt * 1.5;
      if (next >= app.ws.months) {
        app.playing = false;
        if (el("play")) el("play").textContent = "Play months";
      }
      setTime(Math.min(next, app.ws.months));
    }
    for (const inst of app.instances) inst.animate(dt);
    for (const l of app.links) l.animate(dt);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  app.ws = restore();
  app.selected = app.ws.models[0]?.id ?? null;
  app.layout = container.dataset.startLayout === "whole" ? "whole" : "parts";
  app.view = container.dataset.startView === "snapshots" ? "snapshots" : "single";
  recompute();
  renderPanel();
  rebuild();
  tick();

  return {
    get workspace() { return app.ws; },
    get selected() { return app.selected; },
    select,
    addModel,
    link,
    setTime,
    setLayout,
    setView,
    pin,
    load,
  };
}

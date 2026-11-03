/**
 * /resonance — collaboration as overlapping emanations.
 *
 * People are sources on a dark plane. Color is vision (an angle on the color
 * wheel), the glow is reach. One shader sums every field per pixel: gold where
 * overlapping visions add up, red where they cancel, rings rippling outward in
 * step when visions agree. Dots grow with energy and turn toward whoever they
 * resonate with most.
 *
 * The model (resonance_model.js) is pure; this file draws and edits.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { makeSprite } from "./three_stage.js";
import {
  SCENES,
  step,
  pairs,
  heading,
  readout,
  relation,
  person,
  goal,
  nextName,
  wrap,
} from "./resonance_model.js";

const MAX = 24; // sources the shader can sum
const PLANE = 40;
const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const fieldShader = {
  vertexShader: /* glsl */ `
    varying vec2 vP;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vP = world.xz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    #define MAX ${MAX}
    uniform int uCount;
    uniform vec2 uPos[MAX];
    uniform float uVision[MAX];
    uniform float uReach[MAX];
    uniform float uAmp[MAX];
    uniform float uTime;
    varying vec2 vP;

    vec3 hsv(float h, float s, float v) {
      vec3 p = abs(fract(vec3(h) + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
      return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
    }

    void main() {
      vec2 sum = vec2(0.0);   // amplitudes as vectors pointing along each vision
      float power = 0.0;      // Σ a²
      float total = 0.0;      // Σ a
      vec3 tint = vec3(0.0);
      float ripple = 0.0;

      for (int i = 0; i < MAX; i++) {
        if (i >= uCount) break;
        float r = distance(vP, uPos[i]);
        float a = uAmp[i] * exp(-(r * r) / (uReach[i] * uReach[i]));
        sum += a * vec2(cos(uVision[i]), sin(uVision[i]));
        power += a * a;
        total += a;
        tint += hsv(uVision[i] / 6.28318, 0.7, 1.0) * a;
        ripple += a * cos(5.0 * r - 2.4 * uTime + uVision[i]);
      }

      // |Σ|² − Σa² = Σ_{i≠j} aᵢaⱼ·cos(Δvision): + where visions add, − where they cancel
      float meet = dot(sum, sum) - power;

      vec3 col = vec3(0.03, 0.035, 0.07);
      col += tint / (total + 1e-4) * min(total, 1.0) * 0.30;
      col += vec3(1.0, 0.76, 0.28) * max(meet, 0.0) * 1.1;
      col += vec3(0.95, 0.16, 0.22) * max(-meet, 0.0) * 1.1;
      col += vec3(0.9) * smoothstep(0.55, 1.0, ripple / (total + 1e-3)) * min(total, 1.0) * 0.07;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function hueColor(vision, s = 0.7, v = 1) {
  const c = new THREE.Color();
  // same HSV mapping as the shader, so a dot matches its field
  const h = wrap(vision) / TAU;
  const f = (n) => {
    const k = (n + h * 6) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return c.setRGB(f(5), f(3), f(1));
}

export function renderResonance(containerId, ui) {
  const container = document.getElementById(containerId);
  const $ = (id) => document.getElementById(ui[id]);

  // -- stage ------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07080f);

  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(0, 17, 12);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.minDistance = 6;
  controls.maxDistance = 40;

  const uniforms = {
    uCount: { value: 0 },
    uPos: { value: Array.from({ length: MAX }, () => new THREE.Vector2()) },
    uVision: { value: new Array(MAX).fill(0) },
    uReach: { value: new Array(MAX).fill(1) },
    uAmp: { value: new Array(MAX).fill(0) },
    uTime: { value: 0 },
  };
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(PLANE, PLANE).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms, ...fieldShader })
  );
  scene.add(field);

  const edges = new THREE.LineSegments(
    new THREE.BufferGeometry()
      .setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX * MAX * 6), 3))
      .setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX * MAX * 6), 3)),
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(edges);

  // -- state --------------------------------------------------------------------
  let world = [];
  let sceneDef = SCENES[0];
  let selected = null;
  let held = null;
  const views = new Map(); // id → { group, body, ring, arrow, label }

  function load(def) {
    sceneDef = def;
    world = def.build();
    selected = null;
    $("move").checked = def.move !== false;
    $("influence").checked = false;
    $("hint").textContent = def.hint;
    document.querySelectorAll(`#${ui.scenes} [data-scene]`).forEach((b) => {
      b.setAttribute("aria-current", b.dataset.scene === def.id ? "true" : "false");
    });
    rebuildViews();
    showSelection();
  }

  // -- entity meshes ------------------------------------------------------------
  function rebuildViews() {
    for (const v of views.values()) scene.remove(v.group);
    views.clear();

    for (const e of world) {
      const group = new THREE.Group();
      const color = hueColor(e.vision);
      const body =
        e.kind === "goal"
          ? new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color }))
          : new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), new THREE.MeshBasicMaterial({ color }));
      body.position.y = 0.35;
      body.userData.id = e.id;

      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * TAU), 0.02, Math.sin((i / 64) * TAU)))
        ),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 })
      );

      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.32, 12).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color })
      );
      arrow.position.y = 0.35;

      const label = makeSprite(e.name, "#cbd2e6", 0.75);
      label.position.y = 1.05;

      group.add(body, ring, arrow, label);
      scene.add(group);
      views.set(e.id, { group, body, ring, arrow, label, vision: e.vision });
    }
  }

  function updateViews(t) {
    for (const e of world) {
      const v = views.get(e.id);
      if (!v) continue;
      v.group.position.set(e.x, 0, e.y);

      if (v.vision !== e.vision) {
        const c = hueColor(e.vision);
        v.body.material.color.copy(c);
        v.ring.material.color.copy(c);
        v.arrow.material.color.copy(c);
        v.vision = e.vision;
      }

      const s = e.kind === "goal" ? 1 : Math.sqrt(e.energy);
      v.body.scale.setScalar(s);
      if (e.kind === "goal") v.body.rotation.y = t * 0.6;

      v.ring.scale.setScalar(e.reach);
      v.ring.material.opacity = e.id === selected ? 0.75 : 0.22;

      const h = e.kind === "person" ? heading(world, e.id) : null;
      v.arrow.visible = !!h;
      if (h) {
        const r = 0.24 * s + 0.2;
        v.arrow.position.set(h.x * r, 0.35, h.y * r);
        v.arrow.lookAt(v.group.position.x + h.x * 10, 0.35, v.group.position.z + h.y * 10);
      }
    }
  }

  function updateField(t) {
    uniforms.uTime.value = t;
    uniforms.uCount.value = Math.min(world.length, MAX);
    world.slice(0, MAX).forEach((e, i) => {
      uniforms.uPos.value[i].set(e.x, e.y);
      uniforms.uVision.value[i] = e.vision;
      uniforms.uReach.value[i] = e.reach;
      uniforms.uAmp.value[i] = e.kind === "goal" ? 0.9 : 0.45 + 0.35 * Math.sqrt(e.energy);
    });
  }

  // Gold threads pulse between resonant pairs, red ones flicker between
  // dissonant pairs, grey ones mark independent overlap.
  function updateEdges(t) {
    const pos = edges.geometry.attributes.position.array;
    const col = edges.geometry.attributes.color.array;
    const index = new Map(world.map((e) => [e.id, e]));
    let n = 0;

    pairs(world).forEach((p, k) => {
      const a = index.get(p.a);
      const b = index.get(p.b);
      let c;
      if (p.relation === "resonant") {
        c = [1, 0.75, 0.3].map((x) => x * p.resonance * (0.75 + 0.25 * Math.sin(t * 4)));
      } else if (p.relation === "dissonant") {
        c = [1, 0.2, 0.25].map((x) => x * -p.resonance * (0.6 + 0.4 * Math.sin(t * 19 + k * 1.7)));
      } else {
        c = [0.5, 0.55, 0.65].map((x) => x * p.overlap * 0.35);
      }
      pos.set([a.x, 0.35, a.y, b.x, 0.35, b.y], n * 6);
      col.set([...c, ...c], n * 6);
      n++;
    });

    edges.geometry.setDrawRange(0, n * 2);
    edges.geometry.attributes.position.needsUpdate = true;
    edges.geometry.attributes.color.needsUpdate = true;
  }

  // -- readout ------------------------------------------------------------------
  const fmt = (x) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2);
  const nameOf = (id) => world.find((e) => e.id === id)?.name ?? id;

  function updateReadout() {
    const r = readout(world);
    const total = r.constructive + r.destructive || 1;
    $("constructive").style.width = `${(100 * r.constructive) / total}%`;
    $("destructive").style.width = `${(100 * r.destructive) / total}%`;
    $("numbers").textContent =
      `constructive ${r.constructive.toFixed(2)} · destructive ${r.destructive.toFixed(2)} · coherence ${(r.coherence * 100).toFixed(0)}%`;

    const lines = [];
    if (r.strongest) lines.push(`${nameOf(r.strongest.a)} ↔ ${nameOf(r.strongest.b)} resonate (${fmt(r.strongest.resonance)})`);
    if (r.strained) lines.push(`${nameOf(r.strained.a)} ↔ ${nameOf(r.strained.b)} clash (${fmt(r.strained.resonance)})`);
    if (!lines.length) lines.push("No fields meet yet — drag someone closer.");
    $("story").textContent = lines.join(" · ");

    if (selected) {
      const e = world.find((x) => x.id === selected);
      const rel = world
        .filter((o) => o.id !== e.id && relation(e, o) !== "apart")
        .map((o) => `${o.name}: ${relation(e, o)}`);
      $("relations").textContent =
        `energy ${(e.energy * 100).toFixed(0)}%` + (rel.length ? ` · ${rel.join(" · ")}` : " · on their own");
    }
  }

  // -- selection panel ----------------------------------------------------------
  function showSelection() {
    const e = world.find((x) => x.id === selected);
    $("selected").hidden = !e;
    if (!e) return;
    $("selName").textContent = `${e.kind === "goal" ? "◆ " : ""}${e.name}`;
    $("vision").value = Math.round((e.vision * 180) / Math.PI);
    $("reach").value = e.reach;
    $("stubborn").value = e.stubbornness;
    $("stubbornRow").hidden = e.kind === "goal";
  }

  function edit(fn) {
    world = world.map((e) => (e.id === selected ? fn({ ...e }) : e));
  }

  $("vision").addEventListener("input", (ev) => edit((e) => ({ ...e, vision: wrap((ev.target.value * Math.PI) / 180) })));
  $("reach").addEventListener("input", (ev) => edit((e) => ({ ...e, reach: Number(ev.target.value) })));
  $("stubborn").addEventListener("input", (ev) => edit((e) => ({ ...e, stubbornness: Number(ev.target.value) })));
  $("remove").addEventListener("click", () => {
    world = world.filter((e) => e.id !== selected);
    selected = null;
    rebuildViews();
    showSelection();
  });

  function add(kind) {
    if (world.length >= MAX) return;
    const n = world.length + 1;
    const id = nextName(world, kind);
    const x = Math.cos(n * GOLDEN * 3) * 5;
    const y = Math.sin(n * GOLDEN * 3) * 4;
    const vision = n * GOLDEN * 2;
    world = [...world, kind === "goal" ? goal(id, x, y, vision) : person(id, x, y, vision)];
    selected = id;
    rebuildViews();
    showSelection();
  }
  $("addPerson").addEventListener("click", () => add("person"));
  $("addGoal").addEventListener("click", () => add("goal"));

  document.querySelectorAll(`#${ui.scenes} [data-scene]`).forEach((b) => {
    b.addEventListener("click", () => load(SCENES.find((s) => s.id === b.dataset.scene)));
  });

  // -- dragging -----------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let downAt = null;

  function aim(ev) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  renderer.domElement.addEventListener("pointerdown", (ev) => {
    aim(ev);
    downAt = [ev.clientX, ev.clientY];
    const hit = raycaster.intersectObjects([...views.values()].map((v) => v.body))[0];
    if (hit) {
      held = hit.object.userData.id;
      selected = held;
      controls.enabled = false;
      showSelection();
    }
  });

  renderer.domElement.addEventListener("pointermove", (ev) => {
    if (!held) {
      aim(ev);
      const over = raycaster.intersectObjects([...views.values()].map((v) => v.body)).length > 0;
      renderer.domElement.style.cursor = over ? "grab" : "";
      return;
    }
    aim(ev);
    const p = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(ground, p)) {
      const half = PLANE / 2 - 1;
      world = world.map((e) =>
        e.id === held ? { ...e, x: THREE.MathUtils.clamp(p.x, -half, half), y: THREE.MathUtils.clamp(p.z, -half, half) } : e
      );
    }
  });

  window.addEventListener("pointerup", (ev) => {
    const clicked = downAt && Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) < 4;
    if (!held && clicked && ev.target === renderer.domElement) {
      selected = null; // click on empty ground
      showSelection();
    }
    held = null;
    downAt = null;
    controls.enabled = true;
  });

  // -- loop ---------------------------------------------------------------------
  const clock = new THREE.Clock();
  let frame = 0;
  let raf;

  function tick() {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const opts = { move: $("move").checked, influence: $("influence").checked, held };
    world = step(step(world, dt / 2, opts), dt / 2, opts);

    updateField(t);
    updateViews(t);
    updateEdges(t);
    if (frame++ % 8 === 0) {
      updateReadout();
      if (selected && $("influence").checked) showSelection(); // dial follows a drifting vision
    }
    controls.update();
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", resize);

  load(SCENES[0]);
  tick();

  return {
    get world() {
      return world;
    },
    load: (id) => load(SCENES.find((s) => s.id === id)),
    stop: () => cancelAnimationFrame(raf),
  };
}

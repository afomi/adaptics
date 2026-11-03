/**
 * Neighborhood — Three.js scene of figures with identity and connection state
 *
 * A first experiment toward the coevolution model (see COEVOLUTION.md):
 * figures share one coordinate system, each carries identity and a set of
 * connections, and visibility is a function of relationship — when you take a
 * figure's point of view, its neighbors are lit and strangers fade toward the
 * ground. Connection strength drives both the tie's opacity and how far
 * awareness carries.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Identity is intrinsic to a figure; position is where it stands on the shared
// ground. Connections are directional-agnostic pairs resolved after creation.
const FIGURES = [
  { id: "ada", label: "Ada", position: [-3.2, 0, -1.4], color: 0xff8866 },
  { id: "bo", label: "Bo", position: [-1.1, 0, 1.8], color: 0x66ccff },
  { id: "cy", label: "Cy", position: [1.6, 0, 2.4], color: 0xffdd66 },
  { id: "del", label: "Del", position: [3.4, 0, 0.2], color: 0x88ff99 },
  { id: "eve", label: "Eve", position: [0.4, 0, -0.6], color: 0xcc99ff },
  { id: "fen", label: "Fen", position: [2.2, 0, -2.6], color: 0xff99cc },
  { id: "gus", label: "Gus", position: [-2.6, 0, 3.1], color: 0x99ffee },
  { id: "hal", label: "Hal", position: [-4.4, 0, 1.2], color: 0xffaa44 },
];

// strength ∈ (0,1] — how strongly two figures are bound to each other.
const CONNECTIONS = [
  { a: "ada", b: "bo", strength: 0.9 },
  { a: "ada", b: "hal", strength: 0.7 },
  { a: "bo", b: "eve", strength: 0.8 },
  { a: "bo", b: "gus", strength: 0.5 },
  { a: "eve", b: "cy", strength: 0.75 },
  { a: "eve", b: "del", strength: 0.4 },
  { a: "cy", b: "del", strength: 0.85 },
  { a: "del", b: "fen", strength: 0.6 },
  { a: "fen", b: "eve", strength: 0.35 },
  { a: "gus", b: "hal", strength: 0.45 },
];

const GROUND_COLOR = 0x0a0a1a;
const FIGURE_HEIGHT = 0.9;
const FIGURE_RADIUS = 0.22;

export function renderNeighborhood(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const statsEl = document.getElementById("neighborhood-stats");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GROUND_COLOR);
  scene.fog = new THREE.Fog(GROUND_COLOR, 12, 30);

  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 7, 11);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.5, 0);

  // Lighting
  scene.add(new THREE.AmbientLight(0x404060, 0.7));
  const directional = new THREE.DirectionalLight(0xffffff, 0.7);
  directional.position.set(5, 12, 6);
  scene.add(directional);

  // The shared ground — one coordinate system every figure stands on.
  const grid = new THREE.GridHelper(24, 24, 0x222244, 0x111133);
  scene.add(grid);

  // --- Build figures -------------------------------------------------------

  const figuresById = new Map();

  FIGURES.forEach((cfg) => {
    const group = new THREE.Group();
    group.position.set(...cfg.position);

    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: cfg.color,
      emissive: cfg.color,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 1,
    });
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(FIGURE_RADIUS, FIGURE_HEIGHT, 8, 16),
      bodyMaterial
    );
    body.position.y = FIGURE_HEIGHT / 2 + FIGURE_RADIUS;
    group.add(body);

    // A ground ring marks presence even when the figure itself is dim.
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(FIGURE_RADIUS * 1.6, FIGURE_RADIUS * 2.0, 32),
      ringMaterial
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    group.add(ring);

    const label = makeLabel(cfg.label, cfg.color);
    label.position.y = FIGURE_HEIGHT + FIGURE_RADIUS * 3;
    group.add(label);

    scene.add(group);

    figuresById.set(cfg.id, {
      ...cfg,
      group,
      body,
      bodyMaterial,
      ringMaterial,
      label,
      neighbors: new Map(), // id -> strength
    });
  });

  // --- Build connections ---------------------------------------------------

  const ties = [];

  CONNECTIONS.forEach((conn) => {
    const from = figuresById.get(conn.a);
    const to = figuresById.get(conn.b);
    if (!from || !to) return;

    from.neighbors.set(to.id, conn.strength);
    to.neighbors.set(from.id, conn.strength);

    // Ties arc above the ground so overlapping pairs stay readable.
    const start = new THREE.Vector3(...from.position);
    const end = new THREE.Vector3(...to.position);
    const mid = start.clone().lerp(end, 0.5);
    mid.y = start.distanceTo(end) * 0.22 + 0.6;

    const curve = new THREE.QuadraticBezierCurve3(
      start.clone().setY(FIGURE_HEIGHT * 0.7),
      mid,
      end.clone().setY(FIGURE_HEIGHT * 0.7)
    );

    const material = new THREE.MeshBasicMaterial({
      color: 0x8899cc,
      transparent: true,
      opacity: 0.25,
    });
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 32, 0.012 + conn.strength * 0.022, 8, false),
      material
    );
    scene.add(mesh);

    ties.push({ ...conn, mesh, material });
  });

  // --- Visibility as a function of relationship ----------------------------

  // With no point of view chosen, everyone is equally visible — an outside
  // view of the neighborhood. Once a figure is selected, presence falls off
  // with relationship: self is full, neighbors scale with tie strength, and
  // everyone else fades to a bare trace.
  let pointOfView = null;

  function presenceFor(figure) {
    if (!pointOfView) return 1;
    if (figure.id === pointOfView.id) return 1;
    const strength = pointOfView.neighbors.get(figure.id);
    if (strength === undefined) return 0.08;
    return 0.35 + strength * 0.6;
  }

  function applyVisibility() {
    figuresById.forEach((figure) => {
      const presence = presenceFor(figure);
      figure.bodyMaterial.opacity = presence;
      figure.bodyMaterial.emissiveIntensity = 0.1 + presence * 0.5;
      figure.ringMaterial.opacity = 0.1 + presence * 0.35;
      figure.label.material.opacity = presence;

      const selected = pointOfView && figure.id === pointOfView.id;
      figure.group.scale.setScalar(selected ? 1.15 : 1);
    });

    ties.forEach((tie) => {
      let opacity = 0.25;
      let color = 0x8899cc;
      if (pointOfView) {
        const touchesPov = tie.a === pointOfView.id || tie.b === pointOfView.id;
        if (touchesPov) {
          opacity = 0.35 + tie.strength * 0.55;
          color = pointOfView.color;
        } else {
          // A tie between two of your neighbors is visible but not yours.
          const bothKnown =
            pointOfView.neighbors.has(tie.a) && pointOfView.neighbors.has(tie.b);
          opacity = bothKnown ? 0.15 : 0.04;
        }
      }
      tie.material.opacity = opacity;
      tie.material.color.setHex(color);
    });

    updateStats();
  }

  function updateStats() {
    if (!statsEl) return;
    if (!pointOfView) {
      statsEl.innerHTML =
        `${figuresById.size} figures · ${ties.length} ties<br />` +
        `<span style="color:#8888aa">No point of view — outside the neighborhood.</span>`;
      return;
    }
    const neighbors = [...pointOfView.neighbors.entries()].sort(
      (a, b) => b[1] - a[1]
    );
    const named = neighbors
      .map(([id, strength]) => `${figuresById.get(id).label} ${strength.toFixed(2)}`)
      .join(", ");
    const strangers = figuresById.size - 1 - neighbors.length;
    statsEl.innerHTML =
      `Point of view: <strong>${pointOfView.label}</strong><br />` +
      `${neighbors.length} neighbors — ${named}<br />` +
      `<span style="color:#8888aa">${strangers} strangers out of reach.</span>`;
  }

  // --- Picking -------------------------------------------------------------

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const bodies = [...figuresById.values()].map((f) => f.body);

  function figureFromIntersect(object) {
    return [...figuresById.values()].find((f) => f.body === object);
  }

  function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(bodies, false);
    if (hits.length === 0) {
      // Clicking empty ground steps back out to the outside view.
      pointOfView = null;
    } else {
      const picked = figureFromIntersect(hits[0].object);
      pointOfView = pointOfView && pointOfView.id === picked.id ? null : picked;
    }
    applyVisibility();
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  // --- Loop ----------------------------------------------------------------

  function onResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // Figures breathe slightly, so presence reads as alive rather than static.
    figuresById.forEach((figure, id) => {
      const phase = id.charCodeAt(0);
      figure.body.position.y =
        FIGURE_HEIGHT / 2 + FIGURE_RADIUS + Math.sin(t * 1.2 + phase) * 0.03;
      figure.label.lookAt(camera.position);
    });

    controls.update();
    renderer.render(scene, camera);
  }

  applyVisibility();
  animate();
}

/** Canvas-texture text sprite — keeps labels legible from any camera angle. */
function makeLabel(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.font = "500 34px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), material);
  return mesh;
}

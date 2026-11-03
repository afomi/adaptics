import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(function () {
  // --- World Params ---
  const WORLD_SUPPLY_MAX = 21_000_000;
  let worldSupply = WORLD_SUPPLY_MAX;
  let balance = 100; // local player starting tokens (edit as needed)

  const state = {
    points: [], // { position: THREE.Vector3, team: string, mesh: THREE.Mesh }
    team: 'red',
    radius: 0.20,
    weights: { origin: 1.0, cluster: 1.2, cong: 0.6 },
    lastPlaced: null,
  };

  // --- UI Elts ---
  const el = (id) => document.getElementById(id);
  const balanceEl = el('balance');
  const worldSupplyEl = el('worldSupply');
  const yourDotsEl = el('yourDots');
  const yourScoreEl = el('yourScore');

  const teamSelect = el('teamSelect');
  const radiusRange = el('radius');
  const radiusLabel = el('radiusLabel');
  const wOrigin = el('wOrigin');
  const wCluster = el('wCluster');
  const wCong = el('wCong');
  const resetBtn = el('resetBtn');
  const refundBtn = el('refundBtn');

  function refreshHUD() {
    balanceEl.textContent = balance;
    worldSupplyEl.textContent = worldSupply;
    yourDotsEl.textContent = state.points.filter(p => p.isLocal).length;
    yourScoreEl.textContent = totalScore(state.points.filter(p => p.isLocal)).toFixed(3);
  }

  // --- THREE Setup ---
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1220);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.01, 100);
  camera.position.set(1.6, 1.2, 1.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  // Lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 1.0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(2, 2, 2);
  scene.add(dir);

  // Unit cube [-1,1]^3 helpers
  const cubeSize = 2; // spans -1..1
  const boxGeom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const boxEdges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeom), new THREE.LineBasicMaterial({ color: 0x334155 }));
  scene.add(boxEdges);

  // Origin axes
  const axes = new THREE.AxesHelper(0.7);
  scene.add(axes);

  // Transparent hit plane grid stack for raycasting (several z-slices)
  const rayGroup = new THREE.Group();
  for (let i = -10; i <= 10; i++) {
    const z = i / 10; // -1..1
    const planeGeom = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const plane = new THREE.Mesh(planeGeom, mat);
    plane.rotation.x = -Math.PI / 2; // make it XZ plane at varying Y
    plane.position.set(0, z, 0); // y=z (slice)
    rayGroup.add(plane);
  }
  scene.add(rayGroup);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Team colors
  const TEAM_COLORS = {
    red: 0xef4444,
    blue: 0x60a5fa,
    green: 0x34d399,
    yellow: 0xf59e0b,
    purple: 0xa78bfa,
  };

  function createDot(pos, team, isLocal = true) {
    const geo = new THREE.SphereGeometry(0.02, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color: TEAM_COLORS[team] || 0xffffff, emissive: 0x000000, roughness: 0.4, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    const dot = { position: pos.clone(), team, mesh, isLocal };
    state.points.push(dot);
    return dot;
  }

  function clampToUnitCube(v) {
    v.x = Math.max(-1, Math.min(1, v.x));
    v.y = Math.max(-1, Math.min(1, v.y));
    v.z = Math.max(-1, Math.min(1, v.z));
    return v;
  }

  function onClickPlace(event) {
    if (balance <= 0 || worldSupply <= 0) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(rayGroup.children);
    if (!hit.length) return;
    const p = hit[0].point; // x,z on plane with varying y
    // Convert plane orientation: plane is XZ at y=zslice; but .point already world-space
    // Clamp to unit cube bounds
    clampToUnitCube(p);

    // Spend 1 token
    balance -= 1;
    worldSupply -= 1;

    const dot = createDot(p, state.team, /*isLocal*/ true);
    state.lastPlaced = dot;
    refreshHUD();
  }

  renderer.domElement.addEventListener('click', onClickPlace);

  // --- Scoring ---
  const MAX_DIST = Math.sqrt(3); // corner to origin in unit cube
  function originBonus(p) {
    const d = p.position.length(); // distance to origin
    return 1 - (d / MAX_DIST); // in [0,1]
  }

  function clusterBonus(p, points, radius) {
    let same = 0, opp = 0;
    for (const q of points) {
      if (q === p) continue;
      const dist = p.position.distanceTo(q.position);
      if (dist <= radius) {
        if (q.team === p.team) same++;
        else opp++;
      }
    }
    // Diminishing returns with opposition pressure
    return same / (1 + opp);
  }

  function congestionPenalty(p, points, radius) {
    let count = 0;
    for (const q of points) {
      if (q === p) continue;
      if (p.position.distanceTo(q.position) <= radius) count++;
    }
    // Mild logarithmic tax
    return Math.log(1 + count);
  }

  function pointScore(p, points) {
    const r = state.radius;
    const w = state.weights;
    const s = (w.origin * originBonus(p)) + (w.cluster * clusterBonus(p, points, r)) - (w.cong * congestionPenalty(p, points, r));
    return s;
  }

  function totalScore(myPoints) {
    let sum = 0;
    for (const p of myPoints) { sum += pointScore(p, state.points); }
    return sum;
  }

  function recompute() {
    // Update HUD score
    refreshHUD();

    // Optional: glow consensus beacon near the densest cell
    updateConsensusBeacon();
  }

  // Simple voxel grid to find a consensus hotspot
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
  beacon.visible = false;
  scene.add(beacon);

  function updateConsensusBeacon() {
    if (state.points.length === 0) { beacon.visible = false; return; }
    const cells = new Map();
    const cellSize = Math.max(0.15, state.radius * 0.75);
    let bestKey = null, bestCount = 0, bestPos = new THREE.Vector3();
    for (const p of state.points) {
      const cx = Math.floor((p.position.x + 1) / cellSize);
      const cy = Math.floor((p.position.y + 1) / cellSize);
      const cz = Math.floor((p.position.z + 1) / cellSize);
      const key = `${cx},${cy},${cz}`;
      const cur = cells.get(key) || { count: 0, sum: new THREE.Vector3() };
      cur.count += 1;
      cur.sum.add(p.position);
      cells.set(key, cur);
      if (cur.count > bestCount) { bestCount = cur.count; bestKey = key; bestPos = cur.sum.clone().multiplyScalar(1 / cur.count); }
    }
    beacon.position.copy(bestPos);
    beacon.visible = bestCount >= 3; // show if at least 3 points coalesce
  }

  // --- UI bindings ---
  teamSelect.addEventListener('change', () => { state.team = teamSelect.value; });
  radiusRange.addEventListener('input', () => { state.radius = parseFloat(radiusRange.value); radiusLabel.textContent = state.radius.toFixed(2); recompute(); });
  wOrigin.addEventListener('input', () => { state.weights.origin = parseFloat(wOrigin.value); recompute(); });
  wCluster.addEventListener('input', () => { state.weights.cluster = parseFloat(wCluster.value); recompute(); });
  wCong.addEventListener('input', () => { state.weights.cong = parseFloat(wCong.value); recompute(); });

  resetBtn.addEventListener('click', () => {
    // remove meshes
    for (const p of state.points) { scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    state.points = [];
    worldSupply = WORLD_SUPPLY_MAX; balance = 100; state.lastPlaced = null;
    refreshHUD(); updateConsensusBeacon();
  });

  refundBtn.addEventListener('click', () => {
    const p = state.lastPlaced; if (!p) return;
    scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose();
    const idx = state.points.indexOf(p);
    if (idx >= 0) state.points.splice(idx, 1);
    balance += 1; worldSupply += 1; state.lastPlaced = null; refreshHUD(); updateConsensusBeacon();
  });

  // Animate
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
  refreshHUD();
})();

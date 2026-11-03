/**
 * Balancing 3 Rings — Three.js spline editor
 *
 * Three torus rings in 3D space connected by spline curves.
 * Drag rings to reposition; splines show tension/balance between them.
 * Color shifts from green (balanced) to red (unbalanced) based on
 * how evenly spaced the rings are.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";

export function renderBalancingRings(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 4, 8);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 5);
  scene.add(directional);

  // Grid helper
  const grid = new THREE.GridHelper(20, 20, 0x222244, 0x111133);
  scene.add(grid);

  // Create three rings (torus geometry)
  const ringConfigs = [
    { position: new THREE.Vector3(-2, 1, 0), color: 0xff6644, rotation: [0, 0, 0] },
    { position: new THREE.Vector3(2, 1, 0), color: 0x44ff66, rotation: [0, Math.PI / 3, 0] },
    { position: new THREE.Vector3(0, 1, 2), color: 0x4466ff, rotation: [Math.PI / 4, 0, 0] },
  ];

  const rings = [];
  const ringMeshes = [];

  ringConfigs.forEach((cfg) => {
    const geometry = new THREE.TorusGeometry(1, 0.08, 16, 64);
    const material = new THREE.MeshPhongMaterial({
      color: cfg.color,
      emissive: cfg.color,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(cfg.position);
    mesh.rotation.set(...cfg.rotation);
    scene.add(mesh);
    rings.push(mesh);
    ringMeshes.push(mesh);
  });

  // Spline curves connecting ring centers
  const splineMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
  });

  const splineLines = [];
  const splinePairs = [[0, 1], [1, 2], [2, 0]];

  splinePairs.forEach(() => {
    const geometry = new THREE.BufferGeometry();
    const line = new THREE.Line(geometry, splineMaterial.clone());
    scene.add(line);
    splineLines.push(line);
  });

  // Balance indicator — central point
  const balanceDotGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const balanceDotMat = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 0.5,
  });
  const balanceDot = new THREE.Mesh(balanceDotGeo, balanceDotMat);
  scene.add(balanceDot);

  // Controls
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;

  const dragControls = new DragControls(ringMeshes, camera, renderer.domElement);
  dragControls.addEventListener("dragstart", () => {
    orbitControls.enabled = false;
  });
  dragControls.addEventListener("dragend", () => {
    orbitControls.enabled = true;
  });

  function updateSplines() {
    splinePairs.forEach(([i, j], idx) => {
      const p0 = rings[i].position;
      const p1 = rings[j].position;
      const mid = new THREE.Vector3()
        .addVectors(p0, p1)
        .multiplyScalar(0.5);
      mid.y += 0.5; // arc upward

      const curve = new THREE.CatmullRomCurve3([
        p0.clone(),
        mid,
        p1.clone(),
      ]);
      const points = curve.getPoints(50);
      splineLines[idx].geometry.dispose();
      splineLines[idx].geometry = new THREE.BufferGeometry().setFromPoints(points);
    });
  }

  function computeBalance() {
    // Centroid
    const centroid = new THREE.Vector3();
    rings.forEach((r) => centroid.add(r.position));
    centroid.divideScalar(rings.length);
    balanceDot.position.copy(centroid);

    // Measure how evenly spaced — compare pairwise distances
    const dists = splinePairs.map(([i, j]) =>
      rings[i].position.distanceTo(rings[j].position)
    );
    const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
    const variance = dists.reduce((a, d) => a + (d - mean) ** 2, 0) / dists.length;
    const balance = Math.max(0, 1 - variance * 0.5); // 1 = balanced, 0 = unbalanced

    // Color shift: green (balanced) → red (unbalanced)
    const r = 1 - balance;
    const g = balance;
    const color = new THREE.Color(r, g, 0.1);
    balanceDotMat.color.copy(color);
    balanceDotMat.emissive.copy(color);

    // Update spline colors too
    splineLines.forEach((line) => {
      line.material.color.copy(color);
    });

    // Update stats display
    const statsEl = document.getElementById("rings-stats");
    if (statsEl) {
      statsEl.innerHTML =
        `Balance: ${(balance * 100).toFixed(0)}%` +
        `<br>Variance: ${variance.toFixed(3)}` +
        `<br>Distances: ${dists.map((d) => d.toFixed(2)).join(", ")}`;
    }
  }

  // Gentle ring rotation animation
  function animate() {
    requestAnimationFrame(animate);

    rings.forEach((ring, i) => {
      ring.rotation.x += 0.002 * (i + 1);
      ring.rotation.z += 0.001 * (i + 1);
    });

    updateSplines();
    computeBalance();
    orbitControls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

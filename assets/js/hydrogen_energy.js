/**
 * E = Δmc² — Hydrogen energy visualization
 *
 * Interactive Three.js scene showing hydrogen fusion:
 * 4 hydrogen atoms → 1 helium atom + energy release.
 * The mass deficit (Δm) is converted to energy via E=Δmc².
 * Slider controls mass delta; energy output updates in real time.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Constants
const C = 299792458; // speed of light m/s
const C_SQUARED = C * C;
const PROTON_MASS_KG = 1.6726219e-27;
const HELIUM4_MASS_KG = 6.6447e-27;
const HYDROGEN_MASS_AMU = 1.00794;
const HELIUM_MASS_AMU = 4.002602;
const MASS_DEFICIT_AMU = 4 * HYDROGEN_MASS_AMU - HELIUM_MASS_AMU; // ~0.02914 u
const AMU_TO_KG = 1.66054e-27;
const MEV_PER_AMU = 931.494;

export function renderHydrogenEnergy(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050510);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 2, 10);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0x223344, 0.5));
  const pointLight = new THREE.PointLight(0xffffcc, 1, 50);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Hydrogen atoms — 4 protons orbiting before fusion
  const protonGeo = new THREE.SphereGeometry(0.3, 32, 32);
  const protonMat = new THREE.MeshPhongMaterial({
    color: 0x4488ff,
    emissive: 0x112244,
    transparent: true,
    opacity: 0.9,
  });

  const protons = [];
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(protonGeo, protonMat.clone());
    scene.add(mesh);
    protons.push(mesh);
  }

  // Helium nucleus — appears after fusion
  const heliumGeo = new THREE.SphereGeometry(0.5, 32, 32);
  const heliumMat = new THREE.MeshPhongMaterial({
    color: 0xffaa22,
    emissive: 0x442200,
    transparent: true,
    opacity: 0,
  });
  const helium = new THREE.Mesh(heliumGeo, heliumMat);
  scene.add(helium);

  // Energy burst particles
  const particleCount = 200;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    velocities.push(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      )
    );
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xffff44,
    size: 0.05,
    transparent: true,
    opacity: 0,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // State
  let fusionProgress = 0; // 0 = separate, 1 = fused
  let fusionSpeed = 0.003;
  let fusing = false;
  let massDeltaScale = 1.0; // multiplier on mass deficit for exploration

  // Orbit radii for protons pre-fusion
  const orbitRadius = 2.5;

  function updateProtonPositions(t) {
    const r = orbitRadius * (1 - fusionProgress * 0.9);
    protons.forEach((p, i) => {
      const angle = (Math.PI * 2 * i) / 4 + t * (0.5 + i * 0.1);
      const yOff = Math.sin(t * 0.7 + i) * 0.3 * (1 - fusionProgress);
      p.position.set(
        Math.cos(angle) * r,
        yOff,
        Math.sin(angle) * r
      );
      p.material.opacity = 1 - fusionProgress * 0.8;
    });
  }

  function updateHelium() {
    heliumMat.opacity = fusionProgress * 0.9;
    helium.scale.setScalar(0.5 + fusionProgress * 0.5);

    // Glow intensity
    const glow = fusionProgress * 0.6;
    heliumMat.emissive.setRGB(glow, glow * 0.6, 0);
    pointLight.intensity = 0.5 + fusionProgress * 2;
  }

  function updateParticles() {
    if (fusionProgress < 0.95) {
      particleMat.opacity = 0;
      return;
    }
    particleMat.opacity = Math.min(0.8, (fusionProgress - 0.95) * 16);
    const posArr = particleGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      posArr[i * 3] += velocities[i].x;
      posArr[i * 3 + 1] += velocities[i].y;
      posArr[i * 3 + 2] += velocities[i].z;
    }
    particleGeo.attributes.position.needsUpdate = true;
  }

  function computeEnergy() {
    const deltaMass = MASS_DEFICIT_AMU * massDeltaScale;
    const deltaKg = deltaMass * AMU_TO_KG;
    const energyJ = deltaKg * C_SQUARED;
    const energyMeV = deltaMass * MEV_PER_AMU;
    return { deltaMass, deltaKg, energyJ, energyMeV };
  }

  function updateStats() {
    const stats = computeEnergy();
    const el = document.getElementById("hydrogen-stats");
    if (!el) return;
    el.innerHTML = [
      `<strong>E = Δmc²</strong>`,
      ``,
      `4 × H (${(4 * HYDROGEN_MASS_AMU).toFixed(5)} u)`,
      `→ He (${HELIUM_MASS_AMU} u)`,
      ``,
      `Δm = ${stats.deltaMass.toFixed(5)} u`,
      `Δm = ${stats.deltaKg.toExponential(3)} kg`,
      ``,
      `E = ${stats.energyMeV.toFixed(2)} MeV`,
      `E = ${stats.energyJ.toExponential(3)} J`,
      ``,
      `Fusion: ${(fusionProgress * 100).toFixed(0)}%`,
    ].join("<br>");
  }

  // Controls UI
  const startBtn = document.getElementById("fusion-start");
  const resetBtn = document.getElementById("fusion-reset");
  const scaleSlider = document.getElementById("mass-scale");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      fusing = true;
      // Reset particles
      const posArr = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3] = 0;
        posArr[i * 3 + 1] = 0;
        posArr[i * 3 + 2] = 0;
        velocities[i].set(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15
        );
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      fusing = false;
      fusionProgress = 0;
      particleMat.opacity = 0;
    });
  }

  if (scaleSlider) {
    scaleSlider.addEventListener("input", (e) => {
      massDeltaScale = parseFloat(e.target.value);
      const label = document.getElementById("mass-scale-label");
      if (label) label.textContent = `${massDeltaScale.toFixed(1)}×`;
      updateStats();
    });
  }

  let time = 0;

  function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    if (fusing && fusionProgress < 1) {
      fusionProgress = Math.min(1, fusionProgress + fusionSpeed);
    }

    updateProtonPositions(time);
    updateHelium();
    updateParticles();
    updateStats();
    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function renderCoherence(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ── renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xfafafa);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 28);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;

  // ── PLCT constants ────────────────────────────────────────────────────────
  // Tier colours: T1=black, T2=mid-grey, T3=light grey, T4=very light
  const TIER_COLOR = {
    1: 0x111111,
    2: 0x666666,
    3: 0xaaaaaa,
    4: 0xdddddd,
  };

  // Noble gases with their Z, tier, zone, and stability
  const NOBLE_GASES = [
    { symbol: 'He', Z:   2, tier: 1, zone: 'Temporal',  stable: true  },
    { symbol: 'Ne', Z:  10, tier: 2, zone: 'Hard Wall',  stable: true  },
    { symbol: 'Ar', Z:  18, tier: 1, zone: 'Spine',      stable: true  },
    { symbol: 'Kr', Z:  36, tier: 1, zone: 'Spine',      stable: true  },
    { symbol: 'Xe', Z:  54, tier: 1, zone: 'Spine',      stable: true  },
    { symbol: 'Rn', Z:  86, tier: 4, zone: 'Temporal',   stable: false },
    { symbol: 'Og', Z: 118, tier: 4, zone: 'Hard Wall',  stable: false },
  ];

  // Octave gaps between noble gases — all T1
  const OCTAVE_GAPS = [8, 8, 18, 18, 32, 32];

  // Ring multipliers from Russell's Crystallization Chart — all T1
  const RING_MULTIPLIERS = [
    { value: 3,  label: 'B=3',  factor: '3¹'      },
    { value: 4,  label: 'A=4',  factor: '2²'      },
    { value: 8,  label: 'C=8',  factor: '2³'      },
    { value: 12, label: 'D=12', factor: '2²×3'    },
    { value: 24, label: 'E=24', factor: '2³×3'    },
  ];

  // ── scene geometry ────────────────────────────────────────────────────────

  // Ambient + directional light for subtle shading on the few meshes
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);

  // ── 1. Spiral spine — Russell's 10-octave wave as a helix ─────────────────
  // The PLCT spine: T1 lattice numbers form the stable backbone
  const spiralPoints = [];
  const TURNS = 5;
  const SPIRAL_STEPS = 600;
  for (let i = 0; i <= SPIRAL_STEPS; i++) {
    const t = i / SPIRAL_STEPS;
    const angle = t * TURNS * Math.PI * 2;
    const radius = 1.5 + t * 6;
    const y = (t - 0.5) * 18;
    spiralPoints.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    ));
  }
  const spiralGeo = new THREE.BufferGeometry().setFromPoints(spiralPoints);
  const spiralMat = new THREE.LineBasicMaterial({ color: 0xcccccc, linewidth: 1 });
  scene.add(new THREE.Line(spiralGeo, spiralMat));

  // ── 2. Noble gas anchor spheres along the spiral ─────────────────────────
  // Each noble gas sits at its octave closure point
  const totalZ = 118;
  NOBLE_GASES.forEach((ng, i) => {
    const t = ng.Z / totalZ;
    const angle = t * TURNS * Math.PI * 2;
    const radius = 1.5 + t * 6;
    const y = (t - 0.5) * 18;

    const size = ng.stable ? 0.28 + (5 - ng.tier) * 0.08 : 0.18;
    const geo = new THREE.SphereGeometry(size, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: TIER_COLOR[ng.tier],
      roughness: 0.3,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    mesh.userData = ng;
    scene.add(mesh);

    // Thin vertical tick line at each noble gas
    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(angle) * radius, y - 0.6, Math.sin(angle) * radius),
      new THREE.Vector3(Math.cos(angle) * radius, y + 0.6, Math.sin(angle) * radius),
    ]);
    scene.add(new THREE.Line(tickGeo, new THREE.LineBasicMaterial({ color: 0xbbbbbb })));
  });

  // ── 3. Russell's ring multipliers as concentric flat rings ────────────────
  // Positioned below the spiral in a horizontal plane
  RING_MULTIPLIERS.forEach((rm, i) => {
    const r = rm.value * 0.42;
    const ringGeo = new THREE.RingGeometry(r - 0.015, r + 0.015, 128);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -11;
    scene.add(ring);
  });

  // Crystallographic permitted rotation axes at ring centre
  const permitOrders = [1, 2, 3, 4, 6];
  permitOrders.forEach((n, i) => {
    const angle = (i / permitOrders.length) * Math.PI * 2;
    const r = 1.1;
    const dotGeo = new THREE.SphereGeometry(0.10, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(Math.cos(angle) * r, -11, Math.sin(angle) * r);
    scene.add(dot);
  });

  // Forbidden orders (5, 7) — shown faint
  [5, 7].forEach((n, i) => {
    const angle = (i / 2) * Math.PI + Math.PI / 4;
    const r = 1.1;
    const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(Math.cos(angle) * r, -11, Math.sin(angle) * r);
    scene.add(dot);
  });

  // ── 4. Octave gap bars — the T1 spacing {8,8,18,18,32,32} ────────────────
  // Horizontal bars to the right of the spiral showing gap magnitude
  let cumulativeZ = 2; // start at He
  OCTAVE_GAPS.forEach((gap, i) => {
    const t0 = cumulativeZ / totalZ;
    const t1 = (cumulativeZ + gap) / totalZ;
    const y0 = (t0 - 0.5) * 18;
    const y1 = (t1 - 0.5) * 18;
    const cx2 = 10;

    const barGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cx2, y0, 0),
      new THREE.Vector3(cx2, y1, 0),
    ]);
    const alpha = gap === 8 ? 1.0 : gap === 18 ? 0.7 : 0.45;
    const barMat = new THREE.LineBasicMaterial({ color: 0x333333 });
    scene.add(new THREE.Line(barGeo, barMat));

    // Tick caps
    [y0, y1].forEach(y => {
      const capGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cx2 - 0.2, y, 0),
        new THREE.Vector3(cx2 + 0.2, y, 0),
      ]);
      scene.add(new THREE.Line(capGeo, new THREE.LineBasicMaterial({ color: 0x777777 })));
    });

    cumulativeZ += gap;
  });

  // ── 5. Tier-zone cylindrical grid ─────────────────────────────────────────
  // Three concentric cylinders: Spine (inner), Hard Wall (mid), Temporal (outer)
  // These are ghost/wireframe only
  const zoneData = [
    { label: 'Spine',     r: 3.5, color: 0xcccccc },
    { label: 'Hard Wall', r: 5.5, color: 0xbbbbbb },
    { label: 'Temporal',  r: 7.5, color: 0xaaaaaa },
  ];
  zoneData.forEach(z => {
    const cyl = new THREE.CylinderGeometry(z.r, z.r, 20, 64, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: z.color,
      wireframe: false,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(cyl, mat);
    mesh.position.y = 0;
    scene.add(mesh);

    // Wireframe edge ring at top
    const ringGeo = new THREE.RingGeometry(z.r - 0.01, z.r + 0.01, 128);
    const ringMat = new THREE.MeshBasicMaterial({ color: z.color, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 10;
    scene.add(ring);
  });

  // ── resize ─────────────────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── animate ────────────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}

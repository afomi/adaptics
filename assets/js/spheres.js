import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- trail system ---

const TRAIL_COUNT = 30;
const TRAIL_TTL   = 2.0;
const TRAIL_EVERY = 0.04;

function makeTrailPool(scene) {
  const geo = new THREE.SphereGeometry(0.18, 8, 8);
  const dots = Array.from({ length: TRAIL_COUNT }, () => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, bornAt: -999 };
  });
  let head = 0;
  let lastSpawn = -999;
  return {
    spawn(pos, now) {
      if (now - lastSpawn < TRAIL_EVERY) return;
      lastSpawn = now;
      const dot = dots[head % TRAIL_COUNT];
      head++;
      dot.mesh.position.copy(pos);
      dot.mesh.visible = true;
      dot.bornAt = now;
    },
    tick(now) {
      dots.forEach(({ mesh, bornAt }) => {
        if (!mesh.visible) return;
        const age = now - bornAt;
        if (age >= TRAIL_TTL) { mesh.visible = false; }
        else { mesh.material.opacity = (1 - age / TRAIL_TTL) * 0.6; }
      });
    },
    clear() {
      dots.forEach(({ mesh }) => { mesh.visible = false; });
      head = 0; lastSpawn = -999;
    },
  };
}

// --- behaviors ---
// Each behavior exposes:
//   setup({ spheres }) → update(angle) fn (or null for static)
//   solveAngle(spheres) → angle that would reproduce current sphere positions
//     (used when align=off, to compute an offset so the line doesn't snap)

const behaviors = {
  original: {
    label: 'Original',
    description: '3 spheres static',
    setup({ spheres }) {
      spheres.forEach((s, i) => s.position.set((i - 1) * 5, 0, 0));
      return null;
    },
    solveAngle: () => 0,
  },

  rotateX: {
    label: 'Rotate X',
    description: 'line along Z, spins around X — ends trace YZ plane',
    setup({ spheres }) {
      return (a) => spheres.forEach((s, i) => {
        const r = (i - 1) * 5;
        s.position.set(0, Math.sin(a) * r, Math.cos(a) * r);
      });
    },
    // outer sphere (i=2, r=5) is at (0, sin(a)*5, cos(a)*5) → atan2(y, z)
    solveAngle: (spheres) => Math.atan2(spheres[2].position.y, spheres[2].position.z),
  },

  rotateY: {
    label: 'Rotate Y',
    description: 'line along X, spins around Y — ends trace XZ plane',
    setup({ spheres }) {
      return (a) => spheres.forEach((s, i) => {
        const r = (i - 1) * 5;
        s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      });
    },
    // outer sphere at (cos(a)*5, 0, sin(a)*5) → atan2(z, x)
    solveAngle: (spheres) => Math.atan2(spheres[2].position.z, spheres[2].position.x),
  },

  rotateZ: {
    label: 'Rotate Z',
    description: 'line along X, spins around Z — ends trace XY plane',
    setup({ spheres }) {
      return (a) => spheres.forEach((s, i) => {
        const r = (i - 1) * 5;
        s.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      });
    },
    // outer sphere at (cos(a)*5, sin(a)*5, 0) → atan2(y, x)
    solveAngle: (spheres) => Math.atan2(spheres[2].position.y, spheres[2].position.x),
  },
};

// --- menu ---

function makeButton(label, onClick, extraStyle = {}) {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid #ccc',
    borderRadius: '4px',
    padding: '4px 10px',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'monospace',
    fontSize: '13px',
    ...extraStyle,
  });
  btn.addEventListener('click', onClick);
  return btn;
}

function setToggleStyle(btn, enabled, activeStyle = {}) {
  const defaults = { background: 'rgba(0,0,0,0.85)', color: '#fff', borderColor: '#000' };
  const off      = { background: 'rgba(255,255,255,0.85)', color: '#000', borderColor: '#ccc' };
  const s = enabled ? { ...defaults, ...activeStyle } : off;
  Object.assign(btn.style, s);
}

function buildMenu(container, behaviorKeys, callbacks) {
  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    position: 'absolute', top: '12px', left: '12px',
    display: 'flex', flexDirection: 'column', gap: '6px',
    zIndex: '10',
  });

  const behaviorBtns = {};
  behaviorKeys.forEach((key) => {
    const btn = makeButton(behaviors[key].label, () => callbacks.onBehavior(key));
    wrap.appendChild(btn);
    behaviorBtns[key] = btn;
  });

  // divider
  const hr = document.createElement('div');
  hr.style.cssText = 'border-top:1px solid #ccc;margin:2px 0;';
  wrap.appendChild(hr);

  const alignBtn = makeButton('Align: off', () => callbacks.onAlign());
  const trailBtn = makeButton('Trails: off', () => callbacks.onTrail());
  const lineBtn  = makeButton('Line: off',   () => callbacks.onLine());
  wrap.appendChild(alignBtn);
  wrap.appendChild(trailBtn);
  wrap.appendChild(lineBtn);

  container.style.position = 'relative';
  container.appendChild(wrap);

  return {
    buttons: behaviorBtns,
    setActive(key) {
      Object.entries(behaviorBtns).forEach(([k, btn]) => setToggleStyle(btn, k === key));
    },
    setAlign(on)  { alignBtn.textContent = `Align: ${on ? 'on' : 'off'}`;  setToggleStyle(alignBtn, on); },
    setTrail(on)  { trailBtn.textContent = `Trails: ${on ? 'on' : 'off'}`; setToggleStyle(trailBtn, on); },
    setLine(on)   { lineBtn.textContent  = `Line: ${on ? 'on' : 'off'}`;   setToggleStyle(lineBtn, on, { background: 'rgba(255,204,0,0.95)', color: '#000', borderColor: '#cc9900' }); },
  };
}

// --- main ---

export function renderSpheres(selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(5, 5, 20);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();

  scene.add(new THREE.AxesHelper(3));

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(10, 10, 10);
  scene.add(dir);

  const geo = new THREE.SphereGeometry(0.5, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const spheres = [0, 1, 2].map((i) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((i - 1) * 5, 0, 0);
    scene.add(mesh);
    return mesh;
  });

  const trails = spheres.map(() => makeTrailPool(scene));
  let trailsEnabled = false;

  const lineGeo = new THREE.BufferGeometry();
  const linePositions = new Float32Array(9);
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffcc00, visible: false });
  scene.add(new THREE.Line(lineGeo, lineMat));
  let lineEnabled = false;

  function updateLine() {
    spheres.forEach((s, i) => {
      linePositions[i * 3]     = s.position.x;
      linePositions[i * 3 + 1] = s.position.y;
      linePositions[i * 3 + 2] = s.position.z;
    });
    lineGeo.attributes.position.needsUpdate = true;
  }

  const clock = new THREE.Clock();
  let angle = 0;
  let angleOffset = 0;
  let alignEnabled = false;
  let currentUpdate = null;

  const keys = Object.keys(behaviors);
  const menu = buildMenu(container, keys, {
    onBehavior(key) { activate(key); },
    onAlign() {
      alignEnabled = !alignEnabled;
      menu.setAlign(alignEnabled);
    },
    onTrail() {
      trailsEnabled = !trailsEnabled;
      if (!trailsEnabled) trails.forEach(t => t.clear());
      menu.setTrail(trailsEnabled);
    },
    onLine() {
      lineEnabled = !lineEnabled;
      lineMat.visible = lineEnabled;
      menu.setLine(lineEnabled);
    },
  });

  function activate(key) {
    trails.forEach(t => t.clear());
    const b = behaviors[key];
    if (alignEnabled) {
      angleOffset = 0;
    } else {
      const solved = b.solveAngle(spheres);
      angleOffset = solved - angle;
    }
    currentUpdate = b.setup({ scene, spheres }) || null;
    menu.setActive(key);
  }

  activate('original');

  function animate() {
    requestAnimationFrame(animate);
    const delta   = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    angle += delta * 0.8;
    if (currentUpdate) currentUpdate(angle + angleOffset);
    if (lineEnabled) updateLine();
    if (trailsEnabled) spheres.forEach((s, i) => trails[i].spawn(s.position, elapsed));
    trails.forEach(t => t.tick(elapsed));
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

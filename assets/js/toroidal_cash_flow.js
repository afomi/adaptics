/**
 * Toroidal Cash Flow — a business as a closed flow
 *
 * Money rises through the core, radiates out as spending, circles the outside,
 * and returns as revenue. Reserves are the pause at the still point — not the
 * opposite of flow, a phase of it.
 *
 * Each particle rides a vertical circle of radius r whose center sits at
 * distance R from the axis; together the circles sweep the torus surface.
 * theta decreasing: up through the core (theta≈PI), over the top, down the
 * outside (theta≈0), back under. phi is the slow toroidal drift.
 *
 * Companion to geometric-finance.md (tink).
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

const R = 3.0;
const r = 2.4;
const N = 2400;
const TWO_PI = Math.PI * 2;

const FLOW = 0,
  DWELL = 1,
  LEAK = 2;

export function renderToroidalCashFlow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const state = new Uint8Array(N);
  const theta = new Float32Array(N);
  const phi = new Float32Array(N);
  const phiDrift = new Float32Array(N);
  const jitter = new Float32Array(N); // per-particle radius wobble
  const dwellUntil = new Float32Array(N);
  const leakT = new Float32Array(N); // seconds spent leaking
  const leakDir = new Float32Array(N * 3);
  const lastCoreVisit = new Float32Array(N);

  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const alphas = new Float32Array(N);

  const cOutflow = new THREE.Color("#d95926");
  const cReturn = new THREE.Color("#3987e5");
  const cReserve = new THREE.Color("#199e70");
  const cLeak = new THREE.Color("#898781");
  const tmp = new THREE.Color();

  for (let i = 0; i < N; i++) {
    state[i] = FLOW;
    theta[i] = Math.random() * TWO_PI;
    phi[i] = Math.random() * TWO_PI;
    phiDrift[i] = 0.02 + Math.random() * 0.06;
    jitter[i] = 0.82 + Math.random() * 0.22;
    lastCoreVisit[i] = -1;
  }

  // ---------- params (wired to sliders) ----------
  const params = {
    closure: 0.85,
    speed: 1.0,
    dwell: 1.2,
    rhythm: 0.4,
  };

  // ---------- stats ----------
  let passes = 0;
  let leaks = 0;
  let leakedTotal = 0;
  let cycleAvg = 0;
  let cycleSamples = 0;
  const sparkBuf = new Array(90).fill(0);

  // ---------- scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0d0d0d");
  scene.fog = new THREE.Fog("#0d0d0d", 14, 30);

  const width = () => container.clientWidth;
  const height = () => container.clientHeight;

  const camera = new THREE.PerspectiveCamera(48, width() / height(), 0.1, 100);
  camera.position.set(7.5, 4.5, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width(), height());
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Labels render into a sibling overlay scoped to the container, so the
  // page's own chrome (nav, panel) stays clickable.
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width(), height());
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.top = "0";
  labelRenderer.domElement.style.left = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  container.appendChild(labelRenderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;

  // faint reference torus, gridline-recessive
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(R, r, 24, 96),
    new THREE.MeshBasicMaterial({
      color: "#2c2c2a",
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    })
  );
  torus.rotation.x = Math.PI / 2;
  scene.add(torus);

  // reserve core: a soft column at the still point
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, r * 1.5, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: "#199e70",
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(core);

  // particles with per-particle alpha via a small shader
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geom.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 90.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.12, d);
        gl_FragColor = vec4(vColor, vAlpha * soft);
      }
    `,
    vertexColors: true,
  });
  const points = new THREE.Points(geom, mat);
  scene.add(points);

  // ---------- scene labels ----------
  function addLabel(text, sub, x, y, z) {
    const div = document.createElement("div");
    div.className = "scene-label";
    div.textContent = text;
    if (sub) {
      const s = document.createElement("small");
      s.textContent = sub;
      div.appendChild(s);
    }
    const obj = new CSS2DObject(div);
    obj.position.set(x, y, z);
    scene.add(obj);
  }
  addLabel("Outflow", "wages · suppliers · rent · taxes", 2.2, r + 0.9, 2.2);
  addLabel("Return", "local spending → revenue", -2.2, -(r + 0.9), 2.2);
  addLabel("Reserves", "the still point", 0, 0.1, 0);
  addLabel("Leakage", "value that exits the loop", R + r + 1.1, -0.7, 0);

  // ---------- flow update ----------
  function wrap(a) {
    a %= TWO_PI;
    return a < 0 ? a + TWO_PI : a;
  }

  function step(dt, now) {
    const pulse = 1 + params.rhythm * Math.sin(now * (TWO_PI / 4));
    const w = 0.9 * params.speed * pulse; // rad/s poloidal

    for (let i = 0; i < N; i++) {
      const j = i * 3;

      if (state[i] === DWELL) {
        alphas[i] = 0.85;
        tmp.copy(cReserve).multiplyScalar(1.25);
        // slow rise along the core column while held in reserve
        positions[j + 1] += dt * 0.25;
        if (now >= dwellUntil[i]) {
          state[i] = FLOW;
        }
      } else if (state[i] === LEAK) {
        leakT[i] += dt;
        const k = leakT[i];
        positions[j] += leakDir[j] * dt * 2.2;
        positions[j + 1] += (leakDir[j + 1] - 0.35 * k) * dt * 2.2;
        positions[j + 2] += leakDir[j + 2] * dt * 2.2;
        alphas[i] = Math.max(0, 0.7 - k * 0.45);
        tmp.copy(cLeak);
        if (k > 1.6) {
          // replaced by fresh external revenue entering the far side
          state[i] = FLOW;
          theta[i] = wrap(-0.05);
          leakT[i] = 0;
        }
      } else {
        const prev = theta[i];
        theta[i] = wrap(theta[i] - w * dt);

        // crossing the far equator (theta: small -> large means passing 0)
        if (prev < Math.PI && theta[i] > Math.PI && prev < 0.5) {
          passes++;
          if (Math.random() > params.closure) {
            leaks++;
            leakedTotal++;
            state[i] = LEAK;
            leakT[i] = 0;
            const cp = Math.cos(phi[i]);
            const sp = Math.sin(phi[i]);
            leakDir[j] = cp;
            leakDir[j + 1] = -0.2;
            leakDir[j + 2] = sp;
          }
        }

        // crossing the core (theta passes PI going down): a reserve dwell
        if (prev > Math.PI && theta[i] <= Math.PI && state[i] === FLOW) {
          if (lastCoreVisit[i] > 0) {
            const cycle = now - lastCoreVisit[i];
            cycleAvg =
              cycleSamples === 0 ? cycle : cycleAvg * 0.98 + cycle * 0.02;
            cycleSamples++;
          }
          lastCoreVisit[i] = now;
          if (params.dwell > 0.02) {
            state[i] = DWELL;
            dwellUntil[i] = now + params.dwell * (0.5 + Math.random());
          }
        }

        phi[i] = wrap(phi[i] + phiDrift[i] * dt * params.speed);

        const rr = r * jitter[i];
        const rho = R + rr * Math.cos(theta[i]);
        positions[j] = rho * Math.cos(phi[i]);
        positions[j + 1] = rr * Math.sin(theta[i]);
        positions[j + 2] = rho * Math.sin(phi[i]);

        // color by phase: top half outflow, bottom half return, core reserve
        const s = Math.sin(theta[i]);
        const blend = THREE.MathUtils.smoothstep(s, -0.25, 0.25);
        tmp.copy(cReturn).lerp(cOutflow, blend);
        const coreness = Math.max(0, Math.cos(theta[i]) * -1 - 0.86) / 0.14;
        if (coreness > 0) tmp.lerp(cReserve, coreness * 0.9);
        alphas[i] = 0.62;
      }

      colors[j] = tmp.r;
      colors[j + 1] = tmp.g;
      colors[j + 2] = tmp.b;
    }

    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;
    geom.attributes.alpha.needsUpdate = true;

    // core glow tracks how much is actually held in reserve
    let dwelling = 0;
    for (let i = 0; i < N; i++) if (state[i] === DWELL) dwelling++;
    core.material.opacity = Math.min(1, 0.12 + 3.0 * (dwelling / N));
    return dwelling;
  }

  // ---------- gauges ----------
  const elReserve = document.getElementById("t-reserve");
  const elClosure = document.getElementById("t-closure");
  const elCycle = document.getElementById("t-cycle");
  const elLeaked = document.getElementById("t-leaked");
  const spark = document.getElementById("spark");
  const sctx = spark ? spark.getContext("2d") : null;

  function money(nParticles) {
    const v = nParticles * 100;
    return v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + v;
  }

  let lastGauge = 0;
  function updateGauges(now, dwelling) {
    if (now - lastGauge < 0.25) return;
    lastGauge = now;

    sparkBuf.push(dwelling);
    sparkBuf.shift();

    if (elReserve) elReserve.textContent = money(dwelling);
    if (elClosure)
      elClosure.textContent =
        passes > 20 ? Math.round(100 * (1 - leaks / passes)) + "%" : "—";
    if (elCycle)
      elCycle.textContent = cycleSamples > 5 ? cycleAvg.toFixed(1) + "s" : "—";
    if (elLeaked) elLeaked.textContent = money(leakedTotal);

    if (!sctx) return;
    const w = (spark.width = spark.clientWidth * devicePixelRatio);
    const h = (spark.height = spark.clientHeight * devicePixelRatio);
    const max = Math.max(20, ...sparkBuf);
    sctx.clearRect(0, 0, w, h);
    sctx.beginPath();
    sparkBuf.forEach((v, i) => {
      const x = (i / (sparkBuf.length - 1)) * w;
      const y = h - (v / max) * (h - 2) - 1;
      i === 0 ? sctx.moveTo(x, y) : sctx.lineTo(x, y);
    });
    sctx.strokeStyle = "#199e70";
    sctx.lineWidth = 2;
    sctx.stroke();
  }

  // ---------- controls ----------
  function bind(id, out, fmt, set) {
    const el = document.getElementById(id);
    const lab = document.getElementById(out);
    if (!el || !lab) return;
    const apply = () => {
      set(+el.value);
      lab.textContent = fmt(+el.value);
    };
    el.addEventListener("input", apply);
    apply();
  }
  bind("c-closure", "v-closure", (v) => v + "%", (v) => {
    params.closure = v / 100;
  });
  bind("c-speed", "v-speed", (v) => (v / 100).toFixed(1) + "×", (v) => {
    params.speed = v / 100;
  });
  bind("c-dwell", "v-dwell", (v) => (v / 100).toFixed(1) + "s", (v) => {
    params.dwell = v / 100;
  });
  bind("c-rhythm", "v-rhythm", (v) => v + "%", (v) => {
    params.rhythm = v / 100;
  });

  // reset measured closure when the slider moves, so the gauge re-converges
  const closureEl = document.getElementById("c-closure");
  if (closureEl) {
    closureEl.addEventListener("input", () => {
      passes = 0;
      leaks = 0;
    });
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const now = clock.elapsedTime;
    const dwelling = step(dt, now);
    updateGauges(now, dwelling);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = width() / height();
    camera.updateProjectionMatrix();
    renderer.setSize(width(), height());
    labelRenderer.setSize(width(), height());
  });
}

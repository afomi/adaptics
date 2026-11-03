import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─────────────────────────────────────────────────────────────────────────────
// Economic Agent Population — 100,000 agents rendered as GPU Points.
//
// This is an *agent-based economy*: a kinetic wealth-exchange model
// (Bouchaud–Mézard / Chakraborti–Chakrabarti family) that couples three
// dynamics you can turn up independently and watch interact:
//
//   • SPEND / SAVE — each agent keeps a fraction of its wealth as savings and
//     exposes the rest to exchange. Savings *shield* wealth, so high savers
//     ratchet upward. This is the causal engine of inequality.
//   • CLASS        — savings rate is not random: it rises with class (the
//     empirical Keynesian fact — the rich save a larger share). Class is a
//     band derived from wealth; a mobility dial lets agents cross bands.
//   • GEOGRAPHY    — agents transact with *spatial neighbors*, not random
//     partners. Money circulates locally and pools, so regions diverge into
//     rich and poor zones. A "locality" dial slides from global to local.
//
//   • REDISTRIBUTION — a tax dial skims a fraction of every flow into a pot,
//     paid back as a flat citizen's dividend. This is the force that opposes
//     concentration; with tax off, wealth condenses toward a few agents.
//
// Everything lives in flat typed arrays (Structure-of-Arrays), one draw call.
// The tick (`stepSimulation`) mutates `wealth[]` in place; a coarse spatial
// hash makes "find a nearby partner" O(1) so 100k stays at 60fps by processing
// a large random *sample* of interactions each frame (statistically faithful).
// ─────────────────────────────────────────────────────────────────────────────

const N = 100_000;

// Sectors give the population initial structure — spatial clusters + wealth bias.
// (name, hue for the "sector" color mode, share of population, wealth multiplier)
const SECTORS = [
  { name: 'Labor',      hue: 0.58, share: 0.46, wealthBias: 0.7 },
  { name: 'Trade',      hue: 0.12, share: 0.22, wealthBias: 1.0 },
  { name: 'Industry',   hue: 0.02, share: 0.14, wealthBias: 1.3 },
  { name: 'Finance',    hue: 0.34, share: 0.06, wealthBias: 2.4 },
  { name: 'Public',     hue: 0.72, share: 0.08, wealthBias: 0.9 },
  { name: 'Informal',   hue: 0.88, share: 0.04, wealthBias: 0.4 },
];

// Class bands, poorest → richest. Boundaries are percentiles of live wealth,
// recomputed as the distribution moves. `saveBase` is the band's baseline
// savings propensity; the `saveSpread` dial widens the gap between bands.
const CLASSES = [
  { name: 'Precarious', hue: 0.00, saveBase: 0.05 },
  { name: 'Working',    hue: 0.09, saveBase: 0.15 },
  { name: 'Middle',     hue: 0.30, saveBase: 0.30 },
  { name: 'Affluent',   hue: 0.55, saveBase: 0.50 },
  { name: 'Elite',      hue: 0.80, saveBase: 0.70 },
];
const CLASS_PCTL = [0.5, 0.8, 0.95, 0.99]; // cut points → 5 bands

const WORLD = 120; // world spans [-WORLD, WORLD] on X and Z
const GRID = 48;   // spatial-hash resolution (GRID×GRID cells)

// ── deterministic PRNG so runs are reproducible ──────────────────────────────
function makePRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Inverse-CDF sample of a Pareto (power-law) wealth: heavy right tail.
function paretoSample(u, alpha, xmin) {
  return xmin / Math.pow(1 - u, 1 / alpha);
}

// HSV→RGB, returns [r,g,b] in 0..1
function hsv(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

export function renderEconAgents(containerId, uiIds = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ── Structure-of-Arrays: the agent population ──────────────────────────────
  const positions = new Float32Array(N * 3); // xyz for THREE
  const colors    = new Float32Array(N * 3); // rgb, re-derived on remap
  const wealth    = new Float32Array(N);      // the thing that moves
  const sectorOf  = new Uint8Array(N);        // index into SECTORS
  const classOf   = new Uint8Array(N);        // index into CLASSES (0..4)
  const gx         = new Float32Array(N);     // spatial X in world coords
  const gz         = new Float32Array(N);     // spatial Z in world coords
  const cellOf     = new Int32Array(N);       // spatial-hash cell index

  // sector cluster centers on a ring
  const sectorCenters = SECTORS.map((_, k) => {
    const a = (k / SECTORS.length) * Math.PI * 2;
    return [Math.cos(a) * 60, Math.sin(a) * 60];
  });

  const cum = [];
  SECTORS.reduce((acc, s, i) => (cum[i] = acc + s.share), 0);

  // ── tunable dials ──────────────────────────────────────────────────────────
  let alpha      = 1.16; // initial Pareto inequality (seed only)
  let saveSpread = 1.0;  // 0 = everyone saves the same; higher = class gap widens
  let locality   = 0.85; // 0 = trade globally (random); 1 = trade only with neighbors
  let taxRate    = 0.0;  // fraction of each flow redistributed as flat dividend
  let mobility   = 0.02; // chance per interaction an agent's class-luck is reshuffled
  const XMIN = 1.0;

  let colorMode  = 'wealth'; // 'wealth' | 'sector' | 'class'
  let heightMode = 'wealth'; // 'wealth' | 'flat'

  function assignSector(u) {
    for (let k = 0; k < SECTORS.length; k++) if (u <= cum[k]) return k;
    return SECTORS.length - 1;
  }

  // ── spatial hash: bucket agents into a GRID×GRID lattice ────────────────────
  // Rebuilt lazily every few ticks (agents don't move spatially, only in wealth,
  // so the hash is stable; we build it once and reuse).
  const cellStart = new Int32Array(GRID * GRID + 1);
  const cellItems = new Int32Array(N);
  function cellIndex(x, z) {
    let cxi = ((x + WORLD) / (2 * WORLD) * GRID) | 0;
    let czi = ((z + WORLD) / (2 * WORLD) * GRID) | 0;
    if (cxi < 0) cxi = 0; else if (cxi >= GRID) cxi = GRID - 1;
    if (czi < 0) czi = 0; else if (czi >= GRID) czi = GRID - 1;
    return czi * GRID + cxi;
  }
  function buildSpatialHash() {
    cellStart.fill(0);
    for (let i = 0; i < N; i++) {
      const c = cellIndex(gx[i], gz[i]);
      cellOf[i] = c;
      cellStart[c + 1]++;
    }
    for (let c = 0; c < GRID * GRID; c++) cellStart[c + 1] += cellStart[c];
    const cursor = cellStart.slice();
    for (let i = 0; i < N; i++) {
      const c = cellOf[i];
      cellItems[cursor[c]++] = i;
    }
  }

  // Pick a partner for agent i. With prob `locality`, pick from i's cell or a
  // neighboring cell (geography); otherwise pick globally at random.
  function pickPartner(i) {
    if (simRng() < locality) {
      // choose a cell in the 3×3 neighborhood of i's cell
      const c = cellOf[i];
      const cx = c % GRID, cz = (c / GRID) | 0;
      const nx = Math.max(0, Math.min(GRID - 1, cx + ((simRng() * 3) | 0) - 1));
      const nz = Math.max(0, Math.min(GRID - 1, cz + ((simRng() * 3) | 0) - 1));
      const nc = nz * GRID + nx;
      const lo = cellStart[nc], hi = cellStart[nc + 1];
      if (hi > lo) return cellItems[lo + ((simRng() * (hi - lo)) | 0)];
    }
    return (simRng() * N) | 0;
  }

  // ── class assignment from live wealth percentiles ───────────────────────────
  let classCuts = [0, 0, 0, 0]; // wealth thresholds between the 5 bands
  function recomputeClassCuts() {
    const sorted = Float32Array.from(wealth).sort();
    for (let k = 0; k < CLASS_PCTL.length; k++) {
      classCuts[k] = sorted[Math.min(N - 1, (N * CLASS_PCTL[k]) | 0)];
    }
  }
  function classFor(w) {
    for (let k = 0; k < classCuts.length; k++) if (w < classCuts[k]) return k;
    return CLASSES.length - 1;
  }
  // savings propensity for an agent: baseline for its class, gap scaled by spread
  function savingsRate(cls) {
    const base = CLASSES[cls].saveBase;
    const mid = 0.30; // Middle-class baseline is the pivot
    const r = mid + (base - mid) * saveSpread;
    return Math.max(0, Math.min(0.95, r));
  }

  // Initialize / reseed the population.
  function initPopulation(seed = 20260706) {
    let s = seed >>> 0;
    const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let maxW = 0;
    for (let i = 0; i < N; i++) {
      const sk = assignSector(r());
      sectorOf[i] = sk;
      const sec = SECTORS[sk];
      const w = paretoSample(r(), alpha, XMIN) * sec.wealthBias;
      wealth[i] = w; if (w > maxW) maxW = w;
      const [cx, cz] = sectorCenters[sk];
      const rad = (r() + r() + r() - 1.5) * 18;
      const ang = r() * Math.PI * 2;
      gx[i] = cx + Math.cos(ang) * rad;
      gz[i] = cz + Math.sin(ang) * rad;
    }
    buildSpatialHash();
    recomputeClassCuts();
    for (let i = 0; i < N; i++) classOf[i] = classFor(wealth[i]);
    remap(maxW);
  }

  // Re-derive positions + colors from current state. Runs after each tick.
  let framesSinceClassCut = 0;
  function remap(maxWKnown) {
    let maxW = maxWKnown || 0;
    if (!maxWKnown) for (let i = 0; i < N; i++) if (wealth[i] > maxW) maxW = wealth[i];
    const logMax = Math.log(maxW + 1) || 1;

    for (let i = 0; i < N; i++) {
      const wLog = Math.log(wealth[i] + 1) / logMax; // 0..1
      const y = heightMode === 'wealth' ? wLog * 90 : 0;
      positions[i * 3]     = gx[i];
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = gz[i];

      let rr, gg, bb;
      if (colorMode === 'sector') {
        [rr, gg, bb] = hsv(SECTORS[sectorOf[i]].hue, 0.65, 0.35 + wLog * 0.65);
      } else if (colorMode === 'class') {
        [rr, gg, bb] = hsv(CLASSES[classOf[i]].hue, 0.75, 0.45 + wLog * 0.5);
      } else {
        const h = 0.62 - wLog * 0.62;
        [rr, gg, bb] = hsv(h, 0.9 - wLog * 0.5, 0.4 + wLog * 0.6);
      }
      colors[i * 3] = rr; colors[i * 3 + 1] = gg; colors[i * 3 + 2] = bb;
    }
    if (geometry) {
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
    updateReadout(maxW);
  }

  // ── stats: Gini, top-1% share, and per-region divergence ────────────────────
  function computeStats() {
    const sorted = Float32Array.from(wealth).sort();
    let cumw = 0, gsum = 0, total = 0;
    for (let i = 0; i < N; i++) total += sorted[i];
    for (let i = 0; i < N; i++) { cumw += sorted[i]; gsum += cumw; }
    const gini = total > 0 ? (N + 1 - 2 * (gsum / total)) / N : 0;
    let top = 0;
    for (let i = (N * 0.99) | 0; i < N; i++) top += sorted[i];
    const top1 = total > 0 ? top / total : 0;
    return { gini, top1, maxW: sorted[N - 1] };
  }

  // Regional divergence: bucket world into REG×REG macro-regions, measure the
  // spread of mean wealth across them (coefficient of variation).
  const REG = 6;
  function regionalDivergence() {
    const sum = new Float64Array(REG * REG);
    const cnt = new Int32Array(REG * REG);
    for (let i = 0; i < N; i++) {
      let rx = ((gx[i] + WORLD) / (2 * WORLD) * REG) | 0;
      let rz = ((gz[i] + WORLD) / (2 * WORLD) * REG) | 0;
      rx = Math.max(0, Math.min(REG - 1, rx));
      rz = Math.max(0, Math.min(REG - 1, rz));
      const idx = rz * REG + rx;
      sum[idx] += wealth[i]; cnt[idx]++;
    }
    let means = [], gm = 0, gn = 0;
    for (let k = 0; k < REG * REG; k++) if (cnt[k]) { means.push(sum[k] / cnt[k]); gm += sum[k]; gn += cnt[k]; }
    const grand = gn ? gm / gn : 0;
    let varsum = 0;
    means.forEach(m => { varsum += (m - grand) * (m - grand); });
    const cv = grand > 0 && means.length ? Math.sqrt(varsum / means.length) / grand : 0;
    return cv; // 0 = every region equal; grows as regions diverge
  }

  function updateReadout(maxW) {
    const el = uiIds.readout && document.getElementById(uiIds.readout);
    if (!el) return;
    const { gini, top1 } = computeStats();
    const cv = regionalDivergence();
    el.innerHTML =
      `t <b>${tick}</b>` +
      ` · gini <b>${gini.toFixed(3)}</b>` +
      ` · top&nbsp;1% <b>${(top1 * 100).toFixed(1)}%</b>` +
      ` · regional&nbsp;spread <b>${cv.toFixed(2)}</b>` +
      ` · richest <b>${Math.round(maxW).toLocaleString()}</b>`;
  }

  // ── Three.js scene ─────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x05070d);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070d, 0.0016);

  const camera = new THREE.PerspectiveCamera(
    55, container.clientWidth / container.clientHeight, 0.1, 2000
  );
  camera.position.set(0, 120, 220);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 30, 0);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const grid = new THREE.GridHelper(240, 24, 0x1a2540, 0x0e1626);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  initPopulation();

  // ── the tick: coupled spend/save + geography + class + redistribution ───────
  let simRunning = false;
  let tick = 0;
  const simRng = makePRNG(777);
  const INTERACTIONS = 40_000; // sampled pairs per tick — faithful at 60fps

  function stepSimulation() {
    let taxPot = 0;
    for (let t = 0; t < INTERACTIONS; t++) {
      const a = (simRng() * N) | 0;
      const b = pickPartner(a);          // GEOGRAPHY: usually a spatial neighbor
      if (a === b) continue;

      // SPEND/SAVE + CLASS: each agent shields a class-linked savings fraction;
      // only the *spendable* remainder is at stake. The stake is the smaller of
      // the two spendable pots (you can't wager more than the poorer party has).
      const sa = savingsRate(classOf[a]);
      const sb = savingsRate(classOf[b]);
      const spendA = wealth[a] * (1 - sa);
      const spendB = wealth[b] * (1 - sb);
      // Small stake fraction: a plain kinetic exchange condenses wealth toward a
      // single agent regardless of savings (the "yard-sale" theorem); a small
      // stake lets the system explore an equilibrium instead of collapsing, so
      // the savings dial — not the coin — becomes the visible engine.
      let stake = Math.min(spendA, spendB) * 0.15;
      if (stake <= 0) continue;

      // REDISTRIBUTION: skim tax off the flow into a shared pot.
      const tax = stake * taxRate;
      taxPot += tax;
      const net = stake - tax;

      // Savings-biased coin: the higher saver has an edge (0.5 at equal savings).
      // This is what turns the class-linked savings gap into rising inequality;
      // with saveSpread = 0 the bias vanishes and the coin is fair again.
      const pa = 0.5 + 0.5 * (sa - sb);
      if (simRng() < pa) { wealth[a] += net; wealth[b] -= stake; }
      else               { wealth[b] += net; wealth[a] -= stake; }

      // MOBILITY: occasionally an agent's class is re-rolled off its neighbors,
      // letting bands churn rather than lock permanently.
      if (mobility > 0 && simRng() < mobility) {
        const j = simRng() < 0.5 ? a : b;
        classOf[j] = classFor(wealth[j]);
      }
    }

    // pay the tax pot back as a flat citizen's dividend
    if (taxPot > 0) {
      const dividend = taxPot / N;
      for (let i = 0; i < N; i++) wealth[i] += dividend;
    }

    tick++;
    // refresh class boundaries periodically as the distribution drifts
    if ((framesSinceClassCut++ & 15) === 0) {
      recomputeClassCuts();
      for (let i = 0; i < N; i++) classOf[i] = classFor(wealth[i]);
    }
    remap();
  }

  // ── animate ──────────────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    if (simRunning) stepSimulation();
    points.rotation.y += 0.0006;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // ── controls wiring ──────────────────────────────────────────────────────────
  function wireSlider(id, labelId, fmt, set) {
    const el = id && document.getElementById(id);
    if (!el) return;
    const lbl = labelId && document.getElementById(labelId);
    el.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      set(v);
      if (lbl) lbl.textContent = fmt(v);
    });
  }
  wireSlider(uiIds.saveSpread, uiIds.saveSpreadLabel, (v) => v.toFixed(1) + '×', (v) => { saveSpread = v; });
  wireSlider(uiIds.locality,   uiIds.localityLabel,   (v) => (v * 100).toFixed(0) + '%', (v) => { locality = v; });
  wireSlider(uiIds.tax,        uiIds.taxLabel,        (v) => (v * 100).toFixed(0) + '%', (v) => { taxRate = v; });
  wireSlider(uiIds.mobility,   uiIds.mobilityLabel,   (v) => (v * 100).toFixed(1) + '%', (v) => { mobility = v; });

  function wireBtn(id, fn) {
    const b = id && document.getElementById(id);
    if (b) b.addEventListener('click', () => fn(b));
  }
  const COLOR_MODES = ['wealth', 'class', 'sector'];
  wireBtn(uiIds.colorBtn, (b) => {
    colorMode = COLOR_MODES[(COLOR_MODES.indexOf(colorMode) + 1) % COLOR_MODES.length];
    b.textContent = `COLOR: ${colorMode.toUpperCase()}`;
    remap();
  });
  wireBtn(uiIds.heightBtn, (b) => {
    heightMode = heightMode === 'wealth' ? 'flat' : 'wealth';
    b.textContent = `HEIGHT: ${heightMode.toUpperCase()}`;
    remap();
  });
  wireBtn(uiIds.simBtn, (b) => {
    simRunning = !simRunning;
    b.textContent = simRunning ? 'SIM: RUNNING' : 'SIM: PAUSED';
    b.classList.toggle('active', simRunning);
  });
  wireBtn(uiIds.resetBtn, () => { tick = 0; simRng(); initPopulation(); });

  return { step: stepSimulation, reset: () => initPopulation(), stats: computeStats, regionalDivergence };
}

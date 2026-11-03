import * as THREE from 'three';

// Chladni sand simulation — Three.js port of George Savva's genuary2022/day15sand.R
// Standing wave: amp(x,y) = Σ sin(fₙπx)·sin(fₙπy)·aₙ · noise · weight
// Particles migrate to wave nodes (zero crossings) over time.
//
// Three modes:
//   auto    — Savva's original: 12 random chords, fast decay, then repeat
//   explore — pick the three notes; slow decay so the pattern accumulates
//   plate   — a square plate's own modes (n, m):
//             u = cos(nπx)·cos(mπy) ± cos(mπx)·cos(nπy)
//             the classic Chladni figures; sand re-forms when the mode changes
//
// Controls live in a collapsible panel (data-ctl="…" inputs, data-out="…"
// readouts). Keys: space pause · r scatter · s sound · c controls ·
// ←/→ n · ↑/↓ m (plate mode).

const N_MAX  = 150_000;
const A1     = 0.5, A2 = 0.2, A3 = 0.3;
const DECAY_AUTO    = 0.9;  // fast decay in auto mode (matches R original)

const POSSIBLE_NOTES = [3, 4, 6, 8, 9, 10, 12, 15, 18];
// Base frequency for C4 scaled so note=3 → C4 (261.63 Hz)
// R uses 87*t as audio frequency multiplier; here we map each note to a real Hz value
// note index ratio: C4=3, so scale = 261.63/3 = 87.21 Hz per unit
const NOTE_HZ_SCALE = 87.21;

// Plate mode tone: a plate's frequency grows with n² + m² (bending waves:
// f ∝ k²). Scaled to stay audible; clamped so high modes don't shriek.
const PLATE_HZ_PER_K2 = 25;
const PLATE_HZ_MAX    = 3500;

const DEFAULTS = {
  count: 80_000,
  size: 1.5,
  opacity: 0.75,
  palette: 'rainbow',
  drive: 1,          // 1 = the original's agitation
  sustain: 0.995,    // per-step decay in explore and plate modes (original explore value)
  speed: 30,         // simulation steps per second (original: 30)
  trails: 0,         // 0 = clear every frame; toward 1 = long trails
  nodal: false,      // overlay the predicted nodal lines
  volume: 0.18,
  n: 3,
  m: 5,
  sign: -1,
};

function makePRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeNormRNG(rng) {
  return () => {
    const u = rng() + 1e-12, v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6) % 6;
  const f = h * 6 - Math.floor(h * 6);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  return [[v,t,p,p,q,v][i], [q,v,v,t,p,p][i], [p,p,t,v,v,q][i]];
}

/** Square-plate mode (n, m) with sign ±: zero along the nodal lines. */
export function plateMode(x, y, n, m, sign) {
  const PI = Math.PI;
  return Math.cos(n * PI * x) * Math.cos(m * PI * y) + sign * Math.cos(m * PI * x) * Math.cos(n * PI * y);
}

/** Savva's chord field: Σ aₖ·sin(fₖπx)·sin(fₖπy). */
export function chordField(x, y, f1, f2, f3) {
  const PI = Math.PI;
  return Math.sin(f1*PI*x)*Math.sin(f1*PI*y)*A1
       + Math.sin(f2*PI*x)*Math.sin(f2*PI*y)*A2
       + Math.sin(f3*PI*x)*Math.sin(f3*PI*y)*A3;
}

export function plateHz(n, m) {
  return Math.min(PLATE_HZ_MAX, PLATE_HZ_PER_K2 * (n * n + m * m));
}

// ── Web Audio: three sine oscillators matching R's soundwave() ────────────────
function createAudio() {
  let ctx = null, osc1 = null, osc2 = null, osc3 = null;
  let gain1 = null, gain2 = null, gain3 = null, masterGain = null;
  let level = DEFAULTS.volume;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = level;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // `scale` turns note units into Hz; plate mode passes Hz directly (scale 1).
  function startTone(f1, f2, f3, scale = NOTE_HZ_SCALE) {
    ensureCtx();
    stopTone();

    const now = ctx.currentTime;
    const ATTACK = 0.03; // 30ms linear ramp — prevents click on start

    function makeOsc(freq, amp) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * scale, now);
      // ramp from 0 to target amplitude to avoid click
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(amp, now + ATTACK);
      o.connect(g);
      g.connect(masterGain);
      o.start(now);
      return [o, g];
    }

    [osc1, gain1] = makeOsc(f1, A1);
    [osc2, gain2] = makeOsc(f2, A2);
    [osc3, gain3] = makeOsc(f3, A3);
  }

  function stopTone() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const RELEASE = 0.04; // 40ms fade-out before stopping — prevents click on stop
    [osc1, osc2, osc3].forEach((o, i) => {
      const g = [gain1, gain2, gain3][i];
      if (!o) return;
      try {
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + RELEASE);
        o.stop(now + RELEASE);
      } catch(e) {}
    });
    osc1 = osc2 = osc3 = null;
    gain1 = gain2 = gain3 = null;
  }

  function setFreqs(f1, f2, f3, scale = NOTE_HZ_SCALE) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (osc1) osc1.frequency.setTargetAtTime(f1 * scale, now, 0.05);
    if (osc2) osc2.frequency.setTargetAtTime(f2 * scale, now, 0.05);
    if (osc3) osc3.frequency.setTargetAtTime(f3 * scale, now, 0.05);
  }

  // Smooth volume envelope — setTargetAtTime glides to target, no discontinuity
  function applyDecay(decayFactor) {
    if (!masterGain) return;
    const target = level * Math.max(0.001, decayFactor);
    masterGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
  }

  function setVolume(v) {
    level = v;
    if (masterGain) masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  }

  function suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume()  { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  return { startTone, stopTone, setFreqs, applyDecay, setVolume, suspend, resume, isRunning: () => !!osc1 };
}

// Predicted nodal lines, drawn under the sand: a thin line wherever the
// field crosses zero (width from screen-space derivatives, so it stays crisp).
const nodalShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform int uKind;        // 0 = chord field, 1 = plate mode
    uniform vec3 uF;          // chord frequencies
    uniform float uN, uM, uSign;
    uniform float uAlpha;
    varying vec2 vUv;
    const float PI = 3.141592653589793;
    void main() {
      float x = vUv.x, y = vUv.y, u;
      if (uKind == 1) {
        u = cos(uN*PI*x)*cos(uM*PI*y) + uSign*cos(uM*PI*x)*cos(uN*PI*y);
      } else {
        u = sin(uF.x*PI*x)*sin(uF.x*PI*y)*0.5 + sin(uF.y*PI*x)*sin(uF.y*PI*y)*0.2 + sin(uF.z*PI*x)*sin(uF.z*PI*y)*0.3;
      }
      float w = fwidth(u);
      float line = 1.0 - smoothstep(0.0, 1.5 * w, abs(u));
      gl_FragColor = vec4(0.35, 0.85, 1.0, line * uAlpha);
    }
  `,
};

export function renderChladni(containerId, uiIds = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rng     = makePRNG(15012022);
  const normRng = makeNormRNG(rng);

  function sampleFrom(pool, n) {
    return Array.from({length: n}, () => pool[Math.floor(rng() * pool.length)]);
  }
  const chordF1 = sampleFrom(POSSIBLE_NOTES.slice(0, 3), 12);
  const chordF2 = sampleFrom(POSSIBLE_NOTES, 12);
  const chordF3 = sampleFrom(POSSIBLE_NOTES, 12);

  const settings = { ...DEFAULTS };

  // Particle state (allocated at the maximum; `settings.count` are live)
  const px      = new Float32Array(N_MAX);
  const py      = new Float32Array(N_MAX);
  const weights = new Float32Array(N_MAX);

  function initParticles() {
    const ir = makePRNG(15012022 + 1);
    const in_ = makeNormRNG(ir);
    // spread over the live count, so the default 80k start exactly as the original
    for (let i = 0; i < N_MAX; i++) {
      const t = i / settings.count;
      px[i]      = 0.2 * Math.sin(7 * t) + in_() * 0.1 + 0.5;
      py[i]      = 0.2 * Math.cos(7 * t) + in_() * 0.1 + 0.5;
      weights[i] = ir();
    }
  }
  initParticles();

  // Three.js — preserveDrawingBuffer keeps the last frame for trails and PNG export
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x050505);
  renderer.autoClear = false;
  container.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);

  // Trails: instead of clearing, darken the last frame by a translucent quad
  const fadeMat = new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 1, depthTest: false, depthWrite: false });
  const fade = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), fadeMat);
  fade.renderOrder = -2;
  scene.add(fade);

  const nodalUniforms = {
    uKind: { value: 0 }, uF: { value: new THREE.Vector3(1, 10, 9) },
    uN: { value: settings.n }, uM: { value: settings.m }, uSign: { value: settings.sign },
    uAlpha: { value: 0.55 },
  };
  const nodal = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0),
    new THREE.ShaderMaterial({ uniforms: nodalUniforms, ...nodalShader, transparent: true, depthTest: false, depthWrite: false })
  );
  nodal.renderOrder = -1;
  nodal.visible = false;
  scene.add(nodal);

  const positions = new Float32Array(N_MAX * 3);
  const colors    = new Float32Array(N_MAX * 3);

  for (let i = 0; i < N_MAX; i++) {
    positions[i * 3]     = px[i];
    positions[i * 3 + 1] = py[i];
    positions[i * 3 + 2] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: settings.size, vertexColors: true, transparent: true, opacity: settings.opacity,
    sizeAttenuation: false,
  });
  scene.add(new THREE.Points(geometry, material));

  function applyPalette() {
    const n = settings.count;
    for (let i = 0; i < N_MAX; i++) {
      const w = weights[i];
      let rgb;
      switch (settings.palette) {
        case 'sand':   rgb = [0.93, 0.84, 0.66].map((c) => c * (0.7 + 0.3 * w)); break;
        case 'weight': rgb = hsvToRgb(0.55 - 0.47 * w, 0.65, 1.0); break; // light grains cyan → heavy amber
        case 'mono':   rgb = [0.92, 0.92, 0.92]; break;
        default:       rgb = hsvToRgb((i % n) / n, 0.6, 1.0); // original: hue by index
      }
      colors[i * 3] = rgb[0]; colors[i * 3 + 1] = rgb[1]; colors[i * 3 + 2] = rgb[2];
    }
    geometry.attributes.color.needsUpdate = true;
  }

  function applyCount() {
    geometry.setDrawRange(0, settings.count);
    applyPalette();
  }
  applyCount();

  // ── Mode & state ──────────────────────────────────────────────────────────
  let mode         = 'auto';   // 'auto' | 'explore' | 'plate'
  let soundEnabled = false;
  let paused       = false;
  let saveNext     = false;
  let chordIdx     = 0;
  let frameInChord = 0;
  let exploreF1    = 1;
  let exploreF2    = 10;
  let exploreF3    = 9;
  let exploreFrame = 0;        // counts up in explore mode (no auto-reset)
  let plateFrame   = 0;        // counts up in plate mode; reset when the mode (n, m) changes

  const audio = createAudio();

  // ── UI refs ───────────────────────────────────────────────────────────────
  const byId = (key) => (uiIds[key] ? document.getElementById(uiIds[key]) : null);
  const chordLabel   = byId('chordLabel');
  const wfCanvas     = byId('waveform');
  const wfCtx        = wfCanvas ? wfCanvas.getContext('2d') : null;
  const soundBtn     = byId('soundBtn');
  const explorePanel = byId('explorePanel');
  const resetBtn     = byId('resetBtn');
  const autoStrip    = byId('autoStrip');
  const noteGrid     = byId('noteGrid');
  const panel        = byId('panel');
  const panelBtn     = byId('panelBtn');
  const modeButtons  = document.querySelectorAll('[data-mode]');
  const ctl = (name) => (panel ? panel.querySelector(`[data-ctl="${name}"]`) : null);
  const out = (name) => (panel ? panel.querySelector(`[data-out="${name}"]`) : null);

  function getActiveFreqs() {
    if (mode === 'auto') {
      const ci = Math.min(chordIdx, 11);
      return [chordF1[ci], chordF2[ci], chordF3[ci]];
    }
    return [exploreF1, exploreF2, exploreF3];
  }

  function startSound() {
    if (mode === 'plate') {
      const hz = plateHz(settings.n, settings.m);
      audio.startTone(hz, hz * 2, hz * 3, 1);
    } else {
      audio.startTone(...getActiveFreqs());
    }
  }

  function updateWaveform(f1, f2, f3, decayFactor) {
    if (!wfCtx) return;
    const W = wfCanvas.width, H = wfCanvas.height;
    wfCtx.clearRect(0, 0, W, H);
    wfCtx.strokeStyle = 'rgba(255,255,255,0.55)';
    wfCtx.lineWidth = 1.5;
    wfCtx.beginPath();
    for (let p = 0; p <= W; p++) {
      const x = p / W;
      const y = (mode === 'plate'
        ? plateMode(x, 0.5, settings.n, settings.m, settings.sign) * 0.5
        : Math.sin(f1 * Math.PI * x) * A1
        + Math.sin(f2 * Math.PI * x) * A2
        + Math.sin(f3 * Math.PI * x) * A3) * decayFactor;
      const sy = H / 2 - y * (H * 0.42);
      p === 0 ? wfCtx.moveTo(p, sy) : wfCtx.lineTo(p, sy);
    }
    wfCtx.stroke();
  }

  function updateNoteHighlights(f1, f2, f3) {
    const active = new Set([f1, f2, f3]);
    document.querySelectorAll('[data-note]').forEach(el => {
      el.classList.toggle('active', active.has(parseInt(el.dataset.note)));
    });
  }

  function updateModeUI() {
    modeButtons.forEach((b) => b.classList.toggle('mode-active', b.dataset.mode === mode));
    if (explorePanel) explorePanel.style.display = mode === 'explore' ? 'flex' : 'none';
    if (autoStrip) autoStrip.style.display = mode === 'explore' ? 'none' : 'flex';
    if (noteGrid) noteGrid.style.display = mode === 'auto' ? 'grid' : 'none';
    if (chordLabel) chordLabel.style.display = 'inline';
    if (panel) panel.querySelectorAll('[data-for-mode]').forEach((el) => {
      el.hidden = !el.dataset.forMode.split(' ').includes(mode);
    });
    nodalUniforms.uKind.value = mode === 'plate' ? 1 : 0;
    updatePlateLabel();
  }

  function updatePlateLabel() {
    if (mode === 'plate' && chordLabel) {
      chordLabel.textContent = `plate n=${settings.n} m=${settings.m} ${settings.sign > 0 ? '+' : '−'} · ~${Math.round(plateHz(settings.n, settings.m))} Hz`;
    }
    const flat = settings.n === settings.m && settings.sign < 0; // the two terms cancel everywhere
    const hz = out('hz');
    if (hz) hz.textContent = flat ? 'flat: n = m with − cancels' : `~${Math.round(plateHz(settings.n, settings.m))} Hz`;
  }

  function updateSoundUI() {
    if (soundBtn) {
      soundBtn.textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF';
      soundBtn.classList.toggle('active-sound', soundEnabled);
    }
  }

  function updatePauseUI() {
    const b = ctl('pause');
    if (b) b.textContent = paused ? '▶ resume' : '❚❚ pause';
  }

  function scatter() {
    initParticles();
    for (let i = 0; i < N_MAX; i++) {
      positions[i * 3]     = px[i];
      positions[i * 3 + 1] = py[i];
    }
    geometry.attributes.position.needsUpdate = true;
    applyPalette();
  }

  function resetExplore() {
    exploreFrame = 0;
    scatter();
  }

  function setMode(next) {
    mode = next;
    if (mode === 'explore') {
      resetExplore();
    } else if (mode === 'auto') {
      chordIdx = 0; frameInChord = 0;
    } else {
      plateFrame = 0; // the sand re-forms from wherever it lies, like a real plate
    }
    if (soundEnabled) startSound();
    updateModeUI();
  }

  // A new plate mode: re-agitate (decay restarts), keep the sand where it is
  function setPlate(changes) {
    Object.assign(settings, changes);
    settings.n = Math.max(1, Math.min(16, settings.n));
    settings.m = Math.max(1, Math.min(16, settings.m));
    plateFrame = 0;
    nodalUniforms.uN.value = settings.n;
    nodalUniforms.uM.value = settings.m;
    nodalUniforms.uSign.value = settings.sign;
    syncControls();
    updatePlateLabel();
    if (soundEnabled && mode === 'plate') {
      const hz = plateHz(settings.n, settings.m);
      audio.setFreqs(hz, hz * 2, hz * 3, 1);
    }
  }

  modeButtons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) startSound();
    else audio.stopTone();
    updateSoundUI();
  }

  // Sound toggle — must be triggered by user gesture
  if (soundBtn) soundBtn.addEventListener('click', toggleSound);

  // Reset: scatter the sand and restart the current mode's agitation
  function reset() {
    if (mode === 'explore') resetExplore();
    else if (mode === 'auto') { chordIdx = 0; frameInChord = 0; scatter(); }
    else { plateFrame = 0; scatter(); }
  }
  if (resetBtn) resetBtn.addEventListener('click', reset);

  if (panelBtn && panel) {
    panelBtn.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      panelBtn.classList.toggle('mode-active', !panel.hidden);
    });
  }

  // Note picker buttons in explore mode
  document.querySelectorAll('[data-note-pick]').forEach(el => {
    const slot = el.dataset.noteSlot; // '1', '2', or '3'
    const note = parseInt(el.dataset.notePick);
    el.addEventListener('click', () => {
      if (slot === '1') exploreF1 = note;
      else if (slot === '2') exploreF2 = note;
      else exploreF3 = note;
      resetExplore();
      if (soundEnabled) audio.setFreqs(exploreF1, exploreF2, exploreF3);
      // update picker highlights
      document.querySelectorAll(`[data-note-slot="${slot}"]`).forEach(b => {
        b.classList.toggle('picker-active', parseInt(b.dataset.notePick) === note);
      });
    });
  });

  // ── Control panel bindings ─────────────────────────────────────────────────
  const fmt = {
    count: (v) => `${Math.round(v / 1000)}k`,
    sustain: (v) => v.toFixed(3),
    trails: (v) => (v === 0 ? 'off' : v.toFixed(2)),
    drive: (v) => `${v.toFixed(2)}×`,
    size: (v) => v.toFixed(1),
    opacity: (v) => v.toFixed(2),
    speed: (v) => `${v}/s`,
    volume: (v) => `${Math.round(v * 100)}%`,
  };

  function syncControls() {
    if (!panel) return;
    for (const [name, value] of Object.entries(settings)) {
      const el = ctl(name);
      if (el && el.type === 'checkbox') el.checked = !!value;
      else if (el && 'value' in el && el.tagName !== 'BUTTON') el.value = value;
      const o = out(name);
      if (o) o.textContent = fmt[name] ? fmt[name](value) : value;
    }
    const sign = ctl('sign');
    if (sign) sign.textContent = settings.sign > 0 ? 'sign: +' : 'sign: −';
  }

  const onChange = {
    count:   () => applyCount(),
    palette: () => applyPalette(),
    size:    () => { material.size = settings.size; },
    opacity: () => { material.opacity = settings.opacity; },
    nodal:   () => { nodal.visible = settings.nodal; },
    volume:  () => audio.setVolume(settings.volume),
    n:       () => setPlate({}),
    m:       () => setPlate({}),
  };

  if (panel) {
    panel.querySelectorAll('[data-ctl]').forEach((el) => {
      const name = el.dataset.ctl;
      if (el.tagName === 'BUTTON') return;
      el.addEventListener('input', () => {
        settings[name] = el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? el.value : Number(el.value);
        const o = out(name);
        if (o) o.textContent = fmt[name] ? fmt[name](settings[name]) : settings[name];
        onChange[name]?.();
      });
    });

    ctl('sign')?.addEventListener('click', () => setPlate({ sign: -settings.sign }));
    ctl('random')?.addEventListener('click', () => {
      let n, m;
      do { n = 1 + Math.floor(Math.random() * 9); m = 1 + Math.floor(Math.random() * 9); } while (n === m);
      setPlate({ n, m, sign: Math.random() < 0.5 ? 1 : -1 });
      if (mode !== 'plate') setMode('plate');
    });
    ctl('pause')?.addEventListener('click', () => { paused = !paused; updatePauseUI(); });
    ctl('scatter')?.addEventListener('click', reset);
    ctl('png')?.addEventListener('click', () => { saveNext = true; });
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    const k = e.key;
    if (k === ' ') { e.preventDefault(); paused = !paused; updatePauseUI(); }
    else if (k === 'r') reset();
    else if (k === 's') toggleSound();
    else if (k === 'c') panelBtn?.click();
    else if (mode === 'plate' && k === 'ArrowRight') { e.preventDefault(); setPlate({ n: settings.n + 1 }); }
    else if (mode === 'plate' && k === 'ArrowLeft')  { e.preventDefault(); setPlate({ n: settings.n - 1 }); }
    else if (mode === 'plate' && k === 'ArrowUp')    { e.preventDefault(); setPlate({ m: settings.m + 1 }); }
    else if (mode === 'plate' && k === 'ArrowDown')  { e.preventDefault(); setPlate({ m: settings.m - 1 }); }
  });

  // ── Simulation step ───────────────────────────────────────────────────────
  const PI = Math.PI;
  let lastTime = null, accumMs = 0;

  // One step of the shaking: each grain hops a random direction by an amount
  // ∝ the local amplitude, so grains stall where the plate is still (nodes).
  function shake(field, decay, bounded) {
    const count = settings.count, drive = settings.drive;
    for (let i = 0; i < count; i++) {
      const x = px[i], y = py[i], w = weights[i];
      const a = field(x, y) * normRng() * 0.4 * w * decay * drive;
      const theta = rng() * 2 * PI;
      const move  = 2 * a * (1.5 - w);
      let nx = x + Math.sin(theta) * move;
      let ny = y + Math.cos(theta) * move;
      if (bounded) { // a plate has edges: reflect back in
        if (nx < 0) nx = -nx; else if (nx > 1) nx = 2 - nx;
        if (ny < 0) ny = -ny; else if (ny > 1) ny = 2 - ny;
      }
      px[i] = nx; py[i] = ny;
      positions[i * 3]     = nx;
      positions[i * 3 + 1] = ny;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  function stepAuto() {
    if (chordIdx >= 12) { chordIdx = 0; frameInChord = 0; initParticles(); }
    const f1 = chordF1[chordIdx], f2 = chordF2[chordIdx], f3 = chordF3[chordIdx];
    const k = frameInChord + 1;
    const decay = Math.pow(DECAY_AUTO, k);

    if (chordLabel) chordLabel.textContent = `chord ${chordIdx + 1} / 12`;
    updateNoteHighlights(f1, f2, f3);
    updateWaveform(f1, f2, f3, decay);
    nodalUniforms.uF.value.set(f1, f2, f3);
    if (soundEnabled) audio.applyDecay(decay);

    shake((x, y) => chordField(x, y, f1, f2, f3), decay, false);

    frameInChord++;
    if (frameInChord >= 30) { // one chord per 30 steps, as in the original
      frameInChord = 0; chordIdx++;
      if (soundEnabled && chordIdx < 12) audio.startTone(chordF1[chordIdx], chordF2[chordIdx], chordF3[chordIdx]);
    }
  }

  function stepExplore() {
    exploreFrame++;
    const f1 = exploreF1, f2 = exploreF2, f3 = exploreF3;
    // Slow decay: pattern converges gently and holds
    const decay = Math.pow(settings.sustain, exploreFrame);

    updateNoteHighlights(f1, f2, f3);
    updateWaveform(f1, f2, f3, Math.max(decay, 0.05));
    nodalUniforms.uF.value.set(f1, f2, f3);
    if (soundEnabled) audio.applyDecay(Math.max(0.05, decay));

    shake((x, y) => chordField(x, y, f1, f2, f3), decay, false);
  }

  function stepPlate() {
    plateFrame++;
    const { n, m, sign } = settings;
    const decay = Math.max(Math.pow(settings.sustain, plateFrame), 0.02);

    updateWaveform(0, 0, 0, decay);
    if (soundEnabled) audio.applyDecay(Math.max(0.05, decay));

    shake((x, y) => plateMode(x, y, n, m, sign) * 0.5, decay, true);
  }

  function savePng() {
    const a = document.createElement('a');
    a.download = `chladni-${mode}${mode === 'plate' ? `-${settings.n}-${settings.m}` : ''}.png`;
    a.href = renderer.domElement.toDataURL('image/png');
    a.click();
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (lastTime === null) lastTime = now;
    const delta = now - lastTime;
    lastTime = now;
    const msPerStep = 1000 / settings.speed;
    // Cap accumulated time to 2 steps — prevents catch-up rush after tab switch
    accumMs = Math.min(accumMs + delta, msPerStep * 2);
    while (accumMs >= msPerStep) {
      if (!paused) (mode === 'auto' ? stepAuto : mode === 'explore' ? stepExplore : stepPlate)();
      accumMs -= msPerStep;
    }

    fade.visible = settings.trails > 0;
    fadeMat.opacity = 1 - settings.trails;
    nodalUniforms.uAlpha.value = 0.55 * (1 - settings.trails); // don't let the overlay accumulate under trails
    if (settings.trails === 0) renderer.clear();
    renderer.render(scene, camera);
    if (saveNext) { saveNext = false; savePng(); }
  }

  requestAnimationFrame(animate);
  syncControls();
  updateModeUI();
  updateSoundUI();
  updatePauseUI();

  // Pause/resume audio and reset accumulator on tab visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.suspend();
      lastTime = null; // force accumulator reset on return
    } else {
      audio.resume();
    }
  });

  window.addEventListener('resize', () => {
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return {
    settings,
    setMode,
    setPlate,
    get mode() { return mode; },
  };
}

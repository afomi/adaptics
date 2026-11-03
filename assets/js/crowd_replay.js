/**
 * Crowd replay — plays a VoteSmash crowd run back as cards in the card space.
 *
 * Input is the runner's per-agent JSONL transcript (one line per API call),
 * concatenated or not. The line contract is agreed with votesmash
 * (`docs/AGENT_PARTICIPANTS.md`, slice 4; handoff 2026-09-23):
 *
 *   required  v (=1), ts, agent, seq, action, response.status
 *   optional  run_id, kind, tour_id, params, request, response.error, txid, state
 *
 * The layout is a map, not a diagram: x is the tour's phase, so a card's
 * position says how far through the tour that agent has got. Each API call
 * travels from the card to the VoteSmash wall as a packet, coloured by outcome.
 *
 * The top half of this file is pure (parse, run, stateAt) so it can be checked
 * without a browser; the bottom half draws.
 */

import * as THREE from "three";

// --- pure -----------------------------------------------------------------------

export const PHASES = ["arrival", "ticket", "survey", "claims", "votes", "results"];

export const ACTION_PHASE = {
  take_free_ticket: "ticket",
  initiate_chain_ticket: "ticket",
  confirm_chain_ticket: "ticket",
  answer_question: "survey",
  skip_question: "survey",
  submit_claim: "claims",
  list_claims: "votes",
  cast_vote: "votes",
  get_scorecard: "results",
  get_results: "results",
};

// A call succeeded only if it is 2xx *and* carries no error code: "txid not seen
// yet" comes back 202 with an error, and must not count as a paid ticket.
const ok = (line) =>
  line.response.status >= 200 && line.response.status < 300 && !line.response.error;

// Every line is either accepted or reported with the reason it was not — a
// malformed transcript never silently drops calls from the picture.
export function parseTranscript(text) {
  const lines = [];
  const errors = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const lineNo = i + 1;
    if (raw.trim() === "") return;

    let line;
    try {
      line = JSON.parse(raw);
    } catch {
      errors.push({ lineNo, message: "not valid JSON" });
      return;
    }

    const problem =
      (line.v !== 1 && `unsupported version ${JSON.stringify(line.v)}`) ||
      (Number.isNaN(Date.parse(line.ts)) && "ts is not a timestamp") ||
      ((typeof line.agent !== "string" || line.agent === "") && "agent is missing") ||
      (!Number.isInteger(line.seq) && "seq is not an integer") ||
      ((typeof line.action !== "string" || line.action === "") && "action is missing") ||
      (!Number.isInteger(line.response?.status) && "response.status is not an integer");

    if (problem) {
      errors.push({ lineNo, message: problem });
    } else {
      lines.push({ ...line, lineNo, at: Date.parse(line.ts) });
    }
  });

  return { lines, errors };
}

export function buildRun(lines) {
  const sorted = [...lines].sort((a, b) => a.at - b.at || a.seq - b.seq);
  const start = sorted.length ? sorted[0].at : 0;
  const end = sorted.length ? sorted[sorted.length - 1].at : 0;

  const agents = [];
  for (const line of sorted) if (!agents.includes(line.agent)) agents.push(line.agent);

  return {
    agents,
    start,
    end,
    duration: end - start,
    tourId: sorted.find((l) => l.tour_id != null)?.tour_id ?? null,
    runId: sorted.find((l) => l.run_id)?.run_id ?? null,
    lines: sorted.map((line) => ({ ...line, t: line.at - start })),
  };
}

// Each agent's standing at time t (ms from run start). An agent is in the
// furthest phase it has *successfully* acted in; a rejected call leaves it
// where it was and is shown as its status instead.
export function stateAt(run, t) {
  const state = new Map(
    run.agents.map((agent) => [
      agent,
      { phase: 0, last: null, calls: 0, errors: 0, paid: false, votes: 0, claims: 0 },
    ]),
  );

  for (const line of run.lines) {
    if (line.t > t) break;
    const s = state.get(line.agent);
    s.calls += 1;
    s.last = line;
    if (!ok(line)) {
      s.errors += 1;
      continue;
    }
    const phase = PHASES.indexOf(ACTION_PHASE[line.action]);
    if (phase > s.phase) s.phase = phase;
    if (line.action === "confirm_chain_ticket" || line.action === "take_free_ticket") s.paid = true;
    if (line.action === "cast_vote") s.votes += 1;
    if (line.action === "submit_claim") s.claims += 1;
  }

  return state;
}

export function describe(line) {
  if (!line) return null;
  const error = line.response.error || (!ok(line) && `HTTP ${line.response.status}`);
  return error ? `${line.action} ✗ ${error}` : line.action;
}

export function clock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `T+${h}:${mm}:${ss}` : `T+${mm}:${ss}`;
}

// --- drawing ----------------------------------------------------------------------

const ZONE_SPACING = 5.2;
const ZONE_X = (i) => (i - (PHASES.length - 1) / 2) * ZONE_SPACING;
const WALL_Z = -7;
const REPLAY_SECONDS = 40; // "fit" speed plays the whole run in this long

const PACKET_COLORS = {
  ok: 0x6fd3c4,
  error: 0xe8595a,
  read: 0x6a7288,
  chain: 0xe8c872,
};

function labelTexture(text, { width = 512, height = 96, color = "#d8dcec", size = 44 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = `${size}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2, width * 0.95);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function packetKind(line) {
  if (!ok(line)) return "error";
  if (line.txid) return "chain";
  if ((line.request?.method || "GET") === "GET") return "read";
  return "ok";
}

export function createCrowdReplay(cards, ids = {}) {
  const { scene, camera, controls } = cards;
  const el = (key) => ids[key] && document.getElementById(ids[key]);
  const statusEl = el("status");
  const playBtn = el("play");
  const speedSel = el("speed");
  const scrub = el("scrub");
  const clockEl = el("clock");
  const sampleBtn = el("sample");
  const fileInput = el("file");

  let run = null;
  let t = 0;
  let playing = false;
  let stage = null;
  const packets = [];

  // --- stage: phase pads and the VoteSmash wall -----------------------------------
  function buildStage(tourLabel) {
    if (stage) scene.remove(stage);
    stage = new THREE.Group();

    PHASES.forEach((phase, i) => {
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(ZONE_SPACING - 0.6, 9.5),
        new THREE.MeshBasicMaterial({ color: 0x1a2140, transparent: true, opacity: 0.55 }),
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(ZONE_X(i), 0.005, -0.4);
      stage.add(pad);

      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.6),
        new THREE.MeshBasicMaterial({ map: labelTexture(phase), transparent: true }),
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(ZONE_X(i), 0.01, 4.7);
      stage.add(label);
    });

    const span = ZONE_SPACING * PHASES.length;
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(span, 3.4, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x6fd3c4, transparent: true, opacity: 0.12 }),
    );
    wall.position.set(0, 1.7, WALL_Z);
    stage.add(wall);

    const wallLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 0.7),
      new THREE.MeshBasicMaterial({
        map: labelTexture(tourLabel, { width: 1024, color: "#6fd3c4", size: 40 }),
        transparent: true,
      }),
    );
    wallLabel.position.set(0, 3.9, WALL_Z);
    stage.add(wallLabel);

    scene.add(stage);
  }

  // --- packets --------------------------------------------------------------------
  const packetGeometry = new THREE.SphereGeometry(0.09, 12, 12);

  function launch(line) {
    const kind = packetKind(line);
    const from = cards.worldPosition(line.agent);
    const to = new THREE.Vector3(from.x, 1.7, WALL_Z);
    const mesh = new THREE.Mesh(
      packetGeometry,
      new THREE.MeshBasicMaterial({ color: PACKET_COLORS[kind], transparent: true }),
    );
    if (kind === "chain") mesh.scale.setScalar(2);
    mesh.position.copy(from);
    scene.add(mesh);
    packets.push({ mesh, from, to, age: 0, life: 0.7 });
  }

  function stepPackets(dt) {
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.age += dt;
      const k = Math.min(p.age / p.life, 1);
      p.mesh.position.lerpVectors(p.from, p.to, k);
      p.mesh.position.y += Math.sin(k * Math.PI) * 0.8; // arc over neighbours
      p.mesh.material.opacity = k < 0.85 ? 1 : (1 - k) / 0.15;
      if (k >= 1) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        packets.splice(i, 1);
      }
    }
  }

  // --- cards follow the state -------------------------------------------------------
  // Within a phase, agents keep a fixed slot (two columns, front to back), so a
  // card moving right is always an agent advancing, never a reshuffle.
  function slot(index) {
    return { dx: index % 2 === 0 ? -1.05 : 1.05, z: -4 + Math.floor(index / 2) * 2.4 };
  }

  function apply() {
    if (!run) return;
    const state = stateAt(run, t);
    run.agents.forEach((agent, index) => {
      const s = state.get(agent);
      const { dx, z } = slot(index);
      cards.moveTo(agent, { x: ZONE_X(s.phase) + dx, y: 0, z });

      const tone = s.last && !ok(s.last) ? "error" : null;
      const tally = [
        s.paid ? "ticket ✓" : null,
        s.claims ? `${s.claims} claim${s.claims > 1 ? "s" : ""}` : null,
        s.votes ? `${s.votes} vote${s.votes > 1 ? "s" : ""}` : null,
        s.errors ? `${s.errors} rejected` : null,
      ].filter(Boolean);
      cards.setStatus(agent, {
        text: describe(s.last) || "waiting",
        tone,
        detail: tally.join(" · ") || `${s.calls} calls`,
      });
    });

    if (scrub) scrub.value = String(run.duration ? Math.round((t / run.duration) * 1000) : 0);
    if (clockEl) clockEl.textContent = `${clock(t)} / ${clock(run.duration)}`;
  }

  function rate() {
    const choice = speedSel?.value || "fit";
    if (choice === "fit") return Math.max(run.duration / (REPLAY_SECONDS * 1000), 1);
    return Number(choice);
  }

  function setPlaying(next) {
    playing = !!run && next;
    if (playBtn) {
      playBtn.dataset.playing = String(playing);
      playBtn.textContent = playing ? "Pause" : "Play";
      playBtn.disabled = !run;
    }
  }

  cards.onFrame((dt) => {
    stepPackets(dt);
    if (!playing || !run) return;

    const before = t;
    t = Math.min(t + dt * 1000 * rate(), run.duration);
    // Only calls crossed during playback fly; a scrub jump just re-places cards.
    let launched = 0;
    for (const line of run.lines) {
      if (line.t > t) break;
      if (line.t > before && launched < 40) {
        launch(line);
        launched += 1;
      }
    }
    apply();
    if (t >= run.duration) setPlaying(false);
  });

  // --- loading ------------------------------------------------------------------
  function report(message, tone = "ok") {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  }

  function load(text, source) {
    const { lines, errors } = parseTranscript(text);
    if (lines.length === 0) {
      report(`${source}: no usable lines (${errors.length} rejected)`, "error");
      return null;
    }

    run = buildRun(lines);
    t = 0;
    cards.clear();
    run.agents.forEach((agent, index) => {
      const { dx, z } = slot(index);
      cards.add({ id: agent, name: agent, role: "bot", position: { x: ZONE_X(0) + dx, y: 0, z } });
    });
    buildStage(
      ["VoteSmash /api/agent", run.tourId != null && `tour ${run.tourId}`, run.runId]
        .filter(Boolean)
        .join(" · "),
    );

    camera.position.set(0, 13, 21);
    controls.target.set(0, 1, -1);

    const summary = `${source}: ${lines.length} calls · ${run.agents.length} agents`;
    if (errors.length) {
      const first = errors[0];
      report(`${summary} · ${errors.length} lines rejected (line ${first.lineNo}: ${first.message})`, "error");
    } else {
      report(`${summary} · all lines valid`);
    }

    apply();
    setPlaying(true);
    return run;
  }

  async function loadUrl(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return load(await response.text(), url.split("/").pop());
    } catch (error) {
      report(`could not load ${url}: ${error.message}`, "error");
      return null;
    }
  }

  async function loadFiles(files) {
    const texts = await Promise.all([...files].map((file) => file.text()));
    const names = [...files].map((file) => file.name);
    return load(texts.join("\n"), names.length === 1 ? names[0] : `${names.length} files`);
  }

  playBtn?.addEventListener("click", () => {
    if (run && t >= run.duration) t = 0;
    setPlaying(!playing);
  });

  scrub?.addEventListener("input", () => {
    if (!run) return;
    t = (Number(scrub.value) / 1000) * run.duration;
    apply();
  });

  sampleBtn?.addEventListener("click", () => loadUrl(sampleBtn.dataset.src));
  fileInput?.addEventListener("change", () => fileInput.files.length && loadFiles(fileInput.files));

  // Transcripts can be dropped anywhere on the page, several agents at once.
  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => {
    event.preventDefault();
    if (event.dataTransfer?.files.length) loadFiles(event.dataTransfer.files);
  });

  setPlaying(false);

  return {
    load,
    loadUrl,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    seek(ms) {
      if (!run) return;
      t = Math.max(0, Math.min(ms, run.duration));
      apply();
    },
    get run() {
      return run;
    },
    get time() {
      return t;
    },
  };
}

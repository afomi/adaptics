/**
 * Cards — people (and bots) as cards moving through a Three.js space.
 *
 * Each card stands upright on a ground plane and can be moved anywhere in
 * x, y, z. A card can also open into a live view of a URL: an iframe mounted on
 * the card's face through a CSS3D layer, so the card becomes a window onto what
 * that person or bot is looking at.
 *
 * Two layers share one scene and one camera:
 *   - WebGL draws the plane, the card bodies, and their drop lines;
 *   - CSS3D draws the iframes, stacked on top of the WebGL canvas.
 * CSS3D content is never occluded by WebGL geometry, which is acceptable here:
 * an open card is the thing you are looking at.
 *
 * The returned handle doubles as the bot interface (see `api` below) and is
 * exposed as `window.cards` by the page, so a bot — or a channel bridging to
 * one — can add cards, move them, and point them at URLs.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS3DRenderer, CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

const BG = 0x0b0e1a;

// Card proportions: 2:3, like a playing card or a phone held upright.
const CARD_W = 1.6;
const CARD_H = 2.4;
const CARD_DEPTH = 0.04;
const CARD_RADIUS = 0.12;

// The iframe is laid out at this pixel size and scaled down into world units,
// so pages render at a sensible device width rather than a handful of pixels.
const VIEW_PX_W = 480;
const VIEW_PX_H = 720;

const MOVE_SPEED = 4; // world units per second
const EASE = 6; // how quickly a card closes on its target (per second)
const GROUND_EXTENT = 60;

const ROLE_COLORS = {
  person: 0xe8c872,
  bot: 0x6fd3c4,
};

const DEFAULT_CARDS = [
  { id: "ryan", name: "Ryan", role: "person", position: { x: -3, y: 0, z: 1 } },
  { id: "ada", name: "Ada", role: "person", position: { x: 0, y: 0, z: -2 } },
  {
    id: "smash",
    name: "Votesmash bot",
    role: "bot",
    url: "https://votesmash.app",
    position: { x: 3, y: 1, z: 1 },
  },
];

function roundedRectShape(w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function hex(color) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

// The card face is a 2D canvas drawn once per change (name, role, url, focus)
// and uploaded as a texture — cheap, and crisp at the sizes cards appear.
function drawFace(canvas, card, selected) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const accent = hex(ROLE_COLORS[card.role] || ROLE_COLORS.person);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#141a2c";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 10);

  // Avatar disc with initials.
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.3, w * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = selected ? accent : "#232b44";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.stroke();

  ctx.fillStyle = selected ? "#141a2c" : "#e8e4d4";
  ctx.font = `600 ${Math.round(w * 0.16)}px Palatino, Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials(card.name), w / 2, h * 0.3);

  ctx.fillStyle = "#e8e4d4";
  ctx.font = `500 ${Math.round(w * 0.085)}px Palatino, Georgia, serif`;
  ctx.fillText(card.name, w / 2, h * 0.56, w * 0.9);

  ctx.fillStyle = accent;
  ctx.font = `${Math.round(w * 0.05)}px ui-monospace, Menlo, monospace`;
  ctx.fillText(card.role.toUpperCase(), w / 2, h * 0.63);

  // Status is what the card is doing now (e.g. its last API call in a crowd
  // replay); detail is a quieter second line beneath it.
  if (card.status) {
    ctx.fillStyle = card.statusTone === "error" ? "#e8595a" : "#d8dcec";
    ctx.font = `${Math.round(w * 0.05)}px ui-monospace, Menlo, monospace`;
    ctx.fillText(card.status, w / 2, h * 0.72, w * 0.9);
  }
  if (card.detail) {
    ctx.fillStyle = "#6a7288";
    ctx.font = `${Math.round(w * 0.042)}px ui-monospace, Menlo, monospace`;
    ctx.fillText(card.detail, w / 2, h * 0.77, w * 0.9);
  }

  if (card.url) {
    ctx.fillStyle = "#6a7288";
    ctx.font = `${Math.round(w * 0.042)}px ui-monospace, Menlo, monospace`;
    ctx.fillText(card.url.replace(/^https?:\/\//, ""), w / 2, h * 0.86, w * 0.9);
    ctx.fillText("double-click to view", w / 2, h * 0.91, w * 0.9);
  }
}

export function renderCards(containerId, ids = {}) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 30, 80);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.style.position = "relative";
  container.appendChild(renderer.domElement);

  // The CSS3D layer sits over the WebGL canvas. It ignores the pointer so orbit
  // and picking reach the canvas beneath; only open views opt back in.
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.setSize(container.clientWidth, container.clientHeight);
  Object.assign(cssRenderer.domElement.style, {
    position: "absolute",
    top: "0",
    left: "0",
    pointerEvents: "none",
  });
  container.appendChild(cssRenderer.domElement);

  const aspect = () => container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect(), 0.1, 400);
  camera.position.set(0, 7, 14);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.2, 0);
  controls.maxPolarAngle = Math.PI * 0.49; // stay above the ground

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  // --- ground ---------------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_EXTENT * 2, GROUND_EXTENT * 2),
    new THREE.MeshStandardMaterial({ color: 0x10152a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new THREE.GridHelper(GROUND_EXTENT * 2, GROUND_EXTENT, 0x2a3354, 0x1a2140);
  grid.position.y = 0.001;
  scene.add(grid);

  // --- cards ----------------------------------------------------------------
  const cards = new Map();
  const cardGeometry = new THREE.ExtrudeGeometry(roundedRectShape(CARD_W, CARD_H, CARD_RADIUS), {
    depth: CARD_DEPTH,
    bevelEnabled: false,
  });
  cardGeometry.translate(0, 0, -CARD_DEPTH / 2);
  const faceGeometry = new THREE.PlaneGeometry(CARD_W - 0.12, CARD_H - 0.12);

  let selectedId = null;
  const frameHooks = new Set();

  function emit(type, detail) {
    container.dispatchEvent(new CustomEvent(`cards:${type}`, { detail, bubbles: true }));
  }

  function snapshot(card) {
    return {
      id: card.id,
      name: card.name,
      role: card.role,
      url: card.url,
      open: card.open,
      status: card.status,
      position: { x: card.target.x, y: card.target.y, z: card.target.z },
    };
  }

  function redrawFace(card) {
    drawFace(card.faceCanvas, card, card.id === selectedId);
    card.faceTexture.needsUpdate = true;
  }

  function buildView(card) {
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      width: `${VIEW_PX_W}px`,
      height: `${VIEW_PX_H}px`,
      display: "flex",
      flexDirection: "column",
      background: "#0b0e1a",
      border: `2px solid ${hex(ROLE_COLORS[card.role] || ROLE_COLORS.person)}`,
      borderRadius: "18px",
      overflow: "hidden",
      pointerEvents: "auto",
      fontFamily: "ui-monospace, Menlo, monospace",
    });

    const bar = document.createElement("div");
    Object.assign(bar.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      fontSize: "12px",
      color: "#d8dcec",
      background: "#141a2c",
    });

    const title = document.createElement("span");
    title.style.flex = "1";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.whiteSpace = "nowrap";

    // Some sites refuse to be framed (X-Frame-Options / frame-ancestors) and
    // the iframe just stays blank — the browser gives no load error to catch.
    // The escape hatch is always visible so a blank view is never a dead end.
    const popout = document.createElement("a");
    popout.target = "_blank";
    popout.rel = "noopener";
    popout.textContent = "open ↗";
    popout.style.color = "#e8c872";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    Object.assign(close.style, { color: "#d8dcec", fontSize: "16px", lineHeight: "1" });
    close.addEventListener("click", () => api.close(card.id));

    bar.append(title, popout, close);

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { flex: "1", width: "100%", border: "0", background: "#fff" });
    iframe.referrerPolicy = "no-referrer";

    wrapper.append(bar, iframe);

    const object = new CSS3DObject(wrapper);
    object.scale.setScalar(CARD_W / VIEW_PX_W);
    object.position.z = CARD_DEPTH / 2 + 0.002;
    object.visible = false;
    card.group.add(object);

    card.view = { object, iframe, title, popout };
  }

  function syncView(card) {
    const { object, iframe, title, popout } = card.view;
    const showing = card.open && !!card.url;
    object.visible = showing;
    title.textContent = `${card.name} · ${card.url || ""}`;
    popout.href = card.url || "#";
    // Only (re)load when the URL actually changes; toggling a card closed and
    // open again keeps the page state the bot left it in.
    if (showing && iframe.dataset.src !== card.url) {
      iframe.dataset.src = card.url;
      iframe.src = card.url;
    }
  }

  function addCard({ id, name, role = "person", url = null, position = {} }) {
    if (!id) throw new Error("cards.add: id is required");
    if (cards.has(id)) return snapshot(cards.get(id));

    const color = ROLE_COLORS[role] || ROLE_COLORS.person;
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      cardGeometry,
      new THREE.MeshStandardMaterial({ color: 0x1c2338, roughness: 0.6, metalness: 0.1 }),
    );
    group.add(body);

    const faceCanvas = document.createElement("canvas");
    faceCanvas.width = 320;
    faceCanvas.height = 480;
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    const faceMaterial = new THREE.MeshBasicMaterial({ map: faceTexture });

    const front = new THREE.Mesh(faceGeometry, faceMaterial);
    front.position.z = CARD_DEPTH / 2 + 0.001;
    const back = new THREE.Mesh(faceGeometry, faceMaterial);
    back.position.z = -CARD_DEPTH / 2 - 0.001;
    back.rotation.y = Math.PI;
    group.add(front, back);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(cardGeometry),
      new THREE.LineBasicMaterial({ color }),
    );
    group.add(outline);

    // A drop line and ground ring make height legible: without them a card
    // raised in y is indistinguishable from one further away.
    const drop = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.1, transparent: true, opacity: 0.6 }),
    );
    scene.add(drop);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.62, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // `position` is where the card's bottom edge sits; y = 0 is on the plane.
    const start = new THREE.Vector3(position.x || 0, Math.max(0, position.y || 0), position.z || 0);
    group.position.set(start.x, start.y + CARD_H / 2, start.z);
    scene.add(group);

    const card = {
      id,
      name: name || id,
      role,
      url,
      open: false,
      status: null,
      statusTone: null,
      detail: null,
      group,
      body,
      outline,
      drop,
      ring,
      faceCanvas,
      faceTexture,
      target: start.clone(),
    };
    body.userData.cardId = id;
    front.userData.cardId = id;
    back.userData.cardId = id;

    cards.set(id, card);
    buildView(card);
    redrawFace(card);
    syncView(card);
    renderList();
    emit("added", snapshot(card));
    return snapshot(card);
  }

  function removeCard(id) {
    const card = cards.get(id);
    if (!card) return false;
    scene.remove(card.group, card.drop, card.ring);
    card.view.object.element.remove();
    card.faceTexture.dispose();
    cards.delete(id);
    if (selectedId === id) selectedId = null;
    renderList();
    emit("removed", { id });
    return true;
  }

  function mustGet(id) {
    const card = cards.get(id);
    if (!card) throw new Error(`cards: no card with id "${id}"`);
    return card;
  }

  function setTarget(card, { x, y, z }) {
    if (Number.isFinite(x)) card.target.x = THREE.MathUtils.clamp(x, -GROUND_EXTENT, GROUND_EXTENT);
    if (Number.isFinite(y)) card.target.y = THREE.MathUtils.clamp(y, 0, GROUND_EXTENT);
    if (Number.isFinite(z)) card.target.z = THREE.MathUtils.clamp(z, -GROUND_EXTENT, GROUND_EXTENT);
  }

  // --- the bot interface ------------------------------------------------------
  // Everything a bot needs, and nothing that assumes a mouse. Positions are the
  // card's bottom-centre; moves are eased, so a bot can issue a target and let
  // the scene animate the travel.
  const api = {
    list: () => [...cards.values()].map(snapshot),
    get: (id) => (cards.has(id) ? snapshot(cards.get(id)) : null),
    add: addCard,
    remove: removeCard,
    moveTo(id, position) {
      const card = mustGet(id);
      setTarget(card, position);
      emit("moved", snapshot(card));
      return snapshot(card);
    },
    moveBy(id, { x = 0, y = 0, z = 0 }) {
      const card = mustGet(id);
      return api.moveTo(id, { x: card.target.x + x, y: card.target.y + y, z: card.target.z + z });
    },
    setUrl(id, url) {
      const card = mustGet(id);
      card.url = url || null;
      if (!card.url) card.open = false;
      redrawFace(card);
      syncView(card);
      renderList();
      emit("url", snapshot(card));
      return snapshot(card);
    },
    open(id) {
      const card = mustGet(id);
      card.open = !!card.url;
      syncView(card);
      renderList();
      return snapshot(card);
    },
    close(id) {
      const card = mustGet(id);
      card.open = false;
      syncView(card);
      renderList();
      return snapshot(card);
    },
    toggle(id) {
      return cards.get(id)?.open ? api.close(id) : api.open(id);
    },
    select(id) {
      const previous = selectedId;
      selectedId = id && cards.has(id) ? id : null;
      if (previous && cards.has(previous)) redrawFace(cards.get(previous));
      if (selectedId) redrawFace(cards.get(selectedId));
      renderList();
      emit("selected", { id: selectedId });
      return selectedId;
    },
    setStatus(id, { text = null, tone = null, detail = null } = {}) {
      const card = mustGet(id);
      if (card.status === text && card.statusTone === tone && card.detail === detail) return;
      Object.assign(card, { status: text, statusTone: tone, detail });
      redrawFace(card);
    },
    // Where the card is drawn this frame (mid-glide), not where it is headed —
    // for anything that has to attach to the card visually.
    worldPosition(id) {
      return mustGet(id).group.position.clone();
    },
    clear() {
      [...cards.keys()].forEach(removeCard);
    },
    // Per-frame hook for layers built on top of the card space (e.g. replays).
    onFrame(fn) {
      frameHooks.add(fn);
      return () => frameHooks.delete(fn);
    },
    get selected() {
      return selectedId;
    },
  };

  // --- side panel -------------------------------------------------------------
  const listEl = ids.list && document.getElementById(ids.list);
  const urlForm = ids.urlForm && document.getElementById(ids.urlForm);
  const urlInput = ids.urlInput && document.getElementById(ids.urlInput);
  const viewToggle = ids.viewToggle && document.getElementById(ids.viewToggle);

  function renderList() {
    if (listEl) {
      listEl.replaceChildren(
        ...[...cards.values()].map((card) => {
          const item = document.createElement("button");
          item.type = "button";
          item.dataset.cardId = card.id;
          item.dataset.selected = String(card.id === selectedId);
          item.className = "cards-item";
          const swatch = document.createElement("span");
          swatch.className = "cards-swatch";
          swatch.style.background = hex(ROLE_COLORS[card.role] || ROLE_COLORS.person);
          const label = document.createElement("span");
          label.textContent = card.open ? `${card.name} · viewing` : card.name;
          item.append(swatch, label);
          item.addEventListener("click", () => api.select(card.id));
          return item;
        }),
      );
    }

    const card = selectedId && cards.get(selectedId);
    if (urlForm) urlForm.dataset.disabled = String(!card);
    if (urlInput && document.activeElement !== urlInput) urlInput.value = card?.url || "";
    if (viewToggle) {
      viewToggle.disabled = !card?.url;
      viewToggle.dataset.open = String(!!card?.open);
      viewToggle.textContent = card?.open ? "Close view" : "Open view";
    }
  }

  urlForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedId) return;
    let url = urlInput.value.trim();
    if (url && !/^https?:\/\//.test(url)) url = `https://${url}`;
    api.setUrl(selectedId, url);
    if (url) api.open(selectedId);
    urlInput.blur();
  });

  viewToggle?.addEventListener("click", () => selectedId && api.toggle(selectedId));

  // --- pointer: pick a card, or send the selected card to a spot ---------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = null;

  function hit(event, objects) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, false)[0] || null;
  }

  function pickableMeshes() {
    const meshes = [];
    for (const card of cards.values()) {
      card.group.traverse((obj) => obj.userData.cardId && meshes.push(obj));
    }
    return meshes;
  }

  renderer.domElement.addEventListener("pointerdown", (event) => {
    downAt = { x: event.clientX, y: event.clientY };
  });

  // A click is a pointerup that barely moved; anything longer was an orbit drag.
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > 4) return;

    const cardHit = hit(event, pickableMeshes());
    if (cardHit) {
      api.select(cardHit.object.userData.cardId);
      return;
    }
    const groundHit = hit(event, [ground]);
    if (groundHit && selectedId) {
      api.moveTo(selectedId, { x: groundHit.point.x, z: groundHit.point.z });
    } else {
      api.select(null);
    }
  });

  renderer.domElement.addEventListener("dblclick", (event) => {
    const cardHit = hit(event, pickableMeshes());
    if (cardHit) api.toggle(cardHit.object.userData.cardId);
  });

  // --- keyboard: fly the selected card -----------------------------------------
  // WASD moves relative to where the camera looks (projected onto the plane),
  // so "forward" always means into the screen. E / Q rise and sink.
  const held = new Set();
  const MOVE_KEYS = new Set(["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

  function typing() {
    const el = document.activeElement;
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  }

  window.addEventListener("keydown", (event) => {
    if (typing()) return;
    const key = event.key.toLowerCase();
    if (key === "escape") api.select(null);
    if (key === "enter" && selectedId) api.toggle(selectedId);
    if (MOVE_KEYS.has(key) && selectedId) {
      held.add(key);
      event.preventDefault();
    }
    if (event.shiftKey) held.add("shift");
  });
  window.addEventListener("keyup", (event) => {
    held.delete(event.key.toLowerCase());
    if (!event.shiftKey) held.delete("shift");
  });
  window.addEventListener("blur", () => held.clear());

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const step = new THREE.Vector3();

  function steer(dt) {
    if (!selectedId || held.size === 0) return;
    const card = cards.get(selectedId);
    if (!card) return;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    step.set(0, 0, 0);
    if (held.has("w") || held.has("arrowup")) step.add(forward);
    if (held.has("s") || held.has("arrowdown")) step.sub(forward);
    if (held.has("d") || held.has("arrowright")) step.add(right);
    if (held.has("a") || held.has("arrowleft")) step.sub(right);
    if (held.has("e")) step.y += 1;
    if (held.has("q")) step.y -= 1;
    if (step.lengthSq() === 0) return;

    const speed = MOVE_SPEED * (held.has("shift") ? 3 : 1);
    step.normalize().multiplyScalar(speed * dt);
    setTarget(card, {
      x: card.target.x + step.x,
      y: card.target.y + step.y,
      z: card.target.z + step.z,
    });
  }

  // --- frame -------------------------------------------------------------------
  const clock = new THREE.Clock();
  const toCamera = new THREE.Vector3();
  let lastMovedEmit = 0;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    const now = clock.elapsedTime;

    const steering = selectedId && held.size > 0;
    steer(dt);
    if (steering && now - lastMovedEmit > 0.2) {
      lastMovedEmit = now;
      emit("moved", snapshot(cards.get(selectedId)));
    }

    const k = 1 - Math.exp(-EASE * dt);
    for (const card of cards.values()) {
      const g = card.group.position;
      g.x += (card.target.x - g.x) * k;
      g.y += (card.target.y + CARD_H / 2 - g.y) * k;
      g.z += (card.target.z - g.z) * k;

      // Cards turn about their vertical axis to face the camera, so a face and
      // its open view are always readable; they never tilt off upright.
      toCamera.subVectors(camera.position, g);
      card.group.rotation.y = Math.atan2(toCamera.x, toCamera.z);

      const bottom = g.y - CARD_H / 2;
      const points = card.drop.geometry.attributes.position;
      points.setXYZ(0, g.x, bottom, g.z);
      points.setXYZ(1, g.x, 0, g.z);
      points.needsUpdate = true;
      card.drop.computeLineDistances();
      card.drop.visible = bottom > 0.02;
      card.ring.position.x = g.x;
      card.ring.position.z = g.z;

      const selected = card.id === selectedId;
      card.ring.material.opacity = selected ? 1 : 0.45;
    }

    frameHooks.forEach((fn) => fn(dt));

    controls.update();
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
  }

  DEFAULT_CARDS.forEach(addCard);
  api.select("smash");
  frame();

  window.addEventListener("resize", () => {
    camera.aspect = aspect();
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    cssRenderer.setSize(container.clientWidth, container.clientHeight);
  });

  return Object.assign(api, { scene, camera, controls, renderer, cssRenderer });
}

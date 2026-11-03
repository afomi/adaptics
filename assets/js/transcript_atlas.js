import * as THREE from "three";
import { createStage, makeSprite } from "./three_stage.js";
import { timeExtent, position, revealed, timeBins } from "./transcript_atlas_model.js";

const COLORS = ["#38bdf8", "#c084fc", "#4ade80", "#fb7185", "#facc15", "#2dd4bf", "#f9a8d4", "#a5b4fc", "#fb923c", "#a3e635"];
const color = topic => COLORS[Number(topic) % COLORS.length];
const date = at => Number.isFinite(at) ? new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Undated";

export const TranscriptAtlas = {
  mounted() {
    const atlas = JSON.parse(this.el.dataset.atlas);
    const project = this.el.dataset.project;
    // Transcript text is only ever assigned as textContent.
    this.el.innerHTML = `<div class="tx-atlas-grid">
      <div class="tx-atlas-stage"><div class="tx-atlas-toolbar"><select aria-label="Spatial view"><option value="semantic">Semantic space</option><option value="time">Semantics + time</option></select><span>Drag to orbit · scroll to zoom · select a point</span></div><p class="tx-atlas-status" aria-live="polite"></p></div>
      <aside class="tx-atlas-reader"><p class="tx-atlas-eyebrow">One message, in context</p><select class="tx-atlas-message-select" aria-label="Inspect a message"></select><h2>Choose a point</h2><p class="tx-atlas-source"></p><p class="tx-atlas-message"></p><a class="tx-atlas-open" hidden>Open original turn →</a><h3>Nearest messages in other sessions</h3><p class="tx-atlas-explanation">Cosine similarity in all embedding dimensions. These are candidates for a shared thread.</p><ol class="tx-atlas-matches"></ol></aside>
      </div><div class="tx-atlas-timeline"><div class="tx-atlas-time-controls"><button type="button" class="tx-atlas-play">Play</button><output></output><button type="button" class="tx-atlas-reset">Show all</button></div><div class="tx-atlas-histogram" aria-hidden="true"></div><input type="range" aria-label="Reveal messages through date"><div class="tx-atlas-time-labels"><span></span><span></span></div></div><div class="tx-atlas-legend"></div>`;
    const find = selector => this.el.querySelector(selector);
    const host = find(".tx-atlas-stage");
    const status = find(".tx-atlas-status");
    const slider = find('input[type="range"]');
    const output = find("output");
    const play = find(".tx-atlas-play");
    const modeInput = find("select");
    const matchesList = find(".tx-atlas-matches");
    const messageInput = find(".tx-atlas-message-select");
    [...atlas.points].sort((a, b) => (a.at ?? 0) - (b.at ?? 0) || a.id.localeCompare(b.id)).forEach(point => {
      const option = document.createElement("option"); option.value = point.id;
      option.textContent = `${date(point.at)} · ${point.text.slice(0, 80)}`;
      messageInput.appendChild(option);
    });
    const extent = timeExtent(atlas.points);
    let until = extent[1], mode = "semantic", selected = null, playing = false;
    let disposed = false, frame = 0, lastFrame = 0, lastReadout = 0;
    slider.min = extent[0]; slider.max = Math.max(extent[1], extent[0] + 1);
    slider.step = 1; slider.value = until;
    slider.disabled = extent[0] === extent[1];
    play.disabled = slider.disabled;
    find(".tx-atlas-time-labels span:first-child").textContent = date(extent[0]);
    find(".tx-atlas-time-labels span:last-child").textContent = date(extent[1]);
    const bins = timeBins(atlas.points), peak = Math.max(...bins, 1);
    bins.forEach(n => {
      const bar = document.createElement("i");
      bar.style.height = `${Math.max(n / peak * 100, 2)}%`;
      find(".tx-atlas-histogram").appendChild(bar);
    });
    Object.entries(atlas.topics).forEach(([id, topic]) => {
      const item = document.createElement("span");
      const swatch = document.createElement("i"); swatch.style.background = color(id);
      item.append(swatch, document.createTextNode(`${topic.label} (${topic.size})`));
      find(".tx-atlas-legend").appendChild(item);
    });

    let stage;
    try { stage = createStage(host, { cameraPosition: [11, 8, 14], fog: null }); }
    catch (_) {
      status.textContent = "WebGL is unavailable. Open a session and use More like this to inspect embeddings.";
      this.cleanup = () => {};
      return;
    }
    const { scene, camera, renderer, controls, tooltip } = stage;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const observer = new ResizeObserver(stage.resize); observer.observe(host);
    const geometry = new THREE.SphereGeometry(0.075, 12, 8);
    const meshes = new Map();
    const pointById = new Map(atlas.points.map(p => [p.id, p]));
    for (const point of atlas.points) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: color(point.topic), transparent: true }));
      mesh.position.fromArray(position(point, mode, extent)).multiplyScalar(5);
      mesh.userData = point;
      scene.add(mesh); meshes.set(point.id, mesh);
    }
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 10, 10)), new THREE.LineBasicMaterial({ color: 0x26344e }));
    scene.add(box);
    let axisLabel = makeSprite("PC2", "#94a3b8", 0.7);
    axisLabel.position.set(0, 5.6, 0); scene.add(axisLabel);
    const links = new THREE.Group(); scene.add(links);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
    halo.visible = false; scene.add(halo);
    let neighborIds = [];
    const clearLinks = () => {
      for (const line of [...links.children]) { line.geometry.dispose(); line.material.dispose(); }
      links.clear();
    };
    const drawLinks = () => {
      clearLinks();
      const source = meshes.get(selected);
      if (!source || !revealed(source.userData, until)) return;
      for (const id of neighborIds) {
        const target = meshes.get(id);
        if (!target || !revealed(target.userData, until)) continue;
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([source.position, target.position]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
        links.add(line);
      }
    };
    const readout = () => {
      slider.value = until;
      slider.setAttribute("aria-valuetext", date(until));
      output.textContent = `Through ${date(until)} · ${atlas.points.filter(p => revealed(p, until)).length} / ${atlas.points.length} messages`;
      for (const [id, mesh] of meshes) {
        mesh.material.opacity = revealed(mesh.userData, until) ? (selected && selected !== id && !neighborIds.includes(id) ? 0.35 : 1) : 0.055;
        mesh.scale.setScalar(id === selected || neighborIds.includes(id) ? 1.6 : 1);
      }
      halo.visible = !!selected && revealed(pointById.get(selected), until);
      drawLinks();
    };
    const url = (session, number) => `/transcripts/${encodeURIComponent(project)}/${encodeURIComponent(session)}#turn-${number}`;
    const choose = point => {
      selected = point.id; neighborIds = []; clearLinks();
      messageInput.value = point.id;
      halo.position.copy(meshes.get(selected).position);
      find(".tx-atlas-reader h2").textContent = atlas.topics[point.topic].label;
      find(".tx-atlas-source").textContent = `${date(point.at)} · ${point.title} · turn ${point.number}`;
      find(".tx-atlas-message").textContent = point.text;
      const open = find(".tx-atlas-open"); open.hidden = false; open.href = url(point.session_id, point.number);
      matchesList.replaceChildren();
      status.textContent = "Comparing full embedding vectors…";
      readout();
      this.pushEvent("atlas-related", { id: point.id }, result => {
        if (disposed || selected !== point.id) return;
        neighborIds = result.matches.map(match => match.id);
        for (const match of result.matches) {
          const li = document.createElement("li"), a = document.createElement("a"), meta = document.createElement("small");
          a.href = url(match.session_id, match.number); a.textContent = match.text.slice(0, 240);
          meta.textContent = `cosine ${match.similarity.toFixed(3)} · session ${match.session_id.slice(0, 8)} · turn ${match.number}`;
          li.append(a, meta); matchesList.appendChild(li);
        }
        if (!result.matches.length) {
          const li = document.createElement("li"); li.textContent = "No indexed matches in other sessions."; matchesList.appendChild(li);
        }
        status.textContent = `${result.matches.length} related turns · white lines connect visible matches`;
        readout();
      });
    };
    const stop = () => { playing = false; play.textContent = "Play"; };
    messageInput.addEventListener("change", () => {
      const point = pointById.get(messageInput.value);
      stop(); if (Number.isFinite(point.at)) until = Math.max(until, point.at);
      choose(point);
    });
    slider.addEventListener("input", () => { stop(); until = Number(slider.value); readout(); });
    play.addEventListener("click", () => {
      playing = !playing; play.textContent = playing ? "Pause" : "Play";
      if (playing && until >= extent[1]) until = extent[0];
    });
    find(".tx-atlas-reset").addEventListener("click", () => { stop(); until = extent[1]; readout(); });
    modeInput.addEventListener("change", () => {
      mode = modeInput.value;
      for (const mesh of meshes.values()) mesh.position.fromArray(position(mesh.userData, mode, extent)).multiplyScalar(5);
      axisLabel.material.map.dispose(); axisLabel.material.dispose(); scene.remove(axisLabel);
      axisLabel = makeSprite(mode === "time" ? "Message time" : "PC2", "#94a3b8", 0.7);
      axisLabel.position.set(0, 5.6, 0); scene.add(axisLabel);
      // The height axis changes; PC1 and PC3 remain the semantic plane.
      if (selected) halo.position.copy(meshes.get(selected).position);
      status.textContent = mode === "time" ? "Height = message time · horizontal plane = PC1 and PC3" : "Three principal components · full-vector scores in the reader";
      drawLinks();
    });
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let down = null;
    const pick = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects([...meshes.values()]).find(hit => revealed(hit.object.userData, until))?.object.userData;
    };
    renderer.domElement.addEventListener("pointerdown", event => { down = [event.clientX, event.clientY]; });
    renderer.domElement.addEventListener("pointerup", event => {
      if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 5) { const p = pick(event); if (p) choose(p); }
      down = null;
    });
    renderer.domElement.addEventListener("pointermove", event => {
      const p = pick(event); tooltip.style.display = p ? "block" : "none";
      renderer.domElement.style.cursor = p ? "pointer" : "grab";
      if (p) {
        const rect = host.getBoundingClientRect(); tooltip.textContent = p.text.slice(0, 180);
        tooltip.style.left = `${Math.min(event.clientX - rect.left + 12, Math.max(host.clientWidth - 290, 8))}px`;
        tooltip.style.top = `${event.clientY - rect.top + 12}px`;
      }
    });
    renderer.domElement.addEventListener("pointerleave", () => { tooltip.style.display = "none"; down = null; });
    const animate = now => {
      if (disposed) return;
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0; lastFrame = now;
      if (playing) {
        until = Math.min(extent[1], until + (extent[1] - extent[0]) * dt / 16);
        if (now - lastReadout > 80 || until === extent[1]) { readout(); lastReadout = now; }
        if (until === extent[1]) stop();
      }
      controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(animate);
    };
    readout();
    const initial = pointById.get(this.el.dataset.focus) || atlas.points.find(p => atlas.topics[p.topic].size > 1) || atlas.points[0];
    choose(initial);
    frame = requestAnimationFrame(animate);
    this.cleanup = () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("resize", stage.resize); controls.dispose(); clearLinks();
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => { m.map?.dispose(); m.dispose(); });
      renderer.dispose(); this.el.replaceChildren();
    };
  },
  destroyed() { this.cleanup?.(); }
};

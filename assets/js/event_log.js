// EventLog — Story 26
// In-memory event log with a collapsible dev panel.
// Events are plain objects: { type, payload, ts }
//
// Typed event constructors (all return the event object):
//   EventLog.nodeCreated(id, x, y)
//   EventLog.nodeMoved(id, fromX, fromY, toX, toY)
//   EventLog.nodeLabelUpdated(id, name)
//   EventLog.nodeDeleted(id)
//   EventLog.edgeCreated(id, fromId, toId)
//   EventLog.stateChanged(from, to, nodeId)
//
// EventLog.make(container, { dev })  → instance with .push(event) and .panel DOM node

export const EventLog = {
  // ── Typed constructors ────────────────────────────────────────────────────

  nodeCreated(id, x, y) {
    return { type: `create:node:${id}`, payload: { id, x, y }, ts: Date.now() };
  },

  nodeMoved(id, fromX, fromY, toX, toY) {
    return {
      type: `move:node:${id}`,
      payload: { id, from: { x: fromX, y: fromY }, to: { x: toX, y: toY } },
      ts: Date.now(),
    };
  },

  nodeLabelUpdated(id, name) {
    return { type: `label:node:${id}`, payload: { id, name }, ts: Date.now() };
  },

  nodeDeleted(id) {
    return { type: `delete:node:${id}`, payload: { id }, ts: Date.now() };
  },

  edgeCreated(id, fromId, toId) {
    return {
      type: `create:edge:${id}`,
      payload: { id, from_id: fromId, to_id: toId },
      ts: Date.now(),
    };
  },

  stateChanged(from, to, nodeId = null) {
    return {
      type: `state:${from}→${to}`,
      payload: nodeId ? { node_id: nodeId } : {},
      ts: Date.now(),
    };
  },

  nodeHovered(id) {
    return { type: `hover:node:${id}`, payload: { id }, ts: Date.now() };
  },

  // ── Instance factory ──────────────────────────────────────────────────────
  //
  // Options:
  //   dev      — show panel + console.debug
  //   onFlush  — function(events) called every flushInterval with buffered events
  //   flushInterval — ms between flushes (default 5000)

  make(container, { dev = false, onFlush = null, flushInterval = 5000 } = {}) {
    const log = [];
    const buffer = [];
    let panel = null;
    let listEl = null;
    let flushTimer = null;

    if (dev) {
      panel = buildPanel(container);
      listEl = panel.querySelector(".event-log-list");
    }

    if (onFlush) {
      flushTimer = setInterval(() => {
        if (buffer.length === 0) return;
        const batch = buffer.splice(0);
        onFlush(batch);
      }, flushInterval);
    }

    function push(event) {
      log.push(event);
      if (onFlush) buffer.push(event);
      if (dev) {
        console.debug("[event]", event.type, event.payload);
        if (listEl) appendRow(listEl, event);
      }
      return event;
    }

    function getAll() {
      return [...log];
    }

    function destroy() {
      if (flushTimer) clearInterval(flushTimer);
    }

    return { push, getAll, destroy, panel };
  },
};

// ── Panel DOM ──────────────────────────────────────────────────────────────

function buildPanel(container) {
  const panel = document.createElement("div");
  panel.className = "event-log-panel";
  panel.style.cssText = [
    "position:absolute",
    "bottom:12px",
    "right:12px",
    "width:340px",
    "max-height:260px",
    "background:#0f172a",
    "border:1px solid #334155",
    "border-radius:6px",
    "font-family:ui-monospace,monospace",
    "font-size:11px",
    "color:#94a3b8",
    "z-index:50",
    "display:flex",
    "flex-direction:column",
    "overflow:hidden",
    "pointer-events:all",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;" +
    "padding:4px 10px;border-bottom:1px solid #334155;cursor:pointer;" +
    "user-select:none;flex-shrink:0;";
  header.innerHTML =
    '<span style="color:#38bdf8;font-weight:600;">event log</span>' +
    '<span class="event-log-toggle" style="color:#64748b;">▾</span>';

  const list = document.createElement("div");
  list.className = "event-log-list";
  list.style.cssText =
    "overflow-y:auto;flex:1;padding:4px 0;";

  let collapsed = false;
  header.addEventListener("click", () => {
    collapsed = !collapsed;
    list.style.display = collapsed ? "none" : "";
    header.querySelector(".event-log-toggle").textContent = collapsed ? "▸" : "▾";
  });

  panel.appendChild(header);
  panel.appendChild(list);
  container.appendChild(panel);
  return panel;
}

function appendRow(listEl, event) {
  const row = document.createElement("div");
  row.style.cssText =
    "padding:2px 10px;border-bottom:1px solid #1e293b;white-space:nowrap;" +
    "overflow:hidden;text-overflow:ellipsis;";

  const time = new Date(event.ts).toISOString().slice(11, 23); // HH:MM:SS.mmm
  row.title = JSON.stringify(event.payload); // full payload on hover
  row.innerHTML =
    `<span style="color:#475569;">${time}</span> ` +
    `<span style="color:#e2e8f0;">${event.type}</span>`;

  listEl.appendChild(row);
  // Scroll to bottom
  listEl.scrollTop = listEl.scrollHeight;
}

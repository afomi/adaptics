// Canvas Hook — Story 22/23/24/28/29/26
// State machine: idle → selected → connecting → idle
//
// idle:       nothing selected; double-click bg creates node
// selected:   one node highlighted (blue); press E or click another → connecting
//             Escape / click same node / click bg → idle
// connecting: source highlighted (yellow), cursor is crosshair; click target → edge created → idle
//             Escape / click same node / click bg → idle
//
// Drag is available in any state; short moves (<4px) are treated as clicks.
// All actions are recorded to EventLog; dev panel shown when data-dev="true".
// Communicates with CanvasLive via pushEvent / handleEvent.

import { EventLog } from "./event_log";
import { ProjectionSelector } from "./projection_selector";
import { AxisEngine, MARGIN } from "./axis_engine";

const NODE_W = 140;
const NODE_H = 48;

const STATES = { IDLE: "idle", SELECTED: "selected", CONNECTING: "connecting" };

export const CanvasHook = {
  mounted() {
    this.nodes = JSON.parse(this.el.dataset.nodes || "[]");
    this.edges = JSON.parse(this.el.dataset.edges || "[]");
    this.state = STATES.IDLE;
    this.selectedId = null;   // node id in SELECTED state
    this.sourceId = null;     // node id in CONNECTING state

    // Axis layout — resolved payload from Adaptics.Projections.Axis.resolve/2
    this.layout = JSON.parse(this.el.dataset.layout || '{"kind":"freeform","drag_enabled":true}');
    this.schema = JSON.parse(this.el.dataset.schema || "[]");
    this.suggestions = JSON.parse(this.el.dataset.suggestions || "[]");
    this.semanticAxes = JSON.parse(this.el.dataset.semanticAxes || "[]");
    this.comparison = JSON.parse(this.el.dataset.comparison || "null");
    this.baseXY = new Map(this.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    this.unplacedIds = new Set();
    this.cancelTween = null;

    const dev = this.el.dataset.dev === "true";

    // Projection selector
    this.projections = JSON.parse(this.el.dataset.projections || "[]");
    this.activeProjectionId = this.el.dataset.activeProjection
      ? JSON.parse(this.el.dataset.activeProjection)
      : null;

    this.projectionSelector = ProjectionSelector.make(this.el, {
      projections: this.projections,
      activeId: this.activeProjectionId,
      schema: this.schema,
      suggestions: this.suggestions,
      semanticAxes: this.semanticAxes,
      onSelect: (id) => {
        this.pushEvent("projection_selected", { id });
      },
      onSave: (name, layout) => {
        // A save with no axis spec snapshots the current placement — a
        // freeform view is a placement snapshot, not a pointer to node x/y
        // (FC2.13).
        const effective =
          layout && layout.kind
            ? layout
            : {
                kind: "freeform",
                positions: Object.fromEntries(this.nodes.map((n) => [n.id, [n.x, n.y]])),
              };
        this.pushEvent("projection_saved", {
          name,
          filter_config: {},
          layout: effective,
        });
      },
      onPreview: (layout) => {
        this.pushEvent("layout_previewed", { layout: layout || {} });
      },
      onCompare: (id) => {
        this.pushEvent("comparison_selected", { id });
      },
      // FC2.15: /sketch-data persists to this same origin's localStorage,
      // so its nodes/views/modes are readable right here.
      onImport: () => {
        const read = (key) => {
          try {
            return JSON.parse(localStorage.getItem(key) || "[]");
          } catch (_e) {
            return [];
          }
        };
        this.pushEvent("sketch_data_imported", {
          nodes: read("nodes_data_v1"),
          views: read("saved_views_v1"),
          modes: read("custom_modes_v1"),
        });
      },
      hasSketchData:
        !!localStorage.getItem("nodes_data_v1") || !!localStorage.getItem("custom_modes_v1"),
    });

    this.handleEvent("import_result", ({ message }) => this.showHint(message));

    this.log = EventLog.make(this.el, {
      dev,
      onFlush: (events) => {
        this.pushEvent("events_batch", {
          events: events.map((e) => ({ type: e.type, payload: e.payload })),
        });
      },
    });

    this.svg = this.buildSVG();
    this.el.appendChild(this.svg);
    this.renderAll();

    this.svg.addEventListener("dblclick", (e) => {
      if (e.target === this.svg || e.target.classList.contains("canvas-bg")) {
        const pt = this.svgPoint(e);
        this.pushEvent("node_created", { x: pt.x, y: pt.y });
      }
    });

    this.svg.addEventListener("click", (e) => {
      if (e.target === this.svg || e.target.classList.contains("canvas-bg")) {
        this.transition(STATES.IDLE);
      }
    });

    this._onKeyDown = (e) => {
      if (e.key === "Escape") {
        this.transition(STATES.IDLE);
      }
      if (e.key === "e" || e.key === "E") {
        if (this.state === STATES.SELECTED) {
          this.transition(STATES.CONNECTING, { sourceId: this.selectedId });
        }
      }
    };
    window.addEventListener("keydown", this._onKeyDown);

    this.handleEvent("node_added", (node) => {
      this.nodes.push(node);
      this.log.push(EventLog.nodeCreated(node.id, node.x, node.y));
      this.renderAll();
    });

    this.handleEvent("edge_added", (edge) => {
      this.edges.push(edge);
      this.log.push(EventLog.edgeCreated(edge.id, edge.from_id, edge.to_id));
      this.renderEdges();
    });

    this._onResize = () => this.applyLayout(false);
    window.addEventListener("resize", this._onResize);

    this._rawNodes = this.el.dataset.nodes || "[]";
    this._rawLayout = this.el.dataset.layout || "";
    this.applyLayout(false);
  },

  destroyed() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("resize", this._onResize);
    if (this.cancelTween) this.cancelTween();
    this.log.destroy();
  },

  updated() {
    const rawNodes = this.el.dataset.nodes || "[]";
    const rawEdges = this.el.dataset.edges || "[]";
    const rawLayout = this.el.dataset.layout || "";
    const freshProjections = JSON.parse(this.el.dataset.projections || "[]");
    const freshActiveId = this.el.dataset.activeProjection
      ? JSON.parse(this.el.dataset.activeProjection)
      : null;

    // Compare serialized payloads — length checks miss edits to existing
    // records (e.g. changing the active projection's layout).
    const rawComparison = this.el.dataset.comparison || "null";
    const nodesChanged = rawNodes !== this._rawNodes;
    const edgesChanged = rawEdges !== JSON.stringify(this.edges) && JSON.parse(rawEdges).length !== this.edges.length;
    const layoutChanged = rawLayout !== this._rawLayout;
    const comparisonChanged = rawComparison !== JSON.stringify(this.comparison);
    const projectionsChanged =
      freshProjections.length !== this.projections.length ||
      freshActiveId !== this.activeProjectionId;

    if (nodesChanged) {
      const freshNodes = JSON.parse(rawNodes);
      // Fresh nodes carry persisted (freeform) positions; keep on-screen
      // positions as the tween start, remember persisted ones as the base.
      const current = new Map(this.nodes.map((n) => [n.id, n]));
      this.baseXY = new Map(freshNodes.map((n) => [n.id, { x: n.x, y: n.y }]));
      freshNodes.forEach((n) => {
        const cur = current.get(n.id);
        if (cur) {
          n.x = cur.x;
          n.y = cur.y;
        }
      });
      this.nodes = freshNodes;
      this._rawNodes = rawNodes;
    }
    if (edgesChanged) this.edges = JSON.parse(rawEdges);
    if (layoutChanged) {
      this.layout = JSON.parse(rawLayout || '{"kind":"freeform","drag_enabled":true}');
      this._rawLayout = rawLayout;
    }
    if (projectionsChanged) {
      this.projections = freshProjections;
      this.activeProjectionId = freshActiveId;
      this.projectionSelector.update(freshProjections, freshActiveId);
    }
    if (comparisonChanged) this.comparison = JSON.parse(rawComparison);
    if (nodesChanged || edgesChanged) this.renderAll();
    if (nodesChanged || layoutChanged) this.applyLayout(true);
    else if (comparisonChanged) this.renderComparison();
  },

  // ── Axis layout ────────────────────────────────────────────────────────────

  dragEnabled() {
    return !this.layout || this.layout.drag_enabled !== false;
  },

  // Per-node top-left targets for any resolved layout (freeform, axes,
  // semantic). Also used for the comparison overlay (FC2.14).
  computeTargets(resolved) {
    const targets = new Map();
    const unplaced = new Set();

    if (!resolved || resolved.kind === "freeform" || !resolved.kind) {
      const positions = (resolved && resolved.positions) || {};
      for (const n of this.nodes) {
        const snap = positions[String(n.id)];
        const base = this.baseXY.get(n.id) || { x: n.x, y: n.y };
        targets.set(n.id, snap ? { x: snap[0], y: snap[1] } : { x: base.x, y: base.y });
      }
      return { targets, unplaced, axes: null };
    }

    const viewport = {
      width: this.el.clientWidth,
      height: this.el.clientHeight,
      nodeIds: this.nodes.map((n) => n.id),
    };
    const { placed, unplaced: missing, xScale, yScale } = AxisEngine.targets(resolved, viewport);

    placed.forEach((center, id) => {
      targets.set(id, { x: center.x - NODE_W / 2, y: center.y - NODE_H / 2 });
    });

    // Park nodes lacking a value at the bottom-left margin, dimmed.
    missing.forEach((id, i) => {
      unplaced.add(id);
      targets.set(id, {
        x: 12,
        y: viewport.height - MARGIN.bottom - (i + 1) * (NODE_H + 8),
      });
    });

    return { targets, unplaced, axes: { resolved, xScale, yScale, viewport } };
  },

  // Compute per-node targets from the resolved layout and animate to them.
  applyLayout(animate) {
    if (this.cancelTween) this.cancelTween();

    const { targets, unplaced, axes } = this.computeTargets(this.layout);
    this.unplacedIds = unplaced;

    if (axes) {
      this.renderAxes(axes.resolved, axes.xScale, axes.yScale, axes.viewport);
    } else {
      this.renderAxes(null);
    }

    const finish = () => {
      this.cancelTween = null;
      this.renderAll();
    };

    if (animate) {
      this.cancelTween = AxisEngine.tween(this.nodes, targets, {
        duration: 600,
        onFrame: () => {
          this.updatePositions();
          this.renderComparison();
        },
        onDone: finish,
      });
    } else {
      for (const n of this.nodes) {
        const t = targets.get(n.id);
        if (t) {
          n.x = t.x;
          n.y = t.y;
        }
      }
      finish();
    }
  },

  // Ghost-pair overlay for a second projection (FC2.14): dashed ghosts at the
  // comparison layout's positions, arrows from here to there, and an
  // aggregate agreement score (1 - mean displacement / canvas diagonal).
  renderComparison() {
    this.comparisonGroup.innerHTML = "";
    if (!this.comparison) {
      this.comparisonLabel.textContent = "";
      return;
    }

    const { targets } = this.computeTargets(this.comparison.layout);
    const ns = "http://www.w3.org/2000/svg";
    let totalDist = 0;
    let count = 0;

    for (const node of this.nodes) {
      const ghost = targets.get(node.id);
      if (!ghost) continue;

      const dx = ghost.x - node.x;
      const dy = ghost.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      totalDist += dist;
      count += 1;

      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", ghost.x);
      rect.setAttribute("y", ghost.y);
      rect.setAttribute("width", NODE_W);
      rect.setAttribute("height", NODE_H);
      rect.setAttribute("rx", 6);
      rect.setAttribute("fill", "none");
      rect.setAttribute("stroke", "#a78bfa");
      rect.setAttribute("stroke-dasharray", "4 3");
      rect.setAttribute("opacity", "0.5");
      this.comparisonGroup.appendChild(rect);

      if (dist > 2) {
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", node.x + NODE_W / 2);
        line.setAttribute("y1", node.y + NODE_H / 2);
        line.setAttribute("x2", ghost.x + NODE_W / 2);
        line.setAttribute("y2", ghost.y + NODE_H / 2);
        line.setAttribute("stroke", "#a78bfa");
        line.setAttribute("stroke-width", 1);
        line.setAttribute("opacity", "0.5");
        line.setAttribute("marker-end", "url(#comparison-arrowhead)");
        this.comparisonGroup.appendChild(line);
      }
    }

    const diagonal = Math.sqrt(this.el.clientWidth ** 2 + this.el.clientHeight ** 2) || 1;
    const agreement = count > 0 ? Math.max(0, 1 - totalDist / count / diagonal) : 1;
    this.comparisonLabel.textContent =
      `Comparing with "${this.comparison.name}" — agreement ${(agreement * 100).toFixed(0)}% over ${count} node(s)`;
  },

  // Cheap per-frame update: move existing node groups, redraw edges.
  updatePositions() {
    for (const n of this.nodes) {
      const g = this.nodesGroup.querySelector(`g[data-id="${n.id}"]`);
      if (g) g.setAttribute("transform", `translate(${n.x}, ${n.y})`);
    }
    this.renderEdges();
  },

  // Draw (or clear) the axes layer: axis lines, ticks, labels, pole labels.
  renderAxes(resolved, xScale, yScale, viewport) {
    this.axesGroup.innerHTML = "";
    if (!resolved || resolved.show_axes === false) return;

    const { width, height } = viewport;
    const x0 = MARGIN.left;
    const x1 = width - MARGIN.right;
    const y0 = height - MARGIN.bottom;
    const y1 = MARGIN.top;
    const ns = "http://www.w3.org/2000/svg";

    const line = (ax, ay, bx, by) => {
      const l = document.createElementNS(ns, "line");
      l.setAttribute("x1", ax);
      l.setAttribute("y1", ay);
      l.setAttribute("x2", bx);
      l.setAttribute("y2", by);
      l.setAttribute("stroke", "#475569");
      l.setAttribute("stroke-width", 1);
      this.axesGroup.appendChild(l);
      return l;
    };

    const text = (x, y, content, { anchor = "middle", size = 10, fill = "#64748b", rotate = null } = {}) => {
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", x);
      t.setAttribute("y", y);
      t.setAttribute("text-anchor", anchor);
      t.setAttribute("fill", fill);
      t.setAttribute("font-size", size);
      t.setAttribute("font-family", "system-ui, sans-serif");
      if (rotate) t.setAttribute("transform", `rotate(${rotate}, ${x}, ${y})`);
      t.textContent = content;
      this.axesGroup.appendChild(t);
      return t;
    };

    line(x0, y0, x1, y0); // X axis
    line(x0, y0, x0, y1); // Y axis

    AxisEngine.ticks(resolved.x).forEach((tick) => {
      const px = xScale(tick.value);
      line(px, y0, px, y0 + 5);
      text(px, y0 + 18, tick.label);
    });

    AxisEngine.ticks(resolved.y).forEach((tick) => {
      const py = yScale(tick.value);
      line(x0 - 5, py, x0, py);
      text(x0 - 8, py + 3, tick.label, { anchor: "end" });
    });

    // Axis titles — for semantic axes, pole labels at the ends instead.
    if (resolved.x.negative_pole) {
      text(x0, y0 + 34, `← ${resolved.x.negative_pole}`, { anchor: "start", fill: "#f87171", size: 11 });
      text(x1, y0 + 34, `${resolved.x.positive_pole} →`, { anchor: "end", fill: "#4ade80", size: 11 });
      text((x0 + x1) / 2, y0 + 34, resolved.x.label, { fill: "#94a3b8", size: 11 });
    } else {
      text((x0 + x1) / 2, y0 + 34, resolved.x.label, { fill: "#94a3b8", size: 11 });
    }

    if (resolved.y.negative_pole) {
      text(x0 - 40, y0, `← ${resolved.y.negative_pole}`, { anchor: "start", fill: "#f87171", size: 11, rotate: -90 });
      text(x0 - 40, y1, `${resolved.y.positive_pole} →`, { anchor: "end", fill: "#4ade80", size: 11, rotate: -90 });
      text(x0 - 40, (y0 + y1) / 2, resolved.y.label, { fill: "#94a3b8", size: 11, rotate: -90 });
    } else {
      text(x0 - 40, (y0 + y1) / 2, resolved.y.label, { fill: "#94a3b8", size: 11, rotate: -90 });
    }
  },

  // ── State machine ──────────────────────────────────────────────────────────

  transition(nextState, data = {}) {
    const prevState = this.state;
    this.state = nextState;
    this.selectedId = data.selectedId ?? (nextState === STATES.IDLE ? null : this.selectedId);
    this.sourceId = data.sourceId ?? (nextState !== STATES.CONNECTING ? null : this.sourceId);
    const nodeId = data.selectedId ?? data.sourceId ?? null;
    this.log.push(EventLog.stateChanged(prevState, nextState, nodeId));

    // Cursor hint
    if (nextState === STATES.CONNECTING) {
      this.svg.style.cursor = "crosshair";
    } else {
      this.svg.style.cursor = "default";
    }

    this.renderNodes();
    this.updateStatusBar();
  },

  onNodeClick(node) {
    switch (this.state) {
      case STATES.IDLE:
        this.transition(STATES.SELECTED, { selectedId: node.id });
        break;

      case STATES.SELECTED:
        if (this.selectedId === node.id) {
          this.transition(STATES.IDLE);
        } else {
          // Click a different node → treat as: enter connecting from selected source
          this.transition(STATES.CONNECTING, { sourceId: this.selectedId });
          // Then immediately use this node as target
          this._completeEdge(node.id);
        }
        break;

      case STATES.CONNECTING:
        if (this.sourceId === node.id) {
          this.transition(STATES.IDLE);
        } else {
          this._completeEdge(node.id);
        }
        break;
    }
  },

  _completeEdge(targetId) {
    const fromId = this.sourceId;
    this.pushEvent("edge_created", { from_id: fromId, to_id: targetId });
    this.transition(STATES.IDLE);
    // edge_added server event will log with the real id
  },

  // ── Build SVG ──────────────────────────────────────────────────────────────

  buildSVG() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";
    svg.style.cursor = "default";

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "transparent");
    bg.classList.add("canvas-bg");
    svg.appendChild(bg);

    // Arrow marker
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "10");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", "0 0, 10 3.5, 0 7");
    poly.setAttribute("fill", "#38bdf8");
    marker.appendChild(poly);
    defs.appendChild(marker);

    const cmpMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    cmpMarker.setAttribute("id", "comparison-arrowhead");
    cmpMarker.setAttribute("markerWidth", "10");
    cmpMarker.setAttribute("markerHeight", "7");
    cmpMarker.setAttribute("refX", "10");
    cmpMarker.setAttribute("refY", "3.5");
    cmpMarker.setAttribute("orient", "auto");
    const cmpPoly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    cmpPoly.setAttribute("points", "0 0, 10 3.5, 0 7");
    cmpPoly.setAttribute("fill", "#a78bfa");
    cmpMarker.appendChild(cmpPoly);
    defs.appendChild(cmpMarker);

    svg.insertBefore(defs, svg.firstChild);

    this.axesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.axesGroup.setAttribute("id", "axes-layer");
    this.axesGroup.style.pointerEvents = "none";
    svg.appendChild(this.axesGroup);

    this.edgesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.edgesGroup.setAttribute("id", "edges-layer");
    svg.appendChild(this.edgesGroup);

    // Comparison ghosts render under nodes so live nodes stay interactive.
    this.comparisonGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.comparisonGroup.setAttribute("id", "comparison-layer");
    this.comparisonGroup.style.pointerEvents = "none";
    svg.appendChild(this.comparisonGroup);

    this.nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.nodesGroup.setAttribute("id", "nodes-layer");
    svg.appendChild(this.nodesGroup);

    this.comparisonLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    this.comparisonLabel.setAttribute("x", "50%");
    this.comparisonLabel.setAttribute("y", 46);
    this.comparisonLabel.setAttribute("text-anchor", "middle");
    this.comparisonLabel.setAttribute("fill", "#a78bfa");
    this.comparisonLabel.setAttribute("font-size", "12");
    this.comparisonLabel.setAttribute("font-family", "system-ui, sans-serif");
    this.comparisonLabel.style.pointerEvents = "none";
    svg.appendChild(this.comparisonLabel);

    // Status bar (shown in SELECTED / CONNECTING states)
    this.statusBar = document.createElementNS("http://www.w3.org/2000/svg", "text");
    this.statusBar.setAttribute("x", "50%");
    this.statusBar.setAttribute("y", 28);
    this.statusBar.setAttribute("text-anchor", "middle");
    this.statusBar.setAttribute("fill", "#94a3b8");
    this.statusBar.setAttribute("font-size", "12");
    this.statusBar.setAttribute("font-family", "system-ui, sans-serif");
    this.statusBar.style.pointerEvents = "none";
    svg.appendChild(this.statusBar);

    return svg;
  },

  // ── Render ─────────────────────────────────────────────────────────────────

  renderAll() {
    this.renderEdges();
    this.renderNodes();
    this.renderComparison();
    this.updateStatusBar();
  },

  renderEdges() {
    this.edgesGroup.innerHTML = "";
    this.edges.forEach((edge) => this.renderEdge(edge));
  },

  renderEdge(edge) {
    const from = this.nodes.find((n) => n.id === edge.from_id);
    const to = this.nodes.find((n) => n.id === edge.to_id);
    if (!from || !to) return;

    const x1 = from.x + NODE_W / 2;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x + NODE_W / 2;
    const y2 = to.y + NODE_H / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const pad = 26;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2 - (dx / len) * pad);
    line.setAttribute("y2", y2 - (dy / len) * pad);
    line.setAttribute("stroke", "#38bdf8");
    line.setAttribute("stroke-width", 1.5);
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.setAttribute("opacity", "0.7");

    this.edgesGroup.appendChild(line);
  },

  renderNodes() {
    this.nodesGroup.innerHTML = "";
    this.nodes.forEach((node) => this.renderNode(node));
  },

  renderNode(node) {
    const isSelected = this.state === STATES.SELECTED && this.selectedId === node.id;
    const isSource = this.state === STATES.CONNECTING && this.sourceId === node.id;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    g.setAttribute("data-id", node.id);
    g.style.cursor = this.state === STATES.CONNECTING && !isSource ? "crosshair" : this.dragEnabled() ? "grab" : "default";
    if (this.unplacedIds.has(node.id)) g.setAttribute("opacity", "0.35");

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", NODE_W);
    rect.setAttribute("height", NODE_H);
    rect.setAttribute("rx", 6);
    rect.setAttribute("ry", 6);
    rect.setAttribute("fill", isSource ? "#0e4f74" : isSelected ? "#1e3a5f" : "#1e293b");
    rect.setAttribute("stroke", isSource ? "#facc15" : isSelected ? "#60a5fa" : "#38bdf8");
    rect.setAttribute("stroke-width", (isSource || isSelected) ? 2.5 : 1.5);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", NODE_W / 2);
    text.setAttribute("y", NODE_H / 2);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "#f1f5f9");
    text.setAttribute("font-size", "13");
    text.setAttribute("font-family", "system-ui, sans-serif");
    text.textContent = node.name;

    g.appendChild(rect);
    g.appendChild(text);
    this.nodesGroup.appendChild(g);

    g.addEventListener("click", (e) => {
      e.stopPropagation();
      this.onNodeClick(node);
    });

    g.addEventListener("mousedown", (e) => this.onDragStart(e, g, node));

    text.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this.editLabel(g, node, text);
    });

    let hoverTimer = null;
    g.addEventListener("mouseenter", () => {
      hoverTimer = setTimeout(() => {
        this.log.push(EventLog.nodeHovered(node.id));
      }, 120);
    });
    g.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimer);
    });
  },

  // Transient status-bar message (drag gating etc.); reverts to state text.
  showHint(message) {
    this.statusBar.textContent = message;
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => this.updateStatusBar(), 2500);
  },

  updateStatusBar() {
    if (this.state === STATES.SELECTED) {
      const node = this.nodes.find((n) => n.id === this.selectedId);
      const name = node ? node.name : "";
      this.statusBar.textContent = `"${name}" selected — press E to draw edge, or click another node`;
    } else if (this.state === STATES.CONNECTING) {
      const node = this.nodes.find((n) => n.id === this.sourceId);
      const name = node ? node.name : "";
      this.statusBar.textContent = `Drawing edge from "${name}" — click target node (Escape to cancel)`;
    } else {
      this.statusBar.textContent = "";
    }
  },

  // ── Drag ───────────────────────────────────────────────────────────────────

  onDragStart(e, g, node) {
    e.stopPropagation();
    if (!this.dragEnabled()) {
      this.showHint("Positions computed by axes — save a freeform view to arrange manually");
      return;
    }
    const startPt = this.svgPoint(e);
    const startX = node.x;
    const startY = node.y;
    let moved = false;

    const onMove = (e) => {
      const pt = this.svgPoint(e);
      const dx = pt.x - startPt.x;
      const dy = pt.y - startPt.y;
      if (!moved && Math.sqrt(dx * dx + dy * dy) > 4) {
        moved = true;
        g.style.cursor = "grabbing";
      }
      if (moved) {
        node.x = startX + (pt.x - startPt.x);
        node.y = startY + (pt.y - startPt.y);
        g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
        this.renderEdges();
        this.renderComparison();
      }
    };

    const onUp = () => {
      g.style.cursor = "grab";
      if (moved) {
        this.log.push(EventLog.nodeMoved(node.id, startX, startY, node.x, node.y));
        if (this.layout && this.layout.kind === "freeform" && this.layout.positions && this.activeProjectionId) {
          // Freeform snapshot view: the drag edits this view's placement,
          // not the node's canonical position (FC2.13).
          this.pushEvent("projection_position_updated", {
            id: this.activeProjectionId,
            node_id: node.id,
            x: node.x,
            y: node.y,
          });
        } else {
          this.pushEvent("node_moved", { id: node.id, x: node.x, y: node.y });
        }
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  },

  // ── Inline edit ────────────────────────────────────────────────────────────

  editLabel(g, node, textEl) {
    const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute("x", 4);
    fo.setAttribute("y", 10);
    fo.setAttribute("width", 132);
    fo.setAttribute("height", 28);

    const input = document.createElement("input");
    input.type = "text";
    input.value = node.name;
    input.style.cssText =
      "width:100%;height:100%;background:#0f172a;color:#f1f5f9;border:none;outline:none;" +
      "font-size:13px;font-family:system-ui,sans-serif;text-align:center;padding:0 4px;border-radius:4px;";

    fo.appendChild(input);
    g.appendChild(fo);
    textEl.style.display = "none";
    input.focus();
    input.select();

    const commit = () => {
      const newName = input.value.trim() || node.name;
      node.name = newName;
      textEl.textContent = newName;
      textEl.style.display = "";
      fo.remove();
      this.log.push(EventLog.nodeLabelUpdated(node.id, newName));
      this.pushEvent("node_label_updated", { id: node.id, name: newName });
    };

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      if (e.key === "Escape") {
        textEl.style.display = "";
        fo.remove();
      }
    });
  },

  // ── Util ───────────────────────────────────────────────────────────────────

  svgPoint(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(this.svg.getScreenCTM().inverse());
  },
};

import { Canvas, Rect, Circle, Textbox, PencilBrush, util } from "fabric";

function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
}

export const FabricCanvasHook = {
  mounted() {
    this._applyingRemote = false;
    this._cursorThrottleMs = 50;
    this._lastCursorPush = 0;
    this._saveIntervalMs = 30000;
    this._activeTool = "select";

    const container = this.el;

    // Create canvas element
    const canvasEl = document.createElement("canvas");
    canvasEl.id = "fabric-main";
    container.appendChild(canvasEl);

    this.fabricCanvas = new Canvas(canvasEl, {
      width: container.clientWidth,
      height: container.clientHeight - 40,
      backgroundColor: "#ffffff",
      selection: true,
      isDrawingMode: false,
    });

    // Load snapshot if exists
    const snapshotRaw = container.dataset.snapshot;
    if (snapshotRaw) {
      try {
        const snapshotData = JSON.parse(snapshotRaw);
        if (snapshotData && snapshotData.objects && snapshotData.objects.length > 0) {
          this._applyingRemote = true;
          this.fabricCanvas.loadFromJSON(snapshotData).then(() => {
            // Ensure all loaded objects have IDs
            this.fabricCanvas.getObjects().forEach((obj) => {
              if (!obj.id) obj.id = generateId();
            });
            this.fabricCanvas.renderAll();
            this._applyingRemote = false;
          });
        }
      } catch (e) {
        console.warn("Failed to parse canvas snapshot:", e);
      }
    }

    this._setupFabricListeners();
    this._setupRemoteHandlers();
    this._setupCursorTracking();
    this._setupAutoSave();
    this._setupResize();
    this._setupPanZoom();
    this._buildToolbar();
    this._setupKeyboard();
  },

  // --- Fabric.js event listeners (local user actions) ---

  _setupFabricListeners() {
    this.fabricCanvas.on("object:added", (e) => {
      if (this._applyingRemote) return;
      const obj = e.target;
      if (!obj.id) obj.id = generateId();
      this.pushEvent("canvas:object_added", {
        object: obj.toJSON(["id"]),
      });
    });

    this.fabricCanvas.on("object:modified", (e) => {
      if (this._applyingRemote) return;
      const obj = e.target;
      this.pushEvent("canvas:object_modified", {
        object: obj.toJSON(["id"]),
      });
    });

    this.fabricCanvas.on("object:removed", (e) => {
      if (this._applyingRemote) return;
      const obj = e.target;
      if (obj.id) {
        this.pushEvent("canvas:object_removed", { id: obj.id });
      }
    });

    // Freehand drawing creates paths via path:created
    this.fabricCanvas.on("path:created", (e) => {
      if (this._applyingRemote) return;
      const path = e.path;
      if (!path.id) path.id = generateId();
      this.pushEvent("canvas:object_added", {
        object: path.toJSON(["id"]),
      });
    });
  },

  // --- Remote event handlers (from other users via LiveView) ---

  _setupRemoteHandlers() {
    this.handleEvent("canvas:remote_object_added", ({ object }) => {
      this._applyingRemote = true;
      util.enlivenObjects([object]).then((objects) => {
        const fabricObj = objects[0];
        if (fabricObj) {
          fabricObj.id = object.id;
          this.fabricCanvas.add(fabricObj);
          this.fabricCanvas.renderAll();
        }
        this._applyingRemote = false;
      });
    });

    this.handleEvent("canvas:remote_object_modified", ({ object }) => {
      this._applyingRemote = true;
      const existing = this._findById(object.id);
      if (existing) {
        existing.set(object);
        existing.setCoords();
        this.fabricCanvas.renderAll();
      }
      this._applyingRemote = false;
    });

    this.handleEvent("canvas:remote_object_removed", ({ id }) => {
      this._applyingRemote = true;
      const existing = this._findById(id);
      if (existing) {
        this.fabricCanvas.remove(existing);
        this.fabricCanvas.renderAll();
      }
      this._applyingRemote = false;
    });

    this.handleEvent("canvas:remote_cursor", (data) => {
      this._renderRemoteCursor(data);
    });

    this.handleEvent("canvas:presence_diff", ({ leaves }) => {
      if (leaves) {
        leaves.forEach((userId) => this._removeRemoteCursor(userId));
      }
    });
  },

  _findById(id) {
    return this.fabricCanvas.getObjects().find((o) => o.id === id);
  },

  // --- Cursor tracking ---

  _setupCursorTracking() {
    this.fabricCanvas.on("mouse:move", (opt) => {
      const now = Date.now();
      if (now - this._lastCursorPush < this._cursorThrottleMs) return;
      this._lastCursorPush = now;
      const pointer = this.fabricCanvas.getScenePoint(opt.e);
      this.pushEvent("canvas:cursor_moved", {
        x: Math.round(pointer.x),
        y: Math.round(pointer.y),
      });
    });

    // Cursor overlay layer
    this._cursorLayer = document.createElement("div");
    this._cursorLayer.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:100;";
    this.el.appendChild(this._cursorLayer);
    this._cursorEls = {};
  },

  _renderRemoteCursor({ user_id, x, y, color }) {
    let el = this._cursorEls[user_id];
    if (!el) {
      el = document.createElement("div");
      el.style.cssText =
        "position:absolute;pointer-events:none;transition:left 80ms linear,top 80ms linear;z-index:101;";

      // Cursor arrow SVG
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "16");
      svg.setAttribute("height", "16");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.innerHTML = `<path d="M0 0 L0 12 L4 8 L8 14 L10 13 L6 7 L11 7 Z" fill="${color || "#3b82f6"}" stroke="#fff" stroke-width="0.5"/>`;
      el.appendChild(svg);

      // Label
      const label = document.createElement("span");
      label.style.cssText =
        "display:block;margin-left:14px;margin-top:-4px;font-size:10px;" +
        "white-space:nowrap;padding:1px 4px;border-radius:3px;" +
        "color:#fff;background:" +
        (color || "#3b82f6") +
        ";";
      label.textContent = user_id.substring(0, 8);
      el.appendChild(label);

      this._cursorLayer.appendChild(el);
      this._cursorEls[user_id] = el;
    }
    el.style.left = x + "px";
    el.style.top = y + "px";
  },

  _removeRemoteCursor(userId) {
    const el = this._cursorEls[userId];
    if (el) {
      el.remove();
      delete this._cursorEls[userId];
    }
  },

  // --- Auto-save ---

  _setupAutoSave() {
    this._saveTimer = setInterval(() => {
      this._saveSnapshot();
    }, this._saveIntervalMs);

    window.addEventListener("beforeunload", () => this._saveSnapshot());
  },

  _saveSnapshot() {
    const json = this.fabricCanvas.toJSON(["id"]);
    this.pushEvent("canvas:save_snapshot", { snapshot: json });
  },

  // --- Pan / Zoom ---

  _setupPanZoom() {
    const canvas = this.fabricCanvas;

    // Mousewheel zoom
    canvas.on("mouse:wheel", (opt) => {
      const e = opt.e;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.1), 10);

      canvas.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
    });

    // Alt+drag to pan
    let isPanning = false;
    let lastPosX, lastPosY;

    canvas.on("mouse:down", (opt) => {
      if (opt.e.altKey) {
        isPanning = true;
        canvas.selection = false;
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
        canvas.setCursor("grabbing");
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (!isPanning) return;
      const vpt = canvas.viewportTransform;
      vpt[4] += opt.e.clientX - lastPosX;
      vpt[5] += opt.e.clientY - lastPosY;
      lastPosX = opt.e.clientX;
      lastPosY = opt.e.clientY;
      canvas.requestRenderAll();
    });

    canvas.on("mouse:up", () => {
      if (isPanning) {
        isPanning = false;
        canvas.selection = true;
        canvas.setCursor("default");
      }
    });
  },

  // --- Resize ---

  _setupResize() {
    this._onResize = () => {
      this.fabricCanvas.setDimensions({
        width: this.el.clientWidth,
        height: this.el.clientHeight - 40,
      });
    };
    window.addEventListener("resize", this._onResize);
  },

  // --- Keyboard ---

  _setupKeyboard() {
    this._onKeyDown = (e) => {
      // Delete selected objects
      if ((e.key === "Delete" || e.key === "Backspace") && !e.target.closest("input, textarea")) {
        const active = this.fabricCanvas.getActiveObjects();
        if (active.length > 0) {
          active.forEach((obj) => this.fabricCanvas.remove(obj));
          this.fabricCanvas.discardActiveObject();
          this.fabricCanvas.renderAll();
        }
      }

      // Escape to deselect
      if (e.key === "Escape") {
        this.fabricCanvas.discardActiveObject();
        this.fabricCanvas.isDrawingMode = false;
        this._setActiveTool("select");
        this.fabricCanvas.renderAll();
      }
    };
    document.addEventListener("keydown", this._onKeyDown);
  },

  // --- Toolbar ---

  _buildToolbar() {
    const toolbar = document.createElement("div");
    toolbar.style.cssText =
      "position:absolute;top:8px;left:50%;transform:translateX(-50%);" +
      "display:flex;gap:2px;background:#f8fafc;border:1px solid #e2e8f0;" +
      "border-radius:8px;padding:3px 6px;z-index:200;box-shadow:0 1px 3px rgba(0,0,0,0.08);";

    const tools = [
      { key: "select", label: "Select", action: () => this._setActiveTool("select") },
      { key: "rect", label: "Rect", action: () => this._setActiveTool("rect") },
      { key: "circle", label: "Circle", action: () => this._setActiveTool("circle") },
      { key: "text", label: "Text", action: () => this._setActiveTool("text") },
      {
        key: "draw",
        label: "Pen",
        action: () => this._setActiveTool("draw"),
      },
    ];

    this._toolbarButtons = {};

    tools.forEach(({ key, label, action }) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.dataset.tool = key;
      btn.style.cssText =
        "background:transparent;color:#64748b;border:none;padding:5px 12px;" +
        "font-size:12px;cursor:pointer;border-radius:5px;font-weight:500;";
      btn.addEventListener("click", action);
      toolbar.appendChild(btn);
      this._toolbarButtons[key] = btn;
    });

    this.el.appendChild(toolbar);
    this._setActiveTool("select");
  },

  _setActiveTool(tool) {
    this._activeTool = tool;
    this.fabricCanvas.isDrawingMode = tool === "draw";

    if (tool === "draw") {
      this.fabricCanvas.freeDrawingBrush = new PencilBrush(this.fabricCanvas);
      this.fabricCanvas.freeDrawingBrush.color = "#334155";
      this.fabricCanvas.freeDrawingBrush.width = 2;
    }

    // Update toolbar button styles
    Object.entries(this._toolbarButtons).forEach(([key, btn]) => {
      if (key === tool) {
        btn.style.background = "#e2e8f0";
        btn.style.color = "#0f172a";
      } else {
        btn.style.background = "transparent";
        btn.style.color = "#64748b";
      }
    });

    // For shape tools, set up one-click creation
    if (tool === "rect" || tool === "circle" || tool === "text") {
      this._pendingShape = tool;
      this.fabricCanvas.defaultCursor = "crosshair";
      this.fabricCanvas.once("mouse:down", (opt) => {
        if (!this._pendingShape) return;
        const pointer = this.fabricCanvas.getScenePoint(opt.e);
        this._addShape(this._pendingShape, pointer.x, pointer.y);
        this._pendingShape = null;
        this.fabricCanvas.defaultCursor = "default";
        this._setActiveTool("select");
      });
    } else {
      this._pendingShape = null;
      this.fabricCanvas.defaultCursor = "default";
    }
  },

  _addShape(type, x, y) {
    let obj;
    const id = generateId();

    switch (type) {
      case "rect":
        obj = new Rect({
          id,
          left: x,
          top: y,
          width: 150,
          height: 80,
          fill: "#dbeafe",
          stroke: "#3b82f6",
          strokeWidth: 1.5,
          rx: 6,
          ry: 6,
        });
        break;
      case "circle":
        obj = new Circle({
          id,
          left: x,
          top: y,
          radius: 50,
          fill: "#dcfce7",
          stroke: "#22c55e",
          strokeWidth: 1.5,
        });
        break;
      case "text":
        obj = new Textbox("Text", {
          id,
          left: x,
          top: y,
          width: 200,
          fontSize: 16,
          fill: "#1e293b",
          fontFamily: "system-ui, sans-serif",
        });
        break;
    }

    if (obj) {
      this.fabricCanvas.add(obj);
      this.fabricCanvas.setActiveObject(obj);
      this.fabricCanvas.renderAll();
    }
  },

  // --- Cleanup ---

  destroyed() {
    clearInterval(this._saveTimer);
    window.removeEventListener("resize", this._onResize);
    document.removeEventListener("keydown", this._onKeyDown);
    if (this.fabricCanvas) {
      this.fabricCanvas.dispose();
    }
  },
};

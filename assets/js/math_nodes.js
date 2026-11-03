/**
 * Math Nodes — Visual function composition editor
 *
 * Renders physics concepts from the registry as draggable nodes on a canvas.
 * Connect nodes to compose functions. Outputs update in real time.
 * Uses Canvas 2D for the node graph UI.
 */

import { registry } from "./physics/registry";

export function renderMathNodes(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const concepts = registry.getAllConcepts();
  const nodes = [];
  const connections = [];

  // Layout concepts as nodes in a grid
  const cols = 4;
  const nodeW = 220;
  const nodeH = 120;
  const padX = 40;
  const padY = 40;
  const startX = 60;
  const startY = 60;

  Object.values(concepts).forEach((concept, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes.push({
      id: concept.id,
      concept,
      x: startX + col * (nodeW + padX),
      y: startY + row * (nodeH + padY),
      w: nodeW,
      h: nodeH,
      paramValues: {},
      result: null,
      selected: false,
    });
  });

  // Initialize param defaults
  nodes.forEach((node) => {
    if (node.concept.params) {
      node.concept.params.forEach((p) => {
        node.paramValues[p.name] = p.default;
      });
    }
    evaluate(node);
  });

  function evaluate(node) {
    if (node.concept.formula && node.concept.formula.fn) {
      try {
        node.result = node.concept.formula.fn(node.paramValues);
      } catch (e) {
        node.result = "err";
      }
    }
  }

  // Drawing
  function drawNode(node) {
    const { x, y, w, h, concept, result, selected } = node;

    // Shadow
    ctx.shadowColor = selected ? "rgba(100, 200, 255, 0.4)" : "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = selected ? 12 : 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Background
    ctx.fillStyle = selected ? "#1a2a3a" : "#141422";
    ctx.strokeStyle = selected ? "#4488cc" : "#333355";
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Title
    ctx.fillStyle = "#ccddff";
    ctx.font = "bold 13px monospace";
    ctx.fillText(concept.name, x + 10, y + 20);

    // Formula
    if (concept.formula) {
      ctx.fillStyle = "#88aacc";
      ctx.font = "12px monospace";
      ctx.fillText(concept.formula.display, x + 10, y + 38);
    }

    // Params
    ctx.fillStyle = "#8888aa";
    ctx.font = "11px monospace";
    let py = y + 56;
    if (concept.params) {
      concept.params.forEach((p) => {
        const val = node.paramValues[p.name];
        ctx.fillText(`${p.name}=${val} ${p.unit}`, x + 10, py);
        py += 14;
      });
    }

    // Result
    if (result !== null && result !== undefined) {
      ctx.fillStyle = "#66ffaa";
      ctx.font = "bold 12px monospace";
      const unit = concept.returns ? concept.returns.unit : "";
      const display = typeof result === "number" ? result.toFixed(4) : String(result);
      ctx.fillText(`→ ${display} ${unit}`, x + 10, y + h - 10);
    }

    // Output port (right side)
    ctx.fillStyle = "#66ffaa";
    ctx.beginPath();
    ctx.arc(x + w, y + h / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Input port (left side)
    ctx.fillStyle = "#ff8866";
    ctx.beginPath();
    ctx.arc(x, y + h / 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawConnection(conn) {
    const from = nodes.find((n) => n.id === conn.from);
    const to = nodes.find((n) => n.id === conn.to);
    if (!from || !to) return;

    const x0 = from.x + from.w;
    const y0 = from.y + from.h / 2;
    const x1 = to.x;
    const y1 = to.y + to.h / 2;

    ctx.strokeStyle = "#4466aa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    // Bezier curve
    const cx = (x0 + x1) / 2;
    ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
    ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid dots
    ctx.fillStyle = "#1a1a2a";
    for (let gx = 0; gx < canvas.width; gx += 30) {
      for (let gy = 0; gy < canvas.height; gy += 30) {
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    connections.forEach(drawConnection);
    nodes.forEach(drawNode);
  }

  // Interaction: drag nodes
  let dragging = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let connecting = null; // { fromNode, fromPort: "output" }

  function hitTest(mx, my) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) {
        return n;
      }
    }
    return null;
  }

  function hitOutputPort(mx, my) {
    for (const n of nodes) {
      const px = n.x + n.w;
      const py = n.y + n.h / 2;
      if (Math.hypot(mx - px, my - py) < 10) return n;
    }
    return null;
  }

  function hitInputPort(mx, my) {
    for (const n of nodes) {
      const px = n.x;
      const py = n.y + n.h / 2;
      if (Math.hypot(mx - px, my - py) < 10) return n;
    }
    return null;
  }

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check output port first (start connection)
    const outNode = hitOutputPort(mx, my);
    if (outNode) {
      connecting = { fromNode: outNode };
      return;
    }

    const node = hitTest(mx, my);
    if (node) {
      dragging = node;
      dragOffsetX = mx - node.x;
      dragOffsetY = my - node.y;
      nodes.forEach((n) => (n.selected = false));
      node.selected = true;
    } else {
      nodes.forEach((n) => (n.selected = false));
    }
    draw();
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    dragging.x = e.clientX - rect.left - dragOffsetX;
    dragging.y = e.clientY - rect.top - dragOffsetY;
    draw();
  });

  canvas.addEventListener("mouseup", (e) => {
    if (connecting) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const inNode = hitInputPort(mx, my);
      if (inNode && inNode.id !== connecting.fromNode.id) {
        // Add connection (avoid duplicates)
        const exists = connections.find(
          (c) => c.from === connecting.fromNode.id && c.to === inNode.id
        );
        if (!exists) {
          connections.push({
            from: connecting.fromNode.id,
            to: inNode.id,
          });
          // Propagate: feed output of `from` into first param of `to`
          if (connecting.fromNode.result !== null && inNode.concept.params && inNode.concept.params.length > 0) {
            const firstParam = inNode.concept.params[0].name;
            inNode.paramValues[firstParam] = connecting.fromNode.result;
            evaluate(inNode);
          }
        }
      }
      connecting = null;
      draw();
    }
    dragging = null;
  });

  // Double-click to cycle param values
  canvas.addEventListener("dblclick", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = hitTest(mx, my);
    if (node && node.concept.params) {
      // Increment first param by 1
      const p = node.concept.params[0];
      node.paramValues[p.name] = (node.paramValues[p.name] || p.default) + 1;
      evaluate(node);

      // Propagate to connected nodes
      connections
        .filter((c) => c.from === node.id)
        .forEach((c) => {
          const target = nodes.find((n) => n.id === c.to);
          if (target && target.concept.params && target.concept.params.length > 0) {
            target.paramValues[target.concept.params[0].name] = node.result;
            evaluate(target);
          }
        });
      draw();
    }
  });

  // Handle resize
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
  });

  // Initial draw
  draw();

  // Expose for console
  window.mathNodes = { nodes, connections, evaluate, draw };
}

// ProjectionSelector — Story 30 + FC2.4/FC2.6/FC2.11
// Overlay panel for switching and saving named Projections, plus an axis
// editor: pick X/Y properties (from the server-inferred schema) or semantic
// axes, preview live, and save the layout with the projection.
//
// Usage:
//   const ps = ProjectionSelector.make(container, {
//     projections, activeId,
//     schema,        // [{property, type, coverage}] from Projections.Schema.analyze/1
//     suggestions,   // [{name, layout}] from Projections.Schema.suggest/1
//     semanticAxes,  // [{id, name, negative_pole, positive_pole}]
//     onSelect: (id) => ...,            // null = "All nodes"
//     onSave:   (name, layout) => ...,
//     onPreview: (layout) => ...,       // {} = freeform
//   });
//   ps.update(projections, activeId);   // re-render on server push

const INPUT_CSS =
  "background:#1e293b;color:#f1f5f9;border:1px solid #334155;border-radius:4px;" +
  "padding:3px 6px;font-size:11px;width:100%;";

const SCALE_FOR_TYPE = { number: "linear", string: "ordinal", date: "time", boolean: "ordinal" };

export const ProjectionSelector = {
  make(
    container,
    {
      projections = [],
      activeId = null,
      schema = [],
      suggestions = [],
      semanticAxes = [],
      onSelect,
      onSave,
      onPreview,
      onCompare,
      onImport,
      hasSketchData = false,
    } = {}
  ) {
    const panel = document.createElement("div");
    panel.style.cssText = [
      "position:absolute",
      "top:12px",
      "left:12px",
      "background:#0f172a",
      "border:1px solid #334155",
      "border-radius:6px",
      "font-family:system-ui,sans-serif",
      "font-size:12px",
      "color:#94a3b8",
      "z-index:50",
      "padding:8px 10px",
      "display:flex",
      "flex-direction:column",
      "gap:6px",
      "min-width:200px",
      "pointer-events:all",
    ].join(";");

    container.appendChild(panel);

    // Editor state survives re-renders.
    let compareId = null;

    const editor = {
      open: false,
      mode: "data", // "data" | "semantic"
      x: { property: "", scale: "", jitter: 0 },
      y: { property: "", scale: "", jitter: 0 },
      xAxisId: null,
      yAxisId: null,
    };

    // Plottable data properties (arrays can't be an axis).
    const plottable = schema.filter((p) => p.type !== "array");

    function currentLayout() {
      if (!editor.open) return {};
      if (editor.mode === "semantic") {
        if (!editor.xAxisId || !editor.yAxisId) return {};
        return {
          kind: "semantic",
          x_axis: { axis_id: editor.xAxisId },
          y_axis: { axis_id: editor.yAxisId },
        };
      }
      if (!editor.x.property || !editor.y.property) return {};
      return {
        kind: "axes",
        x_axis: { property: editor.x.property, scale: editor.x.scale, jitter: editor.x.jitter },
        y_axis: { property: editor.y.property, scale: editor.y.scale, jitter: editor.y.jitter },
        drag_enabled: false,
        show_axes: true,
      };
    }

    function preview() {
      if (onPreview) onPreview(currentLayout());
    }

    function el(tag, css, textContent) {
      const node = document.createElement(tag);
      if (css) node.style.cssText = css;
      if (textContent) node.textContent = textContent;
      return node;
    }

    function select(options, value, onChange) {
      const s = el("select", INPUT_CSS + "cursor:pointer;");
      options.forEach(([val, label]) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = label;
        if (String(val) === String(value)) opt.selected = true;
        s.appendChild(opt);
      });
      s.addEventListener("change", () => onChange(s.value));
      return s;
    }

    function axisRow(label, axisState, rerender) {
      const row = el("div", "display:flex;gap:4px;align-items:center;");
      row.appendChild(el("span", "width:12px;color:#38bdf8;font-size:11px;", label));

      const propOptions = [["", "— property —"]].concat(
        plottable.map((p) => [p.property, p.property.replace(/^metadata\./, "") + " (" + p.type + ")"])
      );
      const propSelect = select(propOptions, axisState.property, (val) => {
        axisState.property = val;
        const prop = plottable.find((p) => p.property === val);
        axisState.scale = prop ? SCALE_FOR_TYPE[prop.type] || "linear" : "";
        axisState.jitter = axisState.scale === "ordinal" ? 16 : 0;
        rerender();
        preview();
      });
      propSelect.style.flex = "1";
      row.appendChild(propSelect);

      if (axisState.property) {
        const scaleSelect = select(
          [["linear", "linear"], ["ordinal", "ordinal"], ["time", "time"]],
          axisState.scale,
          (val) => {
            axisState.scale = val;
            preview();
          }
        );
        scaleSelect.style.width = "64px";
        row.appendChild(scaleSelect);

        const jitter = el("input", INPUT_CSS + "width:40px;");
        jitter.type = "number";
        jitter.min = "0";
        jitter.title = "jitter (px)";
        jitter.value = axisState.jitter;
        jitter.addEventListener("change", () => {
          axisState.jitter = Math.max(0, parseInt(jitter.value, 10) || 0);
          preview();
        });
        row.appendChild(jitter);
      }

      return row;
    }

    function renderEditor(parent, rerender) {
      const box = el("div", "display:flex;flex-direction:column;gap:5px;border-top:1px solid #334155;padding-top:6px;");

      if (semanticAxes.length > 0) {
        const modeRow = el("div", "display:flex;gap:4px;");
        [["data", "Data"], ["semantic", "Semantic"]].forEach(([mode, label]) => {
          const btn = el(
            "button",
            "flex:1;border-radius:4px;padding:2px 0;font-size:11px;cursor:pointer;" +
              (editor.mode === mode
                ? "background:#1e3a5f;color:#38bdf8;border:1px solid #38bdf8;"
                : "background:#1e293b;color:#94a3b8;border:1px solid #334155;"),
            label
          );
          btn.addEventListener("click", () => {
            editor.mode = mode;
            rerender();
            preview();
          });
          modeRow.appendChild(btn);
        });
        box.appendChild(modeRow);
      }

      if (editor.mode === "semantic") {
        const axisOptions = [["", "— semantic axis —"]].concat(
          semanticAxes.map((a) => [a.id, `${a.name} (${a.negative_pole} ↔ ${a.positive_pole})`])
        );
        const xRow = el("div", "display:flex;gap:4px;align-items:center;");
        xRow.appendChild(el("span", "width:12px;color:#38bdf8;font-size:11px;", "X"));
        const xSel = select(axisOptions, editor.xAxisId, (val) => {
          editor.xAxisId = val ? parseInt(val, 10) : null;
          preview();
        });
        xSel.style.flex = "1";
        xRow.appendChild(xSel);
        box.appendChild(xRow);

        const yRow = el("div", "display:flex;gap:4px;align-items:center;");
        yRow.appendChild(el("span", "width:12px;color:#38bdf8;font-size:11px;", "Y"));
        const ySel = select(axisOptions, editor.yAxisId, (val) => {
          editor.yAxisId = val ? parseInt(val, 10) : null;
          preview();
        });
        ySel.style.flex = "1";
        yRow.appendChild(ySel);
        box.appendChild(yRow);
      } else {
        box.appendChild(axisRow("X", editor.x, rerender));
        box.appendChild(axisRow("Y", editor.y, rerender));

        if (suggestions.length > 0) {
          const sugSelect = select(
            [["", "Suggested modes…"]].concat(suggestions.map((s, i) => [i, s.name])),
            "",
            (val) => {
              if (val === "") return;
              const layout = suggestions[parseInt(val, 10)].layout;
              editor.x = {
                property: layout.x_axis.property,
                scale: layout.x_axis.scale,
                jitter: layout.x_axis.jitter || 0,
              };
              editor.y = {
                property: layout.y_axis.property,
                scale: layout.y_axis.scale,
                jitter: layout.y_axis.jitter || 0,
              };
              rerender();
              preview();
            }
          );
          box.appendChild(sugSelect);
        }
      }

      const clearBtn = el(
        "button",
        "background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:4px;" +
          "padding:2px 8px;font-size:11px;cursor:pointer;",
        "Back to freeform"
      );
      clearBtn.addEventListener("click", () => {
        editor.open = false;
        editor.x = { property: "", scale: "", jitter: 0 };
        editor.y = { property: "", scale: "", jitter: 0 };
        editor.xAxisId = null;
        editor.yAxisId = null;
        rerender();
        if (onPreview) onPreview({});
      });
      box.appendChild(clearBtn);

      parent.appendChild(box);
    }

    function render(projs, currentId) {
      panel.innerHTML = "";

      const header = el(
        "div",
        "color:#38bdf8;font-weight:600;font-size:11px;letter-spacing:0.05em;display:flex;justify-content:space-between;align-items:center;"
      );
      header.appendChild(el("span", "", "PROJECTION"));

      const axesToggle = el(
        "button",
        "background:none;border:none;color:" + (editor.open ? "#38bdf8" : "#64748b") + ";" +
          "font-size:11px;cursor:pointer;padding:0;",
        editor.open ? "axes ▾" : "axes ▸"
      );
      axesToggle.addEventListener("click", () => {
        editor.open = !editor.open;
        rerender();
        preview();
      });
      header.appendChild(axesToggle);
      panel.appendChild(header);

      const projSelect = el("select", INPUT_CSS + "cursor:pointer;font-size:12px;");
      const allOpt = document.createElement("option");
      allOpt.value = "";
      allOpt.textContent = "All nodes";
      if (!currentId) allOpt.selected = true;
      projSelect.appendChild(allOpt);

      projs.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === currentId) opt.selected = true;
        projSelect.appendChild(opt);
      });

      projSelect.addEventListener("change", () => {
        const val = projSelect.value;
        onSelect(val === "" ? null : parseInt(val, 10));
      });
      panel.appendChild(projSelect);

      // Comparison overlay (FC2.14): ghost a second projection's placement.
      if (onCompare && projs.length > 0) {
        const cmpSelect = el("select", INPUT_CSS + "cursor:pointer;color:#a78bfa;");
        const noCmp = document.createElement("option");
        noCmp.value = "";
        noCmp.textContent = "— compare with… —";
        if (!compareId) noCmp.selected = true;
        cmpSelect.appendChild(noCmp);

        projs.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = "vs " + p.name;
          if (p.id === compareId) opt.selected = true;
          cmpSelect.appendChild(opt);
        });

        cmpSelect.addEventListener("change", () => {
          compareId = cmpSelect.value === "" ? null : parseInt(cmpSelect.value, 10);
          onCompare(compareId);
        });
        panel.appendChild(cmpSelect);
      }

      if (editor.open) renderEditor(panel, rerender);

      const saveRow = el("div", "display:flex;gap:4px;");
      const nameInput = el("input", INPUT_CSS + "flex:1;min-width:0;");
      nameInput.type = "text";
      nameInput.placeholder = "View name…";

      const saveBtn = el(
        "button",
        "background:#1e3a5f;color:#38bdf8;border:1px solid #38bdf8;border-radius:4px;" +
          "padding:3px 8px;font-size:11px;cursor:pointer;white-space:nowrap;",
        "Save"
      );
      saveBtn.addEventListener("click", () => {
        const name = nameInput.value.trim();
        if (name) {
          onSave(name, currentLayout());
          nameInput.value = "";
        }
      });
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveBtn.click();
      });

      saveRow.appendChild(nameInput);
      saveRow.appendChild(saveBtn);
      panel.appendChild(saveRow);

      // FC2.15: one-click migration of /sketch-data's localStorage.
      if (onImport && hasSketchData) {
        const importBtn = el(
          "button",
          "background:#1e293b;color:#94a3b8;border:1px dashed #475569;border-radius:4px;" +
            "padding:3px 8px;font-size:11px;cursor:pointer;",
          "Import /sketch-data nodes + views"
        );
        importBtn.addEventListener("click", () => onImport());
        panel.appendChild(importBtn);
      }
    }

    let lastProjs = projections;
    let lastActiveId = activeId;

    function rerender() {
      render(lastProjs, lastActiveId);
    }

    render(projections, activeId);

    return {
      update(projs, currentId) {
        lastProjs = projs;
        lastActiveId = currentId;
        render(projs, currentId);
      },
    };
  },
};

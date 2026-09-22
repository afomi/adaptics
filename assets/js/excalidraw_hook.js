import React, { useRef } from "react";
import ReactDOM from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";

function ExcalidrawApp({ onApiReady, onChange }) {
  const apiRef = useRef(null);
  return React.createElement(Excalidraw, {
    excalidrawAPI: (api) => {
      apiRef.current = api;
      onApiReady(api);
    },
    onChange,
  });
}

export const ExcalidrawHook = {
  mounted() {
    this._elements = [];
    this._appState = {};
    this._files = {};
    this._api = null;

    this._root = ReactDOM.createRoot(this.el);
    this._root.render(
      React.createElement(ExcalidrawApp, {
        onApiReady: (api) => { this._api = api; },
        onChange: (elements, appState, files) => {
          this._elements = elements;
          this._appState = appState;
          this._files = files;
        },
      })
    );

    this.handleEvent("download_excalidraw", () => this._download());

    // Hidden file input for loading
    this._fileInput = document.createElement("input");
    this._fileInput.type = "file";
    this._fileInput.accept = ".excalidraw,application/json";
    this._fileInput.style.display = "none";
    this._fileInput.addEventListener("change", (e) => this._loadFile(e));
    document.body.appendChild(this._fileInput);

    this.handleEvent("open_file_picker", () => this._fileInput.click());
  },

  destroyed() {
    this._root.unmount();
    this._fileInput.remove();
  },

  _download() {
    const payload = {
      type: "excalidraw",
      version: 2,
      source: "adaptics",
      elements: this._elements,
      appState: {
        viewBackgroundColor: this._appState.viewBackgroundColor || "#ffffff",
      },
      files: this._files,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drawing.excalidraw";
    a.click();
    URL.revokeObjectURL(url);
  },

  _loadFile(event) {
    const file = event.target.files[0];
    if (!file || !this._api) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        this._api.updateScene({
          elements: data.elements || [],
          appState: data.appState || {},
        });
        if (data.files) {
          this._api.addFiles(Object.values(data.files));
        }
      } catch (err) {
        console.error("Failed to load .excalidraw file:", err);
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    event.target.value = "";
  },
};

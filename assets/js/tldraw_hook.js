import {
  Tldraw,
  serializeTldrawJson,
  DefaultMainMenu,
  DefaultMainMenuContent,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  loadSnapshot,
} from 'tldraw';
import { createRoot } from 'react-dom/client';
import React from 'react';

// Shared ref so CustomMainMenu can reach the mounted editor instance.
const _editorRef = { current: null };

// Load the server-side .tldr file into the editor. Returns true when a
// snapshot was applied, false when the server has no saved canvas.
async function loadSnapshotFromServer(editor) {
  const res = await fetch('/draw/data/json');
  if (!res.ok) return false;
  const file = await res.json();
  // .tldr format: { records: [...], schema, tldrawFileFormatVersion }
  // loadSnapshot expects: { store: { [id]: record }, schema }
  const store = Object.fromEntries((file.records || []).map(r => [r.id, r]));
  loadSnapshot(editor.store, { store, schema: file.schema });
  return true;
}

async function loadFromServer() {
  const editor = _editorRef.current;
  if (!editor) return;
  const loaded = await loadSnapshotFromServer(editor);
  if (!loaded) console.error('No saved canvas on server');
}

// DefaultMainMenu sets up TldrawUiMenuContextProvider; we pass children
// into it so our TldrawUiMenuGroup renders inside that provider.
function CustomMainMenu() {
  return React.createElement(
    DefaultMainMenu,
    null,
    React.createElement(DefaultMainMenuContent, null),
    React.createElement(
      TldrawUiMenuGroup,
      { id: 'server-actions' },
      React.createElement(TldrawUiMenuItem, {
        id: 'load-from-server',
        label: 'Load from server',
        icon: 'external-link',
        readonlyOk: false,
        onSelect: loadFromServer,
      }),
      React.createElement(TldrawUiMenuItem, {
        id: 'view-data',
        label: 'View Data',
        icon: 'external-link',
        readonlyOk: true,
        onSelect: () => { window.open('/draw/data', '_blank'); },
      })
    )
  );
}

const SAVE_DEBOUNCE_MS = 2000;

export const TldrawHook = {
  mounted() {
    console.log('Tldraw hook mounted');
    this._saveTimer = null;
    this._editor = null;

    const hook = this;

    try {
      const root = createRoot(this.el);

      root.render(React.createElement(Tldraw, {
        persistenceKey: 'adaptics-draw',
        colorScheme: 'system',
        components: { MainMenu: CustomMainMenu },
        onMount: (editor) => {
          hook._editor = editor;
          _editorRef.current = editor;
          console.log('Tldraw editor mounted, file sync enabled');

          // The server .tldr file is the source of truth: saves go there,
          // so loads must come from there too (not only from localStorage).
          loadSnapshotFromServer(editor)
            .then((loaded) => {
              console.log(loaded ? 'Loaded canvas from server' : 'No saved canvas on server; using local state');
            })
            .catch((error) => console.error('Error loading canvas from server:', error));

          // Listen for store changes and persist to .tldr file
          editor.store.listen((entry) => {
            // Only save on user-initiated document changes
            if (entry.source !== 'user') return;

            if (hook._saveTimer) clearTimeout(hook._saveTimer);
            hook._saveTimer = setTimeout(() => {
              hook._saveTldr(editor);
            }, SAVE_DEBOUNCE_MS);
          }, { scope: 'document', source: 'user' });
        }
      }));

      this.root = root;
    } catch (error) {
      console.error('Error mounting Tldraw:', error);
    }
  },

  async _saveTldr(editor) {
    try {
      const json = await serializeTldrawJson(editor);
      this.pushEvent('save_tldr', { json });
    } catch (error) {
      console.error('Error serializing tldraw:', error);
    }
  },

  destroyed() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    if (this.root) {
      this.root.unmount();
    }
  }
};

// Hook for reading localStorage data on demand
export const TldrawDataReaderHook = {
  mounted() {
    console.log('TldrawDataReader hook mounted');

    // Automatically read localStorage when mounted
    try {
      const storageKey = 'TLDRAW_DOCUMENT_v2_adaptics-draw';
      const data = localStorage.getItem(storageKey);

      if (data) {
        console.log('Found tldraw data in localStorage');
        this.pushEvent('tldraw_data_loaded', { json: data });
      } else {
        console.log('No tldraw data found in localStorage');
        this.pushEvent('tldraw_data_loaded', { json: null });
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
      this.pushEvent('tldraw_data_loaded', { json: null, error: error.message });
    }
  }
};

// Penpot plugin API bridge hook.
// Listens for postMessage events from the embedded Penpot iframe and forwards
// them to the LiveView, and allows sending plugin commands back to Penpot.
export const PenpotExplorer = {
  mounted() {
    this._onMessage = (event) => {
      const frame = this.el.querySelector("#penpot-frame");
      if (!frame || event.source !== frame.contentWindow) return;

      const data = event.data;
      if (!data || typeof data !== "object") return;

      // Penpot plugin messages have a `type` field
      const type = data.type || "unknown";
      const payload = data.content ?? data.data ?? data;

      this.pushEvent("penpot_message", { type, payload });
    };

    window.addEventListener("message", this._onMessage);

    // Expose a helper so the browser console can send commands to Penpot
    window.penpotSend = (msg) => {
      const frame = this.el.querySelector("#penpot-frame");
      if (frame?.contentWindow) {
        frame.contentWindow.postMessage(msg, "*");
      }
    };
  },

  destroyed() {
    window.removeEventListener("message", this._onMessage);
    delete window.penpotSend;
  },
};

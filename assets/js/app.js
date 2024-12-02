// We import the CSS which is extracted to its own file by esbuild.
// Remove this line if you add a your own CSS build pipeline (e.g postcss).
import "../css/app.css";

// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"
import "./user_socket.js";

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "../vendor/topbar";
import * as d3 from "d3";
import { renderForceDirectedGraph } from "./force_directed_graph";
import { renderSplines } from "./render_splines";
import { renderGraph } from "./render_graph";
import { renderNodes } from "./nodes";
import { renderVoxels } from "./voxels";
import { renderVortex } from "./vortex";
import * as BpmnJS from "bpmn-js";
import BpmnViewer from "bpmn-js/dist/bpmn-navigated-viewer.production.min";

import BpmnModeler from "bpmn-js/lib/Modeler";
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from "bpmn-js-properties-panel";


let Hooks = {};
Hooks.Splines = {
  mounted() {
    // Render the graph when the DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
      renderSplines("#graph", data);
    });
  },
};

let csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute("content");
let liveSocket = new LiveSocket("/live", Socket, {
  params: { _csrf_token: csrfToken },
  hooks: Hooks,
});

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" });
window.addEventListener("phx:page-loading-start", (info) => topbar.show());
window.addEventListener("phx:page-loading-stop", (info) => topbar.hide());

// connect if there are any LiveViews on the page
liveSocket.connect();

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket;

// Load /
window.nodeGraph = function splines(data) {
  renderForceDirectedGraph("#graph", data);
};

// Load /splines
window.splines = function splines() {
  renderSplines("#graph", data);
};

// Load /splines
window.graph = function graph() {
  renderGraph("#graph", data);
};

window.three_d = function three_d() {
  var [scene, drawLabels, undrawLabels, drawLinks, undrawLinks] = renderNodes(
    "#graph",
    data
  );

  // start with labels off
  var labelsOff = true;
  document
    .getElementsByClassName("id-toggle-button-labels")[0]
    .addEventListener("click", function () {
      if (labelsOff) {
        drawLabels();
        labelsOff = false;
        alert("toggling css labels ON");
      } else {
        undrawLabels();
        labelsOff = true;
        alert("toggling css labels OFF");
      }
    });

  // start with lines on
  var linesOff = false;
  document
    .getElementsByClassName("id-toggle-button-lines")[0]
    .addEventListener("click", function () {
      if (linesOff) {
        drawLinks();
        linesOff = false;
        alert("toggling drawing lines ON");
      } else {
        undrawLinks();
        linesOff = true;
        alert("toggling drawing lines OFF");
      }
    });
};

window.vortex = function () {
  renderVortex("#graph");
};

window.voxels = function () {
  renderVoxels("#graph", data);
};

window.flow = function () {
  // Create a function to initialize and display BPMN diagram
  function displayBpmnDiagram(bpmnXML, containerId) {
    const viewer = new BpmnViewer({
      container: `#${containerId}`,
    });

    fetch(bpmnXML)
      .then((response) => response.text())
      .then((xml) => {
        viewer.importXML(xml, (err) => {
          if (err) {
            console.error("Error rendering BPMN diagram", err);
          } else {
            console.log("BPMN diagram rendered successfully.");
          }
        });
      })
      .catch((error) => {
        console.error("Error fetching BPMN XML:", error);
      });
  }

  // Path to your BPMN XML file
  const bpmnFilepath = "/assets/diagram.bpmn";

  // Call the displayBpmnDiagram function to render the BPMN diagram
  displayBpmnDiagram(bpmnFilepath, "canvas");
};

window.flowModeler = function () {
  var container = document.getElementById("modeler");
  var modeler = new BpmnModeler({
    container: ".modeler",
    keyboard: {
      bindTo: window,
    },
  });

  async function openDiagram(xml) {
    try {
      await modeler.importXML(xml);

      container.removeClass("with-error").addClass("with-diagram");
    } catch (err) {
      container.removeClass("with-diagram").addClass("with-error");

      container.find(".error pre").text(err.message);

      console.error(err);
    }
  }

  // openDiagram("/assets/diagram.bpmn")
};

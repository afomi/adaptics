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
import { renderPool } from "./pool";
import { renderForceDirectedGraph } from "./force_directed_graph";
import { renderSplines } from "./render_splines";
import { renderEcosystem } from "./render_ecosystem";
import { renderGraph } from "./render_graph";
import { renderNodes } from "./nodes";
import { renderVoxels } from "./voxels";
import { renderEnergySimulation } from "./energy_simulation";
import { renderEnergyPhysics } from "./energy_physics";
import { renderUnwriter } from "./unwriter";
import { renderRotatingClock } from "./clock";
import { renderAngles } from "./angles";
import { renderCubeviz } from "./cubeviz";
import { renderNeighborhood } from "./neighborhood";
import { renderCivics } from "./civics";
import { renderToroidalCashFlow } from "./toroidal_cash_flow";
import { renderBalancingRings } from "./balancing_rings";
import { renderMathNodes } from "./math_nodes";
import { renderHydrogenEnergy } from "./hydrogen_energy";
import { renderCoherence } from "./coherence";
import { renderTariffLoop } from "./tariff_loop";
import { renderSpheres } from "./spheres";
import { renderOrgTopology } from "./org_topology";
import { renderRussell } from "./russell";
import { renderSocialNetwork } from "./social_network";
import { renderTopo } from "./topo";
import { renderChladni } from "./chladni";
import { renderEconAgents } from "./econ_agents";
import { mountRemotionPlayer } from "./remotion_player";
// import "./game";
// import "./cubeviz";
import { ValueStreamVisualization } from "./value_stream";
import { ScopeVisualization } from "./scope";
import { FabricCanvasHook } from "./fabric_canvas_hook";
import { TldrawHook, TldrawDataReaderHook } from "./tldraw_hook";
import { ExcalidrawHook } from "./excalidraw_hook";
import { StageCanvas } from "./stage_hook";
import { CanvasHook } from "./canvas_hook";
import * as BpmnJS from "bpmn-js";
import BpmnViewer from "bpmn-js/dist/bpmn-navigated-viewer.production.min";

import BpmnModeler from "bpmn-js/lib/Modeler";
// Temporarily commented out due to FeelLanguageContext export mismatch
// import {
//   BpmnPropertiesPanelModule,
//   BpmnPropertiesProviderModule,
// } from "bpmn-js-properties-panel";


let Hooks = {};
Hooks.Splines = {
  mounted() {
    // Render the graph when the DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
      renderSplines("#graph", data);
    });
  },
};

Hooks.startGameBoard = {
  mounted() {
    // Render the graph when the DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
      renderSplines("#graph", data);
    });
  },
};


Hooks.ValueStreamVisualization = ValueStreamVisualization;
Hooks.Tldraw = TldrawHook;
Hooks.TldrawDataReader = TldrawDataReaderHook;
Hooks.StageCanvas = StageCanvas;
Hooks.ScopeVisualization = ScopeVisualization;
Hooks.FabricCanvasHook = FabricCanvasHook;
Hooks.CanvasHook = CanvasHook;
Hooks.ExcalidrawHook = ExcalidrawHook;

Hooks.cubeviz = {
  mounted() {
    // Render the graph when the DOM is ready
    alert('hiii')
    document.addEventListener("DOMContentLoaded", () => {
      // renderSplines("#graph", data);
    });
  },
};

Hooks.GameBoard = {
  mounted() {
    // memo char counter
    const memo = this.el.querySelector("#memo_input")
    const counter = this.el.querySelector("#memo_count")
    const updateCount = () => counter && (counter.textContent = `${(memo?.value || "").length}/160`)
    memo?.addEventListener("input", updateCount)
    updateCount()

    // receive new dots (from self or others)
    this.handleEvent("dot_created", ({ dot }) => {
      if (typeof window.addDot === "function") {
        window.addDot(dot)         // {x,y,z,team,memo,user_id}
      } else {
        console.warn("addDot(dot) not found on window")
      }
    })
  }
}

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

window.pool = function () {
  renderPool("#graph");
};

// Load /splines
window.splines = function splines() {
  renderSplines("#graph", data);
};

// Load /ecosystem
window.ecosystem = function ecosystem() {
  renderEcosystem();
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
  // renderVortex("#graph");
};

window.unwriter = function () {
  renderUnwriter("c");
};

window.rotatingClock = function () {
  renderRotatingClock("rotating-clock");
};

window.voxels = function () {
  renderVoxels("#graph", data);
};

window.energySimulation = function () {
  renderEnergySimulation("#simulation-container");
};

window.energyPhysics = function () {
  renderEnergyPhysics("#energy-container");
};

window.angles = function () {
  renderAngles("angles-container");
};

window.cubeviz = function () {
  renderCubeviz();
};

window.neighborhood = function () {
  renderNeighborhood("neighborhood-container");
};

window.civics = function () {
  renderCivics("civics-container");
};

window.toroidalCashFlow = function () {
  renderToroidalCashFlow("toroidal-cash-flow-container");
};

window.balancingRings = function () {
  renderBalancingRings("rings-container");
};

window.mathNodes = function () {
  renderMathNodes("math-container");
};

window.hydrogenEnergy = function () {
  renderHydrogenEnergy("hydrogen-container");
};

window.coherence = function () {
  renderCoherence("coherence-container");
};

window.tariffLoop = function () {
  return renderTariffLoop("tariff-loop-container");
};

window.chladni = function () {
  renderChladni("chladni-container", {
    chordLabel:   "chladni-chord-label",
    waveform:     "chladni-waveform",
    modeBtn:      "chladni-mode-btn",
    soundBtn:     "chladni-sound-btn",
    resetBtn:     "chladni-reset-btn",
    explorePanel: "chladni-explore",
  });
};

window.renderSpheres = function (selector) {
  renderSpheres(selector);
};

window.renderRussell = function () {
  return renderRussell("russell-container");
};

window.orgTopology = function () {
  return renderOrgTopology("org-container", {
    sizeButtons:      "org-size",
    aiSlider:         "org-ai",
    aiValue:          "org-ai-value",
    strategyButtons:  "org-strategy",
    meaningfulSlider: "org-meaningful",
    meaningfulValue:  "org-meaningful-value",
    playBtn:          "org-play",
    stats:            "org-stats",
  });
};

window.socialNetwork = function () {
  return renderSocialNetwork("network-container", {
    sidebar:     "net-sidebar",
    stats:       "net-stats",
    sort:        "net-sort",
    distance:    "net-distance",
    year:        "net-year",
    yearValue:   "net-year-value",
    play:        "net-play",
    activateAll: "net-activate-all",
    shared:      "net-shared",
    viewpoint:   "net-viewpoint",
    grow:        "net-grow",
  });
};

window.renderTopo = function (selector) {
  renderTopo(selector);
};

window.renderEconAgents = function (containerId, uiIds) {
  return renderEconAgents(containerId, uiIds);
};

Hooks.RemotionPlayer = {
  mounted() {
    mountRemotionPlayer(this.el.id);
  }
};

window.flow = function () {
  // Create a function to initialize and display BPMN diagram
  function displayBpmnDiagram(bpmnXML, containerId) {
    const viewer = new BpmnViewer({
      container: `#${containerId}`,
    });

    fetch(bpmnXML)
      .then((response) => response.text())
      .then(async (xml) => {
        try {
          await viewer.importXML(xml);
          console.log("BPMN diagram rendered successfully.");
        } catch (err) {
          console.error("Error rendering BPMN diagram", err);
        }
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

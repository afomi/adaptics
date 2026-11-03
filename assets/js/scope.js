import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Layer Y positions
const APEX_Y = 15;
const MID_Y = 0;
const BASE_Y = -15;

// Layout radii
const CLUSTER_RADIUS = 8;
const NODE_RADIUS = 14;

// Activity → color (cool blue to warm gold)
function activityColor(activity) {
  const cold = new THREE.Color(0x2563eb); // blue
  const hot = new THREE.Color(0xf59e0b); // amber
  return cold.clone().lerp(hot, activity);
}

function createDisc(radius, color, position, userData) {
  const geometry = new THREE.CircleGeometry(radius, 48);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData = userData;
  return mesh;
}

export const ScopeVisualization = {
  mounted() {
    const el = this.el;
    const graph = JSON.parse(el.dataset.graph);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      el.clientWidth / el.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 40, 0);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI * 0.4;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0xffffff, 0.6, 100);
    pointLight.position.set(10, 20, 15);
    scene.add(pointLight);

    // Cone wireframe (spatial reference)
    const coneGeo = new THREE.ConeGeometry(16, 32, 24, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const cone = new THREE.Mesh(coneGeo, coneGeo);
    cone.material = coneMat;
    cone.position.y = 0;
    scene.add(cone);

    // Track all discs for animation + raycasting
    const discs = [];
    const discGroup = new THREE.Group();
    scene.add(discGroup);

    // --- Apex: System disc ---
    const systemDisc = createDisc(
      3.0,
      activityColor(graph.system.activity),
      new THREE.Vector3(0, APEX_Y, 0),
      {
        id: graph.system.id,
        type: "system",
        activity: graph.system.activity,
        phaseOffset: 0,
      }
    );
    discGroup.add(systemDisc);
    discs.push(systemDisc);

    // --- Mid-layer: Cluster discs ---
    const clusterDiscs = {};
    graph.clusters.forEach((cluster, i) => {
      const angle = (i / graph.clusters.length) * Math.PI * 2;
      const x = Math.cos(angle) * CLUSTER_RADIUS;
      const z = Math.sin(angle) * CLUSTER_RADIUS;
      const radius = 1.5 + cluster.children.length * 0.3;

      const disc = createDisc(
        radius,
        activityColor(cluster.activity),
        new THREE.Vector3(x, MID_Y, z),
        {
          id: cluster.id,
          type: "cluster",
          activity: cluster.activity,
          phaseOffset: i * 1.2,
          children: cluster.children,
        }
      );
      discGroup.add(disc);
      discs.push(disc);
      clusterDiscs[cluster.id] = { disc, angle, children: cluster.children };
    });

    // --- Base layer: Node discs ---
    const nodeDiscs = {};
    graph.clusters.forEach((cluster, ci) => {
      const clusterAngle = (ci / graph.clusters.length) * Math.PI * 2;
      const sectorWidth = (Math.PI * 2) / graph.clusters.length;

      cluster.children.forEach((nodeId, ni) => {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const nodeAngle =
          clusterAngle -
          sectorWidth * 0.4 +
          (ni / cluster.children.length) * sectorWidth * 0.8;
        const x = Math.cos(nodeAngle) * NODE_RADIUS;
        const z = Math.sin(nodeAngle) * NODE_RADIUS;

        const disc = createDisc(
          0.8,
          activityColor(node.activity),
          new THREE.Vector3(x, BASE_Y, z),
          {
            id: node.id,
            type: "node",
            activity: node.activity,
            phaseOffset: ci * 2 + ni * 0.7,
            clusterId: cluster.id,
          }
        );
        discGroup.add(disc);
        discs.push(disc);
        nodeDiscs[node.id] = disc;
      });
    });

    // --- Edges (lines between nodes at base layer) ---
    const edgeGroup = new THREE.Group();
    scene.add(edgeGroup);

    graph.edges.forEach((edge) => {
      const fromDisc = nodeDiscs[edge.from];
      const toDisc = nodeDiscs[edge.to];
      if (!fromDisc || !toDisc) return;

      const points = [fromDisc.position.clone(), toDisc.position.clone()];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x4488aa,
        transparent: true,
        opacity: 0.4,
      });
      const line = new THREE.Line(geometry, material);
      line.userData = { weight: edge.weight, phaseOffset: Math.random() * 6 };
      edgeGroup.add(line);
    });

    // --- Navigation state ---
    let currentLayer = "clusters";
    let cameraTargetY = null;
    let controlsTargetY = null;
    let focusedCluster = null;

    // Scroll to navigate layers
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.03;
      const newY = THREE.MathUtils.clamp(
        camera.position.y + delta,
        -20,
        25
      );
      camera.position.y = newY;
      controls.target.y = newY - 5;

      // Detect layer
      let layer;
      if (newY > 12) {
        layer = "system";
      } else if (newY > -5) {
        layer = "clusters";
      } else {
        layer = "nodes";
      }

      if (layer !== currentLayer) {
        currentLayer = layer;
        this.pushEvent("layer_changed", { layer });
      }
    }, { passive: false });

    // --- Raycaster for click interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredDisc = null;

    el.addEventListener("pointermove", (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(discs);

      if (hoveredDisc && (!hits.length || hits[0].object !== hoveredDisc)) {
        hoveredDisc.userData.hovered = false;
        hoveredDisc = null;
        renderer.domElement.style.cursor = "default";
      }

      if (hits.length > 0) {
        const disc = hits[0].object;
        if (disc.userData.type !== "system") {
          hoveredDisc = disc;
          disc.userData.hovered = true;
          renderer.domElement.style.cursor = "pointer";
        }
      }
    });

    el.addEventListener("click", (e) => {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(discs);
      if (!hits.length) return;

      const disc = hits[0].object;
      const { id, type } = disc.userData;

      if (type === "cluster") {
        focusedCluster = id;
        this.pushEvent("cluster_entered", { id });

        // Dim non-focused clusters, highlight the focused one
        discs.forEach((d) => {
          if (d.userData.type === "cluster") {
            d.userData.dimmed = d.userData.id !== id;
          }
          if (d.userData.type === "node") {
            d.visible = d.userData.clusterId === id;
          }
        });
        edgeGroup.children.forEach((line) => {
          line.visible = true;
        });
      } else if (type === "node") {
        this.pushEvent("node_selected", { id });
      }
    });

    // Handle reset from LiveView
    this.handleEvent("reset_view", () => {
      focusedCluster = null;
      cameraTargetY = 40;
      controlsTargetY = 0;
      discs.forEach((d) => {
        d.visible = true;
        d.userData.dimmed = false;
      });
    });

    // --- Resize ---
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // --- Animation loop ---
    const animate = () => {
      requestAnimationFrame(animate);
      const t = performance.now() * 0.001;

      // Camera lerp
      if (cameraTargetY !== null) {
        camera.position.y += (cameraTargetY - camera.position.y) * 0.04;
        controls.target.y += (controlsTargetY - controls.target.y) * 0.04;
        if (Math.abs(camera.position.y - cameraTargetY) < 0.05) {
          cameraTargetY = null;
          controlsTargetY = null;
        }
      }

      // Breathing + billboard
      discs.forEach((disc) => {
        const { activity, phaseOffset, hovered, dimmed } = disc.userData;
        const rate = 0.5 + activity * 1.5;
        const amp = 0.05 + activity * 0.15;
        const breath = Math.sin(t * rate + phaseOffset);
        const hoverBoost = hovered ? 1.15 : 1.0;
        const s = (1.0 + breath * amp) * hoverBoost;
        disc.scale.set(s, s, 1);

        const baseOpacity = dimmed ? 0.2 : 0.6 + activity * 0.3;
        disc.material.opacity = baseOpacity + breath * 0.05;
      });

      // Edge pulse
      edgeGroup.children.forEach((line) => {
        const { weight, phaseOffset } = line.userData;
        line.material.opacity =
          0.2 + weight * 0.3 + Math.sin(t * 0.8 + phaseOffset) * 0.15;
      });

      // Edge visibility based on camera height
      edgeGroup.visible = camera.position.y < -2;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup on destroy
    this._cleanup = () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  },

  destroyed() {
    if (this._cleanup) this._cleanup();
  },
};

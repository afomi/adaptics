/**
 * Russell — a full-screen Three.js scene.
 *
 * Starting point: a single cube at the origin, orbitable and lit.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const BG = 0x0b0e1a;

export function renderRussell(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    400
  );
  camera.position.set(9, 7, 13);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff2dc, 1.1);
  key.position.set(8, 12, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.4);
  fill.position.set(-8, 4, -6);
  scene.add(fill);

  // Outline only: EdgesGeometry keeps the 12 edges of the box and drops the
  // diagonals that a wireframe material would draw across each face.
  const cube = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0xe8a33d })
  );
  cube.position.set(0, 0, 0);
  scene.add(cube);

  // Axes through the cube's center: x red, y green, z blue.
  // Each axis is a full line of length AXIS_LENGTH centered on the origin, so
  // it runs -5..+5 and extends 4.5 past the cube's faces (which sit at +/-0.5).
  // AxesHelper is no use here: it draws only the positive arms.
  const AXIS_LENGTH = 10;
  const h = AXIS_LENGTH / 2;
  const axes = new THREE.Group();

  for (const [color, from, to] of [
    [0xe8595a, [-h, 0, 0], [h, 0, 0]],
    [0x5ad19a, [0, -h, 0], [0, h, 0]],
    [0x5a8fe8, [0, 0, -h], [0, 0, h]],
  ]) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from),
      new THREE.Vector3(...to),
    ]);
    axes.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color })));
  }

  scene.add(axes);

  function frame() {
    requestAnimationFrame(frame);
    controls.update();
    renderer.render(scene, camera);
  }
  frame();

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { scene, camera, renderer, controls, cube };
}

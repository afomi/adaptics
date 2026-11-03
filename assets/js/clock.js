import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function renderRotatingClock(selector, data) {
    /** ----- basic setup ----- */
    const canvas = document.getElementById(selector);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(innerWidth, innerHeight);


    // --- scene, camera, renderer -------------------------------------------------
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 20, 0.01); // “above” the shape, looking down
    camera.lookAt(0, 0, 0);

    document.body.appendChild(renderer.domElement);




// --- lights ------------------------------------------------------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(4, 10, 5);
directional.castShadow = true;

directional.shadow.mapSize.set(1024, 1024);
directional.shadow.camera.near = 1;
directional.shadow.camera.far = 20;
directional.shadow.camera.left = -10;
directional.shadow.camera.right = 10;
directional.shadow.camera.top = 10;
directional.shadow.camera.bottom = -10;

scene.add(directional);

// --- floor -------------------------------------------------------------------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.ShadowMaterial({ opacity: 0.2 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1;
floor.receiveShadow = true;
scene.add(floor);

// --- bipyramid factory -------------------------------------------------------
function createHexBipyramid(radius = 1, height = 0.8, color = 0x156289) {
  const vertices = [
    0, height, 0, // top apex
    0, -height, 0 // bottom apex
  ];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    vertices.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }

  const indices = [];
  for (let i = 0; i < 6; i++) {
    const a = 2 + i;
    const b = 2 + ((i + 1) % 6);
    indices.push(0, a, b); // top face
    indices.push(1, b, a); // bottom face
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
  );
  mesh.add(edges);

  return mesh;
}

// --- Create and position 4 rotating bipyramids -------------------------------
const bipyramids = [
  {
    mesh: createHexBipyramid(1, 0.8, 0xffff66),
    speed: (Math.PI * 2) / 1, // 1 per second
    offset: -7.5,
  },
  {
    mesh: createHexBipyramid(1, 0.8, 0xff6666),
    speed: (Math.PI * 2) / 60, // 1 per minute
    offset: -2.5,
  },
  {
    mesh: createHexBipyramid(1, 0.8, 0x66ff66),
    speed: (Math.PI * 2) / 3600, // 1 per hour
    offset: 2.5,
  },
  {
    mesh: createHexBipyramid(1, 0.8, 0x6666ff),
    speed: (Math.PI * 2) / 86400, // 1 per day
    offset: 7.5,
  },
];

bipyramids.forEach(({ mesh, offset }) => {
  mesh.position.x = offset;
  scene.add(mesh);
});

// --- animate -----------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  bipyramids.forEach(({ mesh, speed }) => {
    mesh.rotation.x = elapsed * speed;
  });

  renderer.render(scene, camera);
}

animate();

// --- static size, no resize listener needed ----------------------------------


}

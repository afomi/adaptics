import * as THREE from 'three';

// import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

import { World, Body, Sphere, Plane, Vec3, Material, ContactMaterial } from 'cannon-es';

export function renderPool(selector, data) {
  // Scene Setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableRotate = true;
  controls.enablePan = true;

  // Lighting Adjustments
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Physics World
  const world = new World();
  world.gravity.set(0, -9.82, 0);

  // Materials
  const ballMaterial = new Material('ball');
  const tableMaterial = new Material('table');
  const cushionMaterial = new Material('cushion');
  const ballTableContact = new ContactMaterial(ballMaterial, tableMaterial, {
      friction: 0.02,
      restitution: 0.8
  });
  const cushionContact = new ContactMaterial(ballMaterial, cushionMaterial, {
      friction: 0.02,
      restitution: 0.9
  });
  world.addContactMaterial(ballTableContact);
  world.addContactMaterial(cushionContact);

  // Pool Table Surface
  const tableGeometry = new THREE.BoxGeometry(10, 0.5, 5);
  const tableMeshMaterial = new THREE.MeshStandardMaterial({ color: 0x115511 });
  const table = new THREE.Mesh(tableGeometry, tableMeshMaterial);
  table.position.y = -0.25;
  scene.add(table);

  const tableBody = new Body({ mass: 0, shape: new Plane(), material: tableMaterial });
  tableBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(tableBody);

  // Rail Cushions
  const cushions = [];
  const cushionPositions = [
      { x: -5, z: 0, rotation: Math.PI, width: 0.3, depth: 5.5 },
      { x: 5, z: 0, rotation: Math.PI, width: 0.3, depth: 5.5 },
      { x: 0, z: -2.5, rotation: 0, width: 10.3, depth: 0.3 },
      { x: 0, z: 2.5, rotation: 0, width: 10.3, depth: 0.3 }
  ];

  cushionPositions.forEach(({ x, z, rotation, width, depth }) => {
      const cushionGeometry = new THREE.BoxGeometry(width, 0.5, depth);
      const cushionMeshMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const cushion = new THREE.Mesh(cushionGeometry, cushionMeshMaterial);
      cushion.position.set(x, 0, z);
      cushion.rotation.y = rotation;
      scene.add(cushion);
      cushions.push(cushion);
  });

  // Cue Ball
  const ballGeometry = new THREE.SphereGeometry(0.2, 32, 32);
  const cueBallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const cueBall = new THREE.Mesh(ballGeometry, cueBallMaterial);
  cueBall.position.set(0, 0.2, -2);
  scene.add(cueBall);

  const cueBallBody = new Body({ mass: 1, shape: new Sphere(0.2), material: ballMaterial });
  cueBallBody.position.set(0, 0.2, -2);
  world.addBody(cueBallBody);

  // Rendering Loop
  function animate() {
      requestAnimationFrame(animate);
      world.step(1 / 60);

      cueBall.position.copy(cueBallBody.position);
      cueBallBody.velocity.scale(0.98, cueBallBody.velocity); // Simulate friction

      controls.update();
      renderer.render(scene, camera);
  }
  animate();



  return [scene];
}
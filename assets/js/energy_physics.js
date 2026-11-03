import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import registry from './physics/registry.js';

/**
 * Energy Physics Exploration
 *
 * 3D visualization canvas for exploring physics concepts and compositions.
 */

export function renderEnergyPhysics(selector) {
  let camera, scene, renderer, controls;

  const container = document.querySelector(selector);
  if (!container) {
    console.error('Container not found:', selector);
    return;
  }

  init();
  animate();

  // Expose registry to window for console exploration
  window.physics = registry;

  function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(50, 50, 50);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Orbit Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 3D Axes Helper
    const axesHelper = new THREE.AxesHelper(30);
    scene.add(axesHelper);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    // Handle resize
    window.addEventListener('resize', onWindowResize);

    // Log registry summary to console
    console.log('Physics Registry loaded:', registry.summary());
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
}

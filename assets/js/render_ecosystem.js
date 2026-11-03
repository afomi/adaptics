// Import Three.js and OrbitControls
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function renderEcosystem() {
  // Initialize Scene, Camera, and Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(50, 50, 150);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add OrbitControls
  const controls = new OrbitControls(camera, renderer.domElement);

  // Variables to manage objects
  let spheres = [];
  let frames = [];
  let isLayered = false;
  let edgeResolution = 24;

  // Function to create 100 main spheres and their smaller spheres
  function createSpheres() {
      // clearScene();

      const largeSphereGeometry = new THREE.SphereGeometry(1, edgeResolution, edgeResolution);
      const blueSphereGeometry = new THREE.SphereGeometry(0.5, edgeResolution, edgeResolution);
      const orangeSphereGeometry = new THREE.SphereGeometry(0.25, edgeResolution, edgeResolution);

      const largeSphereMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const blueSphereMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
      const orangeSphereMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });

      const cubeSize = 100;
      for (let i = 0; i < 100; i++) {
          const largeSphere = new THREE.Mesh(largeSphereGeometry, largeSphereMaterial);
          largeSphere.position.set(
              Math.random() * cubeSize - cubeSize / 2,
              Math.random() * cubeSize - cubeSize / 2,
              Math.random() * cubeSize - cubeSize / 2
          );

          // Create smaller blue spheres around the large sphere
          const blueSpheres = [];
          for (let j = 0; j < 50; j++) {
              const blueSphere = new THREE.Mesh(blueSphereGeometry, blueSphereMaterial);
              const offset = new THREE.Vector3(
                  Math.random() * 10 - 5,
                  Math.random() * 10 - 5,
                  Math.random() * 10 - 5
              );
              blueSphere.position.copy(largeSphere.position).add(offset);
              scene.add(blueSphere);
              blueSpheres.push(blueSphere);
          }

          // Create smaller orange spheres in a row near the large sphere
          const orangeSpheres = [];
          const websiteCount = Math.floor(Math.random() * 75);
          for (let k = 0; k < websiteCount; k++) {
              const orangeSphere = new THREE.Mesh(orangeSphereGeometry, orangeSphereMaterial);
              orangeSphere.position.set(
                  largeSphere.position.x + (k - 37) * 0.5,
                  largeSphere.position.y - 5,
                  largeSphere.position.z
              );
              scene.add(orangeSphere);
              orangeSpheres.push(orangeSphere);
          }

          scene.add(largeSphere);
          spheres.push({ largeSphere, blueSpheres, orangeSpheres });
      }

      // alert('hii')
      // camera.p/osition()

      camera.lookAt(spheres[99].largeSphere)
      // debugger
      camera.position.set(500, 500, 550);
  }

  // Function to transform spheres into layers
  function transformToLayers() {
      if (isLayered) return;
      isLayered = true;

      spheres.forEach((group, index) => {
          const { largeSphere, blueSpheres, orangeSpheres } = group;

          // Create frame
          const frameGeometry = new THREE.PlaneGeometry(40, 20);
          const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
          const frame = new THREE.Mesh(frameGeometry, frameMaterial);
          frame.position.set(0, index * 25, 0);
          scene.add(frame);
          frames.push(frame);

          // Add 2D circles (blue) randomly on the frame
          blueSpheres.forEach((blue) => {
              const circleGeometry = new THREE.CircleGeometry(0.25, 16);
              const circleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
              const circle = new THREE.Mesh(circleGeometry, circleMaterial);
              circle.position.set(
                  frame.position.x + Math.random() * 18 - 9,
                  frame.position.y,
                  frame.position.z + Math.random() * 18 - 9
              );
              scene.add(circle);
          });

          // Add 2D circles (orange) in a row on the frame
          orangeSpheres.forEach((orange, i) => {
              const circleGeometry = new THREE.CircleGeometry(0.25, 16);
              const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 });
              const circle = new THREE.Mesh(circleGeometry, circleMaterial);
              circle.position.set(
                  frame.position.x + (i - 37) * 0.5,
                  frame.position.y,
                  frame.position.z
              );
              scene.add(circle);
          });

          // Remove old 3D objects
          scene.remove(largeSphere);
          blueSpheres.forEach((blue) => scene.remove(blue));
          orangeSpheres.forEach((orange) => scene.remove(orange));
      });
  }

  // Function to collapse all frames into one
  function collapseFrames() {
      frames.forEach((frame) => {
          frame.position.set(0, 0, 0);
      });
  }

  // Function to clear the scene
  function clearScene() {
      while (scene.children.length > 0) {
          scene.remove(scene.children[0]);
      }
      spheres = [];
      frames = [];
      isLayered = false;
  }

  // Add lighting
  const light = new THREE.PointLight(0xffffff, 1, 1000);
  light.position.set(150, 150, 150);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // Buttons for actions
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'absolute';
  buttonContainer.style.top = '50px';
  buttonContainer.style.left = '10px';
  buttonContainer.style.background = 'white';
  buttonContainer.style.zIndex = '40';

  const buttonStyle = 'padding: 8px 16px; margin-right: 8px; background: #2a6; color: white; border: none; cursor: pointer;';

  const createButton = document.createElement('button');
  createButton.innerText = 'Create Spheres';
  createButton.style.cssText = buttonStyle;
  createButton.onclick = createSpheres;
  buttonContainer.appendChild(createButton);

  const layerButton = document.createElement('button');
  layerButton.innerText = 'Transform to Layers';
  layerButton.style.cssText = buttonStyle;
  layerButton.onclick = transformToLayers;
  buttonContainer.appendChild(layerButton);

  const collapseButton = document.createElement('button');
  collapseButton.innerText = 'Collapse Frames';
  collapseButton.style.cssText = buttonStyle;
  collapseButton.onclick = collapseFrames;
  buttonContainer.appendChild(collapseButton);

  document.body.appendChild(buttonContainer);

  // Animation loop
  function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
  }
  animate();

  createSpheres()
}
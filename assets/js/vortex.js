import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function renderVortex(selector, data) {
  let camera, scene, renderer;
  let plane;
  let pointer,
    raycaster,
    isShiftDown = false;

  let orbitControl;

  const particleCount = 1000;
  const oppositeParticleCount = 1000;
  let particles;
  let oppositeParticles;
  let vortexHeight = 1.61;

  const objects = [];

  init();
  render();

  function addParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const r = Math.random() * 1; // radius from center
        const theta = Math.random() * Math.PI * 2; // angle
        const z = Math.random() * vortexHeight; // height

        positions[i * 3] = r * Math.cos(theta); // x
        positions[i * 3 + 1] = z; // y (height)
        positions[i * 3 + 2] = r * Math.sin(theta); // z
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({ color: 0x00ff00, size: 0.1 });
    particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

  }

  function addOppositeParticles() {
    const particlesGeometry = new THREE.BufferGeometry();
    // const particleCount = 1000;
    const oppositePositions = new Float32Array(oppositeParticleCount * 3);

    for (let i = 0; i < oppositeParticleCount; i++) {
        const r = Math.random() * 1; // radius from center
        const theta = Math.random() * Math.PI * 2; // angle
        const z = Math.random() * vortexHeight; // height

        oppositePositions[i * 3] = r * Math.cos(theta); // x
        oppositePositions[i * 3 + 1] = z; // y (height)
        oppositePositions[i * 3 + 2] = r * Math.sin(theta); // z
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(oppositePositions, 3));
    const particlesMaterial = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.1 });
    oppositeParticles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(oppositeParticles);

  }

  function init() {
    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    // const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // camera.position.set(500, 800, 1300);
    // camera.position.set(500, 800, 10);
    // camera.position.set(0, 0, 15); // from the side
    camera.position.set(0, vortexHeight / 2, 10); // from the side
    // camera.position.set(0, 20, 10); // from above
    // camera.position.z = 10;

    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // grid
    const gridHelper = new THREE.GridHelper(1000, 20);
    // scene.add(gridHelper);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    const geometry = new THREE.PlaneGeometry(1000, 1000);
    geometry.rotateX(-Math.PI / 2);

    plane = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(plane);

    objects.push(plane);




    const coneGeometry = new THREE.ConeGeometry(1, 1.61, 32); // radius, height, segments
    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const vortex1 = new THREE.Mesh(coneGeometry, coneMaterial);
    scene.add(vortex1);
    vortex1.position.y = vortexHeight / 2;

    // Rotate the cone to point upwards
    vortex1.rotation.x = Math.PI;
    addParticles();



    const oppositeConeGeometry = new THREE.ConeGeometry(1, 1.61, 32); // radius, height, segments
    const oppositeConeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
    const vortex2 = new THREE.Mesh(oppositeConeGeometry, oppositeConeMaterial);
    debugger
    vortex2.position.y = vortexHeight / 2;
    scene.add(vortex2);

    // Rotate the cone to point upwards
    // vortex2.rotation.y = Math.PI / 2;
    addOppositeParticles();






    // lights

    const ambientLight = new THREE.AmbientLight(0x606060, 3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(1, 0.75, 0.5).normalize();
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // document.addEventListener("pointermove", onPointerMove);
    // document.addEventListener("pointerdown", onPointerDown);
    // document.addEventListener("keydown", onDocumentKeyDown);
    // document.addEventListener("keyup", onDocumentKeyUp);

    //

    window.addEventListener("resize", onWindowResize);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
  }


  function render() {
    renderer.render(scene, camera);
    animate();

  }

    function animate() {
      requestAnimationFrame(animate);

      // Update particle positions
      const positions = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
          const x = positions[i * 3];
          const y = positions[i * 3 + 1];
          const z = positions[i * 3 + 2];

          // Convert to polar coordinates
          const r = Math.sqrt(x * x + z * z);
          const theta = Math.atan2(z, x);

          // Increment theta for spin and adjust y for upward motion
          const thetaNew = theta + 0.01; // spin rate
          const yNew = y + 0.01; // downward motion

          // Convert back to Cartesian
          positions[i * 3] = r * Math.cos(thetaNew);
          positions[i * 3 + 1] = yNew;
          positions[i * 3 + 2] = r * Math.sin(thetaNew);

          // Reset if out of bounds
          if (yNew > vortexHeight) {
              positions[i * 3 + 1] = 0; // reset height
          }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      animateOpposing();

      renderer.render(scene, camera);
   }

    function animateOpposing() {
      // requestAnimationFrame(animate);

      // Update particle positions
      const oppositePositions = oppositeParticles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
          const x = oppositePositions[i * 3];
          const y = oppositePositions[i * 3 + 1];
          const z = oppositePositions[i * 3 + 2];

          // Convert to polar coordinates
          const r = Math.sqrt(x * x + z * z);
          const theta = Math.atan2(z, x);

          // Increment theta for spin and adjust y for upward motion
          const thetaNew = theta + 0.01; // opposite spin rate
          const yNew = y - 0.01; // upward motion

          // Convert back to Cartesian
          oppositePositions[i * 3] = r * Math.cos(thetaNew);
          oppositePositions[i * 3 + 1] = yNew;
          oppositePositions[i * 3 + 2] = r * Math.sin(thetaNew);

          // Reset if out of bounds
          // if (-yNew > vortexHeight) {
          //     oppositePositions[i * 3 + 1] = 0; // reset height
          // }
          if (-yNew > 0) {
              oppositePositions[i * 3 + 1] = vortexHeight; // reset height
          }
      }
      oppositeParticles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
  }

  function drawOrbitControls() {
    const control = new OrbitControls(camera, renderer.domElement);
    control.damping = 0.2;
    control.addEventListener("change", render);
    return control;
  }
}

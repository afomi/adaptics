import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function renderAngles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0f);

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Camera - orthographic for 2D-like view
  const aspect = width / height;
  const frustumSize = 3;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  camera.position.z = 10;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false;
  controls.enablePan = true;
  controls.enableZoom = true;

  // Circle parameters
  const circleRadius = 1;
  const circleSegments = 128;

  // Create circle circumference
  const circleGeometry = new THREE.BufferGeometry();
  const circlePoints = [];
  for (let i = 0; i <= circleSegments; i++) {
    const theta = (i / circleSegments) * Math.PI * 2;
    circlePoints.push(
      Math.cos(theta) * circleRadius,
      Math.sin(theta) * circleRadius,
      0
    );
  }
  circleGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(circlePoints, 3)
  );
  const circleMaterial = new THREE.LineBasicMaterial({
    color: 0x4488ff,
    linewidth: 2,
  });
  const circle = new THREE.Line(circleGeometry, circleMaterial);
  scene.add(circle);

  // Point (ball)
  const pointGeometry = new THREE.CircleGeometry(0.03, 32);
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff6644 });
  const point = new THREE.Mesh(pointGeometry, pointMaterial);
  scene.add(point);

  // Trail line - will show the path including reflections
  let trailPoints = [];
  let trailLine = null;
  const trailMaterial = new THREE.LineBasicMaterial({
    color: 0xffaa44,
    linewidth: 1,
  });

  // Future path preview (dotted effect via segments)
  let futurePath = [];
  let futureLines = [];

  // Animation state
  let isAnimating = false;
  let animationPath = [];
  let currentSegmentIndex = 0;
  let segmentProgress = 0;
  let reflectionCount = 0;
  const speed = 0.5; // units per second

  // Get UI elements
  const startBtn = document.getElementById("start-animation");
  const resetBtn = document.getElementById("reset-animation");
  const angleInput = document.getElementById("angle-input");
  const reflectionDisplay = document.getElementById("reflection-count");
  const startPositionRadios = document.querySelectorAll(
    'input[name="start-position"]'
  );

  function getStartPosition() {
    const selected = document.querySelector(
      'input[name="start-position"]:checked'
    );
    if (selected.value === "center") {
      return new THREE.Vector2(0, 0);
    } else {
      return new THREE.Vector2(-1, 0);
    }
  }

  function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  // Calculate reflection of a ray off a circle (from inside)
  function reflectRay(hitPoint, incomingDirection) {
    // Normal at hit point on unit circle points outward (hitPoint normalized)
    const normal = hitPoint.clone().normalize();

    // Reflection formula: r = d - 2(d·n)n
    const dot = incomingDirection.dot(normal);
    const reflection = incomingDirection
      .clone()
      .sub(normal.clone().multiplyScalar(2 * dot));

    return reflection.normalize();
  }

  // Find intersection of ray with circle
  function rayCircleIntersection(origin, direction) {
    // Parametric: P = origin + t * direction
    // Circle: |P|^2 = r^2
    // Solve: |origin + t*dir|^2 = r^2

    const a = direction.dot(direction);
    const b = 2 * origin.dot(direction);
    const c = origin.dot(origin) - circleRadius * circleRadius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null; // No intersection
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    // We want the positive t (forward direction), and if starting inside,
    // we want the exit point (larger positive t)
    let t = null;
    if (t1 > 0.001 && t2 > 0.001) {
      t = Math.min(t1, t2);
    } else if (t1 > 0.001) {
      t = t1;
    } else if (t2 > 0.001) {
      t = t2;
    }

    if (t === null) {
      return null;
    }

    const hitPoint = origin.clone().add(direction.clone().multiplyScalar(t));
    return hitPoint;
  }

  // Calculate the full path with reflections
  function calculatePath(startPos, angleDegrees, maxReflections = 50) {
    const path = [startPos.clone()];
    let currentPos = startPos.clone();
    let direction = new THREE.Vector2(
      Math.cos(degreesToRadians(angleDegrees)),
      Math.sin(degreesToRadians(angleDegrees))
    );

    for (let i = 0; i < maxReflections; i++) {
      const hitPoint = rayCircleIntersection(currentPos, direction);

      if (!hitPoint) {
        // Ray doesn't hit circle (shouldn't happen if starting inside)
        break;
      }

      path.push(hitPoint.clone());

      // Calculate reflection
      direction = reflectRay(hitPoint, direction);
      currentPos = hitPoint.clone();
    }

    return path;
  }

  function updateTrailLine() {
    // Remove old trail
    if (trailLine) {
      scene.remove(trailLine);
      trailLine.geometry.dispose();
    }

    if (trailPoints.length < 2) return;

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    for (const p of trailPoints) {
      positions.push(p.x, p.y, 0);
    }
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    trailLine = new THREE.Line(geometry, trailMaterial);
    scene.add(trailLine);
  }

  function drawFuturePath(path) {
    // Clear old future lines
    for (const line of futureLines) {
      scene.remove(line);
      line.geometry.dispose();
    }
    futureLines = [];

    // Draw each segment as a separate line with slight transparency
    const futureMaterial = new THREE.LineBasicMaterial({
      color: 0x446688,
      transparent: true,
      opacity: 0.4,
    });

    for (let i = 0; i < path.length - 1; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = [path[i].x, path[i].y, 0, path[i + 1].x, path[i + 1].y, 0];
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      const line = new THREE.Line(geometry, futureMaterial);
      scene.add(line);
      futureLines.push(line);
    }
  }

  function clearFuturePath() {
    for (const line of futureLines) {
      scene.remove(line);
      line.geometry.dispose();
    }
    futureLines = [];
  }

  function reset() {
    isAnimating = false;
    animationPath = [];
    currentSegmentIndex = 0;
    segmentProgress = 0;
    reflectionCount = 0;
    trailPoints = [];

    const startPos = getStartPosition();
    point.position.set(startPos.x, startPos.y, 0);

    updateTrailLine();
    clearFuturePath();
    reflectionDisplay.textContent = "Reflections: 0";
  }

  function startAnimation() {
    const startPos = getStartPosition();
    const angle = parseFloat(angleInput.value) || 45;

    // Calculate the full path
    animationPath = calculatePath(startPos, angle, 100);

    // Draw future path preview
    drawFuturePath(animationPath);

    // Reset animation state
    currentSegmentIndex = 0;
    segmentProgress = 0;
    reflectionCount = 0;
    trailPoints = [startPos.clone()];

    point.position.set(startPos.x, startPos.y, 0);
    updateTrailLine();

    isAnimating = true;
    reflectionDisplay.textContent = "Reflections: 0";
  }

  // Event listeners
  startBtn.addEventListener("click", startAnimation);
  resetBtn.addEventListener("click", reset);

  // Update preview when angle changes
  angleInput.addEventListener("input", () => {
    if (!isAnimating) {
      const startPos = getStartPosition();
      const angle = parseFloat(angleInput.value) || 45;
      const path = calculatePath(startPos, angle, 100);
      drawFuturePath(path);
    }
  });

  // Update preview when start position changes
  for (const radio of startPositionRadios) {
    radio.addEventListener("change", () => {
      reset();
      const startPos = getStartPosition();
      const angle = parseFloat(angleInput.value) || 45;
      const path = calculatePath(startPos, angle, 100);
      drawFuturePath(path);
    });
  }

  // Initial position (edge is now default)
  reset();
  const initialPath = calculatePath(getStartPosition(), parseFloat(angleInput.value) || 45, 100);
  drawFuturePath(initialPath);

  // Animation loop
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (isAnimating && animationPath.length > 1) {
      if (currentSegmentIndex < animationPath.length - 1) {
        const segmentStart = animationPath[currentSegmentIndex];
        const segmentEnd = animationPath[currentSegmentIndex + 1];
        const segmentLength = segmentStart.distanceTo(segmentEnd);

        // Move along segment
        segmentProgress += (speed * deltaTime) / segmentLength;

        if (segmentProgress >= 1) {
          // Move to next segment
          segmentProgress = 0;
          currentSegmentIndex++;
          reflectionCount++;
          reflectionDisplay.textContent = `Reflections: ${reflectionCount}`;

          // Add the reflection point to trail
          if (currentSegmentIndex < animationPath.length) {
            trailPoints.push(animationPath[currentSegmentIndex].clone());
            updateTrailLine();
          }
        }

        if (currentSegmentIndex < animationPath.length - 1) {
          // Interpolate position
          const newStart = animationPath[currentSegmentIndex];
          const newEnd = animationPath[currentSegmentIndex + 1];
          const x = newStart.x + (newEnd.x - newStart.x) * segmentProgress;
          const y = newStart.y + (newEnd.y - newStart.y) * segmentProgress;
          point.position.set(x, y, 0);

          // Update trail to current position
          const currentTrail = [...trailPoints];
          currentTrail.push(new THREE.Vector2(x, y));

          // Temporarily update trail with current position
          if (trailLine) {
            scene.remove(trailLine);
            trailLine.geometry.dispose();
          }
          const geometry = new THREE.BufferGeometry();
          const positions = [];
          for (const p of currentTrail) {
            positions.push(p.x, p.y, 0);
          }
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3)
          );
          trailLine = new THREE.Line(geometry, trailMaterial);
          scene.add(trailLine);
        }
      } else {
        // Animation complete
        isAnimating = false;
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // Handle resize
  function onWindowResize() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    const newAspect = newWidth / newHeight;

    camera.left = (frustumSize * newAspect) / -2;
    camera.right = (frustumSize * newAspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
  }

  window.addEventListener("resize", onWindowResize);
}

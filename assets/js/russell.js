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

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // --- cameras --------------------------------------------------------------
  // Two cameras, one active at a time. Perspective converges on a vanishing
  // point; isometric is an orthographic camera viewed down the (1,1,1) diagonal,
  // so parallel edges stay parallel and equal lengths stay equal -- the cube
  // lattice reads as a grid rather than receding.
  const VIEW_DISTANCE = 26;
  const ISO_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();
  const FRUSTUM_HEIGHT = 17; // world units visible top-to-bottom in isometric

  // Three subjects along x: the coil at -6, the lattice at the origin, and the
  // pyramid cube at +6. The origin is already the centre of that spread.
  const VIEW_TARGET = new THREE.Vector3(0, 0, 0);

  const aspect = () => container.clientWidth / container.clientHeight;

  const perspectiveCamera = new THREE.PerspectiveCamera(45, aspect(), 0.1, 400);
  perspectiveCamera.position.set(VIEW_TARGET.x + 4, 8, 17);

  const isoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  isoCamera.position
    .copy(ISO_DIRECTION)
    .multiplyScalar(VIEW_DISTANCE)
    .add(VIEW_TARGET);

  // Orthographic frustum is set from the viewport aspect, not baked in, so the
  // scale survives a window resize and a mode switch alike.
  function sizeIsoFrustum() {
    const halfH = FRUSTUM_HEIGHT / 2;
    const halfW = halfH * aspect();
    isoCamera.left = -halfW;
    isoCamera.right = halfW;
    isoCamera.top = halfH;
    isoCamera.bottom = -halfH;
    isoCamera.updateProjectionMatrix();
  }
  sizeIsoFrustum();

  let camera = perspectiveCamera;

  let controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(VIEW_TARGET);

  let mode = "perspective";
  const toggle = document.getElementById("russell-camera-toggle");
  const label = document.getElementById("russell-camera-label");

  // OrbitControls binds to one camera at construction, so a switch rebuilds it.
  // Disposing first detaches the old listeners; skipping that would leave every
  // previous instance handling the same pointer events.
  function setMode(next) {
    mode = next === "isometric" ? "isometric" : "perspective";
    camera = mode === "isometric" ? isoCamera : perspectiveCamera;

    if (mode === "isometric") {
      // Re-aim down the diagonal each time: orbiting in isometric is allowed,
      // so the camera may have been moved off-axis since the last switch.
      isoCamera.position
        .copy(ISO_DIRECTION)
        .multiplyScalar(VIEW_DISTANCE)
        .add(VIEW_TARGET);
      sizeIsoFrustum();
    }
    camera.lookAt(VIEW_TARGET);

    controls.dispose();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.copy(VIEW_TARGET);
    controls.update();

    // Write the label into its own span: setting textContent on the button
    // would delete the indicator dot alongside it.
    if (toggle) toggle.dataset.mode = mode;
    if (label) label.textContent = mode === "isometric" ? "Isometric" : "Perspective";
    return mode;
  }

  if (toggle) {
    toggle.addEventListener("click", () =>
      setMode(mode === "isometric" ? "perspective" : "isometric")
    );
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff2dc, 1.1);
  key.position.set(8, 12, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.4);
  fill.position.set(-8, 4, -6);
  scene.add(fill);

  // The three axes, defined once. Both the axis lines and the placement of the
  // neighbouring cubes are derived from this, so there is a single source of
  // truth for what "x", "y" and "z" mean in this scene.
  const AXES = [
    { name: "x", unit: new THREE.Vector3(1, 0, 0), color: 0xe8595a },
    { name: "y", unit: new THREE.Vector3(0, 1, 0), color: 0x5ad19a },
    { name: "z", unit: new THREE.Vector3(0, 0, 1), color: 0x5a8fe8 },
  ];

  const CUBE_SIZE = 1;

  const CUBE_COLOR = 0xe8a33d;
  const WAVE_COLOR = 0x5ad1c8;
  const NEIGHBOR_DIM_OPACITY = 0.12;

  // One geometry shared by every cube: the outline is identical for all seven,
  // so there is no reason to build it seven times. EdgesGeometry keeps the 12
  // edges of the box and drops the diagonals that a wireframe material would
  // draw across each face.
  const cubeGeometry = new THREE.EdgesGeometry(
    new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
  );

  // Two materials, though: the centre must stay lit while the neighbours fade.
  // The six neighbours share one material, so dimming them is a single property
  // write rather than a loop over meshes. transparent is set up front because
  // toggling it later forces a shader recompile.
  const cubeMaterial = new THREE.LineBasicMaterial({ color: CUBE_COLOR });
  const neighborMaterial = new THREE.LineBasicMaterial({
    color: CUBE_COLOR,
    transparent: true,
    opacity: 1,
  });

  // The waves get the same treatment: one material for the centre, one shared
  // by the neighbours so focus dims their outlines and waves together.
  const waveMaterial = new THREE.LineBasicMaterial({ color: WAVE_COLOR });
  const neighborWaveMaterial = new THREE.LineBasicMaterial({
    color: WAVE_COLOR,
    transparent: true,
    opacity: 1,
  });

  // --- S waves --------------------------------------------------------------
  // One wave per space diagonal of the centre cube: corner to opposing corner.
  // Each is an S of two quarter-circle arcs joined where their tangents align,
  // so the curve leaves one corner, bends 90 degrees, bends 90 degrees back,
  // and arrives at the antipode.
  //
  // The radius is not a free parameter. In the S's own plane the two arcs span
  // (2r, 2r) -- equal distance along and across -- so the chord sits at 45
  // degrees and has length 2r*sqrt(2). To span a diagonal of length L:
  //
  //     r = L / (2 * sqrt(2))
  //
  // For the unit cube's space diagonal (sqrt(3)) that is about 0.6124.
  const WAVE_SEGMENTS = 96;

  // The four space diagonals, named by the corner they start from. Starting at
  // the four alternating (tetrahedral) corners means the far ends land on the
  // other four, so all eight corners are touched exactly once.
  const WAVE_CORNERS = [
    [1, 1, 1],
    [-1, 1, -1],
    [1, -1, -1],
    [-1, -1, 1],
  ];

  // Build the S in its own 2D frame, where it is exact, then map into 3D:
  // arc 1 centred at (0, r) from -90 to 0 degrees, arc 2 centred at (2r, r)
  // from 180 to 90 degrees. The local frame is rotated 45 degrees so the chord
  // lands along the diagonal.
  function sWavePoints(from, to, segments) {
    const chord = new THREE.Vector3().subVectors(to, from);
    const length = chord.length();
    const along = chord.clone().normalize();

    // Any vector off the diagonal gives an in-plane perpendicular. The y axis
    // works for every diagonal here, none of which is vertical.
    let normal = new THREE.Vector3().crossVectors(along, new THREE.Vector3(0, 1, 0));
    if (normal.lengthSq() < 1e-9) {
      normal = new THREE.Vector3().crossVectors(along, new THREE.Vector3(1, 0, 0));
    }
    normal.normalize();
    const across = new THREE.Vector3().crossVectors(normal, along).normalize();

    const r = length / (2 * Math.SQRT2);
    const c = Math.SQRT1_2;
    const half = Math.ceil(segments / 2);
    const points = [];

    const push = (x, y) => {
      // Rotate the local point by -45 degrees, then place it on the diagonal.
      const u = c * x + c * y;
      const v = -c * x + c * y;
      points.push(
        from.clone().addScaledVector(along, u).addScaledVector(across, v)
      );
    };

    for (let i = 0; i <= half; i++) {
      const a = -Math.PI / 2 + (i / half) * (Math.PI / 2);
      push(r * Math.cos(a), r + r * Math.sin(a));
    }
    for (let i = 1; i <= half; i++) {
      const a = Math.PI - (i / half) * (Math.PI / 2);
      push(2 * r + r * Math.cos(a), r + r * Math.sin(a));
    }
    return points;
  }

  // --- the cube unit --------------------------------------------------------
  // A cube is its outline plus its four diagonal waves, together. Building that
  // once and instantiating it seven times keeps the centre and its neighbours
  // genuinely identical -- there is no separate notion of "the cube with the
  // waves on it".
  //
  // The wave geometries, like the outline geometry, are computed once and
  // shared: every cube is the same size, so the curves are the same curves.
  const waveGeometries = WAVE_CORNERS.map((corner) => {
    const from = new THREE.Vector3(...corner).multiplyScalar(CUBE_SIZE / 2);
    const to = from.clone().negate(); // the opposing corner
    return new THREE.BufferGeometry().setFromPoints(
      sWavePoints(from, to, WAVE_SEGMENTS)
    );
  });

  // --- coil prototype -------------------------------------------------------
  // Walter Russell's wave cycle: the diagonal is the "dynameter" along which a
  // wave compresses to a point and expands again. Each S already passes exactly
  // through the cube's centre at its midpoint, which is Russell's zero -- the
  // still point where compression and expansion balance.
  //
  // The coil winds helically around the S. Its radius is driven by distance
  // from that midpoint, so the spiral pulls tight to nothing at the centre and
  // opens out towards the corners, and the winding runs faster where it is
  // tight. Animating the phase makes the coil travel along the diagonal.
  const COIL_SEGMENTS = 600;
  const COIL_TURNS = 9;
  const COIL_MAX_RADIUS = 0.17;
  const COIL_ORIGIN = new THREE.Vector3(-6, 0, 0);
  const COIL_SPEED = 0.6;

  // Sample the S densely, then carry a rotation-minimising frame along it so
  // the coil does not twist arbitrarily where the curve bends. A naive
  // Frenet frame flips at inflection points; the S has one by construction.
  function coilFrames(points) {
    const tangents = points.map((p, i) => {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      return new THREE.Vector3().subVectors(next, prev).normalize();
    });

    // Seed a normal perpendicular to the first tangent, then parallel-transport
    // it: rotate by the same rotation that carries each tangent to the next.
    let normal = new THREE.Vector3(0, 1, 0);
    if (Math.abs(normal.dot(tangents[0])) > 0.9) normal.set(1, 0, 0);
    normal.cross(tangents[0]).normalize();

    const q = new THREE.Quaternion();
    return tangents.map((t, i) => {
      if (i > 0) {
        q.setFromUnitVectors(tangents[i - 1], t);
        normal.applyQuaternion(q).normalize();
      }
      const binormal = new THREE.Vector3().crossVectors(t, normal).normalize();
      return { normal: normal.clone(), binormal };
    });
  }

  // The spine is the S itself, sampled finely enough for a smooth coil.
  const coilSpines = WAVE_CORNERS.map((corner) => {
    const from = new THREE.Vector3(...corner).multiplyScalar(CUBE_SIZE / 2);
    return sWavePoints(from, from.clone().negate(), COIL_SEGMENTS);
  });
  const coilFrameSets = coilSpines.map(coilFrames);

  const coilMaterial = new THREE.LineBasicMaterial({ color: 0xe8595a });
  const coilCenterMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });

  const coils = new THREE.Group();
  coils.position.copy(COIL_ORIGIN);

  // The bare S, drawn faintly underneath, so the coil's spine stays legible.
  for (const spine of coilSpines) {
    coils.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(spine),
        coilCenterMaterial
      )
    );
  }

  // One coil per diagonal. Positions are rewritten every frame, so the
  // geometry is allocated once with a dynamic attribute.
  const coilLines = coilSpines.map((spine) => {
    const geometry = new THREE.BufferGeometry();
    const array = new Float32Array(spine.length * 3);
    const attribute = new THREE.BufferAttribute(array, 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", attribute);
    const line = new THREE.Line(geometry, coilMaterial);
    line.frustumCulled = false; // positions change; the initial bounds would lie
    coils.add(line);
    return line;
  });

  // Rebuild every coil for a given phase. Kept as a function of time alone so
  // the animation has no accumulated state to drift.
  const coilPoint = new THREE.Vector3();
  function updateCoils(time) {
    coilSpines.forEach((spine, w) => {
      const frames = coilFrameSets[w];
      const attribute = coilLines[w].geometry.attributes.position;
      const mid = (spine.length - 1) / 2;

      for (let i = 0; i < spine.length; i++) {
        // u is -1 at one corner, 0 at the cube's centre, +1 at the other.
        const u = (i - mid) / mid;

        // Amplitude vanishes at the centre and swells towards the corners.
        const radius = COIL_MAX_RADIUS * Math.sin(Math.abs(u) * Math.PI * 0.5);

        // Winding accelerates near the centre: phase advances with u^(1/3),
        // which is steepest at zero, so turns bunch where the coil is tight.
        const wind = Math.sign(u) * Math.pow(Math.abs(u), 1 / 3);
        const angle = wind * COIL_TURNS * Math.PI + time * COIL_SPEED;

        const { normal, binormal } = frames[i];
        coilPoint
          .copy(spine[i])
          .addScaledVector(normal, Math.cos(angle) * radius)
          .addScaledVector(binormal, Math.sin(angle) * radius);

        attribute.setXYZ(i, coilPoint.x, coilPoint.y, coilPoint.z);
      }
      attribute.needsUpdate = true;
    });
  }

  // The same cube outline around the coil, so it reads as the same cube seen a
  // third way: lattice, decomposed into pyramids, and resolved into its waves.
  coils.add(new THREE.LineSegments(cubeGeometry, coilCenterMaterial));

  updateCoils(0);
  scene.add(coils);

  // Animation runs by default; the toggle freezes it for inspection.
  let coilRunning = true;
  const coilToggle = document.getElementById("russell-coil-toggle");
  const coilLabel = document.getElementById("russell-coil-label");

  function setCoilRunning(next) {
    coilRunning = Boolean(next);
    if (coilToggle) coilToggle.dataset.running = String(coilRunning);
    if (coilLabel) coilLabel.textContent = coilRunning ? "Coil running" : "Coil paused";
    return coilRunning;
  }
  setCoilRunning(true);

  if (coilToggle) {
    coilToggle.addEventListener("click", () => setCoilRunning(!coilRunning));
  }

  // Each cube gets an outline material and a wave material. They are passed in
  // rather than looked up, so the centre can stay lit while the neighbours
  // share a dimmable pair.
  function createCube(position, { edgeMaterial, waveMaterial }) {
    const group = new THREE.Group();
    group.position.copy(position);

    const outline = new THREE.LineSegments(cubeGeometry, edgeMaterial);
    group.add(outline);

    const waves = new THREE.Group();
    for (const geometry of waveGeometries) {
      waves.add(new THREE.Line(geometry, waveMaterial));
    }
    group.add(waves);

    group.userData = { outline, waves };
    scene.add(group);
    return group;
  }

  // The centre cube, then one neighbour along each axis in both directions:
  // right/left, above/below, front/back. Offsetting by exactly CUBE_SIZE puts
  // each neighbour face-to-face with the centre.
  const cube = createCube(new THREE.Vector3(0, 0, 0), {
    edgeMaterial: cubeMaterial,
    waveMaterial: waveMaterial,
  });

  const neighbors = AXES.flatMap(({ unit }) =>
    [1, -1].map((sign) =>
      createCube(unit.clone().multiplyScalar(sign * CUBE_SIZE), {
        edgeMaterial: neighborMaterial,
        waveMaterial: neighborWaveMaterial,
      })
    )
  );

  // --- pyramid cube ---------------------------------------------------------
  // The same cube, decomposed. Six square pyramids, each with one cube face as
  // its base and the cube's centre as its apex, fill the volume exactly: six
  // faces, six pyramids, no overlap and no gap. Each is nudged out along its
  // own face normal so the assembly reads as six separate pieces.
  const PYRAMID_ORIGIN = new THREE.Vector3(6, 0, 0);
  const PYRAMID_CUBE_SIZE = 2;
  const PYRAMID_EXPLODE = 0.28;

  // One hue per pyramid, so opposing pairs are distinguishable.
  const PYRAMID_COLORS = [0xe8a33d, 0xe8595a, 0x5ad19a, 0x5a8fe8, 0xc98ce8, 0x5ad1c8];

  const pyramids = new THREE.Group();
  pyramids.position.copy(PYRAMID_ORIGIN);

  // A face is identified by its outward normal. Its four base corners are the
  // normal pushed out to the face, offset by +/- half a side along the two
  // axes that are not the normal -- so the corners are derived from AXES
  // rather than written out by hand.
  const faces = AXES.flatMap(({ unit }) =>
    [1, -1].map((sign) => unit.clone().multiplyScalar(sign))
  );

  faces.forEach((normal, i) => {
    const h = PYRAMID_CUBE_SIZE / 2;
    // The two in-plane axes for this face.
    const tangents = AXES.map(({ unit }) => unit).filter(
      (u) => Math.abs(u.dot(normal)) < 0.5
    );

    const centerOfFace = normal.clone().multiplyScalar(h);
    const base = [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-1, 1],
    ].map(([a, b]) =>
      centerOfFace
        .clone()
        .addScaledVector(tangents[0], a * h)
        .addScaledVector(tangents[1], b * h)
    );
    const apex = new THREE.Vector3(0, 0, 0);

    // Order the base corners counter-clockwise as seen from outside the face,
    // so every triangle below can be wound consistently without special cases.
    // tangents[0] x tangents[1] may point either way; flip if it points in.
    if (new THREE.Vector3().crossVectors(tangents[0], tangents[1]).dot(normal) < 0) {
      base.reverse();
    }

    // Four triangular sides (base edge + apex), then the square base as two
    // triangles wound the opposite way, since the base faces outward while the
    // sides face away from the pyramid's interior.
    const tris = [];
    for (let k = 0; k < 4; k++) {
      tris.push([base[k], base[(k + 1) % 4], apex]);
    }
    tris.push([base[0], base[2], base[1]]);
    tris.push([base[0], base[3], base[2]]);

    const positions = [];
    for (const tri of tris) {
      for (const v of tri) positions.push(v.x, v.y, v.z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: PYRAMID_COLORS[i % PYRAMID_COLORS.length],
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      })
    );
    // Push each piece out along its own normal to open the seams.
    mesh.position.copy(normal).multiplyScalar(PYRAMID_EXPLODE);
    pyramids.add(mesh);
  });

  scene.add(pyramids);

  // --- focus ----------------------------------------------------------------
  // Fading the six neighbours down leaves the centre cube as the only bright
  // object, without removing the lattice that gives it context.
  let focused = false;
  const focusToggle = document.getElementById("russell-focus-toggle");
  const focusLabel = document.getElementById("russell-focus-label");

  function setFocus(next) {
    focused = Boolean(next);
    const opacity = focused ? NEIGHBOR_DIM_OPACITY : 1;
    neighborMaterial.opacity = opacity;
    neighborWaveMaterial.opacity = opacity;
    if (focusToggle) focusToggle.dataset.focused = String(focused);
    if (focusLabel) focusLabel.textContent = focused ? "Focused" : "All cubes";
    return focused;
  }

  if (focusToggle) {
    focusToggle.addEventListener("click", () => setFocus(!focused));
  }

  // Each axis is a full line of length AXIS_LENGTH centered on the origin, so
  // it runs -5..+5 and extends 4 past the outer cubes' far faces (which sit at
  // +/-1.5). AxesHelper is no use here: it draws only the positive arms.
  const AXIS_LENGTH = 10;
  const h = AXIS_LENGTH / 2;
  const axes = new THREE.Group();

  for (const { unit, color } of AXES) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      unit.clone().multiplyScalar(-h),
      unit.clone().multiplyScalar(h),
    ]);
    axes.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color })));
  }

  scene.add(axes);

  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    if (coilRunning) updateCoils(clock.getElapsedTime());
    controls.update();
    renderer.render(scene, camera);
  }
  frame();

  // Both cameras are resized, not just the active one, so the inactive camera
  // is already correct when it is switched to. Perspective takes an aspect
  // ratio; orthographic takes an explicit frustum.
  window.addEventListener("resize", () => {
    perspectiveCamera.aspect = aspect();
    perspectiveCamera.updateProjectionMatrix();
    sizeIsoFrustum();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return {
    scene,
    renderer,
    cube,
    neighbors,
    axes,
    pyramids,
    coils,
    setCoilRunning,
    get coilRunning() { return coilRunning; },
    setMode,
    setFocus,
    get focused() { return focused; },
    get camera() { return camera; },
    get controls() { return controls; },
    get mode() { return mode; },
  };
}

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
  const COIL_COLOR = 0xe8595a;      // cathode -- compressing
  const COIL_ANODE_COLOR = 0x5a8fe8; // anode -- expanding
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

  // Coils get the same centre/neighbour pair, so focus dims them too. Each
  // phase has its own colour: the cathode wave compressing, its anode
  // counterpart expanding.
  const coilMaterials = [
    new THREE.LineBasicMaterial({ color: COIL_COLOR }),
    new THREE.LineBasicMaterial({ color: COIL_ANODE_COLOR }),
  ];
  const neighborCoilMaterials = [
    new THREE.LineBasicMaterial({ color: COIL_COLOR, transparent: true, opacity: 1 }),
    new THREE.LineBasicMaterial({ color: COIL_ANODE_COLOR, transparent: true, opacity: 1 }),
  ];

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
  // flip mirrors the S through its own diagonal: the counterpart leaves the
  // corner bending the other way (down where the first goes up), crosses at
  // the centre and still lands on the opposing corner. The pair encloses a
  // lens, and both pass through the cube's centre.
  function sWavePoints(from, to, segments, flip = false) {
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
    if (flip) across.negate();

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
  // Two S waves per diagonal: one bending each way out of the corner. Eight
  // curves over the four diagonals, every one of them through the centre.
  const waveGeometries = WAVE_CORNERS.flatMap((corner) => {
    const from = new THREE.Vector3(...corner).multiplyScalar(CUBE_SIZE / 2);
    const to = from.clone().negate(); // the opposing corner
    return [false, true].map(
      (flip) =>
        new THREE.BufferGeometry().setFromPoints(
          sWavePoints(from, to, WAVE_SEGMENTS, flip)
        )
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
  // Sampling has to outrun the winding: at the top of the turns range the
  // helix needs enough points per revolution to stay smooth rather than
  // degenerating into a polygon.
  const COIL_SEGMENTS = 2000;

  // The coil's qualities, live rather than fixed. Each is a distinct property
  // of the wave, so each can be varied on its own:
  //
  //   turns    how many times the helix circles the S
  //   radius   how far it stands off the spine at its widest
  //   taper    radius profile from centre to corner. 1 is a sine swell;
  //            below 1 the coil fattens early, above 1 it stays pinched
  //            longer. The radius is always exactly zero at the centre.
  //   bunching how turns distribute. 1 spaces them evenly; below 1 crowds
  //            them towards the centre, which is the compressed look in
  //            Russell's chart.
  // Cathode and anode each carry their own set, so the two waves of a pair can
  // be shaped independently -- one tightly wound and slim, the other open and
  // broad, as Russell's compressing and expanding waves differ.
  const coilParams = {
    cathode: { turns: 9, radius: 0.17, taper: 1, bunching: 1 / 3, speed: 0.6 },
    anode: { turns: 9, radius: 0.17, taper: 1, bunching: 1 / 3, speed: 0.6 },
  };
  const COIL_ORIGIN = new THREE.Vector3(-6, 0, 0);
  // Speed lives per phase (below), so the pair can travel at different rates.

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
  const coilSpines = WAVE_CORNERS.flatMap((corner) => {
    const from = new THREE.Vector3(...corner).multiplyScalar(CUBE_SIZE / 2);
    const to = from.clone().negate();
    return [false, true].map((flip) =>
      sWavePoints(from, to, COIL_SEGMENTS, flip)
    );
  });
  const coilFrameSets = coilSpines.map(coilFrames);

  const coilCenterMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
  });

  // Each diagonal carries a PAIR of coils in counter-phase: Russell's cathode
  // wave compressing towards the centre while its anode counterpart expands
  // away from it, the two balanced at the zero point between them. The pair
  // traces the same path, so they are distinguished only by motion -- frozen,
  // they would sit on top of each other.
  const COIL_PHASES = [
    { key: "cathode", direction: 1 },
    { key: "anode", direction: -1 },
  ];

  // The coil is identical in every cube's local space -- same size, same
  // diagonals -- so all seven cubes share ONE set of geometries per phase,
  // animated once per frame. Each cube's Group transform places its copy.
  // Seven cubes drawing the same eight buffers costs eight buffer updates,
  // not fifty-six.
  const coilGeometries = COIL_PHASES.map(() =>
    coilSpines.map((spine) => {
      const geometry = new THREE.BufferGeometry();
      const attribute = new THREE.BufferAttribute(new Float32Array(spine.length * 3), 3);
      attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute("position", attribute);
      return geometry;
    })
  );

  // Faint spine geometries, also shared. One per diagonal: the pair share a path.
  const coilSpineGeometries = coilSpines.map((spine) =>
    new THREE.BufferGeometry().setFromPoints(spine)
  );

  // Build one cube's worth of coil lines, reusing the shared geometries.
  // materials[0] is the cathode (compressing), materials[1] the anode.
  function createCoilGroup({ coilMats, spineMat }) {
    const group = new THREE.Group();

    const spines = new THREE.Group();
    for (const geometry of coilSpineGeometries) {
      spines.add(new THREE.Line(geometry, spineMat));
    }
    group.add(spines);

    // Each phase lives in its own sub-group, so showing or hiding cathode and
    // anode is one flag each rather than index arithmetic over the children.
    const phases = COIL_PHASES.map(({ key }, phase) => {
      const phaseGroup = new THREE.Group();
      phaseGroup.name = key;
      for (const geometry of coilGeometries[phase]) {
        const line = new THREE.Line(geometry, coilMats[phase]);
        line.frustumCulled = false; // positions change; initial bounds would lie
        phaseGroup.add(line);
      }
      group.add(phaseGroup);
      return phaseGroup;
    });

    group.userData = { spines, phases };
    return group;
  }

  // Rebuild every coil for a given phase. Kept as a function of time alone so
  // the animation has no accumulated state to drift.
  const coilPoint = new THREE.Vector3();
  const lerpAxis = new THREE.Vector3();
  const lerpAxis2 = new THREE.Vector3();
  let lastCoilTime = 0;

  // Each phase carries its own accumulated travel rather than multiplying the
  // clock by speed at the point of use. Accumulating means a speed change
  // alters the rate from here on; multiplying would rewrite all of history and
  // make the coil jump to a new phase the instant the slider moved.
  const coilPhaseTime = COIL_PHASES.map(() => 0);

  function updateCoils(time) {
    const dt = Math.max(0, Math.min(0.1, time - lastCoilTime));
    COIL_PHASES.forEach(({ key }, phase) => {
      coilPhaseTime[phase] += dt * coilParams[key].speed;
    });
    lastCoilTime = time;
    COIL_PHASES.forEach(({ direction, key }, phase) => {
      const params = coilParams[key];
      coilSpines.forEach((spine, w) => {
        const frames = coilFrameSets[w];
        const attribute = coilGeometries[phase][w].attributes.position;
        const mid = (spine.length - 1) / 2;

        for (let i = 0; i < spine.length; i++) {
          // Samples are placed where the turns are, not spread evenly along
          // the diagonal. Low bunching crowds the winding into the centre, so
          // a uniform walk would spend most of its points on the sparse outer
          // stretch and facet badly through the dense middle. Warping the
          // sample parameter by the same exponent that drives the winding puts
          // roughly constant turns between consecutive samples.
          const even = (i - mid) / mid; // -1 .. +1, uniform
          const u =
            Math.sign(even) * Math.pow(Math.abs(even), 1 / params.bunching);

          // Position and frame are interpolated between the spine's own
          // uniformly spaced points, since u no longer lands on one.
          const f = (u + 1) * mid;
          const i0 = Math.max(0, Math.min(spine.length - 1, Math.floor(f)));
          const i1 = Math.min(spine.length - 1, i0 + 1);
          const frac = f - i0;

          // Amplitude vanishes at the centre and swells towards the corners.
          const radius =
            params.radius *
            Math.pow(Math.sin(Math.abs(u) * Math.PI * 0.5), params.taper);

          // Winding accelerates near the centre: phase advances with u^(1/3),
          // which is steepest at zero, so turns bunch where the coil is tight.
          const wind =
            Math.sign(u) * Math.pow(Math.abs(u), params.bunching);

          // The counterpart runs the phase term the other way, so one coil's
          // turns travel towards the centre while the other's travel out.
          // Both meet at u = 0, where the radius is zero and the two coincide:
          // Russell's balanced interchange point.
          const angle =
            wind * params.turns * Math.PI + direction * coilPhaseTime[phase];

          const { normal, binormal } = frames[i0];
          const n1 = frames[i1];
          coilPoint
            .copy(spine[i0])
            .lerp(spine[i1], frac)
            .addScaledVector(
              lerpAxis.copy(normal).lerp(n1.normal, frac).normalize(),
              Math.cos(angle) * radius
            )
            .addScaledVector(
              lerpAxis2.copy(binormal).lerp(n1.binormal, frac).normalize(),
              Math.sin(angle) * radius
            );

          attribute.setXYZ(i, coilPoint.x, coilPoint.y, coilPoint.z);
        }
        attribute.needsUpdate = true;
      });
    });
  }

  // The standalone prototype at COIL_ORIGIN: the same cube seen a third way --
  // lattice, decomposed into pyramids, and resolved into its coiled waves.
  const coils = createCoilGroup({
    coilMats: coilMaterials,
    spineMat: coilCenterMaterial,
  });
  coils.position.copy(COIL_ORIGIN);
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
  function createCube(position, { edgeMaterial, waveMaterial, coilMats }) {
    const group = new THREE.Group();
    group.position.copy(position);

    const outline = new THREE.LineSegments(cubeGeometry, edgeMaterial);
    group.add(outline);

    const waves = new THREE.Group();
    for (const geometry of waveGeometries) {
      waves.add(new THREE.Line(geometry, waveMaterial));
    }
    group.add(waves);

    // Every cube can show its waves coiled. Hidden until switched on, so the
    // lattice stays readable by default; the geometries are shared, so an
    // unused coil group costs nothing to keep around.
    const coil = createCoilGroup({ coilMats, spineMat: waveMaterial });
    coil.visible = false;
    group.add(coil);

    group.userData = { outline, waves, coil };
    scene.add(group);
    return group;
  }

  // The centre cube, then one neighbour along each axis in both directions:
  // right/left, above/below, front/back. Offsetting by exactly CUBE_SIZE puts
  // each neighbour face-to-face with the centre.
  const cube = createCube(new THREE.Vector3(0, 0, 0), {
    edgeMaterial: cubeMaterial,
    waveMaterial: waveMaterial,
    coilMats: coilMaterials,
  });

  const neighbors = AXES.flatMap(({ unit }) =>
    [1, -1].map((sign) =>
      createCube(unit.clone().multiplyScalar(sign * CUBE_SIZE), {
        edgeMaterial: neighborMaterial,
        waveMaterial: neighborWaveMaterial,
        coilMats: neighborCoilMaterials,
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
    for (const m of neighborCoilMaterials) m.opacity = opacity;
    if (focusToggle) focusToggle.dataset.focused = String(focused);
    if (focusLabel) focusLabel.textContent = focused ? "Focused" : "All cubes";
    return focused;
  }

  if (focusToggle) {
    focusToggle.addEventListener("click", () => setFocus(!focused));
  }

  // --- coils on the lattice -------------------------------------------------
  // Show the coiled form on all seven cubes. The plain S waves are swapped out
  // when coils come on, so the two readings of the same diagonal do not fight
  // for the same space.
  const allCubes = [cube, ...neighbors];
  let latticeCoiled = false;
  const latticeCoilToggle = document.getElementById("russell-lattice-coil-toggle");
  const latticeCoilLabel = document.getElementById("russell-lattice-coil-label");

  function setLatticeCoiled(next) {
    latticeCoiled = Boolean(next);
    for (const c of allCubes) {
      c.userData.coil.visible = latticeCoiled;
      c.userData.waves.visible = !latticeCoiled;
    }
    if (latticeCoilToggle) latticeCoilToggle.dataset.coiled = String(latticeCoiled);
    if (latticeCoilLabel) {
      latticeCoilLabel.textContent = latticeCoiled ? "Coiled waves" : "Plain waves";
    }
    return latticeCoiled;
  }
  setLatticeCoiled(false);

  if (latticeCoilToggle) {
    latticeCoilToggle.addEventListener("click", () => setLatticeCoiled(!latticeCoiled));
  }

  // --- coil phases ----------------------------------------------------------
  // Cathode and anode can be shown independently: both, either alone, or
  // neither. Every cube's coil group plus the standalone prototype carry the
  // same two phase sub-groups, so one flag per phase covers all of them.
  const allCoilGroups = [
    ...allCubes.map((c) => c.userData.coil),
    coils,
  ];

  const phaseVisible = COIL_PHASES.map(() => true);

  function setPhaseVisible(phase, next) {
    phaseVisible[phase] = Boolean(next);
    for (const group of allCoilGroups) {
      group.userData.phases[phase].visible = phaseVisible[phase];
    }
    const { key } = COIL_PHASES[phase];
    const button = document.getElementById(`russell-${key}-toggle`);
    const labelEl = document.getElementById(`russell-${key}-label`);
    if (button) button.dataset.on = String(phaseVisible[phase]);
    if (labelEl) {
      labelEl.textContent = key === "cathode" ? "Cathode" : "Anode";
    }
    return phaseVisible[phase];
  }

  // Changing a quality redraws at the current phase, so edits are visible
  // even while the animation is paused.
  // Describe bunching in plain terms rather than as an exponent: below 1 the
  // turns crowd into the centre, above 1 they spread out to the corners.
  function bunchingLabel(b) {
    return b < 0.95 ? "centre" : b > 1.05 ? "corners" : "even";
  }

  // patch applies to one phase ("cathode" / "anode"), or to both when no
  // phase is named.
  function setCoilParams(patch, phaseKey = null) {
    const keys = phaseKey ? [phaseKey] : COIL_PHASES.map((p) => p.key);
    for (const k of keys) Object.assign(coilParams[k], patch);
    updateCoils(lastCoilTime);

    for (const k of COIL_PHASES.map((p) => p.key)) {
      const set = coilParams[k];
      const turnsValue = document.getElementById(`russell-${k}-turns-value`);
      if (turnsValue) turnsValue.textContent = set.turns.toFixed(0);
      const radiusValue = document.getElementById(`russell-${k}-radius-value`);
      if (radiusValue) radiusValue.textContent = set.radius.toFixed(2);
      const bunchingValue = document.getElementById(`russell-${k}-bunching-value`);
      if (bunchingValue) bunchingValue.textContent = bunchingLabel(set.bunching);
    }
    return { ...coilParams };
  }

  // One slider per quality per phase, wired by naming convention.
  for (const { key } of COIL_PHASES) {
    for (const quality of ["turns", "radius", "bunching"]) {
      const slider = document.getElementById(`russell-${key}-${quality}`);
      if (!slider) continue;
      slider.value = String(coilParams[key][quality]);
      slider.addEventListener("input", (e) =>
        setCoilParams({ [quality]: Number(e.target.value) }, key)
      );
    }
  }
  setCoilParams({});

  COIL_PHASES.forEach(({ key }, phase) => {
    setPhaseVisible(phase, true);
    const button = document.getElementById(`russell-${key}-toggle`);
    if (button) {
      button.addEventListener("click", () =>
        setPhaseVisible(phase, !phaseVisible[phase])
      );
    }
  });

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
    setLatticeCoiled,
    get latticeCoiled() { return latticeCoiled; },
    setPhaseVisible,
    get phaseVisible() { return [...phaseVisible]; },
    coilParams,
    setCoilParams,
    get coilRunning() { return coilRunning; },
    setMode,
    setFocus,
    get focused() { return focused; },
    get camera() { return camera; },
    get controls() { return controls; },
    get mode() { return mode; },
  };
}

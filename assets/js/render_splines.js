import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function renderSplines(selector, data) {
  let container;
  let camera, scene, renderer;

  const splineHelperObjects = [];
  let splinePointsLength = 4;

  const positions = []; // Nodes
  const point = new THREE.Vector3();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const onUpPosition = new THREE.Vector2();
  const onDownPosition = new THREE.Vector2();

  const geometry = new THREE.BoxGeometry(50, 50, 20);
  let transformControl;
  let orbitControl;

  const ARC_SEGMENTS = 200;

  const splines = {};

  const params = {
    uniform: true,
    tension: 0.5,
    centripetal: true,
    chordal: true,
    addPoint: addPoint,
    addPoint2: addPoint2,
    removePoint: removePoint,
    exportSpline: exportSpline,
  };

  function init() {
    // Get the html element to draw the three.js canvas in
    container = document.getElementById("graph");

    // Create a new three.js scene with a background color
    function drawScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
    }

    //
    // Library Functions
    //

    function addCamera() {
      // Create a camera and set its position
      // Then add it to the scene
      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        1,
        10000
      );

      // Wardley Map Camera position
      camera.position.set(2500, 2550, 9000);

      scene.add(camera);
    }

    function addLight() {
      scene.add(new THREE.AmbientLight(0xf0f0f0, 3));
      // const light = new THREE.SpotLight(0xffffff, 4.5);
      const light = new THREE.SpotLight(0x99ffff, 4.5);
      light.position.set(0, 500, 200);
      light.angle = Math.PI * 0.2;
      light.decay = 0;
      light.castShadow = true;
      light.shadow.camera.near = 200;
      light.shadow.camera.far = 2000;
      light.shadow.bias = -0.000222;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      scene.add(light);
      return light;
    }

    function drawBasePlane() {
      const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
      planeGeometry.rotateX(-Math.PI / 2);
      const planeMaterial = new THREE.ShadowMaterial({
        color: 0x000000,
        opacity: 0.2,
      });

      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.position.y = -200;
      plane.receiveShadow = true;
      scene.add(plane);
      return plane;
    }

    function drawGridHelper() {
      const gridHelper = new THREE.GridHelper(4000, 100);
      gridHelper.position.x = 2500;
      gridHelper.material.opacity = 0.25;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);
      return gridHelper;
    }

    function addRendererToScene() {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.useLegacyLights = false;
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);
      return renderer;
    }

    function addGUI() {
      const gui = new GUI();

      gui.add(params, "uniform").onChange(render);
      gui
        .add(params, "tension", 0, 1)
        .step(0.01)
        .onChange(function (value) {
          splines.uniform.tension = value;
          updateSplineOutline();
          render();
        });
      gui.add(params, "centripetal").onChange(render);
      gui.add(params, "chordal").onChange(render);
      gui.add(params, "addPoint");
      gui.add(params, "addPoint2");
      gui.add(params, "removePoint");
      gui.add(params, "exportSpline");
      gui.open();
    }

    function drawOrbitControls() {
      const control = new OrbitControls(camera, renderer.domElement);
      control.damping = 0.2;
      control.addEventListener("change", render);
      return control;
    }

    function drawTransformControls() {
      let transformControl = new TransformControls(camera, renderer.domElement);
      transformControl.addEventListener("change", render);
      transformControl.addEventListener("dragging-changed", function (event) {
        orbitControl.enabled = !event.value;
      });
      transformControl.addEventListener("objectChange", function (event) {
        let objectPosition = transformControl.object.position;

        const tControl = transformControl.object.theatreControl;
        if (tControl) {
          const key = tControl.address.objectKey;
          if (key) {
            transformControl.object.theatreControl.sheet.object(
              key,
              {
                position: {
                  x: objectPosition.x,
                  y: objectPosition.y,
                  z: objectPosition.z,
                },
              },
              {
                reconfigure: true,
              }
            );
          }
          updateSplineOutline();
          render();
        }
      });
      scene.add(transformControl);

      transformControl.addEventListener("objectChange", function () {
        updateSplineOutline();
      });

      return transformControl;
    }

    // ========================================================================
    //
    // Just about all Three.js projects need these elements:

    drawScene();
    // Draw a flat plane with a grid on it, as a starting layout
    drawBasePlane();
    drawGridHelper();

    // Add a light source and a camera object, to see the 3d project
    addLight();
    addCamera();

    // Add the three.js renderer to the HTML DOM
    addRendererToScene();

    // three.js Controls
    orbitControl = drawOrbitControls();
    transformControl = drawTransformControls();

    // Add behaviors to `document` and `window`
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", onWindowResize);

    //
    // ========================================================================

    // *** Curves ***
    // Arguments:
    // splinePointsLength (currently a global var)
    // positions          (currently a global var)
    function drawCurves() {
      for (let i = 0; i < splinePointsLength; i++) {
        addSplineObject(positions[i]);
      }

      positions.length = 0;

      for (let i = 0; i < splinePointsLength; i++) {
        positions.push(splineHelperObjects[i].position);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(ARC_SEGMENTS * 3), 3)
      );

      let curve = new THREE.CatmullRomCurve3(positions);
      curve.curveType = "catmullrom";
      curve.mesh = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({
          color: 0xff0000,
          opacity: 0.35,
        })
      );
      curve.mesh.castShadow = true;
      splines.uniform = curve;

      curve = new THREE.CatmullRomCurve3(positions);
      curve.curveType = "centripetal";
      curve.mesh = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({
          color: 0x00ff00,
          opacity: 0.35,
        })
      );
      curve.mesh.castShadow = true;
      splines.centripetal = curve;

      curve = new THREE.CatmullRomCurve3(positions);
      curve.curveType = "chordal";
      curve.mesh = new THREE.Line(
        geometry.clone(),
        new THREE.LineBasicMaterial({
          color: 0x0000ff,
          opacity: 0.35,
        })
      );
      curve.mesh.castShadow = true;
      splines.chordal = curve;

      for (const k in splines) {
        const spline = splines[k];
        scene.add(spline.mesh);
      }
    }

    drawCurves();
    // camera.lookAt(-2500, 10000, 10000);
    camera.lookAt(2500, 1550, 7000);

    // Create the node objects
    let nodes = [];
    for (let i = 0; i < data.nodes.length; i++) {
      var node = data.nodes[i];
      // debugger
      // var x = node.wardley_x || parseInt(Math.floor(Math.random() * 1000) - 500);
      // var x = node.wardley_x || Math.random();

      // var y = parseInt(Math.floor(Math.random() * 1000));

      // Wardley Layout
      var x = node.wardley_x ? node.wardley_x * 50 : Math.random() * 5000;
      var y = node.wardley_y ? node.wardley_y * 31 : Math.random() * 3100;
      var z = 100 * Math.random();
      // var z = node.wardley_y ? node.wardley_y * 50 : 50;

      let vector = new THREE.Vector3(x, y, z);
      nodes.push(vector);
    }

    // Load them / draw them
    load(nodes);
  }


  function addSplineObject(position) {
    const material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff,
    });
    const object = new THREE.Mesh(geometry, material);

    object.castShadow = true;
    object.receiveShadow = true;
    scene.add(object);
    splineHelperObjects.push(object);
    return object;
  }

  function addPoint() {
    splinePointsLength++;

    var mesh = addSplineObject();
    positions.push(mesh.position);

    updateSplineOutline();
    return mesh;
  }

  function addPoint2() {
    splinePointsLength++;
    const mesh = addSplineObject();
    positions.push(mesh.position);
    updateSplineOutline();
    return mesh;
  }

  function removePoint() {
    if (splinePointsLength <= 4) {
      return;
    }

    const point = splineHelperObjects.pop();
    splinePointsLength--;
    positions.pop();

    if (transformControl.object === point) transformControl.detach();
    scene.remove(point);

    updateSplineOutline();

    render();
  }

  function updateSplineOutline() {
    for (const k in splines) {
      const spline = splines[k];

      const splineMesh = spline.mesh;
      const position = splineMesh.geometry.attributes.position;

      for (let i = 0; i < ARC_SEGMENTS; i++) {
        const t = i / (ARC_SEGMENTS - 1);
        spline.getPoint(t, point);
        position.setXYZ(i, point.x, point.y, point.z);
      }

      position.needsUpdate = true;
    }
  }

  function exportSpline() {
    const strplace = [];

    for (let i = 0; i < splinePointsLength; i++) {
      const p = splineHelperObjects[i].position;
      strplace.push(`new THREE.Vector3(${p.x}, ${p.y}, ${p.z})`);
    }

    console.log(strplace.join(",\n"));
    const code = "[" + strplace.join(",\n\t") + "]";
    prompt("copy and paste code", code);
  }

  function load(nodes) {
    for (var i = 0; nodes.length > i; i++) {
      var currentNode = nodes[i];

      // Draw a node
      const mesh = addPoint2(currentNode);
      mesh.position.setX(currentNode.x);
      mesh.position.setY(currentNode.y);
      mesh.position.setZ(currentNode.z);
      // console.log("addingPoint", mesh.position)

      function drawTheatreControl() {
        const theatreControl = sheet.object(`Nodes/node-${currentNode.x}`, {
          position: types.compound({
            x: types.number(mesh.position.x),
            y: types.number(mesh.position.y),
            z: types.number(mesh.position.z),
          }),
        });

        theatreControl.onValuesChange((values) => {
          const { x, y, z } = values.position;
          mesh.position.set(x, y, z);
          // mesh.rotation.set(x, y, z);
          debugger;
          updateSplineOutline();
          render();
        });
        return theatreControl;
      }

      let theatreControl = drawTheatreControl();
      // ensure the mesh object has a way to lookup its corresponding theatre.js sheet
      mesh.theatreControl = theatreControl;
    }

    while (nodes.length < positions.length) {
      removePoint();
    }

    for (let i = 0; i < positions.length; i++) {
      positions[i].copy(nodes[i]);
    }

    updateSplineOutline();
    render();
  }

  function render() {
    // splines.uniform.mesh.visible = params.uniform;
    // splines.centripetal.mesh.visible = params.centripetal;
    // splines.chordal.mesh.visible = params.chordal;
    renderer.render(scene, camera);
  }

  function onPointerDown(event) {
    onDownPosition.x = event.clientX;
    onDownPosition.y = event.clientY;
  }

  function onPointerUp(event) {
    onUpPosition.x = event.clientX;
    onUpPosition.y = event.clientY;

    if (onDownPosition.distanceTo(onUpPosition) === 0) {
      transformControl.detach();
      render();
    }
  }

  function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(splineHelperObjects, false);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (object !== transformControl.object) {
        transformControl.attach(object);
      }
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
  }

  init();
  window.camera = camera;
}
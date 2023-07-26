import * as THREE from 'three';
import { getProject, types } from "@theatre/core";

// https://www.theatrejs.com/docs/latest/getting-started/with-three-js
import studio from "@theatre/studio";
studio.initialize();

const project = getProject('THREE.js x Theatre.js')

// Create a sheet
const sheet = project.sheet('Animated scene')
window.meshes = []

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

export function renderNodes(selector, data) {
  let container;
  let camera, scene, renderer;

  const splineHelperObjects = [];
  let splinePointsLength = 4;

  const positions = []; // Nodes
  const nodes = []; // Nodes

  const labels = []; // CSS Labels
  const cssRenderer = new CSS3DRenderer();

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
      // Front on X, Y, Z
      camera.position.set(3000, 2550, 8000);

      // Right-side perspective
      // camera.position.set(9000, 2550, 0);

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
      const gridHelper = new THREE.GridHelper(6000, 100);
      gridHelper.position.x = 2750;
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
      transformControl.addEventListener("change", function() {
        // drawLinks();
        render();
      });
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

      for (let i = 0; i < window.data.links.length; i++) {
        // debugger
        // Draw a link between two nodes
        // positions.push(splineHelperObjects[i].position);
        // alert('hi')
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(ARC_SEGMENTS * 3), 3)
      );

      function drawRedLine() {
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
      }

      function drawNodeLine() {
        console.log("drawing Node");
        let curve = new THREE.CatmullRomCurve3(positions);
        console.log("POSITIONS====", positions);
        curve.curveType = "catmullrom";
        curve.mesh = new THREE.Line(
          geometry.clone(),
          new THREE.LineBasicMaterial({
            color: 0xffff00,
            opacity: 0.35,
          })
        );
        curve.mesh.castShadow = true;
        splines.uniform = curve;
      }

      // drawRedLine();
      // drawNodeLine();

      // curve = new THREE.CatmullRomCurve3(positions);
      // curve.curveType = "centripetal";
      // curve.mesh = new THREE.Line(
      //   geometry.clone(),
      //   new THREE.LineBasicMaterial({
      //     color: 0x00ff00,
      //     opacity: 0.35,
      //   })
      // );
      // curve.mesh.castShadow = true;
      // splines.centripetal = curve;

      // curve = new THREE.CatmullRomCurve3(positions);
      // curve.curveType = "chordal";
      // curve.mesh = new THREE.Line(
      //   geometry.clone(),
      //   new THREE.LineBasicMaterial({
      //     color: 0x0505ff,
      //     opacity: 0.05,
      //   })
      // );
      // curve.mesh.castShadow = true;
      // splines.chordal = curve;

      for (const k in splines) {
        debugger;
        const spline = splines[k];
        scene.add(spline.mesh);
      }
    }

    function drawCurves2() {
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

      // curve = new THREE.CatmullRomCurve3(positions);
      // curve.curveType = "centripetal";
      // curve.mesh = new THREE.Line(
      //   geometry.clone(),
      //   new THREE.LineBasicMaterial({
      //     color: 0x00ff00,
      //     opacity: 0.35,
      //   })
      // );
      // curve.mesh.castShadow = true;
      // splines.centripetal = curve;

      // curve = new THREE.CatmullRomCurve3(positions);
      // curve.curveType = "chordal";
      // curve.mesh = new THREE.Line(
      //   geometry.clone(),
      //   new THREE.LineBasicMaterial({
      //     color: 0x0000ff,
      //     opacity: 0.35,
      //   })
      // );
      // curve.mesh.castShadow = true;
      // splines.chordal = curve;

      for (const k in splines) {
        const spline = splines[k];
        debugger;
        scene.add(spline.mesh);
      }
    }

    drawCurves();
    // camera.lookAt(-2500, 10000, 10000);


    // ========================================================================
    //
    // 2c. Set Camera
    //
    // Front-on perspective:
    camera.lookAt(3000, 2000, -9000);
    camera.position.set(3000, 2000, 8000);

    camera.position.set(3000, 2000, 2000);

    // Right-side perspective
    // camera.lookAt(9000, 1550, 0);

    // ========================================================================


    // Load them / draw them
    drawNodes();
    render();
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

  function findNodeByHash(hash) {
    var matches = window.meshes.filter(function (mesh) {
      return mesh.userData.hash === hash;
    });

    if (matches.length > 0) {
      // console.log('finding match for ', hash, matches)
      return matches[0];
    } else {
      return null;
    }
  }

  function drawLink(currentLink) {
    const points = [];
    var items = window.meshes;
    var sourceNode = findNodeByHash(currentLink.source);
    var targetNode = findNodeByHash(currentLink.target);
    // debugger
    // var var1 = Math.floor(Math.random() * items.length);
    // var var2 = Math.floor(Math.random() * items.length);
    // console.log("Var1&2 ", var1, var2)
    // var sourceNode = items[var1];
    // var targetNode = items[var2];
    console.log(
      "source node",
      sourceNode,
      currentLink.source,
      targetNode,
      currentLink.target
    );
    if (!sourceNode || !targetNode) {
      // console.log("Can't find match for", currentLink, sourceNode, targetNode);
      return false;
    }
    points.push(
      new THREE.Vector3(
        sourceNode.position.x,
        sourceNode.position.y,
        sourceNode.position.z
      )
    );
    points.push(
      new THREE.Vector3(
        targetNode.position.x,
        targetNode.position.y,
        targetNode.position.z
      )
    );
    const material = new THREE.LineBasicMaterial({
      color: 0x0000ff
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.class = "line";

    scene.add(line);
    return line;
  }

  function drawNode(currentNode) {

    currentNode.x = currentNode.wardley_x * 50;
    currentNode.y = currentNode.wardley_y * 31 + 500
    // var width = 200;
    // currentNode.z = width * Math.random() - width / 2;
    // currentNode.z = currentNode.z * 30;
    currentNode.z = currentNode.z * 50 - 500;

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
        updateSplineOutline();
        render();
      });
      return theatreControl;
    }

    // scene.add(mesh);

    // drawTheatreControl()
    return mesh;
  }

  // Create the node objects
  function drawNodes() {
    let nodes = window.data.nodes;

    for (var i = 0; nodes.length > i; i++) {
      var currentNode = nodes[i];
      var mesh = drawNode(currentNode);
      mesh.userData.hash = currentNode.hash;
      mesh.userData.id = currentNode.id;
      mesh.userData.name = currentNode.name;
      mesh.userData.description = currentNode.description;

      window.meshes.push(mesh);
    }

    drawLinks();
  }

  function drawLabels() {
    window.meshes.forEach((mesh, index) => {
      const div = document.createElement("div");
      div.className = "label";
      // div.textContent = `Mesh ${index + 1}`;
      div.textContent = mesh.userData.name;
      div.style.marginTop = "-1em";
      const label = new CSS3DObject(div);
      label.position.copy(mesh.position);
      labels.push(label);
      scene.add(label);
    });

    // add the CSS Renderer as an HTML element (overlay)
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = "absolute";
    cssRenderer.domElement.style.top = "0px";
    cssRenderer.domElement.className = "css-renderer";

    document.body.appendChild(cssRenderer.domElement);
  }

  function undrawLabels() {
    for(var i = 0; i < labels.length; i++) {
      var label = labels[i];
      scene.remove(label);

      if (label.element) {
        debugger
        // label.element.parentNode.removeChild(label.element);
        label.element.remove();
      }
    }
    // assumes one .css-renderer element is visible
    document.body.getElementsByClassName("css-renderer")[0].remove()
  }

  function drawLinks() {
    undrawLinks()

    for (var i = 0; window.data.links.length > i; i++) {
      var currentLink = window.data.links[i];
      drawLink(currentLink);
    }
  }

  function undrawLinks() {
    var lines = scene.getObjectsByProperty("class", "line");
    debugger
    for (var i = 0; lines.length > i; i++) {
      var line = lines[i];
      scene.remove(line);
    }
  }

  function render() {

    if (cssRenderer) {
      labels.forEach((label) => {
        label.lookAt(camera.position);
      });
      cssRenderer.render(scene, camera);
    }

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
      transformControlActive = false;
      render();
    }
  }

  let transformControlActive = false;

  function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(splineHelperObjects, false);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (object !== transformControl.object && !transformControlActive) {
        transformControl.attach(object);
        transformControlActive = true;
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
  return [scene, drawLabels, undrawLabels, drawLinks, undrawLinks];
}
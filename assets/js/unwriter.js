import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export function renderUnwriter(selector, data) {

    /** ----- basic setup ----- */
    const canvas = document.getElementById(selector);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
    camera.position.set(8, 6, 10);
    debugger
    const controls = drawOrbitControls()
    controls.target.set(0, 1, 0);
    controls.update();

    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
    addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'r') { controls.reset(); }
    });

    /** ----- helpers ----- */
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper); // x:red, y:green, z:blue (world frame)

    function sphere(pos, color = 0xff0000, r = 0.08) {
      const m = new THREE.MeshBasicMaterial({ color });
      const g = new THREE.SphereGeometry(r, 26, 26);
      const s = new THREE.Mesh(g, m);
      s.position.copy(pos);
      scene.add(s);
      return s;
    }

    function line(a, b, color = 0xffffff, dashed = false) {
      const g = new THREE.BufferGeometry().setFromPoints([a, b]);
      let mat;
      if (dashed) {
        mat = new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.1 });
      } else {
        mat = new THREE.LineBasicMaterial({ color });
      }
      const l = new THREE.Line(g, mat);
      if (dashed) l.computeLineDistances();
      scene.add(l);
      return l;
    }

    function gridPlane(width, height, step, color, opacity) {
      const g = new THREE.Object3D();
      const m = new THREE.LineBasicMaterial({ color, opacity, transparent: true });
      for (let x = -width / 2; x <= width / 2; x += step) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, 0, -height / 2),
          new THREE.Vector3(x, 0, height / 2)
        ]);
        g.add(new THREE.Line(geo, m));
      }
      for (let z = -height / 2; z <= height / 2; z += step) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-width / 2, 0, z),
          new THREE.Vector3(width / 2, 0, z)
        ]);
        g.add(new THREE.Line(geo, m));
      }
      return g;
    }

    /** ----- geometry per diagram ----- */

    // “Source” (center of projection)
    const source = new THREE.Vector3(-5, 1.5, 0);
    sphere(source, 0x000000, 0.12);

    // 2D image plane (fixed in 3D space)
    const planeNormal = new THREE.Vector3(1, 0, 0); // plane facing +X
    const planePoint = new THREE.Vector3(-2, 1.5, 0); // a point on plane
    const planeSize = { w: 3, h: 2 };
    const planeColor = 0x4444ff;

    const planeGeom = new THREE.PlaneGeometry(planeSize.w, planeSize.h);
    const planeMat = new THREE.MeshBasicMaterial({ color: planeColor, side: THREE.DoubleSide, transparent: true, opacity: 0.2 });
    const planeMesh = new THREE.Mesh(planeGeom, planeMat);
    planeMesh.position.copy(planePoint);
    planeMesh.lookAt(planePoint.clone().add(planeNormal)); // orient so normal points +X
    scene.add(planeMesh);

    // Draw plane border
    const planeEdges = new THREE.EdgesGeometry(planeGeom);
    const planeLine = new THREE.LineSegments(planeEdges, new THREE.LineBasicMaterial({ color: planeColor }));
    planeMesh.add(planeLine);

    // 4D trajectory “frames” (green curved strip). We'll fake it as vertical planes over time axis.
    const frameCount = 9;
    const frameSpacing = 0.4;
    const framesParent = new THREE.Object3D();
    scene.add(framesParent);

    // time axis direction (we'll curve slightly on Y to mimic diagram)
    for (let i = 0; i < frameCount; i++) {
      const t = i / (frameCount - 1);
      const x = 0 + t * 3.5;
      const y = 0.3 * Math.sin(t * Math.PI * 0.6); // small curve
      const z = 2.5;
      const framePlane = gridPlane(1.5, 2, 0.3, 0x00aa00, 0.5);
      framePlane.rotation.y = Math.PI / 2;
      framePlane.position.set(x, y, z);
      framesParent.add(framePlane);
    }
    // Mark the “current” right-most frame with slightly thicker border
    const currentFrameBorder = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.8 })
    );
    currentFrameBorder.rotation.y = Math.PI / 2;
    currentFrameBorder.position.copy(framesParent.children[framesParent.children.length - 1].position);
    scene.add(currentFrameBorder);

    // Endpoints (right-most dots) in 3D world
    const endPts = [
      new THREE.Vector3(3.3, 1.1, 2.2),
      new THREE.Vector3(3.4, 1.6, 2.8),
      new THREE.Vector3(3.6, 0.7, 2.5),
      new THREE.Vector3(3.2, 1.3, 1.9)
    ];
    endPts.forEach(p => sphere(p, 0xff3333));

    // Laser/projection lines and intersections on plane
    const intersections = [];
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal.clone().normalize(), planePoint);

    // for each endpoint, cast parametric line from source to endpoint, find intersection w/ plane
    endPts.forEach(p => {
      // line from source to endpoint
      line(source, p, 0xffffff, true);

      const dir = p.clone().sub(source).normalize();
      const denom = planeNormal.dot(dir);
      if (Math.abs(denom) > 1e-6) {
        const t = planeNormal.clone().dot(planePoint.clone().sub(source)) / denom;
        const hit = source.clone().add(dir.multiplyScalar(t));
        intersections.push(hit);
        sphere(hit, 0x00ccff);
      }
    });

    // dashed frustum edges (optional): connecting source to plane corners
    const planeCorners = [];
    planeMesh.updateMatrixWorld();
    planeMesh.geometry.computeBoundingBox();
    const bb = planeMesh.geometry.boundingBox;
    const pts = [
      new THREE.Vector3(bb.min.x, bb.min.y, 0),
      new THREE.Vector3(bb.max.x, bb.min.y, 0),
      new THREE.Vector3(bb.max.x, bb.max.y, 0),
      new THREE.Vector3(bb.min.x, bb.max.y, 0),
    ];
    pts.forEach(p => {
      p.applyMatrix4(planeMesh.matrixWorld);
      planeCorners.push(p);
      line(source, p, 0x888888, true);
    });

    /** ----- animate ----- */
    function render() {
      renderer.render(scene, camera);
      animate();

    }

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();


   function drawOrbitControls() {
    const control = new OrbitControls(camera, renderer.domElement);
    control.damping = 0.2;
    control.addEventListener("change", render);
    return control;
  }

}

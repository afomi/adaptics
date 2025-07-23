import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function renderBunkbed(selector, data = {}) {
  /** --------- basics --------- */
  const FT = 0.3048; // meters per foot; feel free to swap units
  const TOTAL_HEIGHT = 6 * FT;

  const canvas = document.getElementById(selector);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(innerWidth, innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  canvas.parentElement.style.position = 'relative';
  canvas.parentElement.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(8, 6, 10);

  const controls = drawOrbitControls();
  controls.target.set(0, 1, 0);
  controls.update();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    labelRenderer.setSize(innerWidth, innerHeight);
  });

  addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'r') controls.reset();
  });

  /** helpers */
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

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
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color, dashSize: 0.2, gapSize: 0.1 })
      : new THREE.LineBasicMaterial({ color });
    const l = new THREE.Line(g, mat);
    if (dashed) l.computeLineDistances();
    scene.add(l);
    return l;
  }

  function makeLabel(text) {
    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = text;
    div.style.color = '#fff';
    div.style.fontSize = '12px';
    div.style.padding = '2px 4px';
    div.style.background = 'rgba(0,0,0,0.5)';
    div.style.borderRadius = '4px';
    return new CSS2DObject(div);
  }

  function addLabeled(mesh, name) {
    mesh.name = name;
    const lbl = makeLabel(name);
    lbl.position.set(0, mesh.geometry.boundingBox ? mesh.geometry.boundingBox.max.y : 0, 0);
    mesh.add(lbl);
    return mesh;
  }

  /** --------- bunkbed geometry --------- */
  // Dimensions (rough)
  const bedLen = 6.5 * FT;   // length
  const bedW   = 3.0 * FT;   // width
  const railTh = 0.05;       // thickness for rails
  const postTh = 0.08;       // thickness for posts
  const bunkGap = 2.8 * FT;  // space between bottom & top frame tops
  const slatTh = 0.02;
  const slatCount = 8;

  const bunkbed = new THREE.Group(); bunkbed.name = 'bunkbed';
  scene.add(bunkbed);

  // Posts
  const postGeo = new THREE.BoxGeometry(postTh, TOTAL_HEIGHT, postTh);
  postGeo.computeBoundingBox();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const postPositions = [
    [-bedLen/2, TOTAL_HEIGHT/2, -bedW/2],
    [ bedLen/2, TOTAL_HEIGHT/2, -bedW/2],
    [-bedLen/2, TOTAL_HEIGHT/2,  bedW/2],
    [ bedLen/2, TOTAL_HEIGHT/2,  bedW/2],
  ];
  postPositions.forEach((p,i)=>{
    const m = new THREE.Mesh(postGeo, postMat);
    m.position.set(...p);
    addLabeled(m, `post_${i+1}`);
    bunkbed.add(m);
  });

  // Rail maker
  function rail(len, th, name) {
    const g = new THREE.BoxGeometry(len, th, th);
    g.computeBoundingBox();
    const m = new THREE.Mesh(g, postMat);
    return addLabeled(m, name);
  }

  // Bottom bunk group
  const bottomBunk = new THREE.Group(); bottomBunk.name = 'bottomBunk';
  bunkbed.add(bottomBunk);

  const bottomY = 0.6 * FT; // height of bottom frame center
  const topY    = bottomY + bunkGap;

  // Bottom frame rails (2 long, 2 short)
  const railOffsetY = bottomY;
  const longRail1 = rail(bedLen, railTh, 'bottom_longRail1');
  longRail1.position.set(0, railOffsetY, -bedW/2 + railTh/2);
  const longRail2 = rail(bedLen, railTh, 'bottom_longRail2');
  longRail2.position.set(0, railOffsetY,  bedW/2 - railTh/2);

  const shortRail1 = rail(bedW, railTh, 'bottom_shortRail1');
  shortRail1.rotation.y = Math.PI/2;
  shortRail1.position.set(-bedLen/2 + railTh/2, railOffsetY, 0);
  const shortRail2 = rail(bedW, railTh, 'bottom_shortRail2');
  shortRail2.rotation.y = Math.PI/2;
  shortRail2.position.set( bedLen/2 - railTh/2, railOffsetY, 0);

  bottomBunk.add(longRail1, longRail2, shortRail1, shortRail2);

  // Bottom slats
  const slatGeo = new THREE.BoxGeometry(bedW - railTh*2, slatTh, railTh);
  slatGeo.computeBoundingBox();
  for (let i = 0; i < slatCount; i++) {
    const x = -bedLen/2 + railTh + (i+0.5)*( (bedLen-railTh*2)/slatCount );
    const slat = new THREE.Mesh(slatGeo, new THREE.MeshStandardMaterial({ color: 0x555555 }));
    slat.position.set(x, railOffsetY - railTh/2, 0);
    addLabeled(slat, `bottom_slat_${i+1}`);
    bottomBunk.add(slat);
  }

  // Top bunk rails
  const topFrame = new THREE.Group(); topFrame.name = 'topBunk';
  bunkbed.add(topFrame);

  const longRailT1 = rail(bedLen, railTh, 'top_longRail1'); longRailT1.position.set(0, topY, -bedW/2 + railTh/2);
  const longRailT2 = rail(bedLen, railTh, 'top_longRail2'); longRailT2.position.set(0, topY,  bedW/2 - railTh/2);
  const shortRailT1 = rail(bedW, railTh, 'top_shortRail1'); shortRailT1.rotation.y = Math.PI/2; shortRailT1.position.set(-bedLen/2 + railTh/2, topY, 0);
  const shortRailT2 = rail(bedW, railTh, 'top_shortRail2'); shortRailT2.rotation.y = Math.PI/2; shortRailT2.position.set( bedLen/2 - railTh/2, topY, 0);

  topFrame.add(longRailT1, longRailT2, shortRailT1, shortRailT2);

  // Ladder
  const ladder = new THREE.Group(); ladder.name = 'ladder';
  const rungCount = 5;
  const rungSpacing = (topY - railOffsetY) / (rungCount + 1);
  const rungLen = bedW * 0.5;
  const rungGeo = new THREE.BoxGeometry(rungLen, railTh, railTh);
  rungGeo.computeBoundingBox();
  const rungMat = new THREE.MeshStandardMaterial({ color: 0x777777 });

  // ladder side rails
  const sideLen = topY - (railOffsetY - railTh);
  const sideGeo = new THREE.BoxGeometry(railTh, sideLen, railTh);
  sideGeo.computeBoundingBox();
  const side1 = new THREE.Mesh(sideGeo, postMat);
  const side2 = new THREE.Mesh(sideGeo, postMat);
  side1.position.set(bedLen/2 + railTh, railOffsetY + sideLen/2 - railTh, -rungLen/2);
  side2.position.set(bedLen/2 + railTh, railOffsetY + sideLen/2 - railTh,  rungLen/2);
  addLabeled(side1,'ladder_side1'); addLabeled(side2,'ladder_side2');
  ladder.add(side1, side2);

  for (let r=1; r<=rungCount; r++){
    const rung = new THREE.Mesh(rungGeo, rungMat);
    rung.position.set(bedLen/2 + railTh, railOffsetY + r*rungSpacing, 0);
    addLabeled(rung, `ladder_rung_${r}`);
    ladder.add(rung);
  }
  bunkbed.add(ladder);

  /** lighting */
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5,10,7);
  scene.add(dir);

  /** (optional) your existing framePlane demo stuff */
  const framesParent = new THREE.Object3D();
  scene.add(framesParent);
  const framePlane = gridPlane(1.5, 2, 0.3, 0x00aa00, 0.5);
  framePlane.rotation.y = Math.PI / 2;
  framePlane.position.set(1, 2, 3);
  framesParent.add(framePlane);

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

  /** render loop */
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  animate();

  function drawOrbitControls() {
    const control = new OrbitControls(camera, renderer.domElement);
    control.enableDamping = true;
    control.dampingFactor = 0.12;
    control.addEventListener('change', () => {
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    });
    return control;
  }
}

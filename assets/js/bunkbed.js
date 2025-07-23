import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function renderBunkbed(selector, data = {}) {
  /** --------- units & constants --------- */
  const FT = 0.3048;
  const IN = 0.0254;

  const TOTAL_HEIGHT = 6 * FT;

  // main bed dimensions
  const bedLen = 6.5 * FT;
  const bedW   = 3.0 * FT;
  const railTh = 0.05;
  const postTh = 0.08;
  const bunkGap = 2.8 * FT;
  const slatTh = 0.02;
  const slatCount = 8;

  // floating twin XL dims (perpendicular)
  const twinW  = 38 * IN; // 0.9652 m
  const twinL  = 80 * IN; // 2.032 m

  /** --------- renderer & scene --------- */
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
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r') controls.reset(); });

  /** --------- helpers --------- */
  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);
  labelAxes();

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
  function addLabeled(mesh, name, yOffset = 0) {
    mesh.name = name;
    const lbl = makeLabel(name);
    lbl.position.set(0, (mesh.geometry?.boundingBox?.max.y || 0) + yOffset, 0);
    mesh.add(lbl);
    return mesh;
  }
  function rail(len, th, name) {
    const g = new THREE.BoxGeometry(len, th, th);
    g.computeBoundingBox();
    const m = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    return addLabeled(new THREE.Mesh(g, m), name);
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
  function labelAxes() {
    const xL = makeLabel('X'); xL.position.set(5.1, 0, 0); scene.add(xL);
    const yL = makeLabel('Y'); yL.position.set(0, 5.1, 0); scene.add(yL);
    const zL = makeLabel('Z'); zL.position.set(0, 0, 5.1); scene.add(zL);
  }

  /** --------- build bunkbed --------- */
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

  // Bottom bunk group
  const bottomBunk = new THREE.Group(); bottomBunk.name = 'bottomBunk';
  bunkbed.add(bottomBunk);

  const bottomY = 0.6 * FT;
  const topY    = bottomY + bunkGap;

  // Bottom rails
  const longRail1 = rail(bedLen, railTh, 'bottom_longRail1');
  longRail1.position.set(0, bottomY, -bedW/2 + railTh/2);

  const longRail2 = rail(bedLen, railTh, 'bottom_longRail2');
  longRail2.position.set(0, bottomY,  bedW/2 - railTh/2);
  longRail2.position.z += 2.5; // displaced outward

  const shortRail1 = rail(bedW, railTh, 'bottom_shortRail1');
  shortRail1.rotation.y = Math.PI/2;
  shortRail1.position.set(-bedLen/2 + railTh/2, bottomY, 0);

  const shortRail2 = rail(bedW, railTh, 'bottom_shortRail2');
  shortRail2.rotation.y = Math.PI/2;
  shortRail2.position.set( bedLen/2 - railTh/2, bottomY, 0);

  bottomBunk.add(longRail1, longRail2, shortRail1, shortRail2);

  // Top bunk
  const topFrame = new THREE.Group(); topFrame.name = 'topBunk';
  bunkbed.add(topFrame);

  const longRailT1 = rail(bedLen, railTh, 'top_longRail1'); longRailT1.position.set(0, topY, -bedW/2 + railTh/2);
  const longRailT2 = rail(bedLen, railTh, 'top_longRail2'); longRailT2.position.set(0, topY,  bedW/2 - railTh/2);
  const shortRailT1 = rail(bedW, railTh, 'top_shortRail1'); shortRailT1.rotation.y = Math.PI/2; shortRailT1.position.set(-bedLen/2 + railTh/2, topY, 0);
  const shortRailT2 = rail(bedW, railTh, 'top_shortRail2'); shortRailT2.rotation.y = Math.PI/2; shortRailT2.position.set( bedLen/2 - railTh/2, topY, 0);

  topFrame.add(longRailT1, longRailT2, shortRailT1, shortRailT2);

  // ---- Top mattress ----
  const mattTh = 8 * IN;
  const topMattGeo = new THREE.BoxGeometry(bedLen - railTh*0.5, mattTh, bedW - railTh*0.5);
  topMattGeo.computeBoundingBox();
  const topMatt = new THREE.Mesh(topMattGeo, new THREE.MeshStandardMaterial({ color: 0x3366aa, opacity: 0.85, transparent: true }));
  topMatt.position.set(0, topY + mattTh/2 + slatTh, 0);
  addLabeled(topMatt, 'top_mattress');
  topFrame.add(topMatt);

  // Ladder (parallel to short rails)
  const ladder = new THREE.Group(); ladder.name = 'ladder';
  const rungCount = 5;
  const rungSpacing = (topY - bottomY) / (rungCount + 1);
  const rungLen = bedW * 0.5;
  const rungGeo = new THREE.BoxGeometry(rungLen, railTh, railTh);
  rungGeo.computeBoundingBox();
  const rungMat = new THREE.MeshStandardMaterial({ color: 0x777777 });

  const sideLen = topY - (bottomY - railTh);
  const sideGeo = new THREE.BoxGeometry(railTh, sideLen, railTh);
  sideGeo.computeBoundingBox();

  ladder.position.x = -0.5
  ladder.position.z = 1.2
  // ladder.rotation.y = Math.PI / 2;
  const ladderZ = -bedW/2 - 0.15;
  const ladderXCenter = 0;
  const ladderYBase = bottomY - railTh;

  const side1 = new THREE.Mesh(sideGeo, postMat);
  const side2 = new THREE.Mesh(sideGeo, postMat);
  side1.position.set(ladderXCenter - rungLen/2, ladderYBase + sideLen/2, ladderZ);
  side2.position.set(ladderXCenter + rungLen/2, ladderYBase + sideLen/2, ladderZ);
  addLabeled(side1,'ladder_side1'); addLabeled(side2,'ladder_side2');
  ladder.add(side1, side2);

  for (let r=1; r<=rungCount; r++){
    const rung = new THREE.Mesh(rungGeo, rungMat);
    rung.position.set(ladderXCenter, ladderYBase + r*rungSpacing, ladderZ);
    addLabeled(rung, `ladder_rung_${r}`);
    ladder.add(rung);
  }
  bunkbed.add(ladder);

  /** --------- Floating Twin XL bed (perpendicular) --------- */
  const floatBed = new THREE.Group(); floatBed.name = 'floatingTwinXL';
  bunkbed.add(floatBed);

  const fbY = bottomY + 0.05;
  const fbRailTh = railTh;

  // Frame rails
  const fbShortRail1 = rail(twinW, fbRailTh, 'float_shortRail_far'); // touches longRail1
  const fbShortRail2 = rail(twinW, fbRailTh, 'float_shortRail_near');
  const fbLongRail1  = rail(twinL, fbRailTh, 'float_longRail_left');
  const fbLongRail2  = rail(twinL, fbRailTh, 'float_longRail_right');
  fbLongRail1.rotation.y = Math.PI/2;
  fbLongRail2.rotation.y = Math.PI/2;

  const contactZ = longRail1.position.z;
  const fbHalfW = twinW/2;
  const fbHalfL = twinL/2;

  const fbCenterZ = contactZ + fbRailTh/2 + fbHalfL;
  const rightEdgeX = bedLen/2 - railTh/2;
  const fbCenterX = rightEdgeX - fbHalfW;

  fbShortRail1.position.set(fbCenterX, fbY, contactZ);
  fbShortRail2.position.set(fbCenterX, fbY, contactZ + twinL);
  fbLongRail1.position.set(fbCenterX - fbHalfW + fbRailTh/2, fbY, fbCenterZ);
  fbLongRail2.position.set(fbCenterX + fbHalfW - fbRailTh/2, fbY, fbCenterZ);

  floatBed.add(fbShortRail1, fbShortRail2, fbLongRail1, fbLongRail2);

  // Slats
  const fbSlatCount = Math.max(6, Math.floor(twinL / 0.25));
  const fbSlatGeo = new THREE.BoxGeometry(twinW - fbRailTh*2, slatTh, fbRailTh);
  fbSlatGeo.computeBoundingBox();
  for (let i = 0; i < fbSlatCount; i++) {
    const z = contactZ + fbRailTh + (i+0.5)*( (twinL - fbRailTh*2)/fbSlatCount );
    const slat = new THREE.Mesh(fbSlatGeo, new THREE.MeshStandardMaterial({ color: 0x666666 }));
    slat.position.set(fbCenterX, fbY - fbRailTh/2, z);
    addLabeled(slat, `float_slat_${i+1}`, 0.01);
    floatBed.add(slat);
  }

  // ---- TwinXL mattress ----
  const twinMattGeo = new THREE.BoxGeometry(twinW - fbRailTh*0.5, mattTh, twinL - fbRailTh*0.5);
  twinMattGeo.computeBoundingBox();
  const twinMatt = new THREE.Mesh(twinMattGeo, new THREE.MeshStandardMaterial({ color: 0x224488, opacity: 0.85, transparent: true }));
  twinMatt.position.set(fbCenterX, fbY + mattTh/2 + slatTh, fbCenterZ);
  addLabeled(twinMatt, 'twinXL_mattress');
  floatBed.add(twinMatt);

  // ---- TwinXL legs (10" off ground) ----
  const legH = 10 * IN;
  const legGeo = new THREE.BoxGeometry(postTh, legH, postTh);
  legGeo.computeBoundingBox();
  const legPositions = [
    [fbCenterX - fbHalfW + postTh/2, legH/2, fbCenterZ - fbHalfL + postTh/2],
    [fbCenterX + fbHalfW - postTh/2, legH/2, fbCenterZ - fbHalfL + postTh/2],
    [fbCenterX - fbHalfW + postTh/2, legH/2, fbCenterZ + fbHalfL - postTh/2],
    [fbCenterX + fbHalfW - postTh/2, legH/2, fbCenterZ + fbHalfL - postTh/2],
  ];
  legPositions.forEach((p,i)=>{
    const leg = new THREE.Mesh(legGeo, postMat);
    leg.position.set(...p);
    addLabeled(leg, `twinXL_leg_${i+1}`);
    floatBed.add(leg);
  });

  // ---- 16" desk shelf above bottom_shortRail1 ----
  const shelfDepth = 16 * IN;
  const shelfTh = 12 * IN;
  const shelfGeo = new THREE.BoxGeometry(bedW, shelfTh, shelfDepth);
  shelfGeo.computeBoundingBox();
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const shelf = new THREE.Mesh(shelfGeo, shelfMat);
  shelf.rotation.y = shortRail1.rotation.y; // same orientation
  shelf.position.set(
    shortRail1.position.x -  shelfDepth/2,
    shortRail1.position.y + 12 * IN, // vertically above by 16"
    shortRail1.position.z
  );
  addLabeled(shelf, 'desk_shelf_12in');
  bunkbed.add(shelf);


  const shelfDepth2 = 24 * IN;
  const shelfTh2 = 12 * IN;
  const shelfGeo2 = new THREE.BoxGeometry(bedW, shelfTh2, shelfDepth2);
  shelfGeo2.computeBoundingBox();
  const shelfMat2 = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const shelf2 = new THREE.Mesh(shelfGeo2, shelfMat2);
  shelf2.rotation.y = shortRail1.rotation.y; // same orientation
  shelf2.position.set(
    shortRail1.position.x - shelfDepth2 / 2,
    shortRail1.position.y, // vertically above by 16"
    shortRail1.position.z
  );
  addLabeled(shelf2, 'desk_shelf_18in');
  bunkbed.add(shelf2);

  const shelfDepth3 = 8 * IN;
  const shelfTh3 = 12 * IN;
  const shelfGeo3 = new THREE.BoxGeometry(bedW, shelfTh3, shelfDepth3);
  shelfGeo3.computeBoundingBox();
  const shelfMat3 = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const shelf3 = new THREE.Mesh(shelfGeo3, shelfMat3);
  shelf3.rotation.y = shortRail1.rotation.y; // same orientation
  shelf3.position.set(
    shortRail1.position.x - shelfDepth3 / 2,
    shortRail1.position.y + 24 * IN, // vertically above by 16"
    shortRail1.position.z
  );
  addLabeled(shelf3, 'desk_shelf_adjusted');
  bunkbed.add(shelf3);


  /** lighting */
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(5,10,7);
  scene.add(dir);

  /** optional framePlane */
  const framesParent = new THREE.Object3D();
  scene.add(framesParent);
  const framePlane = gridPlane(6, 14, 0.3, 0x00aa00, 0.5);
  framePlane.rotation.y = Math.PI / 2;
  framePlane.position.set(0, 0, 0);
  framesParent.add(framePlane);

  /** --------- render loop --------- */
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

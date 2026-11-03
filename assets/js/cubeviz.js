import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function renderCubeviz() {
const el = document.getElementById("cubeviz");
if (!el) return;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(el.clientWidth, el.clientHeight);
el.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(45, el.clientWidth/el.clientHeight, 0.1, 100);
camera.position.set(3.2, 2.4, 3.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(2, 3, 2);
scene.add(dir);

// Cube wireframe
const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
const edges = new THREE.EdgesGeometry(cubeGeo);
scene.add(new THREE.LineSegments(edges,new THREE.LineBasicMaterial({ color: 0x7aa2ff })));

// Axes helper
scene.add(new THREE.AxesHelper(1.6));

// --- DATA ---
const TIME = ["Day 1","Day 2","Day 3"];
const JOURNEY = ["Awareness","Engagement","Conversion"];
const SEGMENTS = ["New","Returning"];

const flows = [
  // Day 1, New
  { from:{t:0,j:0,s:0}, to:{t:0,j:1,s:0}, value: 40 },
  { from:{t:0,j:1,s:0}, to:{t:0,j:2,s:0}, value: 15 },
  { from:{t:0,j:1,s:0}, to:{t:1,j:2,s:0}, value: 12 },

  // Day 1, Returning
  { from:{t:0,j:0,s:1}, to:{t:0,j:1,s:1}, value: 18 },
  { from:{t:0,j:1,s:1}, to:{t:0,j:2,s:1}, value: 7 },

  // Day 2, New
  { from:{t:1,j:0,s:0}, to:{t:1,j:1,s:0}, value: 35 },
  { from:{t:1,j:1,s:0}, to:{t:1,j:2,s:0}, value: 14 },
  { from:{t:1,j:0,s:0}, to:{t:2,j:1,s:0}, value: 10 },

  // Day 2, Returning
  { from:{t:1,j:0,s:1}, to:{t:1,j:1,s:1}, value: 20 },
  { from:{t:1,j:1,s:1}, to:{t:1,j:2,s:1}, value: 9 },

  // Day 3 taper
  { from:{t:2,j:0,s:0}, to:{t:2,j:1,s:0}, value: 22 },
  { from:{t:2,j:1,s:0}, to:{t:2,j:2,s:0}, value: 8 },
  { from:{t:2,j:0,s:1}, to:{t:2,j:1,s:1}, value: 12 },
  { from:{t:2,j:1,s:1}, to:{t:2,j:2,s:1}, value: 5 }
];

// Position helpers
const POS = {
  x: (t)=> THREE.MathUtils.mapLinear(t, 0, TIME.length-1, -0.9, 0.9),
  y: (j)=> THREE.MathUtils.mapLinear(j, 0, JOURNEY.length-1, -0.8, 0.8),
  z: (s)=> THREE.MathUtils.mapLinear(s, 0, SEGMENTS.length-1, -0.9, 0.9),
};
function colorForValue(v, max=40){
  const h = THREE.MathUtils.mapLinear(Math.min(v,max), 0, max, 0.58, 0.0);
  const c = new THREE.Color(); c.setHSL(h, 0.65, 0.55);
  return c;
}

// Labels
function spriteLabel(text, scale=0.35){
  const canvas = document.createElement("canvas");
  canvas.width=512; canvas.height=256;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#e6eefc";
  ctx.font="32px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(text, canvas.width/2, canvas.height/2);
  const tex=new THREE.CanvasTexture(canvas);
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  spr.scale.set(scale,scale*0.5,1);
  return spr;
}
TIME.forEach((t,i)=>{ const s=spriteLabel(t,0.4); s.position.set(POS.x(i),-1.05,-1.05); scene.add(s); });
JOURNEY.forEach((j,i)=>{ const s=spriteLabel(j,0.4); s.position.set(-1.25,POS.y(i),-1.05); scene.add(s); });
SEGMENTS.forEach((s,i)=>{ const sp=spriteLabel(s,0.35); sp.position.set(-1.05,-1.05,POS.z(i)); scene.add(sp); });

// Nodes
const nodeGroup=new THREE.Group(); scene.add(nodeGroup);
const nodeGeom=new THREE.SphereGeometry(0.065,16,16);
const nodeMap=new Map();
flows.forEach(f=>[f.from,f.to].forEach(p=>{
  const k=`${p.t}|${p.j}|${p.s}`;
  if(!nodeMap.has(k)) nodeMap.set(k,{t:p.t,j:p.j,s:p.s,value:0});
  nodeMap.get(k).value+=f.value*0.5;
}));
nodeMap.forEach(n=>{
  const v=Math.max(1,n.value);
  const c=colorForValue(v);
  const mat=new THREE.MeshStandardMaterial({color:c,metalness:0.15,roughness:0.5});
  const m=new THREE.Mesh(nodeGeom,mat);
  m.position.set(POS.x(n.t),POS.y(n.j),POS.z(n.s));
  m.userData={type:"node",label:`${TIME[n.t]} · ${JOURNEY[n.j]} · ${SEGMENTS[n.s]}: ${Math.round(v)}`};
  nodeGroup.add(m);
});

// Curved tubes
const flowGroup=new THREE.Group(); scene.add(flowGroup);
const maxFlow=Math.max(...flows.map(f=>f.value),1);
function curvedTube(a,b,radius,color){
  const mid=a.clone().lerp(b,0.5).add(new THREE.Vector3(0,0.12,0.0));
  const curve=new THREE.CatmullRomCurve3([a,mid,b]);
  const geom=new THREE.TubeGeometry(curve,32,radius,12,false);
  const mat=new THREE.MeshStandardMaterial({color,transparent:true,opacity:0.85,metalness:0.1,roughness:0.35});
  return new THREE.Mesh(geom,mat);
}
flows.forEach(f=>{
  const a=new THREE.Vector3(POS.x(f.from.t),POS.y(f.from.j),POS.z(f.from.s));
  const b=new THREE.Vector3(POS.x(f.to.t),POS.y(f.to.j),POS.z(f.to.s));
  const radius=THREE.MathUtils.mapLinear(f.value,1,maxFlow,0.012,0.09);
  const color=colorForValue(f.value,maxFlow);
  const tube=curvedTube(a,b,radius,color);
  tube.userData={type:"flow",from:`${TIME[f.from.t]} · ${JOURNEY[f.from.j]} · ${SEGMENTS[f.from.s]}`,to:`${TIME[f.to.t]} · ${JOURNEY[f.to.j]} · ${SEGMENTS[f.to.s]}`,value:f.value};
  flowGroup.add(tube);
});

// Tooltip
const tip=document.createElement("div");
tip.style="position:absolute;pointer-events:none;padding:6px 10px;border-radius:8px;background:rgba(20,28,38,0.9);color:#d7e3ff;font:12px/1.3 system-ui, -apple-system, Segoe UI, Roboto;transform:translate(-50%,-120%);opacity:0";
el.style.position="relative"; el.appendChild(tip);

const raycaster=new THREE.Raycaster(); const mouse=new THREE.Vector2(); let hovered=null;
el.addEventListener("mousemove",(ev)=>{
  const rect=renderer.domElement.getBoundingClientRect();
  mouse.x=((ev.clientX-rect.left)/rect.width)*2-1;
  mouse.y=-((ev.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects([...nodeGroup.children,...flowGroup.children],false);
  if(hits.length){
    const obj=hits[0].object;
    if(hovered!==obj){
      hovered=obj;
      if(obj.userData.type==="node"){
        tip.innerHTML=obj.userData.label;
      } else {
        tip.innerHTML=`<b>${obj.userData.value}</b> flow<br/>${obj.userData.from}<br/>→ ${obj.userData.to}`;
      }
    }
    tip.style.left=ev.offsetX+"px"; tip.style.top=ev.offsetY+"px"; tip.style.opacity="1";
  } else { hovered=null; tip.style.opacity="0"; }
});

// Resize + animate
window.addEventListener("resize",()=>{
  renderer.setSize(el.clientWidth,el.clientHeight);
  camera.aspect=el.clientWidth/el.clientHeight;
  camera.updateProjectionMatrix();
});
function tick(){ controls.update(); renderer.render(scene,camera); requestAnimationFrame(tick); }
tick();
}

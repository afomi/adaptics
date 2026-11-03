/**
 * Civics — an exploded-view Three.js model of the layers of a city.
 *
 * One shared procedural city model (boundary, river, street grid, blocks,
 * parcels, uses, institutions) is computed once; every layer is a *view* of
 * that model — the map/diagram distinction made literal. Collapse the stack
 * and the layers register into a single living city; explode it and each
 * stratum floats apart with its own label, from land and water at the bottom
 * to conversation at the top.
 *
 * Extends the ideas in ~/workspace/jurisdictional (jurisdiction boundaries)
 * and ~/workspace/ourquity (neighborhood/parcel maps): the geometry here is
 * seeded and stylized, but each build function takes the shared model, so
 * real GeoJSON can replace the procedural generator without touching layers.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ---------------------------------------------------------------------------
// Seeded randomness — the city is procedural but stable across reloads.
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260814);

// ---------------------------------------------------------------------------
// Shared city model
// ---------------------------------------------------------------------------

const CELL = 1.35;
const GRID_THETA = 0.27; // the street grid sits slightly askew of the boundary

function rotate(x, z, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [x * c - z * s, x * s + z * c];
}

function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function riverZ(x) {
  return 2.4 * Math.sin(x * 0.33 + 1.1) - 1.2;
}

function buildCityModel() {
  // Jurisdiction boundary — an irregular ring, the legal container.
  const boundary = [];
  const nVerts = 16;
  for (let i = 0; i < nVerts; i++) {
    const angle = (i / nVerts) * Math.PI * 2;
    const radius = 9.6 * (0.82 + 0.28 * rand());
    boundary.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }

  // Grid cells clipped to the boundary, carved by the river.
  const cells = [];
  const cellKey = new Set();
  const half = CELL / 2;
  for (let gx = -8; gx <= 8; gx++) {
    for (let gz = -8; gz <= 8; gz++) {
      const [cx, cz] = rotate(gx * CELL, gz * CELL, GRID_THETA);
      if (!pointInPolygon(cx, cz, boundary)) continue;
      const corners = [
        rotate(gx * CELL - half, gz * CELL - half, GRID_THETA),
        rotate(gx * CELL + half, gz * CELL - half, GRID_THETA),
        rotate(gx * CELL + half, gz * CELL + half, GRID_THETA),
        rotate(gx * CELL - half, gz * CELL + half, GRID_THETA),
      ];
      if (!corners.every(([x, z]) => pointInPolygon(x, z, boundary))) continue;
      const inRiver = Math.abs(cz - riverZ(cx)) < 0.85;
      if (inRiver) continue;
      cells.push({ gx, gz, cx, cz });
      cellKey.add(`${gx},${gz}`);
    }
  }

  // Streets are the shared edges of the grid — including block perimeters.
  const edgeKey = new Set();
  const streets = [];
  const addEdge = (ax, az, bx, bz) => {
    const key = [ax.toFixed(2), az.toFixed(2), bx.toFixed(2), bz.toFixed(2)].join("|");
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    const [wax, waz] = rotate(ax, az, GRID_THETA);
    const [wbx, wbz] = rotate(bx, bz, GRID_THETA);
    streets.push({ a: [wax, waz], b: [wbx, wbz] });
  };
  for (const { gx, gz } of cells) {
    const x0 = gx * CELL - half;
    const x1 = gx * CELL + half;
    const z0 = gz * CELL - half;
    const z1 = gz * CELL + half;
    addEdge(x0, z0, x1, z0);
    addEdge(x1, z0, x1, z1);
    addEdge(x0, z1, x1, z1);
    addEdge(x0, z0, x0, z1);
  }

  // Street-network adjacency, so citizens can wander corner to corner.
  const nodeKey = (x, z) => `${x.toFixed(2)}|${z.toFixed(2)}`;
  const adjacency = new Map();
  for (const seg of streets) {
    for (const [from, to] of [
      [seg.a, seg.b],
      [seg.b, seg.a],
    ]) {
      const key = nodeKey(from[0], from[1]);
      if (!adjacency.has(key)) adjacency.set(key, []);
      adjacency.get(key).push(to);
    }
  }

  // Districts — five wards fanning out from the civic center.
  const districtOf = (cx, cz) => {
    const angle = Math.atan2(cz - 0.6, cx + 0.4) + Math.PI;
    return Math.min(4, Math.floor((angle / (Math.PI * 2)) * 5));
  };

  // Parcels — each block splits into six lots; use derives from geography.
  const parcels = [];
  for (const cell of cells) {
    const distCenter = Math.hypot(cell.cx, cell.cz);
    const distRiver = Math.abs(cell.cz - riverZ(cell.cx));
    for (let px = 0; px < 2; px++) {
      for (let pz = 0; pz < 3; pz++) {
        const margin = 0.09;
        const w = CELL / 2 - margin * 2;
        const d = CELL / 3 - margin * 2;
        const lx = (px - 0.5) * (CELL / 2);
        const lz = (pz - 1) * (CELL / 3);
        const [ox, oz] = rotate(lx, lz, GRID_THETA);
        let use = "housing";
        const roll = rand();
        if (distCenter < 3.2 && roll < 0.72) use = "business";
        else if (distRiver < 1.7 && roll < 0.45) use = "park";
        else if (distCenter > 6.5 && roll < 0.25) use = "park";
        else if (roll > 0.86) use = "business";
        parcels.push({
          x: cell.cx + ox,
          z: cell.cz + oz,
          w,
          d,
          use,
          district: districtOf(cell.cx, cell.cz),
          distCenter,
        });
      }
    }
  }

  // Civic institutions claim the parcel nearest each anchor.
  const anchors = [
    { name: "City Hall", x: 0.2, z: 0.4 },
    { name: "Library", x: -2.6, z: 2.2 },
    { name: "School", x: 4.2, z: 3.4 },
    { name: "School", x: -4.6, z: -3.8 },
    { name: "Fire Station", x: 3.4, z: -2.8 },
    { name: "Clinic", x: -5.2, z: 1.6 },
  ];
  const institutions = [];
  for (const anchor of anchors) {
    let best = null;
    let bestDist = Infinity;
    for (const parcel of parcels) {
      if (parcel.use === "civic") continue;
      const dist = Math.hypot(parcel.x - anchor.x, parcel.z - anchor.z);
      if (dist < bestDist) {
        bestDist = dist;
        best = parcel;
      }
    }
    if (best) {
      best.use = "civic";
      institutions.push({ name: anchor.name, parcel: best });
    }
  }

  return { boundary, cells, streets, adjacency, nodeKey, parcels, institutions, districtOf };
}

// ---------------------------------------------------------------------------
// Palette — blueprint night
// ---------------------------------------------------------------------------

const BG = 0x0b0e1a;
const DISTRICT_COLORS = [0x3b4a7a, 0x4a3b6e, 0x2f5a63, 0x5a4a33, 0x394f3f];

// ---------------------------------------------------------------------------
// Layer definitions — order is stacking order, bottom to top.
// ---------------------------------------------------------------------------

const LAYER_DEFS = [
  { id: "land", name: "Land & Water", color: 0x2e8f8a, blurb: "Terrain, watershed, the river the city grew along." },
  { id: "jurisdiction", name: "Jurisdiction", color: 0xe8a33d, blurb: "The legal boundary — the container of consent." },
  { id: "districts", name: "Districts", color: 0x8a7ae8, blurb: "Wards of representation fanning from the center." },
  { id: "utilities", name: "Utilities", color: 0xb0642a, blurb: "Water, power, and fiber shadowing the streets below grade." },
  { id: "streets", name: "Streets", color: 0xd8d2c0, blurb: "The public right-of-way; the commons everyone traverses." },
  { id: "parcels", name: "Parcels", color: 0x5a6a9a, blurb: "The cadastre — every lot a claim with a story." },
  { id: "parks", name: "Parks & Commons", color: 0x4bbf6b, blurb: "Green space held in common trust." },
  { id: "housing", name: "Housing", color: 0x7a8299, blurb: "Where citizens dwell — the quiet mass of the city." },
  { id: "business", name: "Business", color: 0xe8c84a, blurb: "Commerce clustered toward the core, lit late." },
  { id: "civic", name: "Civic Institutions", color: 0x4ad8e8, blurb: "City hall, schools, library, fire — beacons of service." },
  { id: "transit", name: "Transit", color: 0xe84a9a, blurb: "The loop line stitching districts together." },
  { id: "citizens", name: "Citizens", color: 0xfff2d8, blurb: "People moving corner to corner on the shared grid." },
  { id: "conversation", name: "Conversation", color: 0xc8d8ff, blurb: "Arcs of civic dialogue between people and institutions." },
];

// ---------------------------------------------------------------------------
// Per-layer builders — each receives the shared model, returns a THREE.Group.
// ---------------------------------------------------------------------------

function buildLand(model) {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(13, 64),
    new THREE.MeshBasicMaterial({ color: 0x101527, transparent: true, opacity: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  group.add(ground);

  // Contour rings echo the boundary at diminishing scales.
  for (let ring = 0; ring < 3; ring++) {
    const scale = 1.18 - ring * 0.28;
    const pts = model.boundary.map(([x, z]) => new THREE.Vector3(x * scale, 0, z * scale));
    pts.push(pts[0].clone());
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x2e8f8a, transparent: true, opacity: 0.14 + ring * 0.05 })
    );
    group.add(line);
  }

  // The river — a flattened tube along the seed curve.
  const riverPoints = [];
  for (let x = -12; x <= 12; x += 0.5) {
    riverPoints.push(new THREE.Vector3(x, 0.02, riverZ(x)));
  }
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
  const river = new THREE.Mesh(
    new THREE.TubeGeometry(riverCurve, 64, 0.55, 8, false),
    new THREE.MeshBasicMaterial({ color: 0x2e8f8a, transparent: true, opacity: 0.5 })
  );
  river.scale.y = 0.06;
  group.add(river);

  return group;
}

function buildJurisdiction(model) {
  const group = new THREE.Group();
  const wallHeight = 0.55;
  const positions = [];
  const loop = [...model.boundary, model.boundary[0]];

  for (let i = 0; i < loop.length - 1; i++) {
    const [ax, az] = loop[i];
    const [bx, bz] = loop[i + 1];
    positions.push(ax, 0, az, bx, 0, bz, bx, wallHeight, bz);
    positions.push(ax, 0, az, bx, wallHeight, bz, ax, wallHeight, az);
  }
  const wallGeo = new THREE.BufferGeometry();
  wallGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const wall = new THREE.Mesh(
    wallGeo,
    new THREE.MeshBasicMaterial({
      color: 0xe8a33d,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  group.add(wall);

  const rim = model.boundary.map(([x, z]) => new THREE.Vector3(x, wallHeight, z));
  rim.push(rim[0].clone());
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(rim),
      new THREE.LineBasicMaterial({ color: 0xe8a33d, transparent: true, opacity: 0.85 })
    )
  );
  const base = model.boundary.map(([x, z]) => new THREE.Vector3(x, 0.01, z));
  base.push(base[0].clone());
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(base),
      new THREE.LineBasicMaterial({ color: 0xe8a33d, transparent: true, opacity: 0.4 })
    )
  );
  return group;
}

function buildDistricts(model) {
  const group = new THREE.Group();
  const size = CELL - 0.12;
  for (const cell of model.cells) {
    const district = model.districtOf(cell.cx, cell.cz);
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        color: DISTRICT_COLORS[district],
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    tile.rotation.x = -Math.PI / 2;
    tile.rotation.z = -GRID_THETA;
    tile.position.set(cell.cx, 0.02, cell.cz);
    group.add(tile);
  }
  return group;
}

function buildUtilities(model) {
  const group = new THREE.Group();
  const positions = [];
  for (const seg of model.streets) {
    positions.push(seg.a[0], 0, seg.a[1], seg.b[0], 0, seg.b[1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  group.add(
    new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0xb0642a, transparent: true, opacity: 0.35 })
    )
  );

  // Junction nodes pulse faintly where mains meet.
  const nodePositions = [];
  for (const seg of model.streets) {
    if (rand() < 0.25) nodePositions.push(seg.a[0], 0, seg.a[1]);
  }
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodePositions, 3));
  group.add(
    new THREE.Points(
      nodeGeo,
      new THREE.PointsMaterial({ color: 0xe88a4a, size: 0.09, transparent: true, opacity: 0.7 })
    )
  );
  return group;
}

function buildStreets(model) {
  const group = new THREE.Group();
  const positions = [];
  for (const seg of model.streets) {
    positions.push(seg.a[0], 0, seg.a[1], seg.b[0], 0, seg.b[1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  group.add(
    new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0xd8d2c0, transparent: true, opacity: 0.55 })
    )
  );
  return group;
}

function buildParcels(model) {
  const group = new THREE.Group();
  const positions = [];
  for (const parcel of model.parcels) {
    const hw = parcel.w / 2;
    const hd = parcel.d / 2;
    const corners = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ].map(([x, z]) => rotate(x, z, GRID_THETA));
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % 4];
      positions.push(parcel.x + ax, 0, parcel.z + az, parcel.x + bx, 0, parcel.z + bz);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  group.add(
    new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0x5a6a9a, transparent: true, opacity: 0.4 })
    )
  );
  return group;
}

function buildParks(model) {
  const group = new THREE.Group();
  const treeMat = new THREE.MeshLambertMaterial({ color: 0x3a9a55, transparent: true });
  const lawnMat = new THREE.MeshBasicMaterial({
    color: 0x2a6a3d,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const parcel of model.parcels) {
    if (parcel.use !== "park") continue;
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(parcel.w, parcel.d), lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.rotation.z = -GRID_THETA;
    lawn.position.set(parcel.x, 0.03, parcel.z);
    group.add(lawn);
    const nTrees = 1 + Math.floor(rand() * 2);
    for (let t = 0; t < nTrees; t++) {
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 6), treeMat);
      tree.position.set(
        parcel.x + (rand() - 0.5) * parcel.w * 0.6,
        0.12,
        parcel.z + (rand() - 0.5) * parcel.d * 0.6
      );
      group.add(tree);
    }
  }
  return group;
}

function buildBuildingsFor(model, use, material, heightFn) {
  const group = new THREE.Group();
  for (const parcel of model.parcels) {
    if (parcel.use !== use) continue;
    const height = heightFn(parcel);
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(parcel.w * 0.82, height, parcel.d * 0.82),
      material.clone()
    );
    building.position.set(parcel.x, height / 2, parcel.z);
    building.rotation.y = -GRID_THETA;
    group.add(building);
  }
  return group;
}

function buildHousing(model) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x6a7288, transparent: true });
  return buildBuildingsFor(model, "housing", mat, () => 0.22 + rand() * 0.35);
}

function buildBusiness(model) {
  const mat = new THREE.MeshLambertMaterial({
    color: 0xb09a48,
    emissive: 0x4a3d10,
    transparent: true,
  });
  return buildBuildingsFor(model, "business", mat, (parcel) => {
    const coreBoost = Math.max(0, 3.4 - parcel.distCenter) * 0.55;
    return 0.4 + rand() * 0.8 + coreBoost;
  });
}

function buildCivic(model) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({
    color: 0x2a8a9a,
    emissive: 0x0e3a44,
    transparent: true,
  });
  for (const { parcel } of model.institutions) {
    const height = 1.1 + rand() * 0.5;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(parcel.w * 0.9, height, parcel.d * 0.9),
      mat.clone()
    );
    building.position.set(parcel.x, height / 2, parcel.z);
    building.rotation.y = -GRID_THETA;
    group.add(building);

    // A beacon — the column of light that marks a public place.
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 3.4, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x4ad8e8,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.set(parcel.x, height + 1.7, parcel.z);
    group.add(beam);
  }
  return group;
}

function buildTransit(model) {
  const group = new THREE.Group();
  const stops = [];
  const nStops = 7;
  for (let i = 0; i < nStops; i++) {
    const angle = (i / nStops) * Math.PI * 2 + 0.4;
    const radius = 4.6 + rand() * 1.4;
    stops.push(new THREE.Vector3(Math.cos(angle) * radius, 0.06, Math.sin(angle) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(stops, true);
  const linePts = curve.getPoints(120);
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(linePts),
      new THREE.LineBasicMaterial({ color: 0xe84a9a, transparent: true, opacity: 0.7 })
    )
  );
  const tramMat = new THREE.MeshBasicMaterial({ color: 0xff7ab8, transparent: true });
  const trams = [];
  for (let t = 0; t < 3; t++) {
    const tram = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), tramMat.clone());
    group.add(tram);
    trams.push({ mesh: tram, offset: t / 3 });
  }
  group.userData.animate = (time) => {
    for (const tram of trams) {
      const u = (time * 0.02 + tram.offset) % 1;
      tram.mesh.position.copy(curve.getPointAt(u));
    }
  };
  return group;
}

function buildCitizens(model) {
  const group = new THREE.Group();
  const count = 140;
  const segs = model.streets;
  const agents = [];
  for (let i = 0; i < count; i++) {
    const seg = segs[Math.floor(rand() * segs.length)];
    agents.push({ from: seg.a, to: seg.b, u: rand(), speed: 0.1 + rand() * 0.25 });
  }
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xfff2d8,
      size: 0.1,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  group.add(points);

  group.userData.animate = (_time, delta) => {
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      agent.u += (agent.speed * delta) / CELL;
      if (agent.u >= 1) {
        // Arrived at a corner — pick a connected street and keep walking.
        const key = model.nodeKey(agent.to[0], agent.to[1]);
        const options = model.adjacency.get(key);
        const next = options
          ? options[Math.floor(Math.random() * options.length)]
          : agent.from;
        agent.from = agent.to;
        agent.to = next;
        agent.u = 0;
      }
      positions[i * 3] = agent.from[0] + (agent.to[0] - agent.from[0]) * agent.u;
      positions[i * 3 + 1] = 0.06;
      positions[i * 3 + 2] = agent.from[1] + (agent.to[1] - agent.from[1]) * agent.u;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return group;
}

function buildConversation(model) {
  const group = new THREE.Group();
  const arcs = [];
  const civicSites = model.institutions.map(({ parcel }) => parcel);
  for (let i = 0; i < 14; i++) {
    const from = model.parcels[Math.floor(rand() * model.parcels.length)];
    const to = civicSites[Math.floor(rand() * civicSites.length)];
    const start = new THREE.Vector3(from.x, 0.05, from.z);
    const end = new THREE.Vector3(to.x, 0.05, to.z);
    const mid = start
      .clone()
      .lerp(end, 0.5)
      .setY(0.8 + start.distanceTo(end) * 0.28);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const material = new THREE.LineBasicMaterial({
      color: 0xc8d8ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),
      material
    );
    group.add(line);
    arcs.push({ material, phase: rand() * Math.PI * 2 });
  }
  group.userData.animate = (time) => {
    for (const arc of arcs) {
      arc.material.userData.pulse = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(time * 1.6 + arc.phase));
    }
  };
  return group;
}

const BUILDERS = {
  land: buildLand,
  jurisdiction: buildJurisdiction,
  districts: buildDistricts,
  utilities: buildUtilities,
  streets: buildStreets,
  parcels: buildParcels,
  parks: buildParks,
  housing: buildHousing,
  business: buildBusiness,
  civic: buildCivic,
  transit: buildTransit,
  citizens: buildCitizens,
  conversation: buildConversation,
};

// ---------------------------------------------------------------------------
// Layer label sprites — visible only when the stack is exploded.
// ---------------------------------------------------------------------------

function makeLabelSprite(text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = "500 44px Palatino, 'Iowan Old Style', Georgia, serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `#${colorHex.toString(16).padStart(6, "0")}`;
  ctx.fillText(text.toUpperCase(), 8, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false })
  );
  sprite.scale.set(4.6, 0.86, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Scene assembly
// ---------------------------------------------------------------------------

export function renderCivics(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const model = buildCityModel();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 22, 55);

  const camera = new THREE.PerspectiveCamera(
    48,
    container.clientWidth / container.clientHeight,
    0.1,
    200
  );
  camera.position.set(13, 11, 16);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.45;
  controls.target.set(0, 2, 0);
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minDistance = 6;
  controls.maxDistance = 45;

  scene.add(new THREE.AmbientLight(0x8890b8, 0.9));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.1);
  key.position.set(8, 14, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0x4ad8e8, 0.5, 30);
  fill.position.set(0, 6, 0);
  scene.add(fill);

  // Build every layer, cache its materials with their authored opacities so
  // toggling and highlighting can dim them without losing the original look.
  const layers = LAYER_DEFS.map((def, index) => {
    const group = BUILDERS[def.id](model);
    const materials = [];
    group.traverse((obj) => {
      if (obj.material) {
        obj.material.userData.baseOpacity =
          obj.material.opacity !== undefined ? obj.material.opacity : 1;
        obj.material.transparent = true;
        materials.push(obj.material);
      }
    });
    const label = makeLabelSprite(def.name, def.color);
    label.position.set(-12.4, 0.4, 2 - index * 0.3);
    group.add(label);
    scene.add(group);
    return { def, index, group, materials, label, alpha: 1, visible: true };
  });

  // --- Stack state ---------------------------------------------------------
  let spread = 0; // 0 = one composite city, 1 = fully exploded atlas
  let targetSpread = 0;
  let highlighted = null;
  const LAYER_GAP = 1.9;

  const stats = {
    parcels: model.parcels.length,
    blocks: model.cells.length,
    streets: model.streets.length,
    institutions: model.institutions.length,
    citizens: 140,
    districts: 5,
  };

  // --- Control panel -------------------------------------------------------
  const layerList = document.getElementById("civics-layers");
  const statsEl = document.getElementById("civics-stats");
  const slider = document.getElementById("civics-explode");

  if (statsEl) {
    statsEl.textContent =
      `${stats.blocks} blocks · ${stats.parcels} parcels · ${stats.streets} street segments · ` +
      `${stats.districts} districts · ${stats.institutions} institutions · ${stats.citizens} citizens`;
  }

  if (layerList) {
    // Panel rows mirror stacking order: topmost layer first, like an atlas TOC.
    [...layers].reverse().forEach((layer) => {
      const row = document.createElement("div");
      row.className = "civics-layer-row";
      row.innerHTML =
        `<span class="civics-swatch" style="background:#${layer.def.color
          .toString(16)
          .padStart(6, "0")}"></span>` +
        `<span class="civics-layer-name">${layer.def.name}</span>`;
      row.title = layer.def.blurb;
      row.addEventListener("click", () => {
        layer.visible = !layer.visible;
        row.classList.toggle("civics-layer-off", !layer.visible);
      });
      row.addEventListener("mouseenter", () => {
        highlighted = layer;
      });
      row.addEventListener("mouseleave", () => {
        if (highlighted === layer) highlighted = null;
      });
      layerList.appendChild(row);
    });
  }

  if (slider) {
    slider.addEventListener("input", () => {
      targetSpread = slider.value / 100;
    });
  }

  // --- Animation loop ------------------------------------------------------
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    spread += (targetSpread - spread) * Math.min(1, delta * 4);

    for (const layer of layers) {
      layer.group.position.y = layer.index * LAYER_GAP * spread;

      const targetAlpha = !layer.visible
        ? 0
        : highlighted && highlighted !== layer
          ? 0.12
          : 1;
      layer.alpha += (targetAlpha - layer.alpha) * Math.min(1, delta * 6);
      layer.group.visible = layer.alpha > 0.02;

      for (const material of layer.materials) {
        const pulse = material.userData.pulse;
        const base = pulse !== undefined ? pulse : material.userData.baseOpacity;
        material.opacity = base * layer.alpha;
      }
      layer.label.material.opacity =
        Math.max(0, (spread - 0.35) / 0.65) * 0.9 * layer.alpha;

      if (layer.group.userData.animate) layer.group.userData.animate(time, delta);
    }

    // Keep the orbit target near the stack's vertical middle as it explodes.
    controls.target.y = 1 + spread * ((layers.length - 1) * LAYER_GAP) * 0.45;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

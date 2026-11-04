import * as THREE from 'three';
import { LANDMARKS } from './landmarks.js';

// ------------------------------------------------------------
//  Layout de la carte (1 unité = 1 tuile)
// ------------------------------------------------------------
export const ISLAND = 34; // l'île va de -34 à +34

// Routes : [minX, maxX, minZ, maxZ]
export const ROADS = [
  [-20.5, 20.5, -20.5, -15.5], // périphérique nord
  [-20.5, 20.5, 15.5, 20.5],   // périphérique sud
  [-20.5, -15.5, -20.5, 20.5], // périphérique ouest
  [15.5, 20.5, -20.5, 20.5],   // périphérique est
  [-2.5, 2.5, -32, 32],        // avenue nord-sud
  [-32, 32, -2.5, 2.5],        // avenue est-ouest
];

const inRect = (x, z, r, m = 0) => x >= r[0] - m && x <= r[1] + m && z >= r[2] - m && z <= r[3] + m;
export const onRoad = (x, z, m = 0) => ROADS.some((r) => inRect(x, z, r, m));

export const SPAWN = { x: 0, z: 27, angle: Math.PI };

// b = centre du bâtiment, p = centre de la dalle d'entrée
const PROJECT_SLOTS = [
  { b: [-10, -11], p: [-10, -5.5] },
  { b: [10, -11], p: [10, -5.5] },
  { b: [10, 11], p: [10, 5.5] },
  { b: [-10, 11], p: [-10, 5.5] },
  { b: [-27, -9.5], p: [-27, -4.25] },
  { b: [27, -9.5], p: [27, -4.25] },
  { b: [27, 9.5], p: [27, 4.25] },
  { b: [-27, 9.5], p: [-27, 4.25] },
];
const SPECIAL_SLOTS = {
  about: { b: [-9, -27], p: [-4.25, -27], title: 'À propos', style: 'about', color: '#ffd23f' },
  contact: { b: [9, -27], p: [4.25, -27], title: 'Contact', style: 'contact', color: '#38bdf8' },
  cv: { b: [9, 27], p: [4.25, 27], title: 'CV', style: 'tower', color: '#f472b6' },
};

// ------------------------------------------------------------
//  Helpers
// ------------------------------------------------------------
const BOX = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();

export function mat(color, emissive = 0) {
  const key = `${color}:${emissive}`;
  if (!matCache.has(key)) {
    const m = new THREE.MeshLambertMaterial({ color });
    if (emissive) {
      m.emissive = new THREE.Color(color);
      m.emissiveIntensity = emissive;
    }
    matCache.set(key, m);
  }
  return matCache.get(key);
}

export function box(w, h, d, color, x = 0, y = 0, z = 0, emissive = 0) {
  const m = new THREE.Mesh(BOX, mat(color, emissive));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tint = (hex, toward, k) => '#' + new THREE.Color(hex).lerp(new THREE.Color(toward), k).getHexString();

// ------------------------------------------------------------
//  Bâtiments
// ------------------------------------------------------------
function addWindows(g, w, d, y0, y1, facing) {
  const faces = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  for (const [fx, fz] of faces) {
    const span = fx ? d : w;
    const isFront = fx === facing[0] && fz === facing[1];
    for (let y = y0 + 0.9; y < y1 - 0.4; y += 1.3) {
      for (let s = -span / 2 + 1; s <= span / 2 - 0.9; s += 1.4) {
        if (isFront && Math.abs(s) < 1.1 && y < y0 + 2.2) continue; // place pour la porte
        const win = box(fx ? 0.1 : 0.6, 0.6, fx ? 0.6 : 0.1, '#a8dcff', 0, y, 0, 0.25);
        win.castShadow = false;
        if (fx) win.position.set(fx * (w / 2 + 0.01), y, s);
        else win.position.set(s, y, fz * (d / 2 + 0.01));
        g.add(win);
      }
    }
  }
}

function makeBuilding(style, accent, facing) {
  const g = new THREE.Group();
  const W = 6, D = 6;
  const wall = tint(accent, '#ffffff', 0.72);
  const dark = tint(accent, '#1a1a2a', 0.45);
  let top = 3;
  g.userData.effects = {};

  if (style === 'tower') {
    g.add(box(W, 3, D, wall, 0, 1.5, 0));
    g.add(box(W + 0.12, 0.3, D + 0.12, accent, 0, 3, 0));
    g.add(box(W - 1, 3, D - 1, wall, 0, 4.5, 0));
    g.add(box(W - 0.88, 0.3, D - 0.88, accent, 0, 6, 0));
    g.add(box(W - 2, 2.4, D - 2, accent, 0, 7.2, 0));
    g.add(box(0.16, 2, 0.16, '#3b3f4a', 0, 9.4, 0));
    const blink = box(0.3, 0.3, 0.3, '#ff4d4d', 0, 10.5, 0, 1.5);
    blink.userData.dynamic = true;
    g.add(blink);
    g.userData.effects.blink = blink;
    addWindows(g, W, D, 0, 3, facing);
    addWindows(g, W - 1, D - 1, 3, 6, [9, 9]);
    top = 10.8;
  } else if (style === 'lab') {
    g.add(box(W, 2.8, D, wall, 0, 1.4, 0));
    g.add(box(W + 0.12, 0.3, D + 0.12, accent, 0, 2.8, 0));
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: accent, flatShading: true }),
    );
    dome.position.y = 2.95;
    dome.castShadow = dome.receiveShadow = true;
    g.add(dome);
    g.add(box(0.5, 0.6, 0.5, dark, 0, 5.7, 0));
    addWindows(g, W, D, 0, 2.8, facing);
    top = 6.2;
  } else if (style === 'factory') {
    g.add(box(W, 3, D, wall, 0, 1.5, 0));
    for (let i = 0; i < 3; i++) {
      const tooth = box(W / 3, 0.9, D, accent, -W / 2 + W / 6 + (i * W) / 3, 3.35, 0);
      tooth.rotation.z = -0.25;
      g.add(tooth);
    }
    g.add(box(1, 4.2, 1, dark, W / 2 - 1.1, 4.6, -D / 2 + 1.1));
    g.add(box(1.2, 0.3, 1.2, accent, W / 2 - 1.1, 6.6, -D / 2 + 1.1));
    g.userData.effects.smoke = new THREE.Vector3(W / 2 - 1.1, 7, -D / 2 + 1.1);
    addWindows(g, W, D, 0, 3, facing);
    top = 7.4;
  } else {
    // house
    g.add(box(W, 2.7, D, wall, 0, 1.35, 0));
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(W * 0.78, 2.4, 4),
      new THREE.MeshLambertMaterial({ color: accent, flatShading: true }),
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.7 + 1.2;
    roof.castShadow = roof.receiveShadow = true;
    g.add(roof);
    g.add(box(0.8, 1.6, 0.8, dark, 1.6, 4.2, 1.2));
    addWindows(g, W, D, 0, 2.7, facing);
    top = 5.4;
  }

  // Porte côté dalle
  const [fx, fz] = facing;
  const door = box(fx ? 0.14 : 1.3, 1.9, fx ? 1.3 : 0.14, '#5a3d2b', fx * (W / 2 + 0.02), 0.95, fz * (D / 2 + 0.02));
  g.add(door);
  const awning = box(fx ? 0.8 : 1.9, 0.14, fx ? 1.9 : 0.8, accent, fx * (W / 2 + 0.35), 2.15, fz * (D / 2 + 0.35));
  g.add(awning);
  return { group: g, top };
}

function makePad(color) {
  const g = new THREE.Group();
  const base = box(3.3, 0.08, 3.3, '#262a38', 0, 0.04, 0);
  base.castShadow = false;
  g.add(base);
  const glowMat = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.5 });
  const frame = [
    [2.8, 0.36, 0, 1.22], [2.8, 0.36, 0, -1.22], [0.36, 2.8, 1.22, 0], [0.36, 2.8, -1.22, 0],
  ];
  for (const [w, d, x, z] of frame) {
    const m = new THREE.Mesh(BOX, glowMat);
    m.scale.set(w, 0.12, d);
    m.position.set(x, 0.07, z);
    m.receiveShadow = true;
    g.add(m);
  }
  const centre = new THREE.Mesh(BOX, glowMat);
  centre.scale.set(0.7, 0.12, 0.7);
  centre.position.y = 0.07;
  g.add(centre);
  const icon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.45, 0),
    new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.45, flatShading: true }),
  );
  icon.position.y = 2.2;
  icon.castShadow = true;
  g.add(icon);
  g.userData = { glowMat, icon };
  return g;
}

function makeTree(rand) {
  const g = new THREE.Group();
  const greens = ['#3f9b4a', '#4caf50', '#2f8a43', '#5bb85a'];
  const green = greens[Math.floor(rand() * greens.length)];
  if (rand() < 0.35) {
    // sapin
    g.add(box(0.35, 0.7, 0.35, '#6b4428', 0, 0.35, 0));
    g.add(box(1.7, 0.8, 1.7, '#2d7a4a', 0, 1.1, 0));
    g.add(box(1.2, 0.8, 1.2, '#338a52', 0, 1.9, 0));
    g.add(box(0.7, 0.7, 0.7, '#3a9a5c', 0, 2.6, 0));
  } else {
    const s = 1.3 + rand() * 0.5;
    g.add(box(0.38, 0.9, 0.38, '#7a4e2d', 0, 0.45, 0));
    g.add(box(s, s, s, green, 0, 0.9 + s / 2, 0));
    g.add(box(s * 0.6, s * 0.5, s * 0.6, tint(green, '#ffffff', 0.15), 0.1, 0.9 + s + s * 0.2, -0.1));
  }
  g.rotation.y = Math.floor(rand() * 4) * (Math.PI / 2);
  return g;
}

function makeLamp() {
  const g = new THREE.Group();
  g.add(box(0.18, 2.2, 0.18, '#3b3f4a', 0, 1.1, 0));
  g.add(box(0.5, 0.22, 0.5, '#3b3f4a', 0, 2.3, 0));
  const bulb = box(0.36, 0.08, 0.36, '#fff2b0', 0, 2.16, 0, 1);
  bulb.castShadow = false;
  g.add(bulb);
  return g;
}

function makeSign() {
  const g = new THREE.Group();
  g.add(box(0.2, 1.6, 0.2, '#5c3a22', -1.4, 0.8, 0));
  g.add(box(0.2, 1.6, 0.2, '#5c3a22', 1.4, 0.8, 0));
  g.add(box(3.6, 1.6, 0.2, '#5c3a22', 0, 2.1, 0));
  g.add(box(3.3, 1.3, 0.06, '#f3e3bd', 0, 2.1, 0.12));
  // petite voiture dessinée sur le panneau
  g.add(box(1.4, 0.35, 0.04, '#e8434b', 0, 1.95, 0.16));
  g.add(box(0.8, 0.3, 0.04, '#e8434b', -0.1, 2.25, 0.16));
  g.add(box(0.25, 0.25, 0.04, '#262a36', -0.45, 1.75, 0.18));
  g.add(box(0.25, 0.25, 0.04, '#262a36', 0.45, 1.75, 0.18));
  return g;
}

function makeConstruction(color) {
  const g = new THREE.Group();
  const cone = new THREE.ConeGeometry(0.28, 0.6, 4);
  for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [2.5, 2.5], [-2.5, 2.5]]) {
    const m = new THREE.Mesh(cone, new THREE.MeshLambertMaterial({ color: '#ff7a1a', flatShading: true }));
    m.position.set(x, 0.3, z);
    m.castShadow = true;
    g.add(m);
  }
  g.add(box(5, 0.12, 5, '#b89a6c', 0, 0.06, 0));
  g.add(box(1.2, 0.8, 1.2, '#c9b28a', -1, 0.4, 0.6));
  g.add(box(0.8, 0.5, 0.8, color, 1, 0.25, -0.8));
  return g;
}

// ------------------------------------------------------------
//  Construction du monde
// ------------------------------------------------------------
export function buildWorld(scene, profile, projects) {
  const rand = rng(1337);
  const obstacles = [];
  const zones = [];
  const pickables = [];
  const reserved = []; // rectangles où ne pas planter d'arbres
  const labels = [];   // étiquettes HTML projetées par main.js
  const animated = { pads: [], blinks: [], smokes: [], clouds: [], sparkles: [], landmarks: [] };

  // --- Sol (tuiles instanciées) ---
  const N = ISLAND * 2;
  const ground = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshLambertMaterial(), N * N);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const grass = ['#7cc65a', '#76bf54', '#82cb60', '#78c457'];
  const sand = ['#ecd9a0', '#e6d295', '#efdfaa'];
  let i = 0;
  for (let ix = 0; ix < N; ix++) {
    for (let iz = 0; iz < N; iz++) {
      const x = -ISLAND + ix + 0.5, z = -ISLAND + iz + 0.5;
      const edge = Math.min(ISLAND - Math.abs(x), ISLAND - Math.abs(z));
      let c, y = 0;
      if (onRoad(x, z)) c = (ix + iz) % 2 ? '#474c59' : '#4b505e';
      else if (edge < 2.2) c = sand[Math.floor(rand() * sand.length)];
      else if (onRoad(x, z, 1)) { c = (ix + iz) % 2 ? '#cbc5b8' : '#c3bdaf'; y = 0.04; }
      else { c = grass[Math.floor(rand() * grass.length)]; y = rand() < 0.06 ? 0.05 : 0; }
      dummy.position.set(x, y - 0.25, z);
      dummy.updateMatrix();
      ground.setMatrixAt(i, dummy.matrix);
      ground.setColorAt(i, col.set(c));
      i++;
    }
  }
  ground.receiveShadow = true;
  scene.add(ground);

  // Falaises sous l'île
  const cliffTop = box(N, 0.7, N, '#a8763f', 0, -0.85, 0);
  const cliffLow = box(N, 2.2, N, '#7b5232', 0, -2.3, 0);
  cliffTop.castShadow = cliffLow.castShadow = false;
  scene.add(cliffTop, cliffLow);

  // Eau
  const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: '#3d9bd6' }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -1.3;
  water.receiveShadow = true;
  scene.add(water);
  const shallow = new THREE.Mesh(new THREE.PlaneGeometry(N + 3, N + 3), new THREE.MeshLambertMaterial({ color: '#73c6ec' }));
  shallow.rotation.x = -Math.PI / 2;
  shallow.position.y = -1.2;
  scene.add(shallow);
  for (let k = 0; k < 40; k++) {
    let x, z;
    do {
      x = (rand() - 0.5) * 120;
      z = (rand() - 0.5) * 120;
    } while (Math.abs(x) < ISLAND + 3 && Math.abs(z) < ISLAND + 3);
    const s = box(0.6, 0.04, 0.2, '#e8f7ff', x, -1.15, z, 0.6);
    s.castShadow = false;
    scene.add(s);
  }

  // --- Marquages au sol ---
  const dashGeo = new THREE.BoxGeometry(1, 0.03, 1);
  const dashes = [];
  const nearCross = (v) => Math.abs(v) < 3.2 || Math.abs(Math.abs(v) - 18) < 3.2;
  for (let v = -31; v <= 31; v += 2) {
    if (!nearCross(v)) {
      dashes.push([0, v, 0.16, 0.9]);
      dashes.push([v, 0, 0.9, 0.16]);
    }
    if (Math.abs(v) < 16 && !nearCross(v)) {
      dashes.push([v, -18, 0.9, 0.16], [v, 18, 0.9, 0.16], [-18, v, 0.16, 0.9], [18, v, 0.16, 0.9]);
    }
  }
  const dashMesh = new THREE.InstancedMesh(dashGeo, mat('#f2ead2'), dashes.length);
  dashes.forEach(([x, z, w, d], k) => {
    dummy.position.set(x, 0.01, z);
    dummy.scale.set(w, 1, d);
    dummy.updateMatrix();
    dashMesh.setMatrixAt(k, dummy.matrix);
  });
  dashMesh.receiveShadow = true;
  scene.add(dashMesh);
  dummy.scale.set(1, 1, 1);

  // --- Zones (bâtiments + dalles) ---
  function addZone({ id, kind, data, title, color, style, b, p }) {
    const dx = p[0] - b[0], dz = p[1] - b[1];
    const facing = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
    const landmark = LANDMARKS[style] ? LANDMARKS[style](color) : null;
    const { group, top } = landmark || makeBuilding(style, color, facing);
    group.userData.effects ||= {};
    if (landmark?.update) animated.landmarks.push(landmark);
    group.position.set(b[0], 0, b[1]);
    scene.add(group);
    obstacles.push({ type: 'box', minX: b[0] - 3.05, maxX: b[0] + 3.05, minZ: b[1] - 3.05, maxZ: b[1] + 3.05 });
    reserved.push([b[0] - 4.5, b[0] + 4.5, b[1] - 4.5, b[1] + 4.5]);
    reserved.push([p[0] - 2.8, p[0] + 2.8, p[1] - 2.8, p[1] + 2.8]);

    // allée entre la porte et la dalle
    const pathLen = Math.hypot(dx, dz) - 3 - 1.65;
    if (pathLen > 0.1) {
      const mid = 3 + pathLen / 2;
      const path = box(facing[0] ? pathLen : 1.4, 0.06, facing[0] ? 1.4 : pathLen, '#cbc5b8',
        b[0] + facing[0] * mid, 0.03, b[1] + facing[1] * mid);
      path.castShadow = false;
      scene.add(path);
    }

    labels.push({ text: data?.demo && kind === 'project' ? `${title} ▶` : title, color, x: b[0], y: top + 0.4, z: b[1] });

    const pad = makePad(color);
    pad.position.set(p[0], 0, p[1]);
    pad.userData.dynamic = true;
    scene.add(pad);

    const zone = { id, kind, data, title, color, pad: { x: p[0], z: p[1] }, building: { x: b[0], z: b[1] }, padObj: pad, group };
    group.traverse((o) => (o.userData.zone = zone));
    // boîte invisible pour le clic (le bâtiment lui-même sera fusionné au décor)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(6, top, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(b[0], top / 2, b[1]);
    hit.userData.zone = zone;
    scene.add(hit);
    pickables.push(hit);
    zones.push(zone);
    animated.pads.push(zone);
    if (group.userData.effects.blink) animated.blinks.push(group.userData.effects.blink);
    if (group.userData.effects.smoke) {
      animated.smokes.push({ pos: group.userData.effects.smoke.clone().add(group.position), t: rand() });
    }
  }

  projects.slice(0, PROJECT_SLOTS.length).forEach((proj, k) => {
    const slot = PROJECT_SLOTS[k];
    addZone({ id: proj.id || `p${k}`, kind: 'project', data: proj, title: proj.title, color: proj.color || '#ffd23f', style: proj.style || 'house', b: slot.b, p: slot.p });
  });
  for (const [kind, s] of Object.entries(SPECIAL_SLOTS)) {
    addZone({ id: kind, kind, data: profile, title: s.title, color: s.color, style: s.style, b: s.b, p: s.p });
  }

  // Emplacements libres → chantier « bientôt »
  for (let k = projects.length; k < PROJECT_SLOTS.length; k++) {
    const { b } = PROJECT_SLOTS[k];
    const site = makeConstruction('#ffd23f');
    site.position.set(b[0], 0, b[1]);
    scene.add(site);
    labels.push({ text: 'Bientôt…', color: '#ff7a1a', x: b[0], y: 1.6, z: b[1] });
    obstacles.push({ type: 'box', minX: b[0] - 1.6, maxX: b[0] + 0.4, minZ: b[1] - 1.4, maxZ: b[1] + 1.2 });
    reserved.push([b[0] - 3.5, b[0] + 3.5, b[1] - 3.5, b[1] + 3.5]);
  }

  // Panneau de bienvenue
  const sign = makeSign();
  sign.position.set(-6.5, 0, 27);
  sign.rotation.y = Math.PI / 4;
  scene.add(sign);
  labels.push({ text: 'Bienvenue !', color: '#ffd23f', x: -6.5, y: 3.2, z: 27 });
  obstacles.push({ type: 'circle', x: -7.5, z: 26, r: 0.4 }, { type: 'circle', x: -5.5, z: 28, r: 0.4 });
  reserved.push([-9.5, -3.5, 24, 30]);
  reserved.push([-3, 3, 22, 32]); // zone de spawn

  // Lampadaires
  for (const t of [-12, -4, 4, 12]) {
    for (const [x, z] of [[t, -21.15], [t, 21.15], [-21.15, t], [21.15, t]]) {
      const lamp = makeLamp();
      lamp.position.set(x, 0, z);
      scene.add(lamp);
      obstacles.push({ type: 'circle', x, z, r: 0.3 });
      reserved.push([x - 1, x + 1, z - 1, z + 1]);
    }
  }

  // Arbres
  const blocked = (x, z, m = 0) =>
    onRoad(x, z, 1.6 + m) ||
    Math.abs(x) > ISLAND - 2.8 || Math.abs(z) > ISLAND - 2.8 ||
    reserved.some((r) => inRect(x, z, r, m));
  let placed = 0, tries = 0;
  while (placed < 150 && tries < 5000) {
    tries++;
    const x = Math.round((rand() - 0.5) * 2 * ISLAND) + 0.5;
    const z = Math.round((rand() - 0.5) * 2 * ISLAND) + 0.5;
    if (blocked(x, z, 0.5)) continue;
    if (obstacles.some((o) => o.type === 'circle' && Math.hypot(o.x - x, o.z - z) < 1.9)) continue;
    const tree = makeTree(rand);
    tree.position.set(x, 0, z);
    scene.add(tree);
    obstacles.push({ type: 'circle', x, z, r: 0.55 });
    placed++;
  }

  // Fleurs et cailloux
  const flowerCols = ['#ff7eb6', '#ffe066', '#ffffff', '#c084fc', '#ff8a5c'];
  const flowers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), new THREE.MeshLambertMaterial(), 420);
  let f = 0;
  while (f < 420) {
    const x = (rand() - 0.5) * 2 * (ISLAND - 3);
    const z = (rand() - 0.5) * 2 * (ISLAND - 3);
    if (onRoad(x, z, 1.2)) continue;
    dummy.position.set(x, 0.09, z);
    dummy.updateMatrix();
    flowers.setMatrixAt(f, dummy.matrix);
    flowers.setColorAt(f, col.set(flowerCols[Math.floor(rand() * flowerCols.length)]));
    f++;
  }
  scene.add(flowers);
  for (let k = 0; k < 30; k++) {
    const x = (rand() - 0.5) * 2 * (ISLAND - 3);
    const z = (rand() - 0.5) * 2 * (ISLAND - 3);
    if (blocked(x, z)) continue;
    const s = 0.3 + rand() * 0.4;
    scene.add(box(s, s * 0.6, s * 0.8, rand() < 0.5 ? '#9aa0a8' : '#868c96', x, s * 0.3, z));
  }

  // Nuages invisibles qui ne projettent que leur ombre
  const cloudMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  for (let k = 0; k < 9; k++) {
    const c = new THREE.Group();
    const parts = 2 + Math.floor(rand() * 3);
    for (let j = 0; j < parts; j++) {
      const m = new THREE.Mesh(BOX, cloudMat);
      m.scale.set(3 + rand() * 4, 1, 2 + rand() * 3);
      m.position.set(j * 2.2 - parts, 0, (rand() - 0.5) * 2);
      m.castShadow = true;
      c.add(m);
    }
    c.position.set((rand() - 0.5) * 100, 14, (rand() - 0.5) * 80);
    c.userData.speed = 0.6 + rand() * 0.8;
    scene.add(c);
    animated.clouds.push(c);
  }

  // ------------------------------------------------------------
  function update(t, dt, activeZone, smoke) {
    for (const l of animated.landmarks) l.update(t);
    for (const z of animated.pads) {
      const active = z === activeZone;
      const { glowMat, icon } = z.padObj.userData;
      glowMat.emissiveIntensity = active ? 1.1 + Math.sin(t * 10) * 0.25 : 0.45 + Math.sin(t * 2.5 + z.pad.x) * 0.15;
      icon.rotation.y = t * 1.6;
      icon.position.y = 2.2 + Math.sin(t * 2.4 + z.pad.z) * 0.18 + (active ? 0.3 : 0);
      const s = active ? 1.25 : 1;
      icon.scale.setScalar(THREE.MathUtils.lerp(icon.scale.x, s, 0.15));
    }
    for (const b of animated.blinks) b.visible = Math.sin(t * 4) > -0.2;
    for (const s of animated.smokes) {
      s.t -= dt;
      if (s.t <= 0 && smoke) {
        s.t = 0.35;
        smoke.spawn(s.pos.x, s.pos.y, s.pos.z, 0.5 + Math.random() * 0.3, 1.2, (Math.random() - 0.5) * 0.3, 2.4, 0.55 + Math.random() * 0.3);
      }
    }
    for (const c of animated.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 60) c.position.x = -60;
    }
  }


  return { obstacles, zones, pickables, labels, update };
}

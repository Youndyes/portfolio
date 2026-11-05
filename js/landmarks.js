import * as THREE from 'three';

// ============================================================================
//  Monuments voxel : chaque projet a une « architecture qui parle ».
//  Chaque constructeur renvoie { group, top, update(t, active) }.
//  Emprise : socle de 6 × 6 centré sur l'origine (comme les bâtiments).
// ============================================================================

const BOX = new THREE.BoxGeometry(1, 1, 1);
const cache = new Map();
const FACE_CAMERA = Math.PI / 4; // les sprites regardent la caméra isométrique

function mat(color, emissive = 0) {
  const key = `${color}:${emissive}`;
  if (!cache.has(key)) {
    const m = new THREE.MeshLambertMaterial({ color });
    if (emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = emissive; }
    cache.set(key, m);
  }
  return cache.get(key);
}
// Marque un objet animé : il ne sera pas fusionné avec le décor statique
const dyn = (o) => { o.userData.dynamic = true; return o; };
const own = (color, emissive = 0) =>
  new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: emissive });

function b(w, h, d, color, x = 0, y = 0, z = 0, emissive = 0) {
  const m = new THREE.Mesh(BOX, typeof color === 'string' ? mat(color, emissive) : color);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// Voxels instanciés : cells = [[x, y, z, couleur], ...]
function voxelMesh(cells, s, gain = 1) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshLambertMaterial(), cells.length);
  const d = new THREE.Object3D(), c = new THREE.Color();
  cells.forEach(([x, y, z, col], i) => {
    d.position.set(x, y, z);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, c.set(col).multiplyScalar(gain));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// Sprite pixel art extrudé : lignes de haut en bas, '.' = vide. Origine en bas au centre.
function sprite(rows, palette, s = 0.35, depth = 2) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const cells = [];
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (!palette[ch]) return;
      for (let k = 0; k < depth; k++)
        cells.push([(c - (w - 1) / 2) * s, (h - 1 - r) * s + s / 2, (k - (depth - 1) / 2) * s, palette[ch]]);
    }),
  );
  // les sprites font face à la caméra, donc dos au soleil : on compense
  const mesh = voxelMesh(cells, s, 1.55);
  mesh.userData.size = { w: w * s, h: h * s };
  return mesh;
}

function plinth(g, trim, base = '#454a5a') {
  g.add(b(6, 0.3, 6, base, 0, 0.15, 0));
  for (const s of [-1, 1]) {
    g.add(b(6, 0.08, 0.25, trim, 0, 0.34, s * 2.875));
    g.add(b(0.25, 0.08, 6, trim, s * 2.875, 0.34, 0));
  }
}

const HEART = ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'];

// ---------------------------------------------------------------------------
//  JOYN : un smartphone géant qui affiche un « match »
// ---------------------------------------------------------------------------
function joyn(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const phone = new THREE.Group();
  phone.rotation.y = FACE_CAMERA;
  phone.position.y = 0.3;
  g.add(phone);
  phone.add(b(1.8, 0.25, 1.2, '#1d2233', 0, 0.125, 0));
  phone.add(b(3.2, 5.6, 0.5, '#1d2233', 0, 3.05, 0));
  phone.add(b(2.8, 4.9, 0.06, '#eefcf9', 0, 3.0, 0.27, 0.12));
  phone.add(b(2.8, 0.55, 0.07, accent, 0, 5.15, 0.28, 0.3));
  phone.add(b(0.7, 0.12, 0.05, '#0b0e18', 0, 5.65, 0.27));
  // deux profils qui « matchent »
  for (const [x, c] of [[-0.68, '#ff8a3d'], [0.68, '#4c6fff']]) {
    phone.add(b(1.15, 1.45, 0.05, '#ffffff', x, 2.15, 0.3));
    phone.add(b(0.5, 0.5, 0.05, c, x, 2.5, 0.33));
    phone.add(b(0.8, 0.1, 0.05, '#c9d2e3', x, 1.95, 0.33));
    phone.add(b(0.6, 0.1, 0.05, '#c9d2e3', x, 1.75, 0.33));
  }
  phone.add(b(2.2, 0.38, 0.06, accent, 0, 1.0, 0.3, 0.3));
  const heart = sprite(HEART, { H: '#ff4d6d' }, 0.2, 1);
  heart.position.set(0, 3.55, 0.33);
  phone.add(dyn(heart));
  const floatHeart = sprite(HEART, { H: '#ff4d6d' }, 0.18, 2);
  floatHeart.position.set(0, 6.4, 0);
  phone.add(dyn(floatHeart));
  return {
    group: g,
    top: 7.8,
    update(t) {
      heart.scale.setScalar(1 + Math.max(0, Math.sin(t * 6)) * 0.15);
      floatHeart.position.y = 6.4 + Math.sin(t * 2) * 0.2;
      floatHeart.rotation.y = Math.sin(t * 1.5) * 0.5;
    },
  };
}

// ---------------------------------------------------------------------------
//  Hive : tuiles hexagonales du jeu + une abeille qui tourne autour
// ---------------------------------------------------------------------------
function hive(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const hex = new THREE.CylinderGeometry(0.86, 0.86, 0.4, 6);
  const tileMat = { dark: own('#2a2a30'), light: own('#f1e6c8') };
  for (const m of Object.values(tileMat)) m.flatShading = true;
  const R = 0.9, d = Math.sqrt(3) * R;
  const insects = ['#facc15', '#3b82f6', '#8b5a2b', '#22c55e', '#a855f7', '#ef4444', '#facc15'];
  const spots = [[0, 0]];
  for (let k = 0; k < 6; k++) spots.push([Math.cos((k * Math.PI) / 3) * d, Math.sin((k * Math.PI) / 3) * d]);
  // Ruche pyramidale : 7 tuiles, puis 3 (centre + 2 voisines), puis 1 au sommet
  const layersAt = spots.map((_, i) => (i === 0 ? 3 : i === 1 || i === 4 ? 2 : 1));
  spots.forEach(([x, z], i) => {
    const layers = layersAt[i];
    for (let l = 0; l < layers; l++) {
      const tile = new THREE.Mesh(hex, (i + l) % 2 ? tileMat.dark : tileMat.light);
      tile.position.set(x, 0.5 + l * 0.42, z);
      tile.castShadow = tile.receiveShadow = true;
      g.add(tile);
    }
    // petit insecte voxel sur la tuile du dessus
    const y = 0.5 + (layers - 1) * 0.42 + 0.27;
    g.add(b(0.4, 0.16, 0.58, insects[i], x, y, z));
    g.add(b(0.26, 0.16, 0.24, '#1b1b22', x, y, z + 0.4));
  });
  // abeille géante
  const bee = new THREE.Group();
  bee.add(b(0.5, 0.5, 0.5, '#facc15', -0.5, 0, 0));
  bee.add(b(0.5, 0.52, 0.52, '#1b1b22', 0, 0, 0));
  bee.add(b(0.5, 0.5, 0.5, '#facc15', 0.5, 0, 0));
  bee.add(b(0.2, 0.2, 0.2, '#1b1b22', -0.85, 0, 0));
  bee.add(b(0.4, 0.4, 0.4, '#1b1b22', 0.95, 0.02, 0));
  bee.add(b(0.08, 0.08, 0.08, '#ffffff', 1.12, 0.1, 0.12, 0.5));
  bee.add(b(0.08, 0.08, 0.08, '#ffffff', 1.12, 0.1, -0.12, 0.5));
  const wings = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(0, 0.26, s * 0.1);
    const wing = b(0.5, 0.05, 0.7, own('#e0f2fe', 0.3), 0, 0, s * 0.35);
    wing.material.transparent = true;
    wing.material.opacity = 0.85;
    w.add(wing);
    bee.add(w);
    wings.push({ w, s });
  }
  bee.scale.setScalar(1.5);
  g.add(dyn(bee));
  return {
    group: g,
    top: 5.2,
    update(t) {
      const a = t * 1.1;
      bee.position.set(Math.cos(a) * 2.1, 3.3 + Math.sin(t * 3) * 0.3, Math.sin(a) * 2.1);
      bee.rotation.y = -a - Math.PI / 2;
      for (const { w, s } of wings) w.rotation.x = s * (0.4 + Math.sin(t * 40) * 0.5);
    },
  };
}

// ---------------------------------------------------------------------------
//  Pac-Man : le personnage vu de profil, qui ouvre et ferme la bouche
// ---------------------------------------------------------------------------
function pacFrame(mouthDeg) {
  const N = 15, c = 7, R = 7.2, rows = [];
  for (let r = 0; r < N; r++) {
    let line = '';
    for (let col = 0; col < N; col++) {
      const dx = col - c, dy = c - r;
      const inside = dx * dx + dy * dy <= R * R;
      const ang = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
      const mouth = dx > 0 && ang < mouthDeg;
      const eye = col === c + 1 && (r === 3 || r === 4) || col === c + 2 && (r === 3 || r === 4);
      line += !inside || mouth ? '.' : eye ? 'E' : 'Y';
    }
    rows.push(line);
  }
  return rows;
}
function pacman() {
  const g = new THREE.Group();
  plinth(g, '#4a63ff', '#151a3d');
  const holder = new THREE.Group();
  holder.rotation.y = FACE_CAMERA;
  holder.position.y = 0.45;
  g.add(holder);
  // 3 images de l'animation (fermée, entrouverte, ouverte) : on n'en affiche qu'une
  const frames = [0, 24, 44].map((deg) => {
    const f = sprite(pacFrame(deg), { Y: '#ffd23f', E: '#1b1b22' }, 0.36, 3);
    f.visible = false;
    holder.add(dyn(f));
    return f;
  });
  frames[2].visible = true;
  const cycle = [0, 1, 2, 1];
  let current = 2;
  return {
    group: g,
    top: 5.9,
    update(t) {
      const next = cycle[Math.floor(t * 8) % cycle.length];
      if (next !== current) {
        frames[current].visible = false;
        frames[next].visible = true;
        current = next;
      }
    },
  };
}

// ---------------------------------------------------------------------------
//  À propos : un grand point d'interrogation
// ---------------------------------------------------------------------------
const QUESTION = [
  '..YYYYY..',
  '.YYYYYYY.',
  'YYY...YYY',
  'YY.....YY',
  '......YYY',
  '.....YYY.',
  '....YYY..',
  '...YYY...',
  '...YY....',
  '.........',
  '...YY....',
  '...YY....',
];
function about(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const holder = new THREE.Group();
  holder.rotation.y = FACE_CAMERA;
  g.add(holder);
  const q = sprite(QUESTION, { Y: accent }, 0.42, 3);
  q.position.set(0.2, 0.7, 0);
  holder.add(dyn(q));
  return {
    group: g,
    top: 6.1,
    update(t) { q.position.y = 0.7 + Math.sin(t * 1.8) * 0.15; },
  };
}

// ---------------------------------------------------------------------------
//  Contact : l'icône « Contacts » (carte grise + silhouette + onglets)
// ---------------------------------------------------------------------------
const CONTACT = [
  '.LLLLLLLLLLLL.',
  'LLLLLLLLLLLLLR',
  'LLLLLLDDLLLLLR',
  'LLLLLDDDDLLLLR',
  'LLLLLDDDDLLLLO',
  'LLLLLDDDDLLLLO',
  'LLLLLLDDLLLLLO',
  'LLLLLLLLLLLLLG',
  'LLLLDDDDDDLLLG',
  'LLLDDDDDDDDLLG',
  'LLLDDDDDDDDLLB',
  'LLLDDDDDDDDLLB',
  'LLLLLLLLLLLLLB',
  '.LLLLLLLLLLLL.',
];
function contact(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const holder = new THREE.Group();
  holder.rotation.y = FACE_CAMERA;
  g.add(holder);
  holder.add(b(1.6, 0.4, 1.0, '#9ca3af', 0, 0.5, 0));
  const icon = sprite(CONTACT, { L: '#e5e7eb', D: '#8e8e93', R: '#ff5f57', O: '#febc2e', G: '#28c840', B: accent }, 0.36, 3);
  icon.position.y = 0.7;
  holder.add(icon);
  return { group: g, top: 6.0 };
}

// ---------------------------------------------------------------------------
//  Sampler : une boîte à rythmes géante avec un séquenceur qui joue
// ---------------------------------------------------------------------------
function sampler(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const dev = new THREE.Group();
  dev.rotation.y = FACE_CAMERA;
  dev.position.y = 0.3;
  dev.scale.setScalar(0.86);
  g.add(dev);
  const tilt = new THREE.Group();
  tilt.position.y = 1.0;
  tilt.rotation.x = 0.28;
  dev.add(tilt);
  dev.add(b(4.0, 1.0, 3.6, '#1a1c24', 0, 0.5, 0));
  tilt.add(b(4.6, 0.8, 4.8, '#2a2d38', 0, 0.4, 0));
  const rowColors = ['#ff5d8f', '#ff8a3d', '#ffd23f', '#4cd6ff'];
  const pads = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const m = own(rowColors[r], 0.12);
      const p = b(0.7, 0.16, 0.7, m, -1.275 + c * 0.85, 0.86, -0.6 + r * 0.85);
      tilt.add(dyn(p));
      pads.push({ m, r, c });
    }
  // écran avec forme d'onde + boutons
  tilt.add(b(2.2, 0.06, 1.0, '#0d1b12', -0.95, 0.83, -1.75));
  const bars = [];
  for (let i = 0; i < 9; i++) {
    const bar = b(0.14, 0.04, 0.5, '#4ade80', -1.85 + i * 0.22, 0.88, -1.75, 0.8);
    tilt.add(dyn(bar));
    bars.push(bar);
  }
  const knob = new THREE.CylinderGeometry(0.22, 0.22, 0.28, 8);
  for (const x of [0.75, 1.35, 1.95]) {
    const k = new THREE.Mesh(knob, mat('#d7dbe6'));
    k.position.set(x, 0.94, -1.75);
    k.castShadow = true;
    tilt.add(k);
    tilt.add(b(0.05, 0.05, 0.18, '#1a1c24', x, 1.09, -1.83));
  }
  return {
    group: g,
    top: 3.4,
    update(t) {
      const step = Math.floor(t * 4) % 4;
      for (const { m, r, c } of pads) {
        const hit = c === step && (r + step) % 2 === 0 || (c === step && r === 3);
        m.emissiveIntensity += ((hit ? 1.1 : c === step ? 0.4 : 0.1) - m.emissiveIntensity) * 0.3;
      }
      bars.forEach((bar, i) => {
        const h = 0.08 + Math.abs(Math.sin(t * 7 + i * 0.9)) * 0.35;
        bar.scale.y = h;
        bar.position.y = 0.86 + h / 2;
      });
    },
  };
}

// ---------------------------------------------------------------------------
//  Extension Twitch : la bulle de chat violette + badge de notification
// ---------------------------------------------------------------------------
const BUBBLE = [
  '.PPPPPPPPPPPP',
  'PPWWWWWWWWWWP',
  'PWWWWWWWWWWWP',
  'PWWWPPWWPPWWP',
  'PWWWPPWWPPWWP',
  'PWWWPPWWPPWWP',
  'PWWWWWWWWWWWP',
  'PWWWWWWWWWWPP',
  'PWWWWWWWWWPP.',
  'PWWWWWWWWPP..',
  'PPPPPPPPPP...',
  '...PPP.......',
  '...PP........',
  '...P.........',
];
function twitch(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const holder = new THREE.Group();
  holder.rotation.y = FACE_CAMERA;
  holder.position.y = 0.3;
  g.add(holder);
  const bubble = sprite(BUBBLE, { P: '#9146ff', W: '#f4f0ff' }, 0.34, 3);
  bubble.position.y = 0.2;
  holder.add(dyn(bubble));
  const badge = new THREE.Group();
  badge.position.set(2.05, 4.85, 0.35);
  badge.add(b(0.8, 0.8, 0.8, '#ff3b5c', 0, 0, 0, 0.6));
  badge.add(b(0.16, 0.42, 0.06, '#ffffff', 0, 0.06, 0.42, 0.8));
  holder.add(dyn(badge));
  return {
    group: g,
    top: 6.0,
    update(t) {
      const k = 1 + Math.max(0, Math.sin(t * 5)) * 0.25;
      badge.scale.setScalar(k);
      bubble.position.y = 0.2 + Math.sin(t * 1.6) * 0.08;
    },
  };
}

// ---------------------------------------------------------------------------
//  Recherche SSD : une barrette M.2 géante + l'histogramme des benchmarks
// ---------------------------------------------------------------------------
function ssd(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const stick = new THREE.Group();
  stick.position.set(0, 0, 1.15);
  g.add(stick);
  for (const x of [-2.0, 2.0]) stick.add(b(0.3, 0.9, 0.3, '#8a91a3', x, 0.75, 0));
  stick.add(b(5.2, 0.16, 1.7, '#1f7a3a', 0, 1.28, 0));
  stick.add(b(0.75, 0.16, 0.75, '#2c2c34', -1.85, 1.44, 0));
  for (const x of [-0.8, 0.35, 1.5]) stick.add(b(0.95, 0.16, 1.1, '#17171c', x, 1.44, 0));
  stick.add(b(1.9, 0.02, 0.9, '#f1f1f1', -0.22, 1.53, 0));
  stick.add(b(1.9, 0.025, 0.22, accent, -0.22, 1.54, -0.2));
  for (let i = 0; i < 7; i++) stick.add(b(0.28, 0.03, 0.14, '#e8b923', 2.45, 1.37, -0.7 + i * 0.23, 0.2));
  const led = b(0.14, 0.08, 0.14, own('#4ade80', 1), -2.35, 1.4, 0.6);
  stick.add(dyn(led));
  // histogramme des benchmarks (JFFS2, UBIFS, F2FS, VeraCrypt)
  const heights = [2.2, 1.5, 3.1, 1.0];
  const colors = ['#4cc9f0', '#a78bfa', '#4ade80', '#f97316'];
  g.add(b(4.6, 0.06, 0.12, '#e5e7eb', 0, 0.34, -0.85));
  const bars = heights.map((h, i) => {
    const bar = b(0.8, 1, 0.8, colors[i], -1.8 + i * 1.2, 0, -1.6);
    g.add(dyn(bar));
    return { bar, h };
  });
  return {
    group: g,
    top: 4.0,
    update(t) {
      led.visible = Math.sin(t * 12) > 0;
      bars.forEach(({ bar, h }, i) => {
        const hh = h * (0.92 + 0.08 * Math.sin(t * 1.5 + i));
        bar.scale.y = hh;
        bar.position.y = 0.3 + hh / 2;
      });
    },
  };
}

// ---------------------------------------------------------------------------
//  Compression d'entiers : une presse hydraulique qui écrase des bits
// ---------------------------------------------------------------------------
function compression(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  g.add(b(3.8, 0.6, 2.8, '#5b6170', 0, 0.6, 0));
  for (const x of [-2.35, 2.35]) g.add(b(0.5, 5.4, 0.5, '#8a91a3', x, 0.3 + 2.7, 0));
  g.add(b(5.3, 0.7, 1.2, accent, 0, 5.75, 0));
  g.add(b(1.0, 0.8, 1.0, '#3d4250', 0, 5.0, 0));
  const plate = b(3.4, 0.35, 2.3, '#2f8f55', 0, 0, 0);
  const rod = b(0.35, 1, 0.35, '#d9dde6', 0, 0, 0);
  g.add(dyn(plate), dyn(rod));
  const stack = new THREE.Group();
  stack.position.y = 0.9;
  g.add(dyn(stack));
  const H0 = 3 * 0.62;
  const cells = [];
  let seed = 7;
  for (let l = 0; l < 3; l++)
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        seed = (seed * 37 + 11) % 101;
        cells.push([-0.93 + i * 0.62, 0.31 + l * 0.62, -0.62 + j * 0.62, seed % 2 ? '#15803d' : '#e8f5e9']);
      }
  stack.add(voxelMesh(cells, 0.56));
  const ease = (x) => x * x * (3 - 2 * x);
  return {
    group: g,
    top: 6.4,
    update(t) {
      const p = (t % 3) / 3;
      let down = 0;
      if (p < 0.35) down = ease(p / 0.35);
      else if (p < 0.6) down = 1;
      else down = 1 - ease((p - 0.6) / 0.4);
      const c = 1 - 0.5 * down;
      stack.scale.set(1 + 0.18 * down, c, 1 + 0.18 * down);
      const bottom = 0.9 + H0 * c + 0.02;
      plate.position.y = bottom + 0.175;
      const rodBottom = bottom + 0.35, rodTop = 4.6;
      rod.scale.y = rodTop - rodBottom;
      rod.position.y = (rodTop + rodBottom) / 2;
    },
  };
}

// ---------------------------------------------------------------------------
//  Solveur SBLS : un carré latin 5 × 5 en colonnes de couleurs
// ---------------------------------------------------------------------------
function sbls() {
  const g = new THREE.Group();
  plinth(g, '#ff8a3d');
  const colors = ['#ff8a3d', '#ffd23f', '#4ade80', '#38bdf8', '#a78bfa'];
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 5; j++) {
      const v = (2 * i + j) % 5; // chaque couleur une seule fois par ligne et par colonne
      const h = 0.5 + v * 0.5;
      g.add(b(0.86, h, 0.86, colors[v], (j - 2) * 1.0, 0.3 + h / 2, (i - 2) * 1.0));
    }
  // statique : fusionné avec le décor (aucun coût d'animation)
  return { group: g, top: 3.4 };
}

// ---------------------------------------------------------------------------
//  CV : une feuille de CV en pixel art (coin corné, « CV », photo, lignes)
// ---------------------------------------------------------------------------
const CV_SHEET = [
  '.OOOOOOOOOOOOO....',
  'OWWWWWWWWWWWWOFO..',
  'OWWOOOWOWWWOWOFFO.',
  'OWOWWWWOWWWOWOFFFO',
  'OWOWWWWOWWWOWOOOOO',
  'OWOWWWWWOWOWWWWWWO',
  'OWWOOOWWWOWWWWWWWO',
  'OWWWWWWWWWWWWWWWWO',
  'OWWWDDDWWLLLLWWWWO',
  'OWWDDDDDWWWWWWWWWO',
  'OWWWDDDWWLLLLLLLWO',
  'OWWWWWWWWWWWWWWWWO',
  'OWWDDDDDWLLLLLLLWO',
  'OWWDDDDDWWWWWWWWWO',
  'OWWWWWWWWWWWWWWWWO',
  'OWLLLWLLLLLLLLLLWO',
  'OWWWWWWWWWWWWWWWWO',
  'OWLLLWLLLLLLLLLLWO',
  'OWWWWWWWWWWWWWWWWO',
  'OWLLLWLLLLLLLLLLWO',
  'OSWWWWWWWWWWWWWWWO',
  '.OOOOOOOOOOOOOOOO.',
];
function cv(accent) {
  const g = new THREE.Group();
  plinth(g, accent);
  const holder = new THREE.Group();
  holder.rotation.y = FACE_CAMERA;
  g.add(holder);
  // petit pupitre incliné qui tient la feuille
  holder.add(b(2.6, 0.35, 1.2, '#3b3f4f', 0, 0.48, -0.1));
  const sheet = sprite(CV_SHEET, { O: '#1b1b22', W: '#f4f1fa', F: '#5a5a66', D: '#5a5a66', L: '#1b1b22', S: '#d9d6e6' }, 0.27, 2);
  sheet.position.set(0, 0.6, 0);
  sheet.rotation.x = -0.12;
  holder.add(sheet);
  return { group: g, top: 6.8 };
}

export const LANDMARKS = { joyn, hive, pacman, sampler, twitch, ssd, compression, sbls, about, contact, cv };

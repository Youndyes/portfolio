import * as THREE from 'three';
import { box, ISLAND } from './world.js';

// Réglages de conduite « casual » : les touches indiquent une direction à l'écran
// (haut = vers le haut de l'écran), la voiture s'y oriente toute seule et
// s'arrête dès qu'on relâche.
const SPEED = 11;      // vitesse de croisière
const ACCEL = 45;      // montée en vitesse (quasi instantanée)
const STOP = 14;       // freinage au relâchement (plus = arrêt plus sec)
const TURN = 9;        // vitesse d'orientation (rad/s)
const RADIUS = 0.85;   // rayon de collision

// Axes de l'écran projetés sur le sol (caméra isométrique placée en +x +y +z)
const SCREEN_RIGHT = [Math.SQRT1_2, -Math.SQRT1_2];
const SCREEN_UP = [-Math.SQRT1_2, -Math.SQRT1_2];

export class Car {
  constructor(scene, color = '#e8434b') {
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    const b = this.body;
    const dark = '#262a36';

    b.add(box(1.15, 0.42, 2.1, color, 0, 0.52, 0));          // carrosserie
    b.add(box(1.18, 0.14, 2.14, dark, 0, 0.3, 0));            // bas de caisse
    b.add(box(0.98, 0.4, 1.0, '#a9dcff', 0, 0.93, -0.18));    // vitres
    b.add(box(1.02, 0.1, 1.04, color, 0, 1.17, -0.18));       // toit
    b.add(box(0.26, 0.02, 2.11, '#ffffff', 0, 0.74, 0));      // bande
    b.add(box(1.12, 0.07, 0.32, dark, 0, 1.02, -0.95));       // aileron
    for (const s of [-1, 1]) {
      b.add(box(0.08, 0.26, 0.08, dark, s * 0.4, 0.85, -0.95));
      b.add(box(0.26, 0.13, 0.05, '#fff6c8', s * 0.36, 0.56, 1.06, 1.2)); // phares
      b.add(box(0.26, 0.12, 0.05, '#ff3b3b', s * 0.38, 0.58, -1.06, 0.9)); // feux arrière
    }

    this.wheels = [];
    this.frontPivots = [];
    for (const [x, z, front] of [[-0.58, 0.68, true], [0.58, 0.68, true], [-0.58, -0.68, false], [0.58, -0.68, false]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.24, z);
      const wheel = new THREE.Group();
      wheel.add(box(0.26, 0.46, 0.46, '#1d2028'));
      wheel.add(box(0.28, 0.18, 0.18, '#cfd3da'));
      pivot.add(wheel);
      this.root.add(pivot);
      this.wheels.push(wheel);
      if (front) this.frontPivots.push(pivot);
    }
    // Silhouette visible quand la voiture passe derrière un bâtiment
    // Stencil : la voiture visible marque ses pixels (1), la silhouette ne se dessine
    // que là où la voiture est cachée par autre chose (profondeur plus grande + stencil ≠ 1).
    const ghost = new THREE.MeshBasicMaterial({
      color: '#ffe066', transparent: true, opacity: 0.55, depthWrite: false, depthFunc: THREE.GreaterDepth,
      stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
    });
    const meshes = [];
    this.root.traverse((o) => o.isMesh && meshes.push(o));
    for (const m of meshes) {
      m.material = m.material.clone();
      Object.assign(m.material, {
        stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
      });
      const g = new THREE.Mesh(m.geometry, ghost);
      g.renderOrder = 5;
      m.add(g);
    }
    scene.add(this.root);

    this.pos = new THREE.Vector2();
    this.vel = new THREE.Vector2();
    this.angle = 0;
    this.vf = 0;
    this.vl = 0;
    this.steerVis = 0;
    this.pitch = 0;
    this.roll = 0;
    this.bump = 0;
  }

  reset(x, z, angle) {
    this.pos.set(x, z);
    this.vel.set(0, 0);
    this.angle = angle;
    this.vf = this.vl = 0;
    this.sync();
  }

  get position() {
    return this.root.position;
  }

  lookAhead(out) {
    return out.set(this.pos.x + this.vel.x * 0.35, 0, this.pos.y + this.vel.y * 0.35);
  }

  rearWheels() {
    return [
      this.root.localToWorld(new THREE.Vector3(-0.58, 0.05, -0.75)),
      this.root.localToWorld(new THREE.Vector3(0.58, 0.05, -0.75)),
    ];
  }

  update(dt, input, obstacles) {
    const prevVf = this.vf;
    // direction voulue, dans le repère de l'écran
    let dx = input.x * SCREEN_RIGHT[0] + input.y * SCREEN_UP[0];
    let dz = input.x * SCREEN_RIGHT[1] + input.y * SCREEN_UP[1];
    const len = Math.hypot(dx, dz);
    let turn = 0;
    let vf = Math.max(0, this.vf);

    if (len > 0.01) {
      dx /= len; dz /= len;
      // rotation vers la direction voulue par le plus court chemin
      let diff = Math.atan2(dx, dz) - this.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const step = THREE.MathUtils.clamp(diff, -TURN * dt, TURN * dt);
      this.angle += step;
      turn = THREE.MathUtils.clamp(diff * 2, -1, 1);
      // on ralentit un peu pendant les demi-tours pour ne pas faire de grands arcs
      const target = SPEED * Math.max(0.25, Math.cos(diff));
      vf += THREE.MathUtils.clamp(target - vf, -ACCEL * dt, ACCEL * dt);
    } else {
      vf *= Math.exp(-STOP * dt);
      if (vf < 0.05) vf = 0;
    }

    const fx = Math.sin(this.angle), fz = Math.cos(this.angle);
    this.vel.set(fx * vf, fz * vf);
    this.pos.addScaledVector(this.vel, dt);
    this.collide(obstacles);

    // limites de l'île
    const lim = ISLAND - 1.2;
    if (Math.abs(this.pos.x) > lim) { this.pos.x = Math.sign(this.pos.x) * lim; this.vel.x = 0; }
    if (Math.abs(this.pos.y) > lim) { this.pos.y = Math.sign(this.pos.y) * lim; this.vel.y = 0; }

    // la vitesse conservée est celle qui reste après les collisions (pas de rebond)
    this.vf = Math.max(0, this.vel.x * fx + this.vel.y * fz);
    this.vl = 0;

    // effets visuels
    const k = 1 - Math.exp(-10 * dt);
    this.steerVis += (turn - this.steerVis) * k;
    const accel = (this.vf - prevVf) / Math.max(dt, 1e-4);
    this.pitch += (THREE.MathUtils.clamp(-accel * 0.0015, -0.05, 0.05) - this.pitch) * k;
    this.roll += (THREE.MathUtils.clamp(-this.steerVis * (this.vf / SPEED) * 0.06, -0.08, 0.08) - this.roll) * k;
    this.bump *= Math.exp(-8 * dt);
    for (const w of this.wheels) w.rotation.x += (this.vf * dt) / 0.23;
    for (const p of this.frontPivots) p.rotation.y = this.steerVis * 0.45;
    this.sync();
  }

  collide(obstacles) {
    const p = this.pos;
    for (const o of obstacles) {
      let nx, nz, depth;
      if (o.type === 'circle') {
        const dx = p.x - o.x, dz = p.y - o.z;
        const r = RADIUS + o.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2) || 1e-4;
        nx = dx / d; nz = dz / d; depth = r - d;
      } else {
        const cx = Math.max(o.minX, Math.min(p.x, o.maxX));
        const cz = Math.max(o.minZ, Math.min(p.y, o.maxZ));
        const dx = p.x - cx, dz = p.y - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          nx = dx / d; nz = dz / d; depth = RADIUS - d;
        } else {
          // centre à l'intérieur : sortie par le côté le plus proche
          const pens = [[p.x - o.minX, -1, 0], [o.maxX - p.x, 1, 0], [p.y - o.minZ, 0, -1], [o.maxZ - p.y, 0, 1]];
          pens.sort((a, b) => a[0] - b[0]);
          [depth, nx, nz] = [pens[0][0] + RADIUS, pens[0][1], pens[0][2]];
        }
      }
      p.x += nx * depth;
      p.y += nz * depth;
      const vn = this.vel.x * nx + this.vel.y * nz;
      if (vn < 0) {
        // on glisse le long de l'obstacle, sans rebond
        this.vel.x -= nx * vn;
        this.vel.y -= nz * vn;
      }
    }
  }

  sync() {
    this.root.position.set(this.pos.x, 0, this.pos.y);
    this.root.rotation.y = this.angle;
    this.body.rotation.set(this.pitch, 0, this.roll);
    this.body.position.y = Math.abs(Math.sin(performance.now() * 0.05)) * 0.08 * this.bump;
  }
}

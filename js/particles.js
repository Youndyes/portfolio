import * as THREE from 'three';

// Petit système de particules « cubes » (poussière, fumée, traces de pneus)
export class Particles {
  constructor(scene, max, color, { flat = false, drag = 2, shrink = true } = {}) {
    const geo = flat ? new THREE.BoxGeometry(1, 0.02, 1) : new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), max);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = !flat;
    this.mesh.receiveShadow = flat;
    scene.add(this.mesh);
    this.max = max;
    this.drag = drag;
    this.shrink = shrink;
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max).fill(1);
    this.size = new Float32Array(max);
    this.rot = new Float32Array(max);
    this.next = 0;
    this.dummy = new THREE.Object3D();
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, this.dummy.matrix);
  }

  spawn(x, y, z, vx, vy, vz, life, size, rot = Math.random() * Math.PI) {
    const i = this.next;
    this.next = (i + 1) % this.max;
    this.p.set([x, y, z], i * 3);
    this.v.set([vx, vy, vz], i * 3);
    this.life[i] = this.maxLife[i] = life;
    this.size[i] = size;
    this.rot[i] = rot;
  }

  update(dt) {
    const d = this.dummy, damp = Math.exp(-this.drag * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        if (this.life[i] > -1) {
          this.life[i] = -1;
          d.scale.setScalar(0);
          d.updateMatrix();
          this.mesh.setMatrixAt(i, d.matrix);
        }
        continue;
      }
      this.life[i] -= dt;
      const j = i * 3;
      this.p[j] += this.v[j] * dt;
      this.p[j + 1] += this.v[j + 1] * dt;
      this.p[j + 2] += this.v[j + 2] * dt;
      this.v[j] *= damp;
      this.v[j + 2] *= damp;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      d.position.set(this.p[j], this.p[j + 1], this.p[j + 2]);
      d.rotation.set(0, this.rot[i], 0);
      d.scale.setScalar(this.size[i] * (this.shrink ? k : Math.min(1, k * 3)));
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

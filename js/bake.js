import * as THREE from 'three';

// ============================================================================
//  Fusion des objets statiques
//  Des centaines de petits cubes (arbres, bâtiments, monuments…) coûtent un
//  appel de dessin chacun, et le double avec les ombres. On les fusionne en
//  deux maillages (avec / sans ombre portée), la couleur étant stockée par
//  sommet. Les objets marqués userData.dynamic (et leurs enfants) sont ignorés.
// ============================================================================

function collect(obj, out) {
  if (obj.userData.dynamic) return;
  if (obj.isMesh && !obj.isInstancedMesh && obj.material?.isMeshLambertMaterial
      && !obj.material.transparent && !obj.material.map && obj.material.visible !== false) {
    out.push(obj);
  }
  for (const c of obj.children) collect(c, out);
}

function merge(meshes, castShadow) {
  let count = 0;
  const geos = meshes.map((m) => {
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    count += g.attributes.position.count;
    return { g, m };
  });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const c = new THREE.Color();
  let o = 0;
  for (const { g, m } of geos) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    // l'émissif statique (fenêtres…) est « cuit » dans la couleur
    c.copy(m.material.color);
    const em = m.material.emissive;
    const e = em && em.r + em.g + em.b > 0 ? m.material.emissiveIntensity : 0;
    if (e) c.lerp(new THREE.Color(1, 1, 1), Math.min(0.5, e * 0.35)).multiplyScalar(1 + e * 0.4);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], (o + i) * 3);
    o += n;
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  return mesh;
}

export function bakeStatic(scene) {
  scene.updateMatrixWorld(true);
  const found = [];
  collect(scene, found);
  const casters = found.filter((m) => m.castShadow);
  const others = found.filter((m) => !m.castShadow);
  for (const m of found) m.parent.remove(m);
  const out = [];
  if (casters.length) out.push(merge(casters, true));
  if (others.length) out.push(merge(others, false));
  scene.add(...out);
  return found.length;
}

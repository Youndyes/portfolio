import * as THREE from 'three';
import { profile, projects } from './data.js';
import { buildWorld, SPAWN } from './world.js';
import { Car } from './car.js';
import { UI } from './ui.js';
import { Minimap } from './minimap.js';
import { Particles } from './particles.js';

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// Les étiquettes sont dessinées dans des canvas : on attend la police pixel.
async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('20px "VT323"')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* police de secours */ }
}

async function init() {
  await loadFonts();

  // ---------- Rendu ----------
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor('#3d9bd6');

  const scene = new THREE.Scene();
  if (location.hash === '#debug') window.__pf = { renderer, scene };
  scene.add(new THREE.HemisphereLight('#d6ecff', '#5d7f45', 1.25));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
  const SUN_OFFSET = new THREE.Vector3(-12, 30, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  // Soleil fixe couvrant toute l'île : la grille de la shadow map ne bouge jamais,
  // donc aucune ombre ne « sautille » quand la caméra se déplace.
  Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 220 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.position.copy(SUN_OFFSET).multiplyScalar(2.6);
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  // ---------- Caméra isométrique orthographique ----------
  const CAM_DIR = new THREE.Vector3(1, 1, 1).normalize();
  const CAM_RIGHT = new THREE.Vector3(1, 0, -1).normalize();
  const CAM_UP = new THREE.Vector3(-1, 2, -1).normalize();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.copy(CAM_DIR).multiplyScalar(120);
  camera.lookAt(0, 0, 0);

  let PIXEL = 3, bw = 1, bh = 1;
  let zoom = isTouch ? 20 : 24, zoomTarget = zoom;

  function updateFrustum() {
    const aspect = bw / bh;
    camera.left = (-zoom * aspect) / 2;
    camera.right = (zoom * aspect) / 2;
    camera.top = zoom / 2;
    camera.bottom = -zoom / 2;
    camera.updateProjectionMatrix();
  }
  function resize() {
    PIXEL = Math.min(innerWidth, innerHeight) < 640 ? 2 : 3;
    bw = Math.ceil(innerWidth / PIXEL);
    bh = Math.ceil(innerHeight / PIXEL);
    renderer.setSize(bw, bh, false);
    canvas.style.width = `${bw * PIXEL}px`;
    canvas.style.height = `${bh * PIXEL}px`;
    updateFrustum();
  }
  addEventListener('resize', resize);
  resize();

  // ---------- Monde ----------
  const world = buildWorld(scene, profile, projects);
  const car = new Car(scene);
  car.reset(SPAWN.x, SPAWN.z, SPAWN.angle);

  const dust = new Particles(scene, 160, '#e8dcc0');
  const smoke = new Particles(scene, 120, '#f1f1f1', { drag: 0.6 });

  const minimap = new Minimap(document.getElementById('minimap'), world.zones);

  // Étiquettes HTML (texte net quel que soit le zoom)
  const labelLayer = document.getElementById('labels');
  const labels = world.labels.map((l) => {
    const el = document.createElement('div');
    el.className = 'wlabel';
    el.textContent = l.text;
    el.style.setProperty('--accent', l.color);
    labelLayer.appendChild(el);
    return { el, v: new THREE.Vector3(l.x, l.y, l.z) };
  });
  const proj = new THREE.Vector3();
  function updateLabels() {
    camera.updateMatrixWorld();
    const W = bw * PIXEL, H = bh * PIXEL;
    for (const l of labels) {
      proj.copy(l.v).project(camera);
      const x = Math.round(((proj.x + 1) / 2) * W), y = Math.round(((1 - proj.y) / 2) * H);
      const off = x < -200 || x > W + 200 || y < -50 || y > H + 80;
      l.el.style.display = off ? 'none' : '';
      if (!off) l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    }
  }

  const camTarget = new THREE.Vector3();
  const look = new THREE.Vector3();
  car.lookAhead(camTarget);

  function teleport(zone) {
    const a = Math.atan2(zone.building.x - zone.pad.x, zone.building.z - zone.pad.z);
    car.reset(zone.pad.x, zone.pad.z, a + Math.PI);
    car.lookAhead(camTarget);
  }

  // ---------- UI ----------
  const ui = new UI({
    profile,
    zones: world.zones,
    isTouch,
    onStart: () => {
      document.body.classList.add('playing');
    },
    onTeleport: teleport,
    onLeave: () => {
      try {
        sessionStorage.setItem('pf-return', JSON.stringify({ x: car.pos.x, z: car.pos.y, angle: car.angle, zoom: zoomTarget }));
      } catch { /* stockage indisponible : on repartira de l'accueil */ }
    },
  });
  ui.renderIntro();

  // Retour d'une démo : on reprend directement là où on était
  try {
    const back = JSON.parse(sessionStorage.getItem('pf-return') || 'null');
    sessionStorage.removeItem('pf-return');
    if (back) {
      car.reset(back.x, back.z, back.angle);
      car.lookAhead(camTarget);
      zoomTarget = zoom = back.zoom || zoom;
      updateFrustum();
      ui.intro.hidden = true;
      ui.start();
    }
  } catch { /* ignore */ }

  // ---------- Entrées ----------
  const keys = new Set();
  const touch = { x: 0, y: 0 };
  let activeZone = null;

  addEventListener('keydown', (e) => {
    if (ui.handleKey(e)) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if ((e.code === 'Space' || e.code === 'KeyE') && activeZone) {
      e.preventDefault();
      document.activeElement?.blur?.();
      ui.openZone(activeZone);
    }
    if (e.code === 'KeyR') { car.reset(SPAWN.x, SPAWN.z, SPAWN.angle); car.lookAhead(camTarget); }
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  // Joystick : toutes les directions, l'inclinaison règle la vitesse
  // (garde-fou : sans joystick dans la page, le reste du site fonctionne quand même)
  const stick = document.getElementById('stick');
  if (stick) setupStick(stick);
  function setupStick(stick) {
  const knob = stick.querySelector('.knob');
  let stickId = null;
  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    const max = r.width / 2;
    let dx = e.clientX - (r.left + max), dy = e.clientY - (r.top + max);
    const len = Math.hypot(dx, dy);
    if (len > max) { dx *= max / len; dy *= max / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const m = Math.min(1, len / max);
    // petite zone morte au centre, puis réponse progressive
    const s = m < 0.15 ? 0 : (m - 0.15) / 0.85;
    touch.x = len ? (dx / len) * s : 0;
    touch.y = len ? (-dy / len) * s : 0;
  };
  const releaseStick = () => {
    stickId = null;
    touch.x = touch.y = 0;
    knob.style.transform = '';
    stick.classList.remove('on');
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stickId = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    stick.classList.add('on');
    moveStick(e);
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  stick.addEventListener('pointerup', (e) => { if (e.pointerId === stickId) releaseStick(); });
  stick.addEventListener('pointercancel', releaseStick);
  stick.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  // Bouton « Entrer » : grisé tant que la voiture n'est pas sur une dalle
  const enterBtn = document.getElementById('btn-enter') || document.createElement('button');
  enterBtn.addEventListener('click', () => { if (activeZone && !ui.blocking) ui.openZone(activeZone); });

  // Entrée = direction à l'écran (x vers la droite, y vers le haut)
  const NO_INPUT = { x: 0, y: 0 };
  function readInput() {
    const k = (...codes) => codes.some((c) => keys.has(c));
    if (touch.x || touch.y) return { x: touch.x, y: touch.y };
    const up = k('KeyW', 'ArrowUp');
    const down = k('KeyS', 'ArrowDown');
    const left = k('KeyA', 'ArrowLeft');
    const right = k('KeyD', 'ArrowRight');
    return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (up ? 1 : 0) - (down ? 1 : 0) };
  }

  // Boutons + / − (mobile) : plage plus resserrée pour que la scène reste lisible
  const ZOOM_MIN = 14, ZOOM_MAX = 30;
  const zoomBy = (f) => { zoomTarget = THREE.MathUtils.clamp(zoomTarget * f, ZOOM_MIN, ZOOM_MAX); };
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => zoomBy(1 / 1.2));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => zoomBy(1.2));

  addEventListener('wheel', (e) => {
    if (ui.blocking) return;
    zoomTarget = THREE.MathUtils.clamp(zoomTarget * (e.deltaY > 0 ? 1.1 : 0.9), 12, 40);
  }, { passive: true });

  // Clic sur un bâtiment
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(world.pickables, true)[0];
    return hit?.object.userData.zone || null;
  }
  canvas.addEventListener('click', (e) => {
    if (ui.blocking) return;
    const z = pick(e);
    if (z) ui.openZone(z);
  });
  let hoverPending = false;
  canvas.addEventListener('pointermove', (e) => {
    if (hoverPending || ui.blocking || e.pointerType !== 'mouse') return;
    hoverPending = true;
    requestAnimationFrame(() => {
      hoverPending = false;
      canvas.style.cursor = pick(e) ? 'pointer' : '';
    });
  });

  // ---------- Boucle ----------
  let last = performance.now(), t = 0, dustTimer = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    // la première image peut avoir un horodatage antérieur à `last` : jamais de dt négatif
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    t += dt;

    const input = ui.blocking ? NO_INPUT : readInput();
    car.update(dt, input, world.obstacles);

    activeZone = world.zones.find((z) => Math.abs(car.pos.x - z.pad.x) < 1.8 && Math.abs(car.pos.y - z.pad.z) < 1.8) || null;
    ui.setPrompt(ui.blocking ? null : activeZone);
    const canEnter = !!activeZone && !ui.blocking;
    if (enterBtn.disabled === canEnter) {
      enterBtn.disabled = !canEnter;
      enterBtn.style.setProperty('--accent', activeZone?.color || '#ffd23f');
    }
    world.update(t, dt, activeZone, smoke);

    // Petits nuages de poussière quand on roule
    dustTimer -= dt;
    if (dustTimer <= 0 && car.vf > 4) {
      dustTimer = 0.08;
      for (const w of car.rearWheels()) {
        dust.spawn(w.x, 0.2, w.z, (Math.random() - 0.5) * 1.2, 0.8 + Math.random(), (Math.random() - 0.5) * 1.2, 0.5, 0.2 + Math.random() * 0.12);
      }
    }
    dust.update(dt);
    smoke.update(dt);

    // Caméra : suit la voiture, alignée sur la grille de pixels (pas de scintillement)
    if (Math.abs(zoomTarget - zoom) > 0.01) {
      zoom += (zoomTarget - zoom) * (1 - Math.exp(-8 * dt));
      updateFrustum();
    }
    // La caméra suit simplement la voiture, sans anticipation : aucun
    // dépassement ni retour en arrière quand la voiture s'arrête.
    look.set(car.pos.x, 0, car.pos.y);
    camTarget.lerp(look, 1 - Math.exp(-8 * dt));
    const pos = camTarget.clone().addScaledVector(CAM_DIR, 120);
    const px = zoom / bh;
    const r = pos.dot(CAM_RIGHT), u = pos.dot(CAM_UP);
    pos.addScaledVector(CAM_RIGHT, Math.round(r / px) * px - r).addScaledVector(CAM_UP, Math.round(u / px) * px - u);
    camera.position.copy(pos);


    minimap.draw(car, activeZone, t);
    renderer.render(scene, camera);
    updateLabels();
  }
  requestAnimationFrame(frame);
}

init().catch((err) => {
  console.error(err);
  document.getElementById('intro-card').innerHTML =
    `<h1>Oups</h1><p>Impossible de lancer la scène 3D (WebGL indisponible ?).</p><p class="err">${String(err.message || err)}</p>`;
});

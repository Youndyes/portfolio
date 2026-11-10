import {
  Maze, generateMaze, makeRandom, makeConfig, placePellets, newGameState, step, PacmanAI, GhostState,
  SOL, MUR, MUR_PERMANENT, GHOST_HOUSE, TUNNEL, PORTE,
} from './engine.js';

const W = 28, H = 31, CELL = 20;
const GHOST_COLORS = ['#ff4d4d', '#ff9ad5', '#4cd6ff', '#ffb347'];
const GHOST_NAMES = ['Blinky', 'Pinky', 'Inky', 'Clyde'];

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W * CELL;
canvas.height = H * CELL;

const $ = (id) => document.getElementById(id);
let aStar = [true, true, false, false];
let mode = 'player';      // 'player' | 'ai'
let speed = 1;
let running = false, paused = false;
let seed = Date.now() % 100000;
let state, prev, bot, wallLayer;
let acc = 0, lastAiMs = 0;

// ------------------------------------------------------------------
function buildMaze() {
  const maze = new Maze(W, H);
  maze.applyTemplate();
  generateMaze(maze, makeRandom(seed));
  return maze;
}

function newGame(regenerate = false) {
  if (regenerate || !state) seed = (seed * 9301 + 49297) % 233280;
  const maze = regenerate || !state ? buildMaze() : state.maze;
  const cfg = makeConfig(W, H);
  state = newGameState(maze, placePellets(maze), cfg, aStar);
  bot = new PacmanAI();
  snapshot();
  wallLayer = drawWalls(maze);
  acc = 0;
}

function snapshot() {
  prev = { pac: { ...state.pac }, ghosts: state.ghosts.map((g) => ({ ...g.pos })) };
}

// ------------------------------------------------------------------
//  Rendu
// ------------------------------------------------------------------
function drawWalls(maze) {
  const off = document.createElement('canvas');
  off.width = canvas.width; off.height = canvas.height;
  const c = off.getContext('2d');
  c.fillStyle = '#0a0a12';
  c.fillRect(0, 0, off.width, off.height);
  const isWall = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? false : [MUR, MUR_PERMANENT].includes(maze.get(x, y));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const s = maze.get(x, y);
      const px = x * CELL, py = y * CELL;
      if (s === GHOST_HOUSE) { c.fillStyle = '#141428'; c.fillRect(px, py, CELL, CELL); }
      if (s === PORTE) { c.fillStyle = '#ff9ad5'; c.fillRect(px, py + CELL / 2 - 2, CELL, 4); }
      if (s === MUR || s === MUR_PERMANENT) {
        c.fillStyle = s === MUR_PERMANENT ? '#141a4a' : '#1d2766';
        c.fillRect(px, py, CELL, CELL);
        c.fillStyle = '#4a63ff';
        const t = 2;
        if (!isWall(x, y - 1)) c.fillRect(px, py, CELL, t);
        if (!isWall(x, y + 1)) c.fillRect(px, py + CELL - t, CELL, t);
        if (!isWall(x - 1, y)) c.fillRect(px, py, t, CELL);
        if (!isWall(x + 1, y)) c.fillRect(px + CELL - t, py, t, CELL);
      }
    }
  return off;
}

const lerp = (a, b, t) => (Math.abs(a - b) > 1 ? b : a + (b - a) * t);

function render(t, now) {
  ctx.drawImage(wallLayer, 0, 0);
  const { small, power } = state.pellets;
  ctx.fillStyle = '#fab4b4';
  for (let i = 0; i < small.length; i++) {
    if (small[i]) {
      const x = i % W, y = (i / W) | 0;
      ctx.fillRect(x * CELL + CELL / 2 - 2, y * CELL + CELL / 2 - 2, 4, 4);
    }
  }
  const pulse = 4 + Math.sin(now / 150) * 1.5;
  for (let i = 0; i < power.length; i++) {
    if (power[i]) {
      const x = i % W, y = (i / W) | 0;
      ctx.beginPath();
      ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Fantômes
  const frightLeft = state.frightenedEndTick - state.tick;
  state.ghosts.forEach((g, i) => {
    const p = prev.ghosts[i];
    const gx = lerp(p.x, g.pos.x, t) * CELL + CELL / 2;
    const gy = lerp(p.y, g.pos.y, t) * CELL + CELL / 2;
    const scared = state.frightened && g.state === GhostState.CHASE;
    const flash = scared && frightLeft < 12 && Math.floor(now / 160) % 2;
    drawGhost(gx, gy, scared ? (flash ? '#f4f1e8' : '#2b5cff') : GHOST_COLORS[i], g.pos, scared, now);
  });

  // Pac-Man
  const px = lerp(prev.pac.x, state.pac.x, t) * CELL + CELL / 2;
  const py = lerp(prev.pac.y, state.pac.y, t) * CELL + CELL / 2;
  const ang = Math.atan2(state.pac.dy, state.pac.dx);
  const moving = prev.pac.x !== state.pac.x || prev.pac.y !== state.pac.y;
  const mouth = moving ? (Math.sin(now / 60) + 1) * 0.28 + 0.05 : 0.25;
  ctx.fillStyle = state.freezeTimer > 0 && !state.frightened ? '#ffe9a0' : '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, CELL * 0.45, ang + mouth, ang + Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fill();
}

function drawGhost(x, y, color, pos, scared, now) {
  const r = CELL * 0.45;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 1, r, Math.PI, 0);
  const bottom = y + r;
  const wave = Math.floor(now / 150) % 2 ? 3 : -3;
  ctx.lineTo(x + r, bottom);
  for (let k = 0; k < 4; k++) {
    const x0 = x + r - (k * 2 * r) / 4;
    ctx.lineTo(x0 - r / 4, bottom - 3 + (k % 2 ? wave : -wave));
    ctx.lineTo(x0 - r / 2, bottom);
  }
  ctx.closePath();
  ctx.fill();
  if (scared) {
    ctx.fillStyle = '#ffd6d6';
    ctx.fillRect(x - 5, y - 3, 3, 3);
    ctx.fillRect(x + 2, y - 3, 3, 3);
    return;
  }
  for (const ex of [-4, 4]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x + ex, y - 2, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b2a8a';
    ctx.beginPath(); ctx.arc(x + ex + pos.dx * 1.5, y - 2 + pos.dy * 1.5, 1.7, 0, Math.PI * 2); ctx.fill();
  }
}

// ------------------------------------------------------------------
//  Boucle
// ------------------------------------------------------------------
function tick() {
  snapshot();
  if (mode === 'ai') {
    const t0 = performance.now();
    state.desiredDir = bot.getBestAction(state);
    lastAiMs = performance.now() - t0;
  }
  step(state);
  if (state.lives <= 0) end('Partie perdue', `Score : ${state.score}`);
  else if (state.levelCleared) end('Niveau terminé', `Score : ${state.score}`);
}

function end(title, text) {
  running = false;
  $('ov-title').textContent = title;
  $('ov-text').textContent = text;
  $('overlay').hidden = false;
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const tickDur = 1 / (state.cfg.tickPerSecond * speed);
  if (running && !paused) {
    acc += dt;
    let guard = 0;
    while (acc >= tickDur && running && guard++ < 8) { acc -= tickDur; tick(); }
  }
  render(running && !paused ? Math.min(1, acc / tickDur) : 1, now);
  hud();
}

function hud() {
  $('score').textContent = state.score;
  $('lives').textContent = '●'.repeat(Math.max(0, state.lives)) || '—';
  $('stats').innerHTML = mode === 'ai'
    ? `Décision de l’IA : <b>${lastAiMs.toFixed(1)} ms</b> (${bot.nodes} nœuds)`
    : '';
}

// ------------------------------------------------------------------
//  Contrôles
// ------------------------------------------------------------------
function start(m) {
  setMode(m);
  if (!running) newGame(false);
  running = true;
  paused = false;
  $('pause').textContent = 'Pause';
  $('overlay').hidden = true;
}
function setMode(m) {
  mode = m;
  $('m-player').classList.toggle('on', m === 'player');
  $('m-ai').classList.toggle('on', m === 'ai');
}

$('ov-play').onclick = () => start('player');
$('ov-ai').onclick = () => start('ai');
$('m-player').onclick = () => (running ? setMode('player') : start('player'));
$('m-ai').onclick = () => (running ? setMode('ai') : start('ai'));
$('new-maze').onclick = () => { newGame(true); running = false; start(mode); };
$('pause').onclick = () => {
  if (!running) return;
  paused = !paused;
  $('pause').textContent = paused ? 'Reprendre' : 'Pause';
};
for (const b of document.querySelectorAll('[data-speed]')) {
  b.onclick = () => {
    speed = +b.dataset.speed;
    document.querySelectorAll('[data-speed]').forEach((o) => o.classList.toggle('on', o === b));
  };
}

function buildGhostConfig() {
  $('ghost-config').innerHTML = GHOST_NAMES.map((n, i) => `
    <div class="ghost-row">
      <i style="background:${GHOST_COLORS[i]}"></i><span>${n}</span>
      <span class="seg">
        <button class="btn ${aStar[i] ? 'on' : ''}" data-g="${i}" data-a="1">A*</button>
        <button class="btn ${aStar[i] ? '' : 'on'}" data-g="${i}" data-a="0">Glouton</button>
      </span>
    </div>`).join('');
  for (const b of $('ghost-config').querySelectorAll('button')) {
    b.onclick = () => {
      const i = +b.dataset.g;
      aStar[i] = b.dataset.a === '1';
      if (state) state.ghosts[i].useAStar = aStar[i];
      buildGhostConfig();
    };
  }
}

const KEYS = { ArrowUp: 'UP', KeyW: 'UP', ArrowDown: 'DOWN', KeyS: 'DOWN', ArrowLeft: 'LEFT', KeyA: 'LEFT', ArrowRight: 'RIGHT', KeyD: 'RIGHT' };
addEventListener('keydown', (e) => {
  const d = KEYS[e.code];
  if (d) {
    e.preventDefault();
    if (!running) start('player');
    if (mode === 'ai') setMode('player');
    state.desiredDir = d;
  } else if (e.code === 'Space' || e.code === 'KeyP') {
    e.preventDefault();
    $('pause').click();
  }
});
for (const b of document.querySelectorAll('#pad button')) {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!running) start('player');
    if (mode === 'ai') setMode('player');
    state.desiredDir = b.dataset.d;
  });
}
// Glisser du doigt sur le plateau
let touch0 = null;
$('stage').addEventListener('touchstart', (e) => { touch0 = e.touches[0]; }, { passive: true });
$('stage').addEventListener('touchend', (e) => {
  if (!touch0 || !running) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch0.clientX, dy = t.clientY - touch0.clientY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (mode === 'ai') setMode('player');
  state.desiredDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP');
});

buildGhostConfig();
newGame(true);
requestAnimationFrame(loop);

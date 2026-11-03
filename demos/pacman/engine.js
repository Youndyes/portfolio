// ============================================================================
//  Portage JavaScript du TER « Pac-Man » (Java) — logique identique à :
//    Model/Maze.java, Generator/MazeGenerator.java, Game/GameLogic.java,
//    Game/GameState.java, Game/PelletPlacer.java, Game/PacmanAI.java
// ============================================================================

// --- Model/CellState --------------------------------------------------------
export const SOL = 0, MUR = 1, MUR_PERMANENT = 2, GHOST_HOUSE = 3, TUNNEL = 4, PORTE = 5;

// Générateur pseudo-aléatoire à graine (équivalent de java.util.Random pour la démo)
export function makeRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) { // Collections.shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// --- Model/Maze -------------------------------------------------------------
export class Maze {
  constructor(width, height) {
    if (width % 2 !== 0) throw new Error('La largeur doit être paire pour une symétrie parfaite.');
    this.width = width;
    this.height = height;
    this.grid = new Uint8Array(width * height).fill(MUR);
  }
  get(x, y) { return this.grid[y * this.width + x]; }
  set(x, y, v) { this.grid[y * this.width + x] = v; }

  applyTemplate() {
    const { width, height } = this;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (y <= 1 || y >= height - 2 || x <= 1 || x >= width - 2) this.set(x, y, MUR_PERMANENT);

    // Ghost house au centre
    const ghX = (width >> 1) - 4, ghY = (height >> 1) - 2;
    for (let y = ghY; y < ghY + 5; y++)
      for (let x = ghX; x < ghX + 8; x++) {
        this.set(x, y, GHOST_HOUSE);
        if (y === ghY || y === ghY + 4 || x === ghX || x === ghX + 7) this.set(x, y, MUR_PERMANENT);
      }
    for (let y = ghY - 1; y <= ghY + 5; y++)
      for (let x = ghX - 1; x <= ghX + 8; x++)
        if (x > 1 && x < width - 2 && y > 1 && y < height - 2 && this.get(x, y) === MUR) this.set(x, y, SOL);

    // Tunnels sur les côtés
    let tunnelY = height >> 1;
    if (tunnelY % 2 !== 0) tunnelY++;
    for (let x = 2; x < width - 2; x++) {
      const s = this.get(x, tunnelY);
      if (s !== MUR_PERMANENT && s !== GHOST_HOUSE) this.set(x, tunnelY, SOL);
    }
    const xIn = 2, xOut = width - 3;
    this.set(xIn, tunnelY - 1, SOL); this.set(xIn, tunnelY + 1, SOL);
    this.set(xOut, tunnelY - 1, SOL); this.set(xOut, tunnelY + 1, SOL);
    this.set(0, tunnelY, TUNNEL); this.set(width - 1, tunnelY, TUNNEL);
    this.set(1, tunnelY, SOL); this.set(width - 2, tunnelY, SOL);

    this.set((width >> 1) - 1, ghY, PORTE);
    this.set(width >> 1, ghY, PORTE);
  }
}

// --- Generator/MazeGenerator : Kruskal symétrique + suppression des culs-de-sac
export function generateMaze(maze, rand) {
  const { width, height } = maze;
  const key = (x, y) => y * width + x;
  const sets = new Map();
  let setCounter = 0;
  for (let y = 2; y < height - 2; y += 2)
    for (let x = 2; x < width - 2; x += 2)
      if (maze.get(x, y) === MUR) sets.set(key(x, y), setCounter++);

  const pairs = [];
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width / 2; x += 2) {
      if (x + 2 < width)
        pairs.push({ wall: [x + 1, y], sym: [width - 2 - x, y], c1: [x, y], c2: [x + 2, y], s1: [width - 1 - x, y], s2: [width - 3 - x, y] });
      if (y + 2 < height - 2)
        pairs.push({ wall: [x, y + 1], sym: [width - 1 - x, y + 1], c1: [x, y], c2: [x, y + 2], s1: [width - 1 - x, y], s2: [width - 1 - x, y + 2] });
    }
  }
  shuffle(pairs, rand);

  const replaceAll = (from, to) => { for (const [k, v] of sets) if (v === from) sets.set(k, to); };
  for (const p of pairs) {
    const set1 = sets.get(key(...p.c1)), set2 = sets.get(key(...p.c2));
    if (set1 !== undefined && set2 !== undefined && set1 !== set2) {
      for (const c of [p.wall, p.sym, p.c1, p.c2, p.s1, p.s2]) maze.set(c[0], c[1], SOL);
      replaceAll(set2, set1);
      const sym1 = sets.get(key(...p.s1)), sym2 = sets.get(key(...p.s2));
      if (sym1 !== undefined && sym2 !== undefined) replaceAll(sym2, sym1);
    }
  }
  removeDeadEnds(maze, rand);
}

function removeDeadEnds(maze, rand) {
  const { width, height } = maze;
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  let removed;
  do {
    removed = false;
    outer: for (let y = 2; y < height - 1; y++) {
      for (let x = 2; x < width / 2; x++) {
        if (maze.get(x, y) !== SOL) continue;
        let n = 0;
        for (const [dx, dy] of dirs) {
          const nx = x + dx, ny = y + dy;
          if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && maze.get(nx, ny) === SOL) n++;
        }
        if (n === 1) {
          const breakable = [];
          for (const [dx, dy] of dirs) {
            const wx = x + dx, wy = y + dy;
            if (maze.get(wx, wy) === MUR && maze.get(width - 1 - wx, wy) === MUR) breakable.push([wx, wy]);
          }
          if (breakable.length) {
            shuffle(breakable, rand);
            const [wx, wy] = breakable[0];
            maze.set(wx, wy, SOL);
            maze.set(width - 1 - wx, wy, SOL);
            removed = true;
            break outer;
          }
        }
      }
    }
  } while (removed);
}

// --- Game/GameConfig ----------------------------------------------------------
export function makeConfig(w, h) {
  const cx = w >> 1, cy = h >> 1;
  let tunnelY = h >> 1;
  if (tunnelY % 2 !== 0) tunnelY++;
  const tickPerSecond = 7;
  return {
    tickPerSecond,
    frightenedTicks: 6 * tickPerSecond,
    pelletScore: 10, powerScore: 50, ghostScore1: 200,
    pinkyStartDelay: 40, inkyStartDelay: 80, clydeStartDelay: 120, respawnDelay: 50,
    pacSpawn: { x: 1, y: tunnelY, dx: 1, dy: 0 },
    blinkySpawn: { x: cx - 1, y: cy - 1, dx: 0, dy: 0 },
    pinkySpawn: { x: cx, y: cy + 1, dx: 0, dy: 0 },
    inkySpawn: { x: cx - 2, y: cy - 1, dx: 0, dy: 0 },
    clydeSpawn: { x: cx + 2, y: cy - 1, dx: 0, dy: 0 },
    houseExitTarget: { x: cx, y: cy - 3 },
  };
}

// --- Game/PelletPlacer ------------------------------------------------------
export function placePellets(m) {
  const { width: w, height: h } = m;
  const small = new Uint8Array(w * h), power = new Uint8Array(w * h);
  const ghX = (w >> 1) - 4, ghY = (h >> 1) - 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = m.get(x, y);
      const walk = s === SOL || s === TUNNEL;
      const inHouse = x >= ghX && x < ghX + 8 && y >= ghY && y < ghY + 5;
      small[y * w + x] = walk && !inHouse && s !== PORTE ? 1 : 0;
    }
  for (const [x, y] of [[2, 3], [w - 3, 3], [2, h - 4], [w - 3, h - 4]]) {
    const s = m.get(x, y);
    if (s === SOL || s === TUNNEL) { small[y * w + x] = 0; power[y * w + x] = 1; }
  }
  return { small, power, w };
}

// --- Game/GameState ---------------------------------------------------------
export const GhostState = { IN_HOUSE: 0, EXITING: 1, CHASE: 2 };
const GHOST_TYPES = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

function makeGhost(type, spawn, releaseTick, useAStar) {
  return { type, pos: { ...spawn }, spawnPos: { ...spawn }, state: GhostState.IN_HOUSE, releaseTick, useAStar };
}

export function newGameState(maze, pellets, cfg, aStarConfig) {
  const delays = [0, cfg.pinkyStartDelay, cfg.inkyStartDelay, cfg.clydeStartDelay];
  const spawns = [cfg.blinkySpawn, cfg.pinkySpawn, cfg.inkySpawn, cfg.clydeSpawn];
  return {
    maze, pellets, cfg,
    tick: 0, score: 0, lives: 3, levelCleared: false,
    pac: { ...cfg.pacSpawn },
    ghosts: GHOST_TYPES.map((t, i) => makeGhost(t, spawns[i], delays[i], aStarConfig[i])),
    currentDir: 'NONE', desiredDir: 'NONE',
    frightened: false, frightenedEndTick: -1,
    freezeTimer: 0, ghostToReset: null,
  };
}

// Copie utilisée par l'IA (même sémantique que GameState.copy() en Java)
export function copyState(s) {
  return {
    maze: s.maze,
    pellets: { small: s.pellets.small.slice(), power: s.pellets.power.slice(), w: s.pellets.w },
    cfg: s.cfg,
    tick: s.tick, score: s.score, lives: s.lives, levelCleared: s.levelCleared,
    pac: { ...s.pac },
    ghosts: s.ghosts.map((g, i) => ({
      type: g.type, pos: { ...g.pos }, spawnPos: g.spawnPos, state: g.state, useAStar: g.useAStar,
      releaseTick: [0, s.cfg.pinkyStartDelay, s.cfg.inkyStartDelay, s.cfg.clydeStartDelay][i],
    })),
    currentDir: 'NONE', desiredDir: 'NONE',
    frightened: s.frightened, frightenedEndTick: s.frightenedEndTick,
    freezeTimer: 0, ghostToReset: null,
  };
}

const remaining = (pf) => { let r = 0; for (let i = 0; i < pf.small.length; i++) if (pf.small[i] || pf.power[i]) r++; return r; };

// --- Game/GameLogic ---------------------------------------------------------
const DELTA = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0], NONE: [0, 0] };
const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]]; // Haut, Gauche, Bas, Droite

function isWalk(m, x, y, allowSpecial = false) {
  if (x < 0 || x >= m.width || y < 0 || y >= m.height) return false;
  const s = m.get(x, y);
  if (allowSpecial && (s === PORTE || s === GHOST_HOUSE)) return true;
  return s === SOL || s === TUNNEL;
}

function applyMove(m, e, dx, dy) {
  e.dx = dx; e.dy = dy;
  let nx = e.x + dx;
  if (nx < 0) nx = m.width - 1; else if (nx >= m.width) nx = 0;
  e.x = nx; e.y = e.y + dy;
}

export function step(s) {
  if (s.freezeTimer > 0) { handleFreezeStep(s); return; }
  movePacman(s);
  for (const g of s.ghosts) {
    checkCollision(s, g);
    if (s.freezeTimer > 0) break;
    if (g.state === GhostState.IN_HOUSE && s.tick > g.releaseTick) g.state = GhostState.EXITING;
    moveGhost(s, g);
    checkCollision(s, g);
    if (s.freezeTimer > 0) break;
  }
  if (s.freezeTimer > 0) return;
  handlePellets(s);
  if (s.frightened && s.tick >= s.frightenedEndTick) { s.frightened = false; s.frightenedEndTick = -1; }
  if (remaining(s.pellets) === 0) s.levelCleared = true;
  s.tick++;
}

function handleFreezeStep(s) {
  s.freezeTimer--;
  if (s.freezeTimer === 0 && s.ghostToReset) {
    const g = s.ghostToReset;
    g.pos.x = g.spawnPos.x; g.pos.y = g.spawnPos.y; g.pos.dx = 0; g.pos.dy = 0;
    g.state = GhostState.IN_HOUSE;
    g.releaseTick = s.tick + s.cfg.respawnDelay;
    s.ghostToReset = null;
  }
}

function movePacman(s) {
  const m = s.maze, e = s.pac;
  if (s.desiredDir !== 'NONE') {
    const [tx, ty] = DELTA[s.desiredDir];
    if (isWalk(m, e.x + tx, e.y + ty)) { e.dx = tx; e.dy = ty; s.currentDir = s.desiredDir; }
  }
  const nx = e.x + e.dx, ny = e.y + e.dy;
  if ((nx < 0 || nx >= m.width) && m.get(e.x, e.y) === TUNNEL) {
    e.x = nx < 0 ? m.width - 1 : 0;
    e.y = ny;
    return;
  }
  if (isWalk(m, nx, ny)) { e.x = nx; e.y = ny; }
}

function moveGhost(s, g) {
  const m = s.maze;
  if (g.state === GhostState.IN_HOUSE) return moveIdle(m, g.pos);
  if (s.frightened && g.state === GhostState.CHASE) return moveRandomly(m, g.pos);
  if (g.state === GhostState.EXITING) {
    const { x: tx, y: ty } = s.cfg.houseExitTarget;
    chooseDirectionAStar(m, g.pos, tx, ty, true);
    if (g.pos.x === tx && g.pos.y <= ty) { g.state = GhostState.CHASE; g.pos.dx = -1; g.pos.dy = 0; }
    return;
  }
  const tx = s.pac.x, ty = s.pac.y;
  if (g.useAStar) return chooseDirectionAStar(m, g.pos, tx, ty);
  let targetX = tx, targetY = ty;
  if (g.type === 'PINKY') { targetX = tx + 4 * s.pac.dx; targetY = ty + 4 * s.pac.dy; }
  else if (g.type === 'INKY') {
    const blinky = s.ghosts[0];
    const px = tx + 2 * s.pac.dx, py = ty + 2 * s.pac.dy;
    targetX = px + (px - blinky.pos.x); targetY = py + (py - blinky.pos.y);
  } else if (g.type === 'CLYDE') {
    if (Math.hypot(g.pos.x - tx, g.pos.y - ty) < 8) { targetX = 0; targetY = m.height - 1; }
  }
  chooseDirection(m, g.pos, targetX, targetY, false);
}

function moveIdle(m, g) {
  if (g.dy === 0) g.dy = 1;
  const ny = g.y + g.dy;
  const t = ny >= 0 && ny < m.height ? m.get(g.x, ny) : MUR;
  if (t !== GHOST_HOUSE && t !== SOL) g.dy = -g.dy;
  applyMove(m, g, 0, g.dy);
}

// IA gloutonne : case voisine la plus proche de la cible
function chooseDirection(m, g, tx, ty, allowSpecial) {
  let best = Infinity, bdx = g.dx, bdy = g.dy, found = false;
  for (const [dx, dy] of DIRS) {
    if (!allowSpecial && dx === -g.dx && dy === -g.dy) continue;
    let nx = g.x + dx; const ny = g.y + dy;
    if (nx < 0) nx = m.width - 1; else if (nx >= m.width) nx = 0;
    if (!isWalk(m, nx, ny, allowSpecial)) continue;
    const d = Math.hypot(nx - tx, ny - ty);
    if (d < best) { best = d; bdx = dx; bdy = dy; found = true; }
  }
  if (!found) applyMove(m, g, allowSpecial ? 0 : -g.dx, allowSpecial ? -1 : -g.dy);
  else applyMove(m, g, bdx, bdy);
}

// Tas binaire pour la file de priorité de l'A*
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(n) {
    const a = this.a; a.push(n);
    let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

function findNearestWalkable(m, tx, ty) {
  tx = Math.max(0, Math.min(m.width - 1, tx));
  ty = Math.max(0, Math.min(m.height - 1, ty));
  if (isWalk(m, tx, ty)) return [tx, ty];
  for (let r = 1; r < 6; r++)
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++) {
        const nx = tx + dx, ny = ty + dy;
        if (nx >= 0 && nx < m.width && ny >= 0 && ny < m.height && isWalk(m, nx, ny)) return [nx, ny];
      }
  return [tx, ty];
}

// IA A* : chemin optimal vers la cible (pas de demi-tour au premier pas)
function chooseDirectionAStar(m, g, rawTx, rawTy, allowSpecial = false) {
  const [tx, ty] = findNearestWalkable(m, rawTx, rawTy);
  const W = m.width, H = m.height;
  const closed = new Uint8Array(W * H);
  const open = new Heap();
  open.push({ x: g.x, y: g.y, g: 0, f: Math.abs(g.x - tx) + Math.abs(g.y - ty), parent: null });
  let target = null;
  while (open.size) {
    const cur = open.pop();
    if (cur.x === tx && cur.y === ty) { target = cur; break; }
    closed[cur.y * W + cur.x] = 1;
    for (const [dx, dy] of DIRS) {
      if (!cur.parent && dx === -g.dx && dy === -g.dy) continue;
      let nx = cur.x + dx; const ny = cur.y + dy;
      if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0;
      if (ny < 0 || ny >= H || !isWalk(m, nx, ny, allowSpecial) || closed[ny * W + nx]) continue;
      const gg = cur.g + 1;
      open.push({ x: nx, y: ny, g: gg, f: gg + Math.abs(nx - tx) + Math.abs(ny - ty), parent: cur });
    }
  }
  if (!target) {
    for (const [dx, dy] of DIRS) {
      if (dx === -g.dx && dy === -g.dy) continue;
      let nx = g.x + dx; const ny = g.y + dy;
      if (nx < 0) nx = W - 1; else if (nx >= W) nx = 0;
      if (ny >= 0 && ny < H && isWalk(m, nx, ny, allowSpecial)) return applyMove(m, g, dx, dy);
    }
    return applyMove(m, g, -g.dx, -g.dy);
  }
  while (target.parent && target.parent.parent) target = target.parent;
  let dx = target.x - g.x; const dy = target.y - g.y;
  if (Math.abs(dx) > 1) dx = dx > 0 ? -1 : 1;
  applyMove(m, g, dx, dy);
}

function moveRandomly(m, g) {
  const cands = [];
  for (const [dx, dy] of DIRS) {
    if (dx === -g.dx && dy === -g.dy) continue;
    let nx = g.x + dx;
    if (nx < 0) nx = m.width - 1; else if (nx >= m.width) nx = 0;
    if (isWalk(m, nx, g.y + dy)) cands.push([dx, dy]);
  }
  if (cands.length) { const [dx, dy] = cands[Math.floor(Math.random() * cands.length)]; applyMove(m, g, dx, dy); }
  else { g.dx = -g.dx; g.dy = -g.dy; }
}

function checkCollision(s, g) {
  if (s.pac.x !== g.pos.x || s.pac.y !== g.pos.y) return;
  if (s.frightened) {
    s.score += s.cfg.ghostScore1;
    s.freezeTimer = 10; s.ghostToReset = g;
  } else {
    s.lives--;
    if (s.lives > 0) { s.freezeTimer = 10; s.ghostToReset = g; }
  }
}

function handlePellets(s) {
  const i = s.pac.y * s.pellets.w + s.pac.x;
  if (s.pellets.small[i]) { s.pellets.small[i] = 0; s.score += s.cfg.pelletScore; }
  if (s.pellets.power[i]) {
    s.pellets.power[i] = 0;
    s.score += s.cfg.powerScore;
    s.frightened = true;
    s.frightenedEndTick = s.tick + s.cfg.frightenedTicks;
    for (const g of s.ghosts)
      if (g.state === GhostState.CHASE || g.state === GhostState.EXITING) { g.pos.dx = -g.pos.dx; g.pos.dy = -g.pos.dy; }
  }
}

// --- Game/PacmanAI : Minimax (horizon 4) avec élagage alpha-bêta ------------
const HORIZON = 4, SAMPLES_FRIGHTENED = 5, SAMPLES_CHASE = 1, MEMORY_SIZE = 12;
const ACTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
const OPPOSITE = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT', NONE: 'NONE' };

export class PacmanAI {
  constructor() { this.history = []; this.nodes = 0; }

  getBestAction(state) {
    this.history.push(`${state.pac.x},${state.pac.y}`);
    if (this.history.length > MEMORY_SIZE) this.history.shift();
    this.nodes = 0;
    let maxVal = -Infinity, best = 'NONE', alpha = -Infinity;
    const beta = Infinity;
    for (const a of ACTIONS) {
      if (!this.isValidMove(state, a)) continue;
      const it = state.frightened ? SAMPLES_FRIGHTENED : SAMPLES_CHASE;
      let sum = 0;
      for (let i = 0; i < it; i++) {
        const next = copyState(state);
        next.desiredDir = a;
        step(next);
        sum += this.minimax(next, HORIZON - 1, alpha, beta);
      }
      const val = this.penalties(sum / it, state, a, state.currentDir);
      if (val > maxVal) { maxVal = val; best = a; }
      alpha = Math.max(alpha, maxVal);
    }
    return best;
  }

  minimax(state, depth, alpha, beta) {
    this.nodes++;
    if (depth === 0 || state.lives <= 0 || state.levelCleared) return this.evaluate(state);
    let maxVal = -Infinity;
    for (const a of ACTIONS) {
      if (!this.isValidMove(state, a)) continue;
      const next = copyState(state);
      next.desiredDir = a;
      step(next);
      maxVal = Math.max(maxVal, this.minimax(next, depth - 1, alpha, beta));
      alpha = Math.max(alpha, maxVal);
      if (beta <= alpha) break;
    }
    return maxVal === -Infinity ? this.evaluate(state) : maxVal;
  }

  penalties(score, state, a, currentDir) {
    const [dx, dy] = DELTA[a];
    const k = `${state.pac.x + dx},${state.pac.y + dy}`;
    if (this.history.filter((p) => p === k).length > 1) score -= 10000;
    if (a === OPPOSITE[currentDir]) score -= 200;
    else if (a === currentDir) score += 10;
    return score;
  }

  evaluate(s) {
    if (s.lives <= 0) return -1000000;
    if (s.levelCleared) return 1000000;
    return s.score * 10 - this.nearestPellet(s) * 5 + this.ghosts(s);
  }

  ghosts(s) {
    let v = 0;
    for (const g of s.ghosts) {
      const d = Math.abs(s.pac.x - g.pos.x) + Math.abs(s.pac.y - g.pos.y);
      if (s.frightened) { if (d < 8) v += 200 / (d + 1); }
      else if (d <= 1) v -= 10000;
      else if (d < 3) v -= 1000;
      else if (d < 5) v -= 200;
    }
    return v;
  }

  nearestPellet(s) {
    const { small, w } = s.pellets;
    let min = 9999;
    for (let i = 0; i < small.length; i++)
      if (small[i]) {
        const d = Math.abs(s.pac.x - (i % w)) + Math.abs(s.pac.y - ((i / w) | 0));
        if (d < min) min = d;
      }
    return min;
  }

  isValidMove(s, a) {
    const [dx, dy] = DELTA[a];
    const nx = s.pac.x + dx, ny = s.pac.y + dy;
    if (nx < 0 || nx >= s.maze.width) return true;
    const c = s.maze.get(nx, ny);
    return c !== MUR && c !== MUR_PERMANENT && c !== GHOST_HOUSE;
  }
}

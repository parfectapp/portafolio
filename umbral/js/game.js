/* UMBRAL — game.js
   Bucle principal, mundo, cámara, HUD, menús, guardado, muerte y final. */
'use strict';

const CANW = 960, CANH = 540;
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function xorshift(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ================= estado global ================= */
const G = {
  state: 'title', room: null, roomPx: { w: 0, h: 0 },
  cam: { x: 0, y: 0 }, freezeT: 0, shakeA: 0, shakeX: 0, shakeY: 0,
  player: new Player(),
  foes: [], projs: [], parts: [], coins: [], props: [], amb: [],
  gatesActive: false, bossEnt: null,
  fade: 0, fadeDir: 0, fadeCb: null, fadeCol: '#000',
  roomState: {}, save: null, deadT: 0, endT: 0, spikeFlash: 0,
  zoneToast: null, itemToast: null, cursor: 0,
  hasRelic(id) { return !!this.save && this.save.relics.equipped.includes(id); },
  freeze(t) { this.freezeT = Math.max(this.freezeT, t); },
  shake(n) { this.shakeA = Math.max(this.shakeA, n); },
  playerDeath() {
    if (this.state === 'dead') return;
    this.player.dead = true; AUDIO.healStop(); AUDIO.sfx.death(); AUDIO.stopMusic(1.2);
    this.freeze(0.25); this.shake(14);
    spawnP(26, this.player.cx, this.player.cy, { spread: 260, life: 0.9, col: '#e8e4d8', size: 3 });
    spawnP(14, this.player.cx, this.player.cy, { spread: 160, life: 1.1, col: '#ffd9a0', size: 2 });
    this.state = 'dead'; this.deadT = 0; this.save.stats.deaths++;
  },
  bossDefeated(b) {
    this.save.flags['boss_' + b.type] = true;
    spawnP(40, b.cx, b.cy, { spread: 320, life: 1.1, col: '#ffe9c4', size: 3.5 });
    dropCoins(b.cx, b.cy, 45);
    this.shake(12);
    this.bossEnt = null; this.gatesActive = false;
    if (b.reward && !this.save.flags['reward_' + this.room.id]) {
      this.props.push({ type: 'item', id: b.reward, tx: 0, ty: 0, x: b.cx - 12, y: this.roomPx.h - 3 * T - 60, idx: 'reward', t: 0 });
    }
    if (b.type === 'lumbre') { startEnding(); } else { AUDIO.playTheme(ZONES[this.room.zone].music, 2.2); }
    saveGame();
  },
};
window.G = G;

/* ================= tiles / mundo ================= */
function tileAt(tx, ty) {
  const r = G.room; if (!r) return '#';
  if (tx < 0 || tx >= r.w || ty < 0 || ty >= r.h) {
    for (const ex of r.exits) {
      if (ex.dir === 'L' && tx < 0 && ty >= ex.a && ty <= ex.b) return '.';
      if (ex.dir === 'R' && tx >= r.w && ty >= ex.a && ty <= ex.b) return '.';
      if (ex.dir === 'U' && ty < 0 && tx >= ex.a && tx <= ex.b) return '.';
      if (ex.dir === 'D' && ty >= r.h && tx >= ex.a && tx <= ex.b) return '.';
    }
    return '#';
  }
  return r.g[ty][tx];
}
function solidAt(tx, ty) {
  if (tileAt(tx, ty) === '#') return true;
  if (G.gatesActive && G.room) {
    for (const gt of G.room.gates)
      if (tx >= gt.tx && tx < gt.tx + gt.tw && ty >= gt.ty && ty < gt.ty + gt.th) return true;
  }
  return false;
}

/* ================= partículas / esquirlas / proyectiles ================= */
function spawnP(n, x, y, o) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (o.spread || 0) * (0.3 + Math.random() * 0.7);
    G.parts.push({
      x, y,
      vx: o.vx !== undefined ? o.vx : Math.cos(a) * s,
      vy: o.vy !== undefined ? o.vy : Math.sin(a) * s,
      life: o.life * (0.6 + Math.random() * 0.7), max: o.life,
      col: o.col, size: (o.size || 2) * (0.7 + Math.random() * 0.6), grav: o.grav,
    });
  }
}
function dropCoins(x, y, n) {
  for (let i = 0; i < n; i++)
    G.coins.push({ x, y, vx: (Math.random() - 0.5) * 320, vy: -60 - Math.random() * 240, t: Math.random() * 6 });
}
function addProj(p) { G.projs.push(p); }

/* ================= input ================= */
const keys = {}, pressed = {};
const KEYMAP = {
  l: ['ArrowLeft', 'KeyA'], r: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'Space'], atk: ['KeyX', 'KeyJ'], dash: ['KeyC', 'KeyK'], heal: ['KeyL'],
  spell: ['KeyV', 'KeyI'], map: ['KeyM', 'Tab'], pause: ['Escape', 'KeyP'], inter: ['KeyE'],
};
function down(name) { return KEYMAP[name].some(c => keys[c]); }
function pop(name) { const hit = KEYMAP[name].some(c => pressed[c]); if (hit) KEYMAP[name].forEach(c => delete pressed[c]); return hit; }
let audioStarted = false;
addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
  if (!e.repeat) pressed[e.code] = true;
  keys[e.code] = true;
  if (!audioStarted) { audioStarted = true; AUDIO.unlock(); if (G.state === 'title') AUDIO.playTheme('title'); }
});
addEventListener('keyup', e => { keys[e.code] = false; });

/* ================= guardado ================= */
const SAVE_KEY = 'umbral_save_v1';
function defaultSave() {
  return {
    abilities: { chispa: false, dash: false, garra: false, alas: false },
    relics: { owned: [], equipped: [] }, geo: 0,
    bench: { room: START.room, tx: START.tx, ty: START.ty },
    flags: {}, visited: [], stats: { time: 0, deaths: 0, kills: 0 }, eco: null,
  };
}
function saveGame() {
  if (!G.save) return;
  G.save.abilities = G.player.abilities; G.save.geo = G.player.geo;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {}
}
function loadSaveData() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function applyRelics() {
  G.player.maxHp = 5 + (G.hasRelic('musgo') ? 1 : 0);
  G.player.hp = Math.min(G.player.hp, G.player.maxHp);
}

/* ================= salas ================= */
const roomCanvasCache = {}, parallaxCache = {};

function loadRoom(id, tx, ty, keepV) {
  const prevZone = G.room ? G.room.zone : null;
  const r = ROOMS[id];
  G.room = r; G.roomPx = { w: r.w * T, h: r.h * T };
  G.foes = []; G.projs = []; G.coins = []; G.props = []; G.amb = []; G.parts = [];
  G.bossEnt = null; G.gatesActive = false;
  const rs = G.roomState[id] || (G.roomState[id] = { deadFoes: [], broken: [] });
  r.enemies.forEach((def, i) => { if (!rs.deadFoes.includes(i)) G.foes.push(makeFoe(def.type, def.tx, def.ty, i)); });
  r.props.forEach((p, i) => {
    if (p.type === 'item') {
      const key = 'item_' + id + '_' + i;
      if (G.save.flags[key]) return;
      if (!p.extra.startsWith('relic:') && G.player.abilities[p.extra]) return;
      G.props.push({ type: 'item', id: p.extra, tx: p.tx, ty: p.ty, x: p.tx * T + 4, y: p.ty * T - 8, idx: i, t: 0 });
    } else if (p.type === 'urna') {
      if (!rs.broken.includes(i)) G.props.push({ type: 'urna', tx: p.tx, ty: p.ty, x: p.tx * T + 5, y: (p.ty + 1) * T - 24, w: 22, h: 24, idx: i });
    } else {
      G.props.push({ type: p.type, tx: p.tx, ty: p.ty, x: p.tx * T, y: (p.ty + 1) * T - 40, extra: p.extra, t: Math.random() * 6 });
    }
  });
  if (r.boss && !G.save.flags['boss_' + r.boss.type]) G.bossEnt = new Boss(r.boss.type, r.boss.tx, r.boss.ty);
  if (r.boss && G.save.flags['boss_' + r.boss.type] && BOSS_DEFS[r.boss.type].reward && !G.save.flags['reward_' + id])
    G.props.push({ type: 'item', id: BOSS_DEFS[r.boss.type].reward, tx: 0, ty: 0, x: r.boss.tx * T, y: G.roomPx.h - 3 * T - 60, idx: 'reward', t: 0 });
  if (G.save.eco && G.save.eco.room === id)
    G.props.push({ type: 'eco', x: G.save.eco.x, y: G.save.eco.y, geo: G.save.eco.geo, t: 0 });

  const pl = G.player;
  const oldVx = pl.vx, oldVy = pl.vy;
  pl.x = tx * T + (T - pl.w) / 2; pl.y = (ty + 1) * T - pl.h;
  pl.vx = 0; pl.vy = 0;
  if (keepV) { pl.vx = keepV.vx || 0; pl.vy = keepV.vy || 0; }
  pl.lastSafeX = pl.x; pl.lastSafeY = pl.y;
  if (!G.save.visited.includes(id)) { G.save.visited.push(id); saveGame(); }
  if (r.zone !== prevZone) {
    G.zoneToast = { text: ZONES[r.zone].name, t: 3.4 };
    AUDIO.setRain(!!ZONES[r.zone].rain);
  }
  if (!G.bossEnt || !G.bossEnt.active) AUDIO.playTheme(ZONES[r.zone].music);
  snapCamera();
}
function transitionTo(id, tx, ty, keepV) {
  if (G.fadeDir !== 0) return;
  G.fadeDir = 1; G.fadeCol = '#000';
  G.fadeCb = () => { loadRoom(id, tx, ty, keepV); };
}

/* ================= prerender de sala ================= */
function roomCanvas(r) {
  if (roomCanvasCache[r.id]) return roomCanvasCache[r.id];
  const z = ZONES[r.zone];
  const c = document.createElement('canvas'); c.width = r.w * T; c.height = r.h * T;
  const x = c.getContext('2d');
  const rng = xorshift(hashStr(r.id));
  const sol = (tx, ty) => tx >= 0 && tx < r.w && ty >= 0 && ty < r.h && r.g[ty][tx] === '#';
  for (let ty = 0; ty < r.h; ty++) for (let tx = 0; tx < r.w; tx++) {
    const ch = r.g[ty][tx], px = tx * T, py = ty * T;
    if (ch === '#') {
      x.fillStyle = z.ink; x.fillRect(px, py, T, T);
      if (!sol(tx, ty - 1) && r.g[ty - 1] && r.g[ty - 1][tx] !== '#') {
        x.fillStyle = z.edge; x.globalAlpha = 0.55; x.fillRect(px, py, T, 3); x.globalAlpha = 1;
      }
    } else if (ch === '^') {
      x.fillStyle = z.edge;
      const up = !sol(tx, ty + 1) && sol(tx, ty - 1); // púa de techo
      for (let k = 0; k < 2; k++) {
        const bx = px + k * 16;
        x.beginPath();
        if (up) { x.moveTo(bx, py); x.lineTo(bx + 16, py); x.lineTo(bx + 8, py + 22); }
        else { x.moveTo(bx, py + T); x.lineTo(bx + 16, py + T); x.lineTo(bx + 8, py + 10); }
        x.fill();
      }
    } else if (ch === '-') {
      x.fillStyle = z.ink; x.fillRect(px, py + 2, T, 7);
      x.fillStyle = z.edge; x.globalAlpha = 0.5; x.fillRect(px, py + 2, T, 2); x.globalAlpha = 1;
      x.fillStyle = z.ink; x.fillRect(px + 4, py + 9, 3, 8); x.fillRect(px + 25, py + 9, 3, 8);
    }
  }
  // decoración sembrada
  for (let ty = 0; ty < r.h; ty++) for (let tx = 0; tx < r.w; tx++) {
    if (!sol(tx, ty)) continue;
    const px = tx * T, py = ty * T;
    const above = ty > 0 && r.g[ty - 1][tx] !== '#' && r.g[ty - 1][tx] !== '^';
    const below = ty < r.h - 1 && r.g[ty + 1][tx] !== '#';
    if (above) {
      if (z.deco === 'moss') {
        x.strokeStyle = z.accent; x.globalAlpha = 0.5; x.lineWidth = 1.5;
        for (let k = 0; k < 4; k++) { const gx = px + 3 + rng() * 26, gh = 3 + rng() * 7; x.beginPath(); x.moveTo(gx, py); x.quadraticCurveTo(gx + 2, py - gh * 0.6, gx + (rng() * 4 - 2), py - gh); x.stroke(); }
        x.globalAlpha = 1;
      } else if (z.deco === 'ash') {
        x.fillStyle = z.edge; x.globalAlpha = 0.35;
        for (let k = 0; k < 2; k++) if (rng() < 0.6) x.fillRect(px + rng() * 28, py - 2, 2, 2);
        x.globalAlpha = 1;
      } else if (z.deco === 'webs' && rng() < 0.12) {
        x.strokeStyle = '#3a2f3f'; x.globalAlpha = 0.6; x.lineWidth = 1;
        x.beginPath(); x.moveTo(px + 4, py); x.quadraticCurveTo(px + 16, py + 10, px + 28, py); x.stroke(); x.globalAlpha = 1;
      }
    }
    if (below) {
      if (z.deco === 'moss' && rng() < 0.3) {
        x.strokeStyle = z.accent; x.globalAlpha = 0.35; x.lineWidth = 1.5;
        const vx = px + 4 + rng() * 24, vl = 8 + rng() * 26;
        x.beginPath(); x.moveTo(vx, py + T); x.quadraticCurveTo(vx + 3, py + T + vl * 0.6, vx - 2 + rng() * 4, py + T + vl); x.stroke();
        x.globalAlpha = 1;
      } else if ((z.deco === 'ash' || z.deco === 'webs') && rng() < 0.18) {
        x.fillStyle = z.ink;
        const sx = px + 6 + rng() * 18, sl = 6 + rng() * 12;
        x.beginPath(); x.moveTo(sx - 5, py + T); x.lineTo(sx + 5, py + T); x.lineTo(sx, py + T + sl); x.fill();
      } else if (z.deco === 'city' && rng() < 0.2) {
        x.strokeStyle = z.accent; x.globalAlpha = 0.25; x.lineWidth = 1;
        const dx2 = px + 6 + rng() * 20;
        x.beginPath(); x.moveTo(dx2, py + T); x.lineTo(dx2, py + T + 4 + rng() * 6); x.stroke(); x.globalAlpha = 1;
      }
    }
    // ventanas cálidas en los torreones de la ciudad
    if (z.deco === 'city' && !above && !below && ty > 1 && sol(tx - 1, ty) && sol(tx + 1, ty) && rng() < 0.08) {
      x.fillStyle = '#e8b96a'; x.globalAlpha = 0.5;
      x.fillRect(px + 11, py + 8, 8, 12); x.globalAlpha = 1;
    }
  }
  roomCanvasCache[r.id] = c;
  return c;
}

/* ================= parallax por zona ================= */
function parallax(zone) {
  if (parallaxCache[zone]) return parallaxCache[zone];
  const z = ZONES[zone], layers = [];
  const rng = xorshift(hashStr(zone + 'plx'));
  for (let li = 0; li < 2; li++) {
    const c = document.createElement('canvas'); c.width = 1440; c.height = CANH;
    const x = c.getContext('2d');
    const col = li === 0 ? z.fog : mixCol(z.fog, z.ink, 0.55);
    x.fillStyle = col;
    if (zone === 'ciudad') {
      let bx = 0;
      while (bx < 1440) {
        const bw = 50 + rng() * 90, bh = 120 + rng() * (li === 0 ? 180 : 300);
        x.fillRect(bx, CANH - bh, bw, bh);
        if (rng() < 0.8) x.fillRect(bx + bw * 0.3, CANH - bh - 26, bw * 0.4, 26);
        if (li === 1) { x.fillStyle = 'rgba(232,185,106,0.35)'; for (let k = 0; k < 5; k++) if (rng() < 0.5) x.fillRect(bx + 8 + rng() * (bw - 18), CANH - bh + 12 + rng() * (bh - 30), 4, 6); x.fillStyle = col; }
        bx += bw + 22 + rng() * 60;
      }
    } else if (zone === 'verde') {
      for (let k = 0; k < (li === 0 ? 9 : 13); k++) {
        const fx = rng() * 1440, fh = 130 + rng() * 260, fw = 30 + rng() * 60;
        x.beginPath(); x.moveTo(fx, CANH);
        x.quadraticCurveTo(fx + fw * 0.7, CANH - fh * 0.6, fx + fw * (rng() < 0.5 ? 1.4 : -0.4), CANH - fh);
        x.quadraticCurveTo(fx + fw * 0.5, CANH - fh * 0.5, fx + fw, CANH); x.fill();
      }
    } else if (zone === 'hondura') {
      for (let k = 0; k < (li === 0 ? 8 : 12); k++) {
        const sx = rng() * 1440, sl = 60 + rng() * 200, sw = 14 + rng() * 30;
        x.beginPath(); x.moveTo(sx - sw, 0); x.lineTo(sx + sw, 0); x.lineTo(sx, sl); x.fill();
        if (li === 1 && rng() < 0.5) { x.beginPath(); x.moveTo(sx - sw, CANH); x.lineTo(sx + sw, CANH); x.lineTo(sx, CANH - sl * 0.8); x.fill(); }
      }
    } else { // sendas: monolitos y arcos rotos
      for (let k = 0; k < (li === 0 ? 7 : 10); k++) {
        const mx = rng() * 1440, mh = 100 + rng() * 240, mw = 26 + rng() * 50;
        x.fillRect(mx, CANH - mh, mw, mh);
        if (rng() < 0.4) x.fillRect(mx - mw * 0.4, CANH - mh, mw * 1.8, 14);
      }
    }
    layers.push(c);
  }
  parallaxCache[zone] = layers;
  return layers;
}
function mixCol(a, b, f) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - f) + ((pb >> 16) & 255) * f);
  const g = Math.round(((pa >> 8) & 255) * (1 - f) + ((pb >> 8) & 255) * f);
  const bl = Math.round((pa & 255) * (1 - f) + (pb & 255) * f);
  return `rgb(${r},${g},${bl})`;
}

/* ================= cámara ================= */
function snapCamera() {
  const pl = G.player;
  G.cam.x = clamp(pl.cx - CANW / 2, 0, Math.max(0, G.roomPx.w - CANW));
  G.cam.y = clamp(pl.cy - CANH / 2, 0, Math.max(0, G.roomPx.h - CANH));
}
function updateCamera(dt) {
  const pl = G.player;
  const tx = clamp(pl.cx + pl.face * 42 - CANW / 2, 0, Math.max(0, G.roomPx.w - CANW));
  const ty = clamp(pl.cy - 30 - CANH / 2, 0, Math.max(0, G.roomPx.h - CANH));
  const k = 1 - Math.pow(0.0015, dt);
  G.cam.x += (tx - G.cam.x) * k;
  G.cam.y += (ty - G.cam.y) * k;
  G.shakeA = Math.max(0, G.shakeA - dt * 26);
  G.shakeX = (Math.random() - 0.5) * G.shakeA;
  G.shakeY = (Math.random() - 0.5) * G.shakeA;
}

/* ================= flujo de juego ================= */
function newGame() {
  G.save = defaultSave();
  G.player = new Player();
  G.roomState = {};
  loadRoom(START.room, START.tx, START.ty);
  G.state = 'play';
  saveGame();
}
function continueGame() {
  G.save = loadSaveData() || defaultSave();
  G.player = new Player();
  G.player.abilities = Object.assign(G.player.abilities, G.save.abilities);
  G.player.geo = G.save.geo || 0;
  applyRelics(); G.player.hp = G.player.maxHp;
  G.roomState = {};
  loadRoom(G.save.bench.room, G.save.bench.tx, G.save.bench.ty);
  G.state = 'play';
}
function startEnding() {
  G.state = 'ending'; G.endT = 0;
  G.save.flags.fin = true; saveGame();
  AUDIO.playTheme('alba', 3);
}
function benchRest(prop) {
  const pl = G.player;
  applyRelics(); pl.hp = pl.maxHp;
  G.save.bench = { room: G.room.id, tx: prop.tx, ty: prop.ty - 0 };
  G.roomState = {};
  AUDIO.sfx.bench();
  spawnP(18, prop.x + 20, prop.y + 20, { spread: 90, vy: -60, life: 1, col: '#ffd9a0', size: 2 });
  saveGame();
  G.state = 'bench'; G.cursor = 0;
  // reaparecen los caídos de la sala
  const rs = { deadFoes: [], broken: [] }; G.roomState[G.room.id] = rs;
  G.foes = []; G.room.enemies.forEach((def, i) => G.foes.push(makeFoe(def.type, def.tx, def.ty, i)));
}

/* ================= update: jugando ================= */
function inputSnapshot() {
  return {
    l: down('l'), r: down('r'), up: down('up'), down: down('down'),
    jumpP: pop('jump'), jumpH: down('jump'), atkP: pop('atk'), dashP: pop('dash'),
    healH: down('heal'), spellP: pop('spell'),
    upP: pop('up'), eP: pop('inter'), mapP: pop('map'), pauseP: pop('pause'),
  };
}
function updatePlay(dt) {
  const pl = G.player, inp = inputSnapshot();
  if (inp.pauseP) { G.state = 'pause'; G.cursor = 0; AUDIO.sfx.uiSel(); return; }
  if (inp.mapP) { G.state = 'map'; return; }

  // interacción con props
  if (inp.upP || inp.eP) {
    for (const p of G.props) {
      const px = p.type === 'urna' ? p.x + 11 : p.x + 20;
      if (Math.abs(pl.cx - px) < 42 && Math.abs(pl.cy - (p.y + 20)) < 70) {
        if (p.type === 'estela') { G.state = 'dialog'; G.dialogText = p.extra; AUDIO.sfx.uiSel(); return; }
        if (p.type === 'brasa') { benchRest(p); return; }
      }
    }
  }

  pl.update(dt, inp);

  // púas
  if (pl.inv <= 0 && !pl.dead && touchingSpikes(pl)) {
    pl.damage(1, pl.cx + pl.face);
    if (!pl.dead) {
      pl.x = pl.lastSafeX; pl.y = pl.lastSafeY; pl.vx = 0; pl.vy = 0;
      G.spikeFlash = 0.35; snapCamera();
    }
  }
  if (pl.onGround && !pl.dead) {
    let nearSpike = false;
    for (let ty = Math.floor(pl.y / T) - 1; ty <= Math.floor((pl.y + pl.h) / T) + 1 && !nearSpike; ty++)
      for (let tx = Math.floor(pl.x / T) - 1; tx <= Math.floor((pl.x + pl.w) / T) + 1; tx++)
        if (tileAt(tx, ty) === '^') { nearSpike = true; break; }
    if (!nearSpike) { pl.lastSafeX = pl.x; pl.lastSafeY = pl.y; }
  }

  // espina: resolución de golpes
  const box = pl.slashBox();
  if (box) {
    for (let i = G.foes.length - 1; i >= 0; i--) {
      const e = G.foes[i];
      if (e.lastSlash === pl.slashId || !overlap(box, e)) continue;
      e.lastSlash = pl.slashId;
      const res = hurtFoe(e, 5, pl.cx, pl.slashDir);
      G.freeze(0.045);
      if (res === 'blocked') { if (pl.slashDir === 'down') pl.pogo(); else pl.recoil(-pl.face * 1.6); }
      else {
        pl.gainAnima(11);
        if (pl.slashDir === 'down') pl.pogo(); else if (pl.slashDir === 'side') pl.recoil(-pl.face);
        if (res === 'dead') {
          G.roomState[G.room.id].deadFoes.push(e.idx);
          G.save.stats.kills++; G.foes.splice(i, 1);
        }
      }
    }
    const b = G.bossEnt;
    if (b && b.active && b.lastSlash !== pl.slashId && b.alpha > 0.6 && overlap(box, b)) {
      b.lastSlash = pl.slashId;
      if (b.hurt(5, pl.cx) === 'hit') {
        pl.gainAnima(11); G.freeze(0.045);
        if (pl.slashDir === 'down') pl.pogo(); else if (pl.slashDir === 'side') pl.recoil(-pl.face);
      }
    }
    for (let i = G.props.length - 1; i >= 0; i--) {
      const p = G.props[i];
      if (p.type === 'urna' && overlap(box, p)) {
        AUDIO.sfx.breakUrn();
        spawnP(10, p.x + 11, p.y + 12, { spread: 150, life: 0.5, col: ZONES[G.room.zone].edge, size: 2.5 });
        dropCoins(p.x + 11, p.y + 8, 5 + Math.floor(Math.random() * 4));
        G.roomState[G.room.id].broken.push(p.idx);
        G.props.splice(i, 1);
        if (pl.slashDir === 'down') pl.pogo();
      } else if (p.type === 'eco' && overlap(box, { x: p.x, y: p.y, w: 24, h: 36 })) {
        pl.geo += p.geo; G.save.eco = null; saveGame();
        AUDIO.sfx.eco(); pl.gainAnima(33);
        spawnP(20, p.x + 12, p.y + 18, { spread: 200, life: 0.8, col: '#b7a9d9', size: 2.5 });
        G.props.splice(i, 1);
      }
    }
    for (let i = G.projs.length - 1; i >= 0; i--) {
      const pr = G.projs[i];
      if (pr.hostile && ['lob', 'orb', 'orbline'].includes(pr.kind) && !pr.delay &&
        overlap(box, { x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 })) {
        spawnP(6, pr.x, pr.y, { spread: 110, life: 0.35, col: '#d8d2c2', size: 2 });
        AUDIO.sfx.hit(); G.projs.splice(i, 1);
      }
    }
  }

  // chispa (proyectil del jugador) contra enemigos
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const pr = G.projs[i];
    if (pr.hostile || pr.kind !== 'chispa') continue;
    let used = false;
    for (let j = G.foes.length - 1; j >= 0 && !used; j--) {
      const e = G.foes[j];
      if (overlap({ x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 }, e)) {
        used = true;
        const res = hurtFoe(e, pr.dmg, pr.x, 'spell');
        if (res === 'dead') { G.roomState[G.room.id].deadFoes.push(e.idx); G.save.stats.kills++; G.foes.splice(j, 1); }
      }
    }
    const b = G.bossEnt;
    if (!used && b && b.active && b.alpha > 0.6 && overlap({ x: pr.x - pr.r, y: pr.y - pr.r, w: pr.r * 2, h: pr.r * 2 }, b)) {
      used = true; b.hurt(pr.dmg, pr.x);
    }
    if (used) { spawnP(10, pr.x, pr.y, { spread: 140, life: 0.4, col: '#ffd9a0', size: 2.5 }); G.projs.splice(i, 1); }
  }

  for (const e of G.foes) updateFoe(e, dt, pl);
  for (const e of G.foes) { e.x = clamp(e.x, T, G.roomPx.w - T - e.w); }

  // jefe
  const b = G.bossEnt;
  if (b) {
    if (!b.active && pl.x > 8 * T) { b.activate(); G.gatesActive = true; }
    b.update(dt, pl);
  }

  for (let i = G.projs.length - 1; i >= 0; i--) if (!updateProj(G.projs[i], dt, pl)) G.projs.splice(i, 1);

  // esquirlas
  for (let i = G.coins.length - 1; i >= 0; i--) {
    const c = G.coins[i]; c.t += dt;
    const magnet = G.hasRelic('iman') ? 170 : 30;
    const dx = pl.cx - c.x, dy = pl.cy - c.y, d = Math.hypot(dx, dy);
    if (d < magnet) { c.vx += dx / d * 900 * dt; c.vy += dy / d * 900 * dt; }
    else { c.vy += 1400 * dt; }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (solidAt(Math.floor(c.x / T), Math.floor((c.y + 5) / T)) && c.vy > 0) { c.y = Math.floor((c.y + 5) / T) * T - 5; c.vy *= -0.45; c.vx *= 0.75; }
    if (solidAt(Math.floor(c.x / T), Math.floor(c.y / T)) && Math.abs(c.vx) > 10) c.vx *= -0.6;
    if (d < 24) { pl.geo++; AUDIO.sfx.coin(); spawnP(2, c.x, c.y, { spread: 50, life: 0.3, col: '#d8d2c2', size: 1.5 }); G.coins.splice(i, 1); }
    else if (c.t > 12) G.coins.splice(i, 1);
  }

  // objetos recogibles
  for (let i = G.props.length - 1; i >= 0; i--) {
    const p = G.props[i];
    if (p.type !== 'item') continue;
    p.t += dt;
    if (overlap({ x: p.x - 8, y: p.y - 8, w: 40, h: 44 }, pl)) {
      collectItem(p);
      G.props.splice(i, 1);
    }
  }

  updateParts(dt);
  updateAmbient(dt);
  updateCamera(dt);
  checkExits();
  G.save.stats.time += dt;
}
function collectItem(p) {
  const pl = G.player;
  AUDIO.sfx.ability(); G.freeze(0.18);
  spawnP(24, p.x + 12, p.y + 12, { spread: 240, life: 0.9, col: '#ffe9c4', size: 2.5 });
  if (p.idx === 'reward') G.save.flags['reward_' + G.room.id] = true;
  else G.save.flags['item_' + G.room.id + '_' + p.idx] = true;
  if (String(p.id).startsWith('relic:')) {
    const rid = p.id.slice(6);
    if (!G.save.relics.owned.includes(rid)) G.save.relics.owned.push(rid);
    const r = RELICS[rid];
    G.itemToast = { name: r.name.toUpperCase(), hint: r.desc + '  (Equípala en una brasa.)', t: 4.5 };
  } else {
    pl.abilities[p.id] = true;
    const a = ABILITIES[p.id];
    G.itemToast = { name: a.name, hint: a.hint, t: 5 };
  }
  saveGame();
}
function checkExits() {
  const pl = G.player, r = G.room;
  if (G.fadeDir !== 0 || G.gatesActive) return;
  const r0 = Math.floor(pl.y / T), r1 = Math.floor((pl.y + pl.h - 1) / T);
  const c0 = Math.floor(pl.x / T), c1 = Math.floor((pl.x + pl.w - 1) / T);
  for (const ex of r.exits) {
    if (ex.dir === 'L' && pl.x < -8 && r1 >= ex.a && r0 <= ex.b) return transitionTo(ex.to, ex.tx, ex.ty, { vx: pl.vx, vy: pl.vy });
    if (ex.dir === 'R' && pl.x + pl.w > G.roomPx.w + 8 && r1 >= ex.a && r0 <= ex.b) return transitionTo(ex.to, ex.tx, ex.ty, { vx: pl.vx, vy: pl.vy });
    if (ex.dir === 'U' && pl.y < -10 && c1 >= ex.a && c0 <= ex.b) return transitionTo(ex.to, ex.tx, ex.ty, { vx: pl.vx, vy: -430 });
    if (ex.dir === 'D' && pl.y > G.roomPx.h + 10 && c1 >= ex.a && c0 <= ex.b) return transitionTo(ex.to, ex.tx, ex.ty, { vx: pl.vx, vy: Math.max(pl.vy, 120) });
  }
  pl.x = clamp(pl.x, -pl.w + 8, G.roomPx.w - 8);
  if (pl.y > G.roomPx.h + 300) { pl.y = G.roomPx.h - 4 * T; pl.vy = 0; } // red de seguridad
}
function updateParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    if (p.grav) p.vy += 1000 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 1 - 2.4 * dt; p.vy *= 1 - (p.grav ? 0 : 2.4) * dt;
  }
}
function updateAmbient(dt) {
  const z = ZONES[G.room.zone];
  const want = z.rain ? 110 : z.deco === 'moss' ? 34 : z.deco === 'ash' ? 30 : 14;
  while (G.amb.length < want) {
    if (z.rain) G.amb.push({ x: G.cam.x + Math.random() * (CANW + 240) - 120, y: G.cam.y - 20 - Math.random() * 300, vx: -70, vy: 560 + Math.random() * 140, rain: true });
    else G.amb.push({ x: G.cam.x + Math.random() * (CANW + 100) - 50, y: G.cam.y + Math.random() * CANH, vx: (Math.random() - 0.5) * 16, vy: z.deco === 'ash' ? 14 + Math.random() * 22 : (Math.random() - 0.5) * 14, ph: Math.random() * 6 });
  }
  for (let i = G.amb.length - 1; i >= 0; i--) {
    const a = G.amb[i];
    a.x += a.vx * dt; a.y += a.vy * dt;
    if (!a.rain) { a.ph += dt; a.x += Math.sin(a.ph) * 12 * dt; }
    if (a.rain && solidAt(Math.floor(a.x / T), Math.floor(a.y / T))) {
      spawnP(1, a.x, Math.floor(a.y / T) * T, { vx: (Math.random() - 0.5) * 40, vy: -50, life: 0.25, col: '#7fb2d9', size: 1.2 });
      G.amb.splice(i, 1); continue;
    }
    if (a.y > G.cam.y + CANH + 60 || a.y < G.cam.y - 400 || a.x < G.cam.x - 200 || a.x > G.cam.x + CANW + 200) G.amb.splice(i, 1);
  }
}

/* ================= update: otros estados ================= */
function updateDead(dt) {
  G.deadT += dt;
  updateParts(dt);
  if (G.deadT > 2.4 && G.fadeDir === 0) {
    const pl = G.player;
    G.save.eco = { room: G.room.id, x: clamp(pl.x, T, G.roomPx.w - 2 * T), y: clamp(pl.y, T, G.roomPx.h - 4 * T), geo: pl.geo };
    pl.geo = 0; saveGame();
    G.fadeDir = 1; G.fadeCol = '#000';
    G.fadeCb = () => {
      pl.reset(0, 0); pl.dead = false; applyRelics(); pl.hp = pl.maxHp; pl.anima = 0;
      G.roomState = {};
      loadRoom(G.save.bench.room, G.save.bench.tx, G.save.bench.ty);
      G.state = 'play';
    };
  }
}
const BENCH_ITEMS = ['musgo', 'piedra', 'rezo', 'iman'];
function updateBench(dt) {
  const owned = BENCH_ITEMS.filter(r => G.save.relics.owned.includes(r));
  if (pop('pause') || pop('inter') || pop('jump')) { G.state = 'play'; applyRelics(); G.player.hp = G.player.maxHp; saveGame(); return; }
  if (owned.length) {
    if (pop('up')) { G.cursor = (G.cursor + owned.length - 1) % owned.length; AUDIO.sfx.uiTick(); }
    if (pop('down')) { G.cursor = (G.cursor + 1) % owned.length; AUDIO.sfx.uiTick(); }
    if (pop('atk')) {
      const rid = owned[G.cursor], eq = G.save.relics.equipped;
      if (eq.includes(rid)) { eq.splice(eq.indexOf(rid), 1); AUDIO.sfx.uiTick(); }
      else {
        const used = eq.reduce((s, r) => s + RELICS[r].cost, 0);
        if (used + RELICS[rid].cost <= 3) { eq.push(rid); AUDIO.sfx.uiSel(); }
        else AUDIO.sfx.clang();
      }
      applyRelics(); G.player.hp = G.player.maxHp;
    }
  }
  pop('atk'); pop('map'); pop('l'); pop('r');
}
function updateDialog() {
  if (pop('atk') || pop('jump') || pop('inter') || pop('pause') || pop('up')) { G.state = 'play'; }
}
function updateMap() {
  if (pop('map') || pop('pause') || pop('jump') || pop('atk')) G.state = 'play';
}
const PAUSE_ITEMS = ['Reanudar', 'Controles', 'Salir al título'];
function updatePause() {
  if (pop('pause')) { G.state = 'play'; return; }
  if (pop('up')) { G.cursor = (G.cursor + 2) % 3; AUDIO.sfx.uiTick(); }
  if (pop('down')) { G.cursor = (G.cursor + 1) % 3; AUDIO.sfx.uiTick(); }
  if (pop('jump') || pop('atk') || pop('inter')) {
    AUDIO.sfx.uiSel();
    if (G.cursor === 0) G.state = 'play';
    else if (G.cursor === 1) { G.state = 'controls'; G.backTo = 'pause'; }
    else { saveGame(); G.state = 'title'; G.cursor = 0; AUDIO.playTheme('title', 1.5); AUDIO.setRain(false); }
  }
}
function updateControls() {
  if (pop('pause') || pop('jump') || pop('atk') || pop('inter')) { G.state = G.backTo || 'title'; G.cursor = 0; }
}
function titleItems() { return loadSaveData() ? ['Continuar', 'Nueva partida', 'Controles'] : ['Nueva partida', 'Controles']; }
function updateTitle(dt) {
  const items = titleItems();
  if (pop('up')) { G.cursor = (G.cursor + items.length - 1) % items.length; AUDIO.sfx.uiTick(); }
  if (pop('down')) { G.cursor = (G.cursor + 1) % items.length; AUDIO.sfx.uiTick(); }
  if (pop('jump') || pop('atk') || pop('inter')) {
    const it = items[G.cursor];
    AUDIO.sfx.uiSel();
    if (it === 'Continuar') continueGame();
    else if (it === 'Nueva partida') newGame();
    else { G.state = 'controls'; G.backTo = 'title'; }
  }
}
function updateEnding(dt) {
  G.endT += dt;
  if (G.endT > 4 && (pop('jump') || pop('atk') || pop('inter') || pop('pause'))) {
    G.state = 'title'; G.cursor = 0; AUDIO.playTheme('title', 2); AUDIO.setRain(false);
  }
}

/* ================= render ================= */
function draw() {
  const z = G.room ? ZONES[G.room.zone] : ZONES.sendas;
  // cielo
  const sky = ctx.createLinearGradient(0, 0, 0, CANH);
  sky.addColorStop(0, z.sky[0]); sky.addColorStop(1, z.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CANW, CANH);

  if (G.state === 'title') { drawTitle(); drawFade(); return; }
  if (G.state === 'controls') { drawControls(); return; }
  if (G.state === 'ending') { drawEnding(); return; }
  if (!G.room) return;

  // parallax
  const layers = parallax(G.room.zone);
  [0.18, 0.42].forEach((f, i) => {
    const off = ((G.cam.x * f) % 1440 + 1440) % 1440;
    const yOff = clamp(CANH - G.roomPx.h + G.cam.y * (1 - f * 0.5), -160, 0) * 0.3;
    ctx.drawImage(layers[i], -off, yOff);
    ctx.drawImage(layers[i], -off + 1440, yOff);
  });
  const fogG = ctx.createLinearGradient(0, 0, 0, CANH);
  fogG.addColorStop(0, 'rgba(0,0,0,0)');
  fogG.addColorStop(1, z.fog + '');
  ctx.globalAlpha = 0.35; ctx.fillStyle = fogG; ctx.fillRect(0, 0, CANW, CANH); ctx.globalAlpha = 1;

  // mundo
  ctx.save();
  ctx.translate(Math.round(-G.cam.x + G.shakeX), Math.round(-G.cam.y + G.shakeY));
  ctx.drawImage(roomCanvas(G.room), 0, 0);
  drawGates(z);
  for (const p of G.props) drawProp(p, z);
  // ambiente
  for (const a of G.amb) {
    if (a.rain) { ctx.strokeStyle = 'rgba(127,178,217,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - a.vx * 0.016, a.y - a.vy * 0.016); ctx.stroke(); }
    else { ctx.fillStyle = z.deco === 'moss' ? 'rgba(168,208,138,0.35)' : 'rgba(140,150,170,0.3)'; ctx.fillRect(a.x, a.y, 2, 2); }
  }
  for (const c of G.coins) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.t * 4);
    ctx.fillStyle = '#d8d2c2'; ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.fillStyle = '#8f8a78'; ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  }
  for (const e of G.foes) drawFoe(ctx, e, z.accent);
  if (G.bossEnt) G.bossEnt.draw(ctx, z.accent);
  G.player.draw(ctx);
  for (const pr of G.projs) drawProj(ctx, pr, z.accent);
  for (const p of G.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  drawPrompts();
  ctx.restore();

  if (z.dark) drawDarkness();
  drawVignette();
  drawHUD(z);
  drawToasts();

  if (G.state === 'map') drawMap();
  if (G.state === 'pause') drawPause();
  if (G.state === 'bench') drawBench();
  if (G.state === 'dialog') drawDialog();
  if (G.state === 'dead') {
    ctx.fillStyle = `rgba(0,0,0,${clamp((G.deadT - 0.6) / 1.4, 0, 0.9)})`;
    ctx.fillRect(0, 0, CANW, CANH);
    if (G.deadT > 1.2) {
      ctx.globalAlpha = clamp((G.deadT - 1.2) / 0.8, 0, 1);
      ctx.fillStyle = '#8f8a78'; ctx.font = 'italic 26px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('Te apagaste.', CANW / 2, CANH / 2);
      ctx.globalAlpha = 1;
    }
  }
  if (G.spikeFlash > 0) {
    ctx.fillStyle = `rgba(0,0,0,${clamp(G.spikeFlash * 2.4, 0, 0.85)})`;
    ctx.fillRect(0, 0, CANW, CANH);
  }
  drawFade();
}
function drawGates(z) {
  if (!G.room.gates.length) return;
  const show = G.gatesActive;
  for (const gt of G.room.gates) {
    if (!show) continue;
    const x = gt.tx * T, y = gt.ty * T, w = gt.tw * T, h = gt.th * T;
    ctx.fillStyle = '#171c26'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = z.edge; ctx.globalAlpha = 0.4;
    for (let i = 0; i < gt.th; i++) ctx.fillRect(x, y + i * T + 10, w, 3);
    ctx.globalAlpha = 1;
  }
}
function drawProp(p, z) {
  const t = p.t || 0;
  if (p.type === 'brasa') {
    p.t = t + 0.016;
    const bx = p.x + 20, by = p.y + 40;
    ctx.fillStyle = '#171c26';
    ctx.fillRect(bx - 14, by - 10, 28, 8);
    ctx.fillRect(bx - 4, by - 2, 8, 4);
    // llama
    const fl = 1 + Math.sin(t * 9 + Math.sin(t * 23)) * 0.18;
    const gr = ctx.createRadialGradient(bx, by - 16, 2, bx, by - 16, 34);
    gr.addColorStop(0, 'rgba(255,214,150,0.35)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = gr; ctx.fillRect(bx - 34, by - 50, 68, 68);
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.moveTo(bx - 6, by - 10);
    ctx.quadraticCurveTo(bx - 7, by - 20 * fl, bx, by - 26 * fl);
    ctx.quadraticCurveTo(bx + 7, by - 20 * fl, bx + 6, by - 10);
    ctx.fill();
    ctx.fillStyle = '#fff3dd';
    ctx.beginPath(); ctx.ellipse(bx, by - 13, 3, 5 * fl, 0, 0, 7); ctx.fill();
    if (Math.random() < 0.06) spawnP(1, bx + (Math.random() - 0.5) * 8, by - 20, { vy: -30, vx: (Math.random() - 0.5) * 14, life: 1, col: '#ffd9a0', size: 1.6 });
  } else if (p.type === 'estela') {
    ctx.fillStyle = '#141922';
    ctx.beginPath();
    ctx.moveTo(p.x + 6, p.y + 40); ctx.lineTo(p.x + 8, p.y + 4); ctx.quadraticCurveTo(p.x + 20, p.y - 2, p.x + 32, p.y + 4);
    ctx.lineTo(p.x + 34, p.y + 40); ctx.fill();
    ctx.strokeStyle = z.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(p.x + 12, p.y + 10 + i * 7); ctx.lineTo(p.x + 28, p.y + 10 + i * 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  } else if (p.type === 'urna') {
    ctx.fillStyle = '#1a212e';
    ctx.beginPath(); ctx.ellipse(p.x + 11, p.y + 14, 11, 10, 0, 0, 7); ctx.fill();
    ctx.fillRect(p.x + 6, p.y + 2, 10, 6);
    ctx.fillStyle = z.edge; ctx.globalAlpha = 0.4; ctx.fillRect(p.x + 4, p.y + 10, 14, 2); ctx.globalAlpha = 1;
  } else if (p.type === 'item') {
    p.t = t + 0.016;
    const fy = p.y + Math.sin(t * 2.4) * 5;
    const gr = ctx.createRadialGradient(p.x + 12, fy + 12, 2, p.x + 12, fy + 12, 30);
    gr.addColorStop(0, 'rgba(255,233,196,0.5)'); gr.addColorStop(1, 'rgba(255,233,196,0)');
    ctx.fillStyle = gr; ctx.fillRect(p.x - 18, fy - 18, 60, 60);
    if (String(p.id).startsWith('relic:')) {
      ctx.fillStyle = '#e8e4d8';
      ctx.save(); ctx.translate(p.x + 12, fy + 12); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14); ctx.restore();
      ctx.fillStyle = z.accent;
      ctx.save(); ctx.translate(p.x + 12, fy + 12); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    } else {
      ctx.strokeStyle = '#f2eee2'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x + 12, fy + 12, 9, t * 2, t * 2 + Math.PI * 1.4); ctx.stroke();
      ctx.fillStyle = '#ffe9c4';
      ctx.beginPath(); ctx.arc(p.x + 12, fy + 12, 3.5, 0, 7); ctx.fill();
    }
  } else if (p.type === 'eco') {
    p.t = t + 0.016;
    const fy = p.y + Math.sin(t * 1.8) * 4;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#1a1522';
    ctx.beginPath();
    ctx.moveTo(p.x + 12, fy);
    ctx.quadraticCurveTo(p.x - 2, fy + 18, p.x + 2, fy + 36 + Math.sin(t * 3) * 3);
    ctx.lineTo(p.x + 22, fy + 36 - Math.sin(t * 3) * 3);
    ctx.quadraticCurveTo(p.x + 26, fy + 18, p.x + 12, fy);
    ctx.fill();
    ctx.fillStyle = '#b7a9d9';
    ctx.fillRect(p.x + 7, fy + 8, 3, 5); ctx.fillRect(p.x + 14, fy + 8, 3, 5);
    ctx.globalAlpha = 1;
  }
}
function drawPrompts() {
  const pl = G.player;
  for (const p of G.props) {
    if (p.type !== 'estela' && p.type !== 'brasa') continue;
    const px = p.x + 20;
    if (Math.abs(pl.cx - px) < 42 && Math.abs(pl.cy - (p.y + 20)) < 70) {
      const bob = Math.sin(performance.now() / 250) * 3;
      ctx.fillStyle = 'rgba(232,228,216,0.9)';
      ctx.font = '13px Menlo, monospace'; ctx.textAlign = 'center';
      ctx.fillText('↑', px, p.y - 12 + bob);
    }
  }
}
function drawDarkness() {
  const dk = drawDarkness.cv || (drawDarkness.cv = document.createElement('canvas'));
  dk.width = CANW; dk.height = CANH;
  const dx = dk.getContext('2d');
  dx.fillStyle = 'rgba(0,0,0,0.93)'; dx.fillRect(0, 0, CANW, CANH);
  dx.globalCompositeOperation = 'destination-out';
  const holes = [[G.player.cx, G.player.cy, 185]];
  for (const p of G.props) {
    if (p.type === 'brasa') holes.push([p.x + 20, p.y + 24, 110]);
    if (p.type === 'estela') holes.push([p.x + 20, p.y + 20, 60]);
    if (p.type === 'item') holes.push([p.x + 12, p.y + 12, 70]);
  }
  for (const pr of G.projs) if (pr.kind === 'chispa' || pr.kind === 'ember') holes.push([pr.x, pr.y, 60]);
  if (G.bossEnt) holes.push([G.bossEnt.cx, G.bossEnt.cy, G.bossEnt.type === 'lumbre' ? 260 : 120]);
  for (const [hx, hy, hr] of holes) {
    const sx = hx - G.cam.x, sy = hy - G.cam.y;
    const gr = dx.createRadialGradient(sx, sy, hr * 0.25, sx, sy, hr);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dx.fillStyle = gr;
    dx.fillRect(sx - hr, sy - hr, hr * 2, hr * 2);
  }
  ctx.drawImage(dk, 0, 0);
}
let vignetteCv = null;
function drawVignette() {
  if (!vignetteCv) {
    vignetteCv = document.createElement('canvas'); vignetteCv.width = CANW; vignetteCv.height = CANH;
    const vx = vignetteCv.getContext('2d');
    const gr = vx.createRadialGradient(CANW / 2, CANH / 2, CANH * 0.42, CANW / 2, CANH / 2, CANH * 0.95);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
    vx.fillStyle = gr; vx.fillRect(0, 0, CANW, CANH);
  }
  ctx.drawImage(vignetteCv, 0, 0);
}
function drawHUD(z) {
  const pl = G.player;
  // orbe de ánima
  const ox = 46, oy = 48, or_ = 19;
  ctx.fillStyle = 'rgba(10,12,16,0.75)';
  ctx.beginPath(); ctx.arc(ox, oy, or_ + 3, 0, 7); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(ox, oy, or_, 0, 7); ctx.clip();
  const fh = (pl.anima / 99) * or_ * 2;
  ctx.fillStyle = '#e9ddc0';
  ctx.fillRect(ox - or_, oy + or_ - fh, or_ * 2, fh);
  if (pl.anima >= 33) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(ox - or_, oy + or_ - fh, or_ * 2, 3); }
  ctx.restore();
  ctx.strokeStyle = pl.anima >= 33 ? '#e9ddc0' : '#4a5060'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ox, oy, or_ + 3, 0, 7); ctx.stroke();
  // candelas
  for (let i = 0; i < pl.maxHp; i++) {
    const cx2 = 86 + i * 26, cy2 = 40;
    const lit = i < pl.hp;
    const fl = lit ? 1 + Math.sin(performance.now() / 130 + i * 2) * 0.12 : 1;
    ctx.fillStyle = lit ? '#ffd9a0' : 'rgba(60,66,80,0.8)';
    ctx.beginPath();
    ctx.moveTo(cx2 - 6, cy2 + 8);
    ctx.quadraticCurveTo(cx2 - 7, cy2 - 4 * fl, cx2, cy2 - 12 * fl);
    ctx.quadraticCurveTo(cx2 + 7, cy2 - 4 * fl, cx2 + 6, cy2 + 8);
    ctx.fill();
    if (lit) { ctx.fillStyle = '#fff3dd'; ctx.beginPath(); ctx.ellipse(cx2, cy2 - 1, 2.4, 4.5, 0, 0, 7); ctx.fill(); }
  }
  // esquirlas
  ctx.save(); ctx.translate(40, 92); ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#d8d2c2'; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  ctx.fillStyle = '#d8d2c2'; ctx.font = '15px Menlo, monospace'; ctx.textAlign = 'left';
  ctx.fillText(String(pl.geo), 56, 97);
  // reliquias equipadas
  G.save.relics.equipped.forEach((rid, i) => {
    ctx.save(); ctx.translate(36 + i * 20, 124); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#8fa3bd'; ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = z.accent; ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
  });
  // barra de jefe
  const b = G.bossEnt;
  if (b && b.active && b.state !== 'wait') {
    const bw = 400, bx = CANW / 2 - bw / 2, by = CANH - 44;
    ctx.fillStyle = 'rgba(10,12,16,0.7)'; ctx.fillRect(bx - 4, by - 4, bw + 8, 16);
    ctx.fillStyle = '#2a3140'; ctx.fillRect(bx, by, bw, 8);
    ctx.fillStyle = z.accent; ctx.fillRect(bx, by, bw * (b.hp / b.maxHp), 8);
    ctx.fillStyle = '#d8d2c2'; ctx.font = '13px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(b.name, CANW / 2, by - 10);
  }
}
function drawToasts() {
  if (G.zoneToast) {
    const t = G.zoneToast; t.t -= 0.016;
    if (t.t <= 0) G.zoneToast = null;
    else {
      const a = Math.min(1, Math.min(t.t, 3.4 - t.t) * 1.6);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e8e4d8'; ctx.font = '32px Georgia, serif'; ctx.textAlign = 'center';
      const sp = t.text.split('').join('  ');
      ctx.fillText(sp, CANW / 2, 150);
      ctx.fillRect(CANW / 2 - 60, 166, 120, 1);
      ctx.globalAlpha = 1;
    }
  }
  if (G.itemToast) {
    const t = G.itemToast; t.t -= 0.016;
    if (t.t <= 0) G.itemToast = null;
    else {
      const a = Math.min(1, Math.min(t.t, 5 - t.t) * 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(10,12,16,0.85)';
      ctx.fillRect(CANW / 2 - 260, 190, 520, 74);
      ctx.strokeStyle = '#8f8a78'; ctx.strokeRect(CANW / 2 - 260 + 6, 196, 508, 62);
      ctx.fillStyle = '#ffe9c4'; ctx.font = '22px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText(t.name, CANW / 2, 220);
      ctx.fillStyle = '#b9b2a0'; ctx.font = '13px Menlo, monospace';
      ctx.fillText(t.hint, CANW / 2, 246);
      ctx.globalAlpha = 1;
    }
  }
}
function panelBG(x, y, w, h) {
  ctx.fillStyle = 'rgba(6,8,12,0.88)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#3a4150'; ctx.lineWidth = 1; ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
}
function drawMap() {
  panelBG(60, 40, CANW - 120, CANH - 80);
  ctx.fillStyle = '#e8e4d8'; ctx.font = '24px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('E L   R E I N O', CANW / 2, 84);
  const u = 15, offX = CANW / 2 - 17 * u, offY = 110;
  for (const id of G.save.visited) {
    const r = ROOMS[id]; if (!r) continue;
    const [mx, my, mw, mh] = r.map;
    const x = offX + mx * u, y = offY + my * u;
    ctx.fillStyle = 'rgba(60,70,90,0.25)';
    ctx.fillRect(x, y, mw * u - 3, mh * u - 3);
    ctx.strokeStyle = ZONES[r.zone].edge; ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, mw * u - 3, mh * u - 3);
    if (r.props.some(p => p.type === 'brasa')) {
      ctx.fillStyle = '#ffd9a0'; ctx.beginPath();
      ctx.arc(x + mw * u - 12, y + 9, 3, 0, 7); ctx.fill();
    }
    if (G.room && id === G.room.id && Math.floor(performance.now() / 400) % 2 === 0) {
      ctx.fillStyle = '#fff3dd'; ctx.beginPath();
      ctx.arc(x + (mw * u) / 2, y + (mh * u) / 2, 4, 0, 7); ctx.fill();
    }
  }
  ctx.fillStyle = '#8f8a78'; ctx.font = '12px Menlo, monospace';
  ctx.fillText('M — cerrar', CANW / 2, CANH - 56);
}
function drawPause() {
  panelBG(CANW / 2 - 170, 150, 340, 240);
  ctx.fillStyle = '#e8e4d8'; ctx.font = '26px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('PAUSA', CANW / 2, 196);
  PAUSE_ITEMS.forEach((it, i) => {
    ctx.fillStyle = i === G.cursor ? '#ffe9c4' : '#8f8a78';
    ctx.font = i === G.cursor ? '19px Georgia, serif' : '17px Georgia, serif';
    ctx.fillText((i === G.cursor ? '— ' : '') + it + (i === G.cursor ? ' —' : ''), CANW / 2, 248 + i * 40);
  });
}
function drawBench() {
  const owned = BENCH_ITEMS.filter(r => G.save.relics.owned.includes(r));
  panelBG(CANW / 2 - 250, 110, 500, 320);
  ctx.fillStyle = '#ffe9c4'; ctx.font = '24px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('LA BRASA ARDE', CANW / 2, 152);
  ctx.fillStyle = '#8f8a78'; ctx.font = '13px Menlo, monospace';
  ctx.fillText('descansaste — el reino contiene el aliento', CANW / 2, 176);
  const used = G.save.relics.equipped.reduce((s, r) => s + RELICS[r].cost, 0);
  let mu = '';
  for (let i = 0; i < 3; i++) mu += i < used ? '◆ ' : '◇ ';
  ctx.fillStyle = '#d8d2c2'; ctx.font = '15px Menlo, monospace';
  ctx.fillText('MUESCAS  ' + mu, CANW / 2, 206);
  if (!owned.length) {
    ctx.fillStyle = '#8f8a78'; ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText('Aún no llevas ninguna reliquia.', CANW / 2, 268);
  } else {
    owned.forEach((rid, i) => {
      const r = RELICS[rid], eq = G.save.relics.equipped.includes(rid);
      const y = 240 + i * 42;
      ctx.textAlign = 'left';
      ctx.fillStyle = i === G.cursor ? '#ffe9c4' : '#a8a191';
      ctx.font = '16px Georgia, serif';
      ctx.fillText((i === G.cursor ? '› ' : '  ') + r.name + '  (' + r.cost + ')', CANW / 2 - 220, y);
      ctx.fillStyle = eq ? '#a8d08a' : '#5a6070';
      ctx.font = '12px Menlo, monospace'; ctx.textAlign = 'right';
      ctx.fillText(eq ? 'EQUIPADA' : '—', CANW / 2 + 220, y);
      ctx.textAlign = 'left'; ctx.fillStyle = '#6f6a5e'; ctx.font = '12px Menlo, monospace';
      ctx.fillText(r.desc, CANW / 2 - 196, y + 17);
    });
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#6f6a5e'; ctx.font = '12px Menlo, monospace';
  ctx.fillText('↑↓ elegir · X equipar · Z levantarse', CANW / 2, 410);
}
function drawDialog() {
  panelBG(120, CANH - 170, CANW - 240, 120);
  ctx.fillStyle = '#d8d2c2'; ctx.font = 'italic 16px Georgia, serif'; ctx.textAlign = 'center';
  const lines = (G.dialogText || '').split('\n');
  lines.forEach((l, i) => ctx.fillText(l, CANW / 2, CANH - 128 + i * 26));
  ctx.fillStyle = '#6f6a5e'; ctx.font = '11px Menlo, monospace';
  ctx.fillText('X — cerrar', CANW / 2, CANH - 66);
}
let titleT = 0;
function drawTitle() {
  titleT += 0.016;
  const layers = parallax('sendas');
  const off = (titleT * 12) % 1440;
  ctx.globalAlpha = 0.7;
  ctx.drawImage(layers[0], -off, 0); ctx.drawImage(layers[0], -off + 1440, 0);
  const off2 = (off * 2.2) % 1440;
  ctx.drawImage(layers[1], -off2, 0); ctx.drawImage(layers[1], -off2 + 1440, 0);
  ctx.globalAlpha = 1;
  // pavesas flotando
  ctx.fillStyle = 'rgba(255,214,150,0.5)';
  for (let i = 0; i < 14; i++) {
    const x = (i * 137 + Math.sin(titleT * 0.4 + i * 2) * 60 + titleT * 9) % CANW;
    const y = (i * 83 + Math.cos(titleT * 0.3 + i) * 40) % CANH;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.fillStyle = 'rgba(4,6,10,0.45)'; ctx.fillRect(0, 0, CANW, CANH);
  ctx.fillStyle = '#e8e4d8'; ctx.textAlign = 'center';
  ctx.font = '86px Georgia, serif';
  ctx.fillText('U M B R A L', CANW / 2, 208);
  ctx.fillStyle = '#8f8a78'; ctx.font = 'italic 17px Georgia, serif';
  ctx.fillText('un reino hundido bajo la niebla', CANW / 2, 244);
  ctx.fillRect(CANW / 2 - 90, 262, 180, 1);
  const items = titleItems();
  items.forEach((it, i) => {
    ctx.fillStyle = i === G.cursor ? '#ffe9c4' : '#8f8a78';
    ctx.font = i === G.cursor ? '20px Georgia, serif' : '18px Georgia, serif';
    ctx.fillText((i === G.cursor ? '— ' : '') + it + (i === G.cursor ? ' —' : ''), CANW / 2, 330 + i * 42);
  });
  ctx.fillStyle = '#5a5648'; ctx.font = '11px Menlo, monospace';
  ctx.fillText('Z elegir · ↑↓ moverse', CANW / 2, CANH - 46);
  ctx.fillText('una pavesa · una espina · la niebla', CANW / 2, CANH - 26);
  drawVignette();
}
function drawControls() {
  ctx.fillStyle = 'rgba(4,6,10,0.6)'; ctx.fillRect(0, 0, CANW, CANH);
  panelBG(CANW / 2 - 240, 70, 480, 400);
  ctx.fillStyle = '#e8e4d8'; ctx.font = '24px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('CONTROLES', CANW / 2, 116);
  const rows = [
    ['← →  /  A D', 'moverse'], ['Z / Espacio', 'saltar'], ['X / J', 'espina (con ↑ o ↓ apuntas)'],
    ['C / K', 'manto de ceniza (dash)'], ['L (mantener)', 'rezar — sana 1 candela (33 ánima)'],
    ['V / I', 'chispa errante (33 ánima)'], ['↑ / E', 'interactuar'], ['↓', 'bajar por rejas'],
    ['M / Tab', 'mapa'], ['Esc / P', 'pausa'],
  ];
  rows.forEach(([k, v], i) => {
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffe9c4'; ctx.font = '14px Menlo, monospace';
    ctx.fillText(k, CANW / 2 - 20, 158 + i * 29);
    ctx.textAlign = 'left'; ctx.fillStyle = '#a8a191'; ctx.font = '14px Georgia, serif';
    ctx.fillText(v, CANW / 2 + 4, 158 + i * 29);
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#6f6a5e'; ctx.font = '12px Menlo, monospace';
  ctx.fillText('Z — volver', CANW / 2, 448);
}
function drawEnding() {
  const t = G.endT;
  ctx.fillStyle = '#0b0f16'; ctx.fillRect(0, 0, CANW, CANH);
  const w = clamp(t / 2.5, 0, 1);
  ctx.fillStyle = `rgba(244,238,224,${w * 0.92})`; ctx.fillRect(0, 0, CANW, CANH);
  if (t > 2.2) {
    const a = clamp((t - 2.2) / 1.5, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#3a3428'; ctx.textAlign = 'center';
    ctx.font = '64px Georgia, serif';
    ctx.fillText('E L   A L B A', CANW / 2, 170);
    ctx.font = 'italic 18px Georgia, serif'; ctx.fillStyle = '#6f6654';
    ctx.fillText('La Lumbre descansa. El reino queda a oscuras,', CANW / 2, 226);
    ctx.fillText('y sin embargo: amanece.', CANW / 2, 252);
    const s = G.save.stats;
    const mm = String(Math.floor(s.time / 60)).padStart(2, '0'), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
    ctx.font = '14px Menlo, monospace'; ctx.fillStyle = '#8a8068';
    ctx.fillText(`tiempo  ${mm}:${ss}       muertes  ${s.deaths}       esquirlas  ${G.player.geo}`, CANW / 2, 330);
    ctx.fillText(`reliquias  ${G.save.relics.owned.length} / 4`, CANW / 2, 356);
    ctx.font = 'italic 15px Georgia, serif'; ctx.fillStyle = '#6f6654';
    ctx.fillText('Gracias por jugar — UMBRAL', CANW / 2, 420);
    if (t > 4) ctx.fillText('pulsa Z', CANW / 2, 456);
    ctx.globalAlpha = 1;
  }
}
function drawFade() {
  if (G.fadeDir === 0 && G.fade <= 0) return;
  ctx.fillStyle = G.fadeCol;
  ctx.globalAlpha = clamp(G.fade, 0, 1);
  ctx.fillRect(0, 0, CANW, CANH);
  ctx.globalAlpha = 1;
}

/* ================= bucle ================= */
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;
  // fundido de transición
  if (G.fadeDir === 1) {
    G.fade += dt * 4.2;
    if (G.fade >= 1) { G.fade = 1; G.fadeDir = -1; if (G.fadeCb) { G.fadeCb(); G.fadeCb = null; } }
  } else if (G.fadeDir === -1) {
    G.fade -= dt * 3;
    if (G.fade <= 0) { G.fade = 0; G.fadeDir = 0; }
  }
  G.spikeFlash = Math.max(0, G.spikeFlash - dt);
  if (G.freezeT > 0) { G.freezeT -= dt; draw(); return; }
  const busy = G.fadeDir === 1;
  switch (G.state) {
    case 'title': updateTitle(dt); break;
    case 'play': if (!busy) updatePlay(dt); break;
    case 'dead': updateDead(dt); break;
    case 'pause': updatePause(); break;
    case 'map': updateMap(); break;
    case 'bench': updateBench(dt); break;
    case 'dialog': updateDialog(); break;
    case 'controls': updateControls(); break;
    case 'ending': updateEnding(dt); break;
  }
  for (const k in pressed) delete pressed[k];
  draw();
}

/* ================= escala / arranque ================= */
function fit() {
  const s = Math.min(innerWidth / CANW, innerHeight / CANH);
  cv.style.width = CANW * s + 'px';
  cv.style.height = CANH * s + 'px';
}
addEventListener('resize', fit); fit();

/* ================= debug ================= */
window.__umbral = {
  G,
  get p() { return G.player; },
  warp(id, tx, ty) { const r = ROOMS[id]; loadRoom(id, tx ?? 3, ty ?? r.h - 4); G.state = 'play'; },
  giveAll() { const a = G.player.abilities; a.chispa = a.dash = a.garra = a.alas = true; G.save.relics.owned = ['musgo', 'piedra', 'rezo', 'iman']; saveGame(); },
  god() { G.player.inv = 1e9; G.player.hp = 9; G.player.maxHp = 9; },
  geo(n) { G.player.geo += n || 500; },
  killBoss() { if (G.bossEnt) { G.bossEnt.activate(); G.bossEnt.hurt(9999, 0); } },
  start() { newGame(); },
};

requestAnimationFrame(frame);

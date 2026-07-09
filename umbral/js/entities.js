/* UMBRAL — entities.js
   La Pavesa (jugador), bestiario, jefes, proyectiles, esquirlas, partículas. */
'use strict';

const PHYS = {
  grav: 2200, maxFall: 900, run: 260, accel: 2800, decel: 3200,
  jumpV: -680, jumpCut: -160, coyote: 0.09, buffer: 0.12,
  dashV: 520, dashT: 0.18, dashCD: 0.45,
  wallSlide: 140, wallJx: 330, wallJy: -540, wallLock: 0.13,
  pogoV: -520, djV: -560,
};

/* ================= JUGADOR ================= */
class Player {
  constructor() {
    this.w = 20; this.h = 34;
    this.reset(0, 0);
    this.maxHp = 5; this.hp = 5; this.anima = 0; this.geo = 0;
    this.abilities = { chispa: false, dash: false, garra: false, alas: false };
  }
  reset(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.wallDir = 0; this.coyote = 0; this.jbuf = 0;
    this.usedDJ = false; this.dashT = 0; this.dashCD = 0; this.dashDir = 1;
    this.slashT = 0; this.slashCD = 0; this.slashDir = 'side'; this.slashId = 0;
    this.healT = 0; this.healing = false; this.inv = 0; this.lockT = 0; this.dropT = 0;
    this.spellCD = 0; this.dead = false; this.trail = []; this.animT = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, inp) {
    if (this.dead) return;
    this.animT += dt;
    this.coyote -= dt; this.jbuf -= dt; this.dashCD -= dt; this.slashCD -= dt;
    this.inv -= dt; this.lockT -= dt; this.dropT -= dt; this.spellCD -= dt;
    this.slashT -= dt;
    if (inp.jumpP) this.jbuf = PHYS.buffer;

    const R = this.abilities;
    const move = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);

    // --- rezo (cura canalizada) ---
    const wantHeal = inp.healH && this.onGround && this.anima >= 33 && this.hp < this.maxHp && this.dashT <= 0;
    if (wantHeal) {
      if (!this.healing) { this.healing = true; this.healT = 0; AUDIO.healStart(); }
      const speed = G.hasRelic('rezo') ? 1.55 : 1;
      this.healT += dt * speed;
      if (Math.random() < 0.35) spawnP(1, this.cx + rnd(-10, 10), this.y + this.h, { vy: rnd(-70, -30), vx: rnd(-8, 8), life: 0.7, col: '#ffd9a0', size: 2 });
      if (this.healT >= 0.85) {
        this.healT = 0; this.anima -= 33; this.hp = Math.min(this.maxHp, this.hp + 1);
        AUDIO.sfx.healDone(); spawnP(14, this.cx, this.cy, { spread: 120, life: 0.6, col: '#ffe9c4', size: 2.5 });
        if (this.anima < 33 || this.hp >= this.maxHp) { this.healing = false; AUDIO.healStop(); }
      }
      this.vx = 0;
    } else if (this.healing) { this.healing = false; this.healT = 0; AUDIO.healStop(); }

    // --- dash ---
    if (inp.dashP && R.dash && this.dashCD <= 0 && this.dashT <= 0 && !this.healing) {
      this.dashT = PHYS.dashT; this.dashCD = PHYS.dashCD;
      this.dashDir = move !== 0 ? move : this.face;
      this.face = this.dashDir; this.vy = 0;
      AUDIO.sfx.dash(); spawnP(8, this.cx, this.cy, { spread: 60, life: 0.3, col: '#9aa7b8', size: 2 });
    }

    if (this.dashT > 0) {
      this.vx = this.dashDir * PHYS.dashV; this.vy = 0;
      this.trail.push({ x: this.x, y: this.y, life: 0.25, face: this.face });
    } else if (!this.healing) {
      // --- correr ---
      if (this.lockT <= 0) {
        const target = move * PHYS.run;
        const a = (move !== 0 ? PHYS.accel : PHYS.decel) * dt;
        if (this.vx < target) this.vx = Math.min(target, this.vx + a);
        else if (this.vx > target) this.vx = Math.max(target, this.vx - a);
        if (move !== 0) this.face = move;
      }
      this.vy = Math.min(PHYS.maxFall, this.vy + PHYS.grav * dt);
    }

    // --- deslizamiento en muro ---
    this.wallDir = 0;
    if (R.garra && !this.onGround && this.dashT <= 0 && this.vy > 0) {
      if (move === 1 && bodyTouchesWall(this, 1)) this.wallDir = 1;
      else if (move === -1 && bodyTouchesWall(this, -1)) this.wallDir = -1;
      if (this.wallDir !== 0) {
        this.vy = Math.min(this.vy, PHYS.wallSlide);
        if (Math.random() < 0.3) spawnP(1, this.x + (this.wallDir > 0 ? this.w : 0), this.y + rnd(4, this.h), { vx: -this.wallDir * rnd(20, 50), vy: rnd(-20, 20), life: 0.4, col: '#8b8f96', size: 1.5 });
      }
    }

    // --- saltos ---
    if (this.jbuf > 0 && this.dashT <= 0 && !this.healing) {
      if (this.onGround || this.coyote > 0) {
        this.vy = PHYS.jumpV; this.jbuf = 0; this.coyote = 0; this.usedDJ = false;
        AUDIO.sfx.jump(); spawnP(4, this.cx, this.y + this.h, { vy: rnd(-40, -10), spread: 40, life: 0.3, col: '#777f8c', size: 1.5 });
      } else if (this.wallDir !== 0) {
        this.vy = PHYS.wallJy; this.vx = -this.wallDir * PHYS.wallJx;
        this.face = -this.wallDir; this.lockT = PHYS.wallLock; this.jbuf = 0; this.usedDJ = false;
        AUDIO.sfx.jump(); spawnP(6, this.x + (this.wallDir > 0 ? this.w : 0), this.cy, { spread: 60, life: 0.3, col: '#8b8f96', size: 2 });
      } else if (R.alas && !this.usedDJ) {
        this.vy = PHYS.djV; this.usedDJ = true; this.jbuf = 0;
        AUDIO.sfx.wing(); spawnP(10, this.cx, this.y + this.h, { spread: 80, vy: rnd(20, 60), life: 0.5, col: '#d8d2c2', size: 2 });
      }
    }
    if (!inp.jumpH && this.vy < PHYS.jumpCut) this.vy = PHYS.jumpCut;

    // --- caer por plataformas '-' ---
    if (inp.down && this.onGround && standingOnOneway(this)) this.dropT = 0.18;

    // --- espina (ataque) ---
    if (inp.atkP && this.slashCD <= 0 && !this.healing) {
      this.slashCD = 0.35; this.slashT = 0.12; this.slashId++;
      this.slashDir = inp.up ? 'up' : (inp.down && !this.onGround ? 'down' : 'side');
      AUDIO.sfx.slash();
    }

    // --- hechizo ---
    if (inp.spellP && R.chispa && this.anima >= 33 && this.spellCD <= 0 && !this.healing && this.dashT <= 0) {
      this.anima -= 33; this.spellCD = 0.4;
      const dmg = G.hasRelic('piedra') ? 22 : 15;
      addProj({ kind: 'chispa', x: this.cx + this.face * 14, y: this.cy - 4, vx: this.face * 480, vy: 0, r: 9, hostile: false, dmg, life: 1.0 });
      this.vx -= this.face * 90;
      AUDIO.sfx.spell(); spawnP(8, this.cx + this.face * 16, this.cy, { spread: 70, life: 0.4, col: '#ffd9a0', size: 2 });
    }

    // --- mover y colisionar ---
    const wasAir = !this.onGround;
    const hit = moveBody(this, dt);
    this.onGround = hit.d;
    if (hit.d) {
      this.coyote = PHYS.coyote; this.usedDJ = false;
      if (wasAir && this.vyLand > 500) { spawnP(6, this.cx, this.y + this.h, { spread: 60, vy: rnd(-30, -5), life: 0.35, col: '#777f8c', size: 1.8 }); }
    }
    this.vyLand = this.vy > 0 ? this.vy : this.vyLand;
    if (hit.u) this.vy = Math.max(this.vy, 0);
    if (this.dashT > 0 && (hit.l || hit.r)) this.dashT = 0;

    for (const t of this.trail) t.life -= dt;
    this.trail = this.trail.filter(t => t.life > 0);
  }

  slashBox() {
    if (this.slashT <= 0) return null;
    const r = 46;
    if (this.slashDir === 'up') return { x: this.cx - 26, y: this.y - r, w: 52, h: r + 8 };
    if (this.slashDir === 'down') return { x: this.cx - 26, y: this.y + this.h - 8, w: 52, h: r + 8 };
    return this.face > 0
      ? { x: this.x + this.w - 6, y: this.cy - 22, w: r + 10, h: 44 }
      : { x: this.x + 6 - r - 10, y: this.cy - 22, w: r + 10, h: 44 };
  }
  pogo() {
    this.vy = PHYS.pogoV; this.usedDJ = false; this.dashCD = 0;
    AUDIO.sfx.pogo();
  }
  recoil(dir) { this.vx = dir * 170; this.lockT = 0.06; }
  gainAnima(n) { this.anima = Math.min(99, this.anima + n); }

  damage(n, fromX) {
    if (this.inv > 0 || this.dead) return false;
    this.hp -= n; this.inv = 1.2;
    this.vx = (this.cx < fromX ? -1 : 1) * 260; this.vy = -220; this.lockT = 0.2;
    this.healing && AUDIO.healStop(); this.healing = false; this.healT = 0;
    this.dashT = 0;
    AUDIO.sfx.hurt(); G.freeze(0.12); G.shake(7);
    spawnP(12, this.cx, this.cy, { spread: 160, life: 0.5, col: '#e8e4d8', size: 2 });
    if (this.hp <= 0) { this.hp = 0; G.playerDeath(); }
    return true;
  }

  draw(ctx) {
    if (this.dead) return;
    if (this.inv > 0 && Math.floor(this.inv * 14) % 2 === 0 && this.hp > 0) return;
    const cx = this.cx, cy = this.cy;
    // estelas del dash
    for (const t of this.trail) {
      ctx.globalAlpha = t.life * 1.6;
      ctx.fillStyle = '#5d6f8a';
      ctx.fillRect(t.x + 3, t.y + 6, this.w - 6, this.h - 8);
    }
    ctx.globalAlpha = 1;
    // halo cálido de la Pavesa
    const gr = ctx.createRadialGradient(cx, this.y + 8, 2, cx, this.y + 8, 30);
    gr.addColorStop(0, 'rgba(255,214,150,0.16)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = gr; ctx.fillRect(cx - 30, this.y - 24, 60, 60);
    // capa de ceniza
    const sway = Math.sin(this.animT * 7) * (Math.abs(this.vx) > 20 ? 2.2 : 0.7);
    ctx.fillStyle = '#101418';
    ctx.beginPath();
    ctx.moveTo(cx, this.y + 6);
    ctx.quadraticCurveTo(cx - 12 - sway, cy, cx - 9 - sway, this.y + this.h);
    ctx.lineTo(cx + 9 - sway, this.y + this.h);
    ctx.quadraticCurveTo(cx + 12 - sway, cy, cx, this.y + 6);
    ctx.fill();
    // cabeza-farol pálida
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath(); ctx.ellipse(cx, this.y + 9, 9, 10, 0, 0, 7); ctx.fill();
    // ojos
    ctx.fillStyle = '#0a0c10';
    const ex = this.face * 3;
    ctx.beginPath(); ctx.ellipse(cx - 3.5 + ex, this.y + 9, 2.2, 3.4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 3.5 + ex, this.y + 9, 2.2, 3.4, 0, 0, 7); ctx.fill();
    // rezo
    if (this.healing) {
      ctx.globalAlpha = 0.5 + Math.sin(this.animT * 20) * 0.2;
      ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, 20 + this.healT * 10, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // arco de la espina
    if (this.slashT > 0) {
      const a = this.slashT / 0.12;
      ctx.globalAlpha = a * 0.95;
      ctx.strokeStyle = '#f2eee2'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath();
      if (this.slashDir === 'up') ctx.arc(cx, this.y - 6, 34, Math.PI * 1.15, Math.PI * 1.85);
      else if (this.slashDir === 'down') ctx.arc(cx, this.y + this.h + 6, 34, Math.PI * 0.15, Math.PI * 0.85);
      else if (this.face > 0) ctx.arc(this.x + this.w, cy, 38, -Math.PI * 0.42, Math.PI * 0.42);
      else ctx.arc(this.x, cy, 38, Math.PI * 0.58, Math.PI * 1.42);
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
  }
}

/* ================= colisión compartida ================= */
function bodyTouchesWall(b, dir) {
  const tx = dir > 0 ? Math.floor((b.x + b.w + 2) / T) : Math.floor((b.x - 2) / T);
  for (let ty = Math.floor(b.y / T); ty <= Math.floor((b.y + b.h - 1) / T); ty++)
    if (solidAt(tx, ty)) return true;
  return false;
}
function standingOnOneway(b) {
  const ty = Math.floor((b.y + b.h + 2) / T);
  for (let tx = Math.floor(b.x / T); tx <= Math.floor((b.x + b.w - 1) / T); tx++)
    if (tileAt(tx, ty) === '-' && !solidAt(tx, ty)) return true;
  return false;
}
function moveBody(b, dt) {
  const hit = { l: false, r: false, u: false, d: false };
  // eje X
  let nx = b.x + b.vx * dt;
  if (b.vx > 0) {
    const tx = Math.floor((nx + b.w) / T);
    if (colSolid(tx, b.y, b.h)) { nx = tx * T - b.w - 0.01; b.vx = 0; hit.r = true; }
  } else if (b.vx < 0) {
    const tx = Math.floor(nx / T);
    if (colSolid(tx, b.y, b.h)) { nx = (tx + 1) * T + 0.01; b.vx = 0; hit.l = true; }
  }
  b.x = nx;
  // eje Y
  const prevBottom = b.y + b.h;
  let ny = b.y + b.vy * dt;
  if (b.vy > 0) {
    const ty = Math.floor((ny + b.h) / T);
    let land = rowSolid(b.x, b.w, ty);
    if (!land && (!b.dropT || b.dropT <= 0) && prevBottom <= ty * T + 1 && rowOneway(b.x, b.w, ty)) land = true;
    if (land) { ny = ty * T - b.h - 0.01; b.vy = 0; hit.d = true; }
  } else if (b.vy < 0) {
    const ty = Math.floor(ny / T);
    if (rowSolid(b.x, b.w, ty)) { ny = (ty + 1) * T + 0.01; b.vy = 0; hit.u = true; }
  }
  b.y = ny;
  return hit;
}
function colSolid(tx, y, h) {
  for (let ty = Math.floor(y / T); ty <= Math.floor((y + h - 1) / T); ty++)
    if (solidAt(tx, ty)) return true;
  return false;
}
function rowSolid(x, w, ty) {
  for (let tx = Math.floor(x / T); tx <= Math.floor((x + w - 1) / T); tx++)
    if (solidAt(tx, ty)) return true;
  return false;
}
function rowOneway(x, w, ty) {
  for (let tx = Math.floor(x / T); tx <= Math.floor((x + w - 1) / T); tx++)
    if (tileAt(tx, ty) === '-') return true;
  return false;
}
function touchingSpikes(b) {
  const pad = 6;
  for (let ty = Math.floor((b.y + pad) / T); ty <= Math.floor((b.y + b.h - pad) / T); ty++)
    for (let tx = Math.floor((b.x + pad) / T); tx <= Math.floor((b.x + b.w - pad) / T); tx++)
      if (tileAt(tx, ty) === '^') return true;
  return false;
}
function rnd(a, b) { return a + Math.random() * (b - a); }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

/* ================= BESTIARIO ================= */
const FOE_DEFS = {
  rastrero:  { hp: 8,  w: 30, h: 20, geo: 3, dmg: 1 },
  zumbon:    { hp: 6,  w: 24, h: 22, geo: 2, dmg: 1, fly: true },
  escupidor: { hp: 10, w: 28, h: 30, geo: 4, dmg: 1 },
  acorazado: { hp: 14, w: 34, h: 26, geo: 6, dmg: 1 },
  tejedora:  { hp: 12, w: 28, h: 24, geo: 5, dmg: 1, fly: true },
};
function makeFoe(type, tx, ty, idx) {
  const d = FOE_DEFS[type];
  const e = {
    type, idx, hp: d.hp, maxHp: d.hp, w: d.w, h: d.h, geo: d.geo, dmg: d.dmg,
    x: tx * T + (T - d.w) / 2, y: (ty + 1) * T - d.h, vx: 0, vy: 0,
    dir: Math.random() < 0.5 ? -1 : 1, t: rnd(0, 6), flash: 0, state: 'idle', st: 0,
    lastSlash: -1, fly: !!d.fly,
  };
  if (type === 'zumbon') { e.homeX = e.x; e.homeY = e.y; }
  if (type === 'tejedora') { e.anchorY = ty * T + 4; e.y = e.anchorY; e.state = 'hang'; }
  if (type === 'escupidor') e.st = rnd(0.5, 2);
  return e;
}
function updateFoe(e, dt, pl) {
  e.t += dt; e.flash -= dt;
  const d2p = Math.hypot(pl.cx - (e.x + e.w / 2), pl.cy - (e.y + e.h / 2));
  switch (e.type) {
    case 'rastrero': case 'acorazado': {
      const sp = e.type === 'rastrero' ? 46 : 30;
      e.vx = e.dir * sp;
      e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.grav * dt);
      const hit = moveBody(e, dt);
      if (hit.l) e.dir = 1; if (hit.r) e.dir = -1;
      if (hit.d) { // giro en el borde
        const aheadX = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
        if (!solidAt(Math.floor(aheadX / T), Math.floor((e.y + e.h + 4) / T))) e.dir *= -1;
      }
      break;
    }
    case 'zumbon': {
      if (d2p < 210) {
        const ang = Math.atan2(pl.cy - (e.y + e.h / 2), pl.cx - (e.x + e.w / 2));
        e.vx += Math.cos(ang) * 260 * dt; e.vy += Math.sin(ang) * 260 * dt;
      } else {
        e.vx += (e.homeX - e.x) * 0.9 * dt; e.vy += (e.homeY + Math.sin(e.t * 2) * 14 - e.y) * 0.9 * dt;
      }
      const spd = Math.hypot(e.vx, e.vy), mx = 95;
      if (spd > mx) { e.vx *= mx / spd; e.vy *= mx / spd; }
      moveBody(e, dt);
      break;
    }
    case 'escupidor': {
      e.st -= dt;
      e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.grav * dt); e.vx = 0;
      moveBody(e, dt);
      e.dir = pl.cx > e.x ? 1 : -1;
      if (e.st <= 0 && d2p < 280 && d2p > 40) {
        e.st = 2.3; e.mouth = 0.35;
        const dx = pl.cx - (e.x + e.w / 2);
        addProj({ kind: 'lob', x: e.x + e.w / 2, y: e.y + 6, vx: Math.max(-170, Math.min(170, dx * 0.9)), vy: -330, r: 7, hostile: true, dmg: 1, grav: true, life: 3 });
      }
      e.mouth = Math.max(0, (e.mouth || 0) - dt);
      break;
    }
    case 'tejedora': {
      if (e.state === 'hang') {
        e.y = e.anchorY + Math.sin(e.t * 1.6) * 6;
        if (Math.abs(pl.cx - (e.x + e.w / 2)) < 46 && pl.cy > e.y) { e.state = 'fall'; e.vy = 60; }
      } else if (e.state === 'fall') {
        e.vy = Math.min(700, e.vy + PHYS.grav * dt); e.vx = 0;
        const hit = moveBody(e, dt);
        if (hit.d) { e.state = 'crawl'; e.st = 3; e.dir = pl.cx > e.x ? 1 : -1; }
      } else if (e.state === 'crawl') {
        e.st -= dt;
        e.dir = pl.cx > e.x + e.w / 2 ? 1 : -1;
        e.vx = e.dir * 62; e.vy = Math.min(PHYS.maxFall, e.vy + PHYS.grav * dt);
        moveBody(e, dt);
        if (e.st <= 0) e.state = 'rise';
      } else { // rise
        e.vx = 0; e.vy = -120; moveBody(e, dt);
        if (e.y <= e.anchorY) { e.y = e.anchorY; e.state = 'hang'; }
      }
      break;
    }
  }
  // contacto con el jugador
  if (pl.inv <= 0 && !pl.dead && overlap(e, pl)) pl.damage(e.dmg, e.x + e.w / 2);
}
function hurtFoe(e, dmg, fromX, slashDir) {
  // escudo del acorazado: bloquea golpes laterales frontales
  if (e.type === 'acorazado' && slashDir === 'side' && Math.sign(fromX - (e.x + e.w / 2)) === e.dir) {
    AUDIO.sfx.clang(); spawnP(5, e.x + e.w / 2 + e.dir * 18, e.y + e.h / 2, { spread: 100, life: 0.3, col: '#c9d2df', size: 2 });
    return 'blocked';
  }
  e.hp -= dmg; e.flash = 0.12;
  if (!e.fly) e.vx += Math.sign((e.x + e.w / 2) - fromX) * 130;
  AUDIO.sfx.hit();
  spawnP(7, e.x + e.w / 2, e.y + e.h / 2, { spread: 130, life: 0.4, col: '#d8d2c2', size: 2 });
  if (e.hp <= 0) {
    spawnP(16, e.x + e.w / 2, e.y + e.h / 2, { spread: 190, life: 0.6, col: '#3a4150', size: 3 });
    dropCoins(e.x + e.w / 2, e.y + e.h / 2, e.geo);
    return 'dead';
  }
  return 'hit';
}
function drawFoe(ctx, e, accent) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const ink = e.flash > 0 ? '#e8e4d8' : '#11151c';
  const eye = e.flash > 0 ? '#11151c' : accent;
  ctx.fillStyle = ink;
  switch (e.type) {
    case 'rastrero': {
      ctx.beginPath(); ctx.ellipse(cx, e.y + e.h - 8, e.w / 2, 11, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(e.x + 3, e.y + e.h - 9, e.w - 6, 7);
      const legT = Math.sin(e.t * 14) * 2;
      ctx.fillRect(e.x + 5, e.y + e.h - 3 + legT, 3, 3); ctx.fillRect(e.x + e.w - 8, e.y + e.h - 3 - legT, 3, 3);
      ctx.fillStyle = eye;
      ctx.fillRect(cx + e.dir * 8 - 1, e.y + e.h - 14, 2.6, 2.6);
      break;
    }
    case 'zumbon': {
      const flap = Math.sin(e.t * 22) * 8;
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#2a3140';
      ctx.beginPath(); ctx.ellipse(cx - 9, cy - 4 - flap, 9, 5, -0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 9, cy - 4 - flap, 9, 5, 0.5, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(cx, cy, 8, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = eye; ctx.fillRect(cx - 4, cy - 5, 2.4, 2.4); ctx.fillRect(cx + 2, cy - 5, 2.4, 2.4);
      break;
    }
    case 'escupidor': {
      ctx.fillRect(cx - 2, e.y + 14, 4, e.h - 14);
      const open = (e.mouth || 0) > 0 ? 6 : 0;
      ctx.beginPath(); ctx.ellipse(cx, e.y + 10, 13, 10 + open * 0.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath(); ctx.ellipse(cx + e.dir * 4, e.y + 8, 2.6, 2.6 + open, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1c2430';
      ctx.beginPath(); ctx.ellipse(cx - 8, e.y + 16, 4, 2.5, -0.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 8, e.y + 16, 4, 2.5, 0.6, 0, 7); ctx.fill();
      break;
    }
    case 'acorazado': {
      ctx.fillRect(e.x + 2, e.y + 4, e.w - 4, e.h - 8);
      ctx.fillStyle = '#242c3a';
      for (let i = 0; i < 3; i++) ctx.fillRect(e.x + 4 + i * 10, e.y + 2, 8, 5);
      ctx.fillStyle = ink;
      const legT = Math.sin(e.t * 10) * 2;
      ctx.fillRect(e.x + 4, e.y + e.h - 4 + legT, 4, 4); ctx.fillRect(e.x + e.w - 8, e.y + e.h - 4 - legT, 4, 4);
      ctx.fillStyle = eye; ctx.fillRect(cx + e.dir * 12 - 1, cy - 4, 3, 3);
      // placa frontal
      ctx.fillStyle = '#39445a';
      ctx.fillRect(e.dir > 0 ? e.x + e.w - 5 : e.x, e.y + 2, 5, e.h - 4);
      break;
    }
    case 'tejedora': {
      ctx.strokeStyle = 'rgba(160,160,175,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, e.y + 4); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(cx, cy + 3, 10, 9, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy - 7, 6, 5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = ink; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = -0.9 + i * 0.6 + Math.sin(e.t * 8 + i) * 0.12;
        ctx.beginPath(); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx - 6 - Math.cos(a) * 13, cy + Math.sin(a) * 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 6, cy); ctx.lineTo(cx + 6 + Math.cos(a) * 13, cy + Math.sin(a) * 13); ctx.stroke();
      }
      ctx.fillStyle = eye; ctx.fillRect(cx - 4, cy - 9, 2.4, 2.4); ctx.fillRect(cx + 2, cy - 9, 2.4, 2.4);
      break;
    }
  }
}

/* ================= JEFES ================= */
class Boss {
  constructor(type, tx, ty) {
    const d = BOSS_DEFS[type];
    this.type = type; this.name = d.name; this.hp = d.hp; this.maxHp = d.hp; this.reward = d.reward;
    this.w = type === 'guardian' ? 62 : type === 'regente' ? 46 : 56;
    this.h = type === 'guardian' ? 70 : type === 'regente' ? 64 : 56;
    this.x = tx * T; this.y = (ty + 1) * T - this.h;
    this.vx = 0; this.vy = 0; this.dir = -1; this.t = 0; this.st = 0;
    this.state = 'wait'; this.flash = 0; this.phase = 1; this.active = false;
    this.alpha = 1; this.lastSlash = -1; this.dmgSince = 0; this.dying = 0;
    if (type === 'lumbre') { this.cx0 = this.x; this.cy0 = this.y; }
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  activate() {
    if (this.active) return;
    this.active = true; this.state = 'intro'; this.st = 1.4;
    AUDIO.sfx.roar(); G.shake(10);
    AUDIO.playTheme(this.type === 'lumbre' ? 'lumbre' : 'boss', 0.8);
  }
  hurt(dmg, fromX) {
    if (!this.active || this.state === 'dying' || this.state === 'wait') return 'none';
    this.hp -= dmg; this.flash = 0.1; this.dmgSince += dmg;
    AUDIO.sfx.bossHit();
    spawnP(8, this.cx, this.cy, { spread: 150, life: 0.4, col: '#e8e4d8', size: 2.5 });
    const frac = this.hp / this.maxHp;
    if (this.phase === 1 && frac <= 0.55) { this.phase = 2; AUDIO.sfx.roar(); G.shake(8); }
    if (this.type === 'lumbre' && this.phase === 2 && frac <= 0.3) { this.phase = 3; AUDIO.sfx.roar(); G.shake(12); }
    if (this.type === 'guardian' && this.dmgSince >= 60 && this.state !== 'stagger') {
      this.dmgSince = 0; this.state = 'stagger'; this.st = 1.3; AUDIO.sfx.stagger();
    }
    if (this.hp <= 0) { this.hp = 0; this.state = 'dying'; this.st = 2.2; this.vx = 0; this.vy = 0; AUDIO.sfx.bossDie(); G.shake(14); }
    return 'hit';
  }
  update(dt, pl) {
    this.t += dt; this.flash -= dt; this.st -= dt;
    if (this.state === 'wait') return;
    if (this.state === 'dying') {
      if (Math.random() < 0.3) spawnP(4, this.cx + rnd(-30, 30), this.cy + rnd(-30, 30), { spread: 120, life: 0.6, col: '#ffd9a0', size: 3 });
      if (this.st <= 0) G.bossDefeated(this);
      return;
    }
    if (this.state === 'intro') { if (this.st <= 0) this.idle(0.6); return; }
    const fns = { guardian: this.upGuardian, regente: this.upRegente, lumbre: this.upLumbre };
    fns[this.type].call(this, dt, pl);
    // contacto
    if (this.state !== 'dying' && pl.inv <= 0 && !pl.dead && this.alpha > 0.7 && overlap(this, pl)) pl.damage(1, this.cx);
  }
  idle(t) { this.state = 'idle'; this.st = t; }

  /* --- GUARDIÁN ROTO --- */
  upGuardian(dt, pl) {
    const floorY = G.roomPx.h - 3 * T;
    if (this.state === 'stagger') {
      this.vx *= 0.9; this.vy = Math.min(900, this.vy + PHYS.grav * dt); moveBody(this, dt);
      if (this.st <= 0) this.idle(0.4);
      return;
    }
    if (this.state === 'idle') {
      this.dir = pl.cx > this.cx ? 1 : -1;
      this.vx = 0; this.vy = Math.min(900, this.vy + PHYS.grav * dt); moveBody(this, dt);
      if (this.st <= 0) {
        const r = Math.random();
        if (this.phase === 2 && r < 0.3) { this.state = 'debris'; this.st = 0.5; this.telegraph = 0.5; }
        else if (r < 0.6) this.startLeap(pl, 1);
        else this.startLeap(pl, 3);
      }
      return;
    }
    if (this.state === 'leap') {
      this.vy = Math.min(1100, this.vy + PHYS.grav * dt * 1.15);
      const hit = moveBody(this, dt);
      if (hit.d && this.vy >= 0) {
        G.shake(9); AUDIO.sfx.bossHit();
        spawnP(14, this.cx, this.y + this.h, { spread: 200, vy: rnd(-120, -20), life: 0.5, col: '#4a5568', size: 3 });
        addProj({ kind: 'wave', x: this.cx - 20, y: this.y + this.h - 24, vx: -240, vy: 0, r: 12, hostile: true, dmg: 1, life: 1.5 });
        addProj({ kind: 'wave', x: this.cx + 20, y: this.y + this.h - 24, vx: 240, vy: 0, r: 12, hostile: true, dmg: 1, life: 1.5 });
        this.hops--;
        if (this.hops > 0) { this.st = 0.35; this.state = 'hopwait'; }
        else this.idle(this.phase === 2 ? 0.8 : 1.2);
        this.vx = 0;
      }
      return;
    }
    if (this.state === 'hopwait') {
      this.vy = Math.min(900, this.vy + PHYS.grav * dt); moveBody(this, dt);
      if (this.st <= 0) this.startLeap(pl, this.hops, true);
      return;
    }
    if (this.state === 'debris') {
      this.vy = Math.min(900, this.vy + PHYS.grav * dt); moveBody(this, dt);
      if (this.st <= 0) {
        for (let i = 0; i < 5; i++) {
          const x = rnd(2 * T, G.roomPx.w - 2 * T);
          addProj({ kind: 'debris', x, y: T + 6, vx: 0, vy: 0, r: 10, hostile: true, dmg: 1, grav: true, life: 4, delay: i * 0.22 });
        }
        this.idle(1.4);
      }
      return;
    }
  }
  startLeap(pl, hops, keep) {
    if (!keep) this.hops = hops;
    this.state = 'leap';
    const dx = pl.cx - this.cx;
    this.vy = this.hops > 1 ? -560 : -760;
    const air = 2 * Math.abs(this.vy) / (PHYS.grav * 1.15);
    this.vx = Math.max(-330, Math.min(330, dx / air));
    this.dir = Math.sign(this.vx) || this.dir;
    spawnP(6, this.cx, this.y + this.h, { spread: 80, life: 0.4, col: '#4a5568', size: 2.5 });
  }

  /* --- REGENTE AHOGADO --- */
  upRegente(dt, pl) {
    const arena = G.roomPx;
    const anchors = [0.16, 0.32, 0.5, 0.68, 0.84].map(f => ({ x: arena.w * f, y: arena.h - 3 * T - 130 }));
    this.dir = pl.cx > this.cx ? 1 : -1;
    this.y += Math.sin(this.t * 2) * 0.35;
    if (this.state === 'idle') {
      if (this.st <= 0) { this.state = 'fadeout'; this.st = 0.35; }
      return;
    }
    if (this.state === 'fadeout') {
      this.alpha = Math.max(0, this.st / 0.35);
      if (this.st <= 0) {
        const a = anchors[Math.floor(Math.random() * anchors.length)];
        this.x = a.x - this.w / 2; this.y = a.y; this.state = 'fadein'; this.st = 0.3;
        spawnP(10, this.cx, this.cy, { spread: 130, life: 0.4, col: '#7fb2d9', size: 2 });
      }
      return;
    }
    if (this.state === 'fadein') {
      this.alpha = 1 - Math.max(0, this.st / 0.3);
      if (this.st <= 0) {
        this.alpha = 1;
        const r = Math.random(), fast = this.phase === 2;
        if (this.phase === 2 && r < 0.28) { this.state = 'surge'; this.st = 0.55; }
        else if (r < 0.55) { this.state = 'orbs'; this.st = 0; this.cast = 3; }
        else if (r < 0.8) { this.state = 'spears'; this.st = 0.75; this.spearXs = Array.from({ length: 6 }, () => rnd(2 * T, arena.w - 2 * T)); }
        else { this.state = 'ring'; this.st = fast ? 0.4 : 0.6; }
      }
      return;
    }
    if (this.state === 'orbs') {
      this.st -= 0; // usa su propio ritmo
      this.castT = (this.castT || 0) - dt;
      if (this.cast > 0 && this.castT <= 0) {
        this.castT = 0.28; this.cast--;
        const ang = Math.atan2(pl.cy - this.cy, pl.cx - this.cx);
        addProj({ kind: 'orb', x: this.cx, y: this.cy, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, r: 8, hostile: true, dmg: 1, life: 5.5 });
        AUDIO.sfx.spell();
      }
      if (this.cast <= 0) this.idle(this.phase === 2 ? 0.7 : 1.1);
      return;
    }
    if (this.state === 'spears') {
      if (this.st <= 0) {
        for (const x of this.spearXs) addProj({ kind: 'spear', x, y: T + 8, vx: 0, vy: 640, r: 8, hostile: true, dmg: 1, life: 2.5 });
        AUDIO.sfx.spell(); this.idle(this.phase === 2 ? 0.7 : 1.1);
      }
      return;
    }
    if (this.state === 'ring') {
      if (this.st <= 0) {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2 + 0.4;
          addProj({ kind: 'orbline', x: this.cx, y: this.cy, vx: Math.cos(a) * 205, vy: Math.sin(a) * 205, r: 7, hostile: true, dmg: 1, life: 2.2 });
        }
        AUDIO.sfx.spell(); this.idle(this.phase === 2 ? 0.7 : 1.1);
      }
      return;
    }
    if (this.state === 'surge') {
      if (this.st <= 0) {
        const fy = arena.h - 3 * T - 22;
        addProj({ kind: 'surge', x: 1.5 * T, y: fy, vx: 300, vy: 0, r: 20, hostile: true, dmg: 1, life: 4 });
        addProj({ kind: 'surge', x: arena.w - 1.5 * T, y: fy, vx: -300, vy: 0, r: 20, hostile: true, dmg: 1, life: 4 });
        AUDIO.sfx.roar(); this.idle(1.2);
      }
      return;
    }
  }

  /* --- LA LUMBRE --- */
  upLumbre(dt, pl) {
    const arena = G.roomPx;
    // deriva flotante
    if (this.state !== 'dive') {
      const txp = arena.w / 2 + Math.sin(this.t * 0.7) * arena.w * 0.28;
      const typ = 4.2 * T + Math.sin(this.t * 1.1) * 40;
      this.x += (txp - this.cx) * 1.4 * dt; this.y += (typ - this.cy) * 1.4 * dt;
    }
    if (this.state === 'idle') {
      if (this.st <= 0) {
        const r = Math.random(), p3 = this.phase === 3;
        if (r < 0.3) { this.state = 'ring'; this.st = 0.55; }
        else if (r < 0.55) { this.state = 'beams'; this.st = 0.85; this.beamXs = [rnd(3 * T, arena.w - 3 * T), rnd(3 * T, arena.w - 3 * T)]; if (p3) this.beamXs.push(rnd(3 * T, arena.w - 3 * T)); }
        else if (r < 0.8) { this.state = 'dive'; this.st = 0.7; this.diveA = null; }
        else { this.state = 'walls'; this.st = 0.6; }
      }
      return;
    }
    if (this.state === 'ring') {
      if (this.st <= 0) {
        const n = this.phase >= 2 ? 14 : 10, off = rnd(0, 1);
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + off;
          addProj({ kind: 'ember', x: this.cx, y: this.cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 7, hostile: true, dmg: 1, life: 2.6 });
        }
        AUDIO.sfx.spell();
        if (this.phase === 3) { this.state = 'ring2'; this.st = 0.5; } else this.idle(1.0);
      }
      return;
    }
    if (this.state === 'ring2') {
      if (this.st <= 0) {
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * Math.PI * 2 + 0.22;
          addProj({ kind: 'ember', x: this.cx, y: this.cy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 7, hostile: true, dmg: 1, life: 2.6 });
        }
        this.idle(0.8);
      }
      return;
    }
    if (this.state === 'beams') {
      if (this.st <= 0) { this.state = 'beamfire'; this.st = 0.55; AUDIO.sfx.roar(); G.shake(6); }
      return;
    }
    if (this.state === 'beamfire') {
      if (pl.inv <= 0 && !pl.dead) {
        for (const bx of this.beamXs) if (Math.abs(pl.cx - bx) < 26) { pl.damage(1, bx); break; }
      }
      if (this.st <= 0) this.idle(this.phase === 3 ? 0.6 : 1.0);
      return;
    }
    if (this.state === 'dive') {
      if (this.diveA === null) {
        if (this.st > 0) return;
        const ang = Math.atan2(pl.cy - this.cy, pl.cx - this.cx);
        this.diveA = ang; this.vx = Math.cos(ang) * 620; this.vy = Math.sin(ang) * 620; this.st = 0.75;
        AUDIO.sfx.dash();
      } else {
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (Math.random() < 0.6) spawnP(2, this.cx, this.cy, { spread: 40, life: 0.4, col: '#ffd9a0', size: 2.5 });
        this.x = Math.max(T, Math.min(arena.w - T - this.w, this.x));
        this.y = Math.max(T, Math.min(arena.h - 3.6 * T - this.h, this.y));
        if (this.st <= 0) { this.diveA = null; this.idle(0.8); }
      }
      return;
    }
    if (this.state === 'walls') {
      if (this.st <= 0) {
        const fy = arena.h - 3 * T, gapRow = Math.random() < 0.5 ? 1 : 2;
        for (let row = 0; row < 3; row++) {
          if (row === gapRow) continue;
          const y = fy - 26 - row * 58;
          addProj({ kind: 'ember', x: 1.5 * T, y, vx: 210, vy: 0, r: 7, hostile: true, dmg: 1, life: 6 });
          addProj({ kind: 'ember', x: arena.w - 1.5 * T, y, vx: -210, vy: 0, r: 7, hostile: true, dmg: 1, life: 6 });
        }
        AUDIO.sfx.spell(); this.idle(this.phase === 3 ? 0.9 : 1.3);
      }
      return;
    }
  }

  draw(ctx, accent) {
    const cx = this.cx, cy = this.cy;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const ink = this.flash > 0 ? '#e8e4d8' : '#0d1016';
    if (this.state === 'dying' && Math.floor(this.t * 16) % 2 === 0) ctx.globalAlpha *= 0.5;
    if (this.type === 'guardian') {
      // cuerpo de armadura rota
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(cx, cy + 8, this.w / 2, this.h / 2 - 6, 0, 0, 7); ctx.fill();
      // yelmo
      ctx.beginPath(); ctx.ellipse(cx, this.y + 16, 22, 18, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#242c3a';
      ctx.fillRect(cx - 26, cy - 6, 12, 22); ctx.fillRect(cx + 14, cy - 6, 12, 22);
      // ranura del ojo
      ctx.fillStyle = this.state === 'stagger' ? '#ffd9a0' : accent;
      ctx.fillRect(cx - 12 + this.dir * 4, this.y + 12, 24, 4);
      // grietas
      ctx.strokeStyle = this.state === 'stagger' ? '#ffd9a0' : '#39445a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 2, cy + 14); ctx.lineTo(cx - 10, cy + 26); ctx.stroke();
    } else if (this.type === 'regente') {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(cx, this.y);
      ctx.quadraticCurveTo(cx - 22, cy, cx - 16 - Math.sin(this.t * 3) * 4, this.y + this.h);
      ctx.lineTo(cx + 16 + Math.sin(this.t * 3) * 4, this.y + this.h);
      ctx.quadraticCurveTo(cx + 22, cy, cx, this.y);
      ctx.fill();
      // corona
      ctx.fillStyle = '#39445a';
      for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * 6 - 2, this.y - 8 + Math.abs(i) * 2, 4, 10 - Math.abs(i) * 2);
      ctx.fillStyle = accent;
      ctx.fillRect(cx - 7 + this.dir * 3, this.y + 14, 4, 6); ctx.fillRect(cx + 3 + this.dir * 3, this.y + 14, 4, 6);
      // goteo
      if (Math.random() < 0.12) spawnP(1, cx + rnd(-14, 14), this.y + this.h - 4, { vy: 60, vx: 0, life: 0.5, col: '#7fb2d9', size: 1.5, grav: true });
    } else { // lumbre
      const pul = 1 + Math.sin(this.t * 5) * 0.06;
      const gr = ctx.createRadialGradient(cx, cy, 4, cx, cy, 60 * pul);
      gr.addColorStop(0, 'rgba(255,236,200,0.9)');
      gr.addColorStop(0.35, 'rgba(255,210,140,0.35)');
      gr.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = gr; ctx.fillRect(cx - 70, cy - 70, 140, 140);
      // rayos giratorios
      ctx.strokeStyle = 'rgba(255,222,160,0.55)'; ctx.lineWidth = 2.5;
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = this.t * 0.8 + i / n * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20);
        ctx.lineTo(cx + Math.cos(a) * (38 + Math.sin(this.t * 3 + i) * 6), cy + Math.sin(a) * (38 + Math.sin(this.t * 3 + i) * 6));
        ctx.stroke();
      }
      ctx.fillStyle = this.flash > 0 ? '#0d1016' : '#fff3dd';
      ctx.beginPath(); ctx.arc(cx, cy, 16 * pul, 0, 7); ctx.fill();
      // rostro: dos ojos cerrados tristes
      ctx.strokeStyle = this.flash > 0 ? '#ffe9c4' : '#8a6a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx - 6, cy - 1, 3.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 6, cy - 1, 3.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      // telegrafía de rayos
      if (this.state === 'beams' && this.beamXs) {
        ctx.strokeStyle = 'rgba(255,220,160,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
        for (const bx of this.beamXs) { ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, G.roomPx.h); ctx.stroke(); }
        ctx.setLineDash([]);
      }
      if (this.state === 'beamfire' && this.beamXs) {
        for (const bx of this.beamXs) {
          const bg = ctx.createLinearGradient(bx - 26, 0, bx + 26, 0);
          bg.addColorStop(0, 'rgba(255,230,180,0)'); bg.addColorStop(0.5, 'rgba(255,240,210,0.85)'); bg.addColorStop(1, 'rgba(255,230,180,0)');
          ctx.fillStyle = bg; ctx.fillRect(bx - 26, 0, 52, G.roomPx.h);
        }
      }
    }
    ctx.restore();
  }
}

/* ================= proyectiles / esquirlas / partículas ================= */
function updateProj(p, dt, pl) {
  if (p.delay && p.delay > 0) { p.delay -= dt; return true; }
  p.life -= dt;
  if (p.life <= 0) return false;
  if (p.grav) p.vy = Math.min(800, p.vy + PHYS.grav * 0.55 * dt);
  if (p.kind === 'orb') {
    const ang = Math.atan2(pl.cy - p.y, pl.cx - p.x);
    p.vx += Math.cos(ang) * 300 * dt; p.vy += Math.sin(ang) * 300 * dt;
    const s = Math.hypot(p.vx, p.vy); if (s > 175) { p.vx *= 175 / s; p.vy *= 175 / s; }
  }
  p.x += p.vx * dt; p.y += p.vy * dt;
  // choque con sólidos (las oleadas y mareas se pegan al suelo)
  const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  if (p.kind === 'wave' || p.kind === 'surge') {
    if (solidAt(Math.floor((p.x + Math.sign(p.vx) * p.r) / T), ty)) return false;
    if (!solidAt(tx, Math.floor((p.y + p.r + 6) / T))) p.y += 140 * dt;
  } else if (solidAt(tx, ty)) {
    if (p.kind === 'chispa') spawnP(6, p.x, p.y, { spread: 90, life: 0.3, col: '#ffd9a0', size: 2 });
    return false;
  }
  // daño al jugador
  if (p.hostile && pl.inv <= 0 && !pl.dead) {
    const hb = p.kind === 'surge' ? { x: p.x - 14, y: p.y - 26, w: 28, h: 46 } : { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    if (overlap(hb, { x: pl.x, y: pl.y, w: pl.w, h: pl.h })) { pl.damage(p.dmg, p.x); return p.kind === 'surge' || p.kind === 'wave'; }
  }
  return true;
}
function drawProj(ctx, p, accent) {
  if (p.delay && p.delay > 0) { // sombra de telegrafía (escombros)
    ctx.globalAlpha = 0.35; ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (0.22 - Math.min(0.22, p.delay)) * 30, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; return;
  }
  switch (p.kind) {
    case 'chispa': {
      const gr = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 14);
      gr.addColorStop(0, 'rgba(255,240,210,0.95)'); gr.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = gr; ctx.fillRect(p.x - 14, p.y - 14, 28, 28);
      ctx.fillStyle = '#fff3dd'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, 7); ctx.fill();
      break;
    }
    case 'lob':
      ctx.fillStyle = '#8fb56a'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 1, 0, 7); ctx.fill();
      ctx.fillStyle = '#41522f'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill();
      break;
    case 'orb': case 'orbline':
      ctx.fillStyle = 'rgba(127,178,217,0.35)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#b8dbf2'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 2, 0, 7); ctx.fill();
      break;
    case 'spear':
      ctx.strokeStyle = '#b8dbf2'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 16); ctx.lineTo(p.x, p.y + 10); ctx.stroke();
      ctx.fillStyle = '#b8dbf2'; ctx.beginPath(); ctx.moveTo(p.x - 4, p.y + 6); ctx.lineTo(p.x + 4, p.y + 6); ctx.lineTo(p.x, p.y + 16); ctx.fill();
      break;
    case 'wave':
      ctx.fillStyle = '#4a5568';
      ctx.beginPath(); ctx.moveTo(p.x - 14, p.y + 12); ctx.quadraticCurveTo(p.x, p.y - 16, p.x + 14, p.y + 12); ctx.fill();
      break;
    case 'surge':
      ctx.fillStyle = 'rgba(127,178,217,0.7)';
      ctx.beginPath(); ctx.moveTo(p.x - 18, p.y + 20); ctx.quadraticCurveTo(p.x, p.y - 30, p.x + 18, p.y + 20); ctx.fill();
      break;
    case 'debris':
      ctx.fillStyle = '#39445a'; ctx.beginPath();
      ctx.moveTo(p.x - 8, p.y + 4); ctx.lineTo(p.x - 2, p.y - 9); ctx.lineTo(p.x + 8, p.y - 2); ctx.lineTo(p.x + 4, p.y + 8); ctx.fill();
      break;
    case 'ember': {
      const gr = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 12);
      gr.addColorStop(0, 'rgba(255,226,170,0.9)'); gr.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = gr; ctx.fillRect(p.x - 12, p.y - 12, 24, 24);
      ctx.fillStyle = '#ffe9c4'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
      break;
    }
  }
}

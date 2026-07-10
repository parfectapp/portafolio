/* ===== OBRA — flow field vivo: concentraciones -> estrellas que explotan,
   y objetos que cruzan al hacer scroll (cohetes, ovnis, cometas, satélites) ===== */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, particles = [], t = 0, raf, mx = 0.5, my = 0.5, frames = 0;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 650 : 1800;

  // capas extra
  const stars = [];      // núcleos que crecen y explotan
  const sparks = [];     // chispas de las explosiones
  const sprites = [];    // cohetes / ovnis / cometas / satélites

  const ACCENT = "#FF5B2E", BONE = "#F4F1EA", PURPLE = "#9D7CFF", GREEN = "#3FD68C", AMBER = "#F2A33C";
  const PALETTE = [ACCENT, ACCENT, BONE, PURPLE, GREEN, AMBER];

  // rejilla de densidad para detectar concentraciones
  let CELL, GX, GY, grid, cool;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR;
    H = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.fillStyle = "#0A0A0B";
    ctx.fillRect(0, 0, W, H);
    CELL = 78 * DPR;
    GX = Math.max(1, Math.ceil(W / CELL));
    GY = Math.max(1, Math.ceil(H / CELL));
    grid = new Int16Array(GX * GY);
    cool = new Int32Array(GX * GY);   // frame en que la celda podrá volver a disparar
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; });

  function flow(x, y, time) {
    const s = 0.0011;
    const a = Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8);
    const b = Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4);
    const c = Math.sin((x + y) * s * 0.5 + time * 1.2) * 0.6;
    return (a + b + c) * Math.PI;
  }

  function seed(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.life = 60 + Math.random() * 220;
    p.c = PALETTE[(Math.random() * PALETTE.length) | 0];
    p.w = (Math.random() < 0.18 ? 2.2 : 0.7) * DPR;
    p.sp = 2.6 + Math.random() * 1.8;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p); particles.push(p); }

  /* ---------- estrellas y explosiones ---------- */
  function birthStar(x, y) {
    if (stars.length > 7) return;
    stars.push({ x, y, age: 0, grow: 42 + (Math.random() * 22 | 0), r: 0 });
  }
  function explode(x, y) {
    const n = 26 + (Math.random() * 26 | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (1.2 + Math.random() * 4.4) * DPR;
      sparks.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 26 + Math.random() * 40, max: 66,
        c: Math.random() < 0.5 ? BONE : (Math.random() < 0.6 ? ACCENT : PALETTE[(Math.random() * PALETTE.length) | 0]),
        w: (Math.random() < 0.3 ? 2.0 : 1.0) * DPR
      });
    }
  }

  function drawStars() {
    ctx.save();
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.age++;
      if (s.age <= s.grow) {
        // crece y brilla
        const k = s.age / s.grow;
        s.r = (1 + k * 6) * DPR;
        const glow = 6 + k * 22;
        ctx.globalAlpha = 0.25 + k * 0.75;
        ctx.fillStyle = BONE;
        ctx.shadowColor = ACCENT; ctx.shadowBlur = glow;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        // destello en cruz al acercarse al clímax
        if (k > 0.55) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = ACCENT; ctx.globalAlpha = (k - 0.55) * 1.6;
          ctx.lineWidth = 1.2 * DPR;
          const L = s.r * (3 + k * 4);
          ctx.beginPath();
          ctx.moveTo(s.x - L, s.y); ctx.lineTo(s.x + L, s.y);
          ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y + L);
          ctx.stroke();
        }
      } else {
        explode(s.x, s.y);
        stars.splice(i, 1);
      }
    }
    ctx.restore();
  }

  function drawSparks() {
    ctx.save();
    ctx.shadowBlur = 0;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vx *= 0.965; s.vy *= 0.965; s.vy += 0.02 * DPR;
      const px = s.x, py = s.y;
      s.x += s.vx; s.y += s.vy; s.life--;
      ctx.globalAlpha = Math.max(0, s.life / s.max) * 0.9;
      ctx.strokeStyle = s.c; ctx.lineWidth = s.w;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(s.x, s.y); ctx.stroke();
      if (s.life <= 0) sparks.splice(i, 1);
    }
    ctx.restore();
  }

  /* ---------- objetos que cruzan al bajar ---------- */
  const TYPES = ["comet", "rocket", "ufo", "satellite", "ufo", "rocket", "comet"];
  let typeIdx = 0, scrollAccum = 0, lastY = (window.scrollY || 0);

  function spawnSprite(type) {
    if (sprites.length > 5) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = (0.12 + Math.random() * 0.72) * H;
    const speed = (1.6 + Math.random() * 2.2) * DPR * dir;
    const scale = (type === "ufo" ? 1.15 : 1) * (0.9 + Math.random() * 0.7) * DPR;
    sprites.push({
      type, dir,
      x: dir > 0 ? -120 * DPR : W + 120 * DPR,
      y, vx: speed, base: y, ph: Math.random() * Math.PI * 2, sc: scale, spin: 0
    });
  }
  addEventListener("scroll", () => {
    const y = window.scrollY || 0;
    scrollAccum += Math.abs(y - lastY); lastY = y;
    if (scrollAccum > 560) { scrollAccum = 0; spawnSprite(TYPES[typeIdx++ % TYPES.length]); }
  }, { passive: true });

  function drawSprite(s) {
    s.x += s.vx;
    s.ph += 0.05; s.spin += 0.02;
    s.y = s.base + Math.sin(s.ph) * 6 * DPR;
    const off = s.x < -180 * DPR || s.x > W + 180 * DPR;
    ctx.save();
    ctx.translate(s.x, s.y);
    const k = s.sc;

    if (s.type === "comet") {
      const dirx = s.vx > 0 ? 1 : -1;
      const grad = ctx.createLinearGradient(-70 * k * dirx, 0, 6 * k * dirx, 0);
      grad.addColorStop(0, "rgba(244,241,234,0)");
      grad.addColorStop(1, "rgba(255,120,70,0.75)");
      ctx.strokeStyle = grad; ctx.lineWidth = 2.4 * k; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-70 * k * dirx, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.shadowColor = ACCENT; ctx.shadowBlur = 16;
      ctx.fillStyle = BONE; ctx.beginPath(); ctx.arc(0, 0, 2.6 * k, 0, Math.PI * 2); ctx.fill();

    } else if (s.type === "rocket") {
      const d = s.vx > 0 ? 1 : -1;
      ctx.scale(d, 1);
      // llama parpadeante
      const fl = (7 + Math.random() * 6) * k;
      const fg = ctx.createLinearGradient(-6 * k - fl, 0, -6 * k, 0);
      fg.addColorStop(0, "rgba(255,91,46,0)");
      fg.addColorStop(1, "rgba(255,170,60,0.9)");
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-6 * k, -2.2 * k); ctx.lineTo(-6 * k - fl, 0); ctx.lineTo(-6 * k, 2.2 * k); ctx.closePath(); ctx.fill();
      // cuerpo
      ctx.fillStyle = BONE;
      ctx.beginPath();
      ctx.moveTo(9 * k, 0); ctx.lineTo(0, -3 * k);
      ctx.lineTo(-6 * k, -3 * k); ctx.lineTo(-6 * k, 3 * k); ctx.lineTo(0, 3 * k);
      ctx.closePath(); ctx.fill();
      // aletas + ventana
      ctx.fillStyle = ACCENT;
      ctx.beginPath(); ctx.moveTo(-6 * k, -3 * k); ctx.lineTo(-9 * k, -5.5 * k); ctx.lineTo(-4 * k, -3 * k); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-6 * k, 3 * k); ctx.lineTo(-9 * k, 5.5 * k); ctx.lineTo(-4 * k, 3 * k); ctx.fill();
      ctx.beginPath(); ctx.arc(1.5 * k, 0, 1.5 * k, 0, Math.PI * 2); ctx.fill();

    } else if (s.type === "ufo") {
      // domo
      ctx.fillStyle = "rgba(157,124,255,0.55)";
      ctx.beginPath(); ctx.ellipse(0, -3 * k, 6 * k, 5 * k, 0, Math.PI, 0); ctx.fill();
      // platillo
      ctx.fillStyle = BONE;
      ctx.beginPath(); ctx.ellipse(0, 0, 15 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(10,10,11,0.35)";
      ctx.beginPath(); ctx.ellipse(0, 1.4 * k, 15 * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();
      // luces intermitentes
      const cols = [ACCENT, GREEN, AMBER, PURPLE];
      for (let i = 0; i < 4; i++) {
        const bx = (-9 + i * 6) * k;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.ph * 3 + i);
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(bx, 2.6 * k, 1.3 * k, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // haz de luz tenue
      ctx.fillStyle = "rgba(63,214,140,0.10)";
      ctx.beginPath(); ctx.moveTo(-5 * k, 3 * k); ctx.lineTo(5 * k, 3 * k); ctx.lineTo(11 * k, 20 * k); ctx.lineTo(-11 * k, 20 * k); ctx.closePath(); ctx.fill();

    } else { // satellite
      ctx.rotate(s.spin * 0.3);
      ctx.fillStyle = BONE;
      ctx.fillRect(-3 * k, -3 * k, 6 * k, 6 * k);
      ctx.fillStyle = PURPLE;
      ctx.fillRect(-14 * k, -2.2 * k, 8 * k, 4.4 * k);
      ctx.fillRect(6 * k, -2.2 * k, 8 * k, 4.4 * k);
      ctx.strokeStyle = "rgba(10,10,11,0.5)"; ctx.lineWidth = 0.8 * k;
      ctx.beginPath();
      ctx.moveTo(-10 * k, -2.2 * k); ctx.lineTo(-10 * k, 2.2 * k);
      ctx.moveTo(10 * k, -2.2 * k); ctx.lineTo(10 * k, 2.2 * k);
      ctx.stroke();
    }
    ctx.restore();
    return off;
  }

  function drawSprites() {
    ctx.save();
    for (let i = sprites.length - 1; i >= 0; i--) {
      if (drawSprite(sprites[i])) sprites.splice(i, 1);
    }
    ctx.restore();
  }

  /* ---------- loop ---------- */
  function frame() {
    frames++;
    t += 0.0026;
    ctx.fillStyle = "rgba(10,10,11,0.036)";
    ctx.fillRect(0, 0, W, H);

    grid.fill(0);
    const cx = mx * W, cy = my * H;
    for (const p of particles) {
      let ang = flow(p.x, p.y, t);
      const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) + 1;
      if (d < 360 * DPR) ang += Math.atan2(dy, dx) * 0.28;

      const nx = p.x + Math.cos(ang) * p.sp * DPR;
      const ny = p.y + Math.sin(ang) * p.sp * DPR;

      ctx.strokeStyle = p.c;
      ctx.globalAlpha = 0.26;
      ctx.lineWidth = p.w;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      p.x = nx; p.y = ny; p.life--;
      if (p.life < 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) { seed(p); continue; }

      // conteo de densidad
      const gi = (p.x / CELL | 0) + (p.y / CELL | 0) * GX;
      if (gi >= 0 && gi < grid.length) grid[gi]++;
    }
    ctx.globalAlpha = 1;

    // donde el flujo se concentra mucho -> nace una estrella
    const THRESH = lowEnd ? 16 : 24;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] >= THRESH && frames >= cool[i]) {
        cool[i] = frames + 150;   // enfriamiento por celda
        const gx = (i % GX) * CELL + CELL / 2;
        const gy = ((i / GX) | 0) * CELL + CELL / 2;
        birthStar(gx, gy);
      }
    }

    drawStars();
    drawSparks();
    drawSprites();

    raf = requestAnimationFrame(frame);
  }

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

  if (reduce) {
    for (let k = 0; k < 120; k++) {
      for (const p of particles) {
        const ang = flow(p.x, p.y, t);
        const nx = p.x + Math.cos(ang) * 2.4 * DPR, ny = p.y + Math.sin(ang) * 2.4 * DPR;
        ctx.strokeStyle = p.c; ctx.globalAlpha = 0.18; ctx.lineWidth = p.w;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny;
      }
      t += 0.02;
    }
    ctx.globalAlpha = 1;
  } else {
    start();
  }
})();

/* ===== OBRA — viaje espacial por secciones =====
   HERO = la luna: el cohete extrae su energía y la vuelve datos.
   Cada sección = un PLANETA de marca. Entre secciones se hace un
   SALTO tipo Star Wars (las estrellas se estiran a hiperespacio,
   flash, y desaceleran en la galaxia nueva). El cursor es un cohete. */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, particles = [], bits = [], t = 0, raf, mx = 0.5, my = 0.5;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 700 : 1600;

  const GAL = [
    { stars: ["#F4F1EA", "#F2A33C", "#FF5B2E"], neb: "rgba(242,163,60,",  spd: 1.0 },
    { stars: ["#FF5B2E", "#F4F1EA", "#F2A33C"], neb: "rgba(255,91,46,",   spd: 1.15 },
    { stars: ["#9D7CFF", "#F4F1EA", "#C9B4FF"], neb: "rgba(157,124,255,", spd: 1.05 },
    { stars: ["#3FD68C", "#F4F1EA", "#8AF2C0"], neb: "rgba(63,214,140,",  spd: 1.2 },
    { stars: ["#FF3B57", "#FF5B2E", "#F4F1EA"], neb: "rgba(255,59,87,",   spd: 1.35 },
    { stars: ["#7CB0FF", "#9D7CFF", "#F4F1EA"], neb: "rgba(124,176,255,", spd: 0.9 },
  ];

  const JUMPDUR = 165;                 // salto largo (~2.7s @60fps)
  let secEls = [], activeIdx = 0, fromIdx = 0, jumpClk = 1e9, stretch = 0, flash = 0, nebA = 0.16;

  const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const ss = (a, b, x) => { const k = seg(x, a, b); return k * k * (3 - 2 * k); };

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR;
    H = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.fillStyle = "#09090C"; ctx.fillRect(0, 0, W, H);
    collectSections();
  }
  function collectSections() {
    secEls = [...document.querySelectorAll("header.hero, main section")]
      .filter((s) => !s.classList.contains("marquee"));
  }

  function flow(x, y, time) {
    const s = 0.0011;
    const a = Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8);
    const b = Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4);
    const c = Math.sin((x + y) * s * 0.5 + time * 1.2) * 0.6;
    return (a + b + c) * Math.PI;
  }

  const VPx = () => 0.5 * W, VPy = () => 0.44 * H;
  function starColor(gi) { const a = GAL[gi % GAL.length].stars; return a[(Math.random() * a.length) | 0]; }

  function seed(pt, atVP) {
    if (atVP) { const a = Math.random() * 6.283, r = Math.random() * 30 * DPR; pt.x = VPx() + Math.cos(a) * r; pt.y = VPy() + Math.sin(a) * r; }
    else { pt.x = Math.random() * W; pt.y = Math.random() * H; }
    pt.life = 50 + Math.random() * 200;
    pt.c = starColor(activeIdx);
    pt.w = (Math.random() < 0.18 ? 2.0 : 0.7) * DPR;
    pt.sp = 3.0 + Math.random() * 2.0;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p, false); particles.push(p); }

  function activeSection() {
    const mid = innerHeight * 0.5;
    let best = activeIdx, bd = 1e9;
    for (let i = 0; i < secEls.length; i++) {
      const r = secEls[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) return i;
      const d = Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function nebula(gi, alpha) {
    if (alpha <= 0) return;
    const g = GAL[gi % GAL.length].neb;
    const nx = (0.28 + 0.44 * (0.5 + 0.5 * Math.sin(t * 0.11 + gi * 2))) * W;
    const ny = (0.18 + 0.34 * (0.5 + 0.5 * Math.cos(t * 0.08 + gi * 2))) * H;
    const rad = 0.42 * Math.max(W, H);
    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
    grad.addColorStop(0, g + alpha.toFixed(3) + ")");
    grad.addColorStop(0.55, g + (alpha * 0.35).toFixed(3) + ")");
    grad.addColorStop(1, g + "0)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- cuerpos: luna (hero) y planetas de marca ---------- */
  function bodyFor(idx) {
    const R = Math.min(W, H);
    if (idx === 0) return { x: 0.82 * W, y: 0.27 * H, r: 0.115 * R, moon: true };
    const side = idx % 2 === 1 ? 0.83 : 0.17;
    const ys = [0.30, 0.66, 0.34, 0.62, 0.38];
    return { x: side * W, y: ys[idx % ys.length] * H, r: 0.135 * R, moon: false, gi: idx };
  }

  function drawSphere(cx, cy, r, o, alpha, moon) {
    ctx.save(); ctx.globalAlpha = alpha;
    const gg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.95);
    gg.addColorStop(0, o.glow + "0.42)"); gg.addColorStop(1, o.glow + "0)");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r * 1.95, 0, 7); ctx.fill();
    const bg = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.42, r * 0.1, cx, cy, r);
    bg.addColorStop(0, o.light); bg.addColorStop(1, o.dark);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    if (moon) {
      ctx.fillStyle = "rgba(120,120,132,0.5)";
      const cr = [[-.3, -.2, .18], [.25, .1, .13], [-.1, .35, .1], [.35, -.35, .09], [.05, -.05, .07]];
      for (const c of cr) { ctx.beginPath(); ctx.arc(cx + c[0] * r, cy + c[1] * r, c[2] * r, 0, 7); ctx.fill(); }
    } else {
      ctx.strokeStyle = o.band; ctx.lineWidth = r * 0.12;
      for (let i = 0; i < 3; i++) {
        const yy = cy + Math.sin(t * 0.3 + i * 1.6) * r * 0.26 + (i - 1) * r * 0.42;
        ctx.beginPath(); ctx.moveTo(cx - r, yy);
        ctx.bezierCurveTo(cx - r * 0.3, yy - r * 0.14, cx + r * 0.3, yy + r * 0.14, cx + r, yy); ctx.stroke();
      }
    }
    ctx.restore();
    const tg = ctx.createRadialGradient(cx + r * 0.55, cy + r * 0.55, r * 0.2, cx, cy, r * 1.05);
    tg.addColorStop(0, "rgba(9,9,12,0)"); tg.addColorStop(1, "rgba(9,9,12,0.72)");
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.restore();
  }

  function drawBody(idx, alpha) {
    const b = bodyFor(idx);
    const gi = idx % GAL.length;
    const o = b.moon
      ? { glow: "rgba(200,205,220,", light: "#DADCE4", dark: "#33343d", band: "rgba(255,255,255,0.06)" }
      : { glow: GAL[gi].neb, light: GAL[gi].stars[0], dark: "#151019", band: GAL[gi].neb + "0.2)" };
    drawSphere(b.x, b.y, b.r, o, alpha, b.moon);
    // extracción de energía -> datos: emite "bits" que se alejan del cuerpo
    if (alpha > 0.4 && stretch < 0.15 && Math.random() < 0.7) {
      const a = Math.random() * 6.283, rr = b.r * (0.9 + Math.random() * 0.2);
      const bx = b.x + Math.cos(a) * rr, by = b.y + Math.sin(a) * rr;
      const dirx = (VPx() - b.x), diry = (VPy() - b.y), dl = Math.hypot(dirx, diry) + 1;
      bits.push({
        x: bx, y: by,
        vx: (dirx / dl) * (0.6 + Math.random()) * DPR + (Math.random() - 0.5) * DPR,
        vy: (diry / dl) * (0.6 + Math.random()) * DPR + (Math.random() - 0.5) * DPR,
        life: 60 + Math.random() * 60, max: 120,
        c: b.moon ? (Math.random() < 0.5 ? "#DADCE4" : "#F2A33C") : GAL[gi].stars[(Math.random() * 3) | 0],
        sz: (Math.random() < 0.5 ? 1.6 : 2.6) * DPR, energy: b.moon
      });
    }
  }

  function drawBits() {
    ctx.save();
    for (let i = bits.length - 1; i >= 0; i--) {
      const s = bits[i];
      s.x += s.vx; s.y += s.vy; s.vx *= 0.99; s.vy *= 0.99; s.life--;
      const k = Math.max(0, s.life / s.max);
      ctx.globalAlpha = k * 0.9;
      ctx.fillStyle = s.c;
      // energía = punto suave; dato = cuadrito
      if (s.energy && k > 0.6) { ctx.beginPath(); ctx.arc(s.x, s.y, s.sz, 0, 7); ctx.fill(); }
      else ctx.fillRect(s.x - s.sz / 2, s.y - s.sz / 2, s.sz, s.sz);
      if (s.life <= 0) bits.splice(i, 1);
    }
    ctx.restore();
  }

  /* ---------- loop ---------- */
  function render() {
    t += 0.004;
    const a = activeSection();
    if (a !== activeIdx) { fromIdx = activeIdx; activeIdx = a; jumpClk = 0; }
    jumpClk++;
    const ph = Math.min(1, jumpClk / JUMPDUR);
    stretch = Math.min(ss(0, 0.20, ph), 1 - ss(0.55, 1, ph));   // sube, sostiene hiperespacio, baja
    flash = Math.max(0, 1 - Math.abs(ph - 0.22) / 0.10);
    const blend = Math.min(1, jumpClk / (JUMPDUR * 0.5));

    if (jumpClk < JUMPDUR * 0.5) {
      const n = (particles.length * 0.05) | 0;
      for (let k = 0; k < n; k++) particles[(Math.random() * particles.length) | 0].c = starColor(activeIdx);
    }

    ctx.fillStyle = "rgba(9,9,12," + (0.05 + 0.10 * stretch).toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);
    nebula(fromIdx, nebA * (1 - blend) * (1 - stretch * 0.7));
    nebula(activeIdx, nebA * blend * (1 - stretch * 0.7));

    const gspd = GAL[activeIdx % GAL.length].spd;
    const cx = mx * W, cy = my * H, vx0 = VPx(), vy0 = VPy();
    for (const pt of particles) {
      if (stretch > 0.02) {
        // SALTO STAR WARS: estelas radiales largas desde el punto de fuga
        const rx = pt.x - vx0, ry = pt.y - vy0, rl = Math.hypot(rx, ry) + 1;
        const ru = rx / rl, rv = ry / rl;
        const boost = stretch * (7 + (rl / W) * 46) * DPR;
        pt.x += ru * boost; pt.y += rv * boost;
        const len = stretch * (rl * 0.55 + 24 * DPR);
        ctx.strokeStyle = stretch > 0.55 ? "#F4F1EA" : pt.c;
        ctx.globalAlpha = 0.32 + 0.6 * stretch;
        ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x - ru * len, pt.y - rv * len); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        if (rl > Math.max(W, H) * 0.75) seed(pt, true);
      } else {
        let ang = flow(pt.x, pt.y, t);
        const dx = cx - pt.x, dy = cy - pt.y, d = Math.hypot(dx, dy) + 1;
        if (d < 300 * DPR) ang += Math.atan2(dy, dx) * 0.18;
        const nx = pt.x + Math.cos(ang) * pt.sp * gspd * DPR, ny = pt.y + Math.sin(ang) * pt.sp * gspd * DPR;
        ctx.strokeStyle = pt.c; ctx.globalAlpha = 0.22; ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny); ctx.stroke();
        pt.x = nx; pt.y = ny; pt.life--;
        if (pt.life < 0 || pt.x < -5 || pt.x > W + 5 || pt.y < -5 || pt.y > H + 5) seed(pt, false);
      }
    }
    ctx.globalAlpha = 1;

    // cuerpo de la sección actual (aparece ya asentado, se esconde en el salto)
    const bodyA = ss(0.5, 0.9, ph) * (1 - stretch);
    drawBody(activeIdx, bodyA);
    drawBits();

    // flash del salto a la velocidad de la luz
    if (flash > 0.01) {
      const fg = ctx.createRadialGradient(vx0, vy0, 0, vx0, vy0, Math.max(W, H) * 0.7);
      fg.addColorStop(0, "rgba(244,241,234," + (0.55 * flash).toFixed(3) + ")");
      fg.addColorStop(1, "rgba(244,241,234,0)");
      ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
    }
  }
  function frame() { render(); raf = requestAnimationFrame(frame); }
  window.__render = render;

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; });
  resize();

  if (reduce) {
    for (let k = 0; k < 60; k++) {
      for (const pt of particles) {
        const ang = flow(pt.x, pt.y, t);
        const nx = pt.x + Math.cos(ang) * 2.4 * DPR, ny = pt.y + Math.sin(ang) * 2.4 * DPR;
        ctx.strokeStyle = pt.c; ctx.globalAlpha = 0.16; ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny); ctx.stroke();
        pt.x = nx; pt.y = ny;
      }
      t += 0.02;
    }
    ctx.globalAlpha = 1; drawBody(0, 1);
  } else {
    start();
  }
})();

/* ===== Cursor = cohete que sigue al mouse ===== */
(function () {
  if (matchMedia("(pointer:coarse)").matches) return;
  const style = document.createElement("style");
  style.textContent =
    "*{cursor:none!important}.cursor{display:none!important}" +
    "#rkt{position:fixed;left:0;top:0;z-index:100000;pointer-events:none;will-change:transform;opacity:0;transition:opacity .5s}" +
    "body.ready #rkt{opacity:1}" +
    "#rkt svg{display:block;filter:drop-shadow(0 0 7px rgba(255,91,46,.55))}" +
    "#rkt-fl{transform-box:fill-box;transform-origin:top center}";
  document.head.appendChild(style);
  const el = document.createElement("div");
  el.id = "rkt";
  el.innerHTML =
    '<svg width="30" height="42" viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="rktfg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#FFC24A"/><stop offset="1" stop-color="#FF5B2E" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    '<g id="rkt-fl"><path d="M13 37 Q20 60 27 37 Q20 45 13 37 Z" fill="url(#rktfg)"/></g>' +
    '<path d="M14 30 L7 41 L14 38 Z" fill="#FF5B2E"/><path d="M26 30 L33 41 L26 38 Z" fill="#FF5B2E"/>' +
    '<path d="M20 3 C28 9 28 22 26 31 L26 37 L14 37 L14 31 C12 22 12 9 20 3 Z" fill="#F4F1EA"/>' +
    '<circle cx="20" cy="19" r="3.6" fill="#0A0A0B" stroke="#FF5B2E" stroke-width="2"/></svg>';
  document.body.appendChild(el);
  const fl = el.querySelector("#rkt-fl");
  let mX = innerWidth / 2, mY = innerHeight / 2, cX = mX, cY = mY, ang = -90, lx = cX, ly = cY;
  addEventListener("pointermove", (e) => { mX = e.clientX; mY = e.clientY; }, { passive: true });
  (function loop() {
    requestAnimationFrame(loop);
    cX += (mX - cX) * 0.28; cY += (mY - cY) * 0.28;
    const dx = cX - lx, dy = cY - ly, sp = Math.hypot(dx, dy);
    if (sp > 0.5) ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    lx = cX; ly = cY;
    el.style.transform = "translate(" + cX + "px," + cY + "px) rotate(" + ang + "deg) translate(-50%,-50%)";
    const s = Math.min(2.6, 0.55 + sp * 0.16) * (0.82 + Math.random() * 0.36);
    fl.style.transform = "scaleY(" + s.toFixed(2) + ")";
  })();
})();

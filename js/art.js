/* ===== OBRA — viaje intergaláctico por secciones =====
   Cada sección es una GALAXIA distinta (color de estrellas + nebulosa).
   Al cruzar de una sección a otra se dispara un SALTO (warp/hiperespacio)
   y el campo se recolorea a la nueva galaxia. Sin planetas. Rápido.
   El cohete es el cursor del mouse (ver módulo al final). */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, particles = [], t = 0, raf, mx = 0.5, my = 0.5;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 650 : 1500;

  // galaxias: una por sección (ciclan si hay más secciones que galaxias)
  const GAL = [
    { stars: ["#F4F1EA", "#F2A33C", "#FF5B2E"], neb: "rgba(242,163,60,",  spd: 1.0 },  // origen — cálida
    { stars: ["#FF5B2E", "#F4F1EA", "#F2A33C"], neb: "rgba(255,91,46,",   spd: 1.25 }, // vermellón
    { stars: ["#9D7CFF", "#F4F1EA", "#C9B4FF"], neb: "rgba(157,124,255,", spd: 1.1 },  // violeta
    { stars: ["#3FD68C", "#F4F1EA", "#8AF2C0"], neb: "rgba(63,214,140,",  spd: 1.35 }, // esmeralda
    { stars: ["#FF3B57", "#FF5B2E", "#F4F1EA"], neb: "rgba(255,59,87,",   spd: 1.6 },  // carmesí (games)
    { stars: ["#7CB0FF", "#9D7CFF", "#F4F1EA"], neb: "rgba(124,176,255,", spd: 0.9 },  // campo profundo azul
  ];

  let secEls = [], activeIdx = 0, fromIdx = 0, jumpClk = 999, warp = 0, nebA = 0.17;

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

  function seed(pt) {
    if (warp > 0.35 && Math.random() < warp) {   // durante el salto nacen cerca del punto de fuga
      const a = Math.random() * 6.283, r = Math.random() * 46 * DPR;
      pt.x = VPx() + Math.cos(a) * r; pt.y = VPy() + Math.sin(a) * r;
    } else {
      pt.x = Math.random() * W; pt.y = Math.random() * H;
    }
    pt.life = 50 + Math.random() * 200;
    pt.c = starColor(activeIdx);
    pt.w = (Math.random() < 0.18 ? 2.0 : 0.7) * DPR;
    pt.sp = 3.0 + Math.random() * 2.0;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p); particles.push(p); }

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
    // glow contenido y desplazado (una galaxia a lo lejos), no una niebla de pantalla completa
    const nx = (0.28 + 0.44 * (0.5 + 0.5 * Math.sin(t * 0.11 + gi * 2))) * W;
    const ny = (0.18 + 0.34 * (0.5 + 0.5 * Math.cos(t * 0.08 + gi * 2))) * H;
    const rad = 0.42 * Math.max(W, H);
    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
    grad.addColorStop(0, g + (alpha).toFixed(3) + ")");
    grad.addColorStop(0.55, g + (alpha * 0.35).toFixed(3) + ")");
    grad.addColorStop(1, g + "0)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- loop ---------- */
  function render() {
    t += 0.004;

    // ¿cambió de sección? -> salto
    const a = activeSection();
    if (a !== activeIdx) { fromIdx = activeIdx; activeIdx = a; jumpClk = 0; }
    jumpClk++;
    warp = jumpClk < 52 ? Math.sin(Math.min(1, jumpClk / 52) * Math.PI) : 0;
    const blend = Math.min(1, jumpClk / 34);

    // recolorea el campo hacia la galaxia activa durante el salto
    if (jumpClk < 40) {
      const n = (particles.length * 0.09) | 0;
      for (let k = 0; k < n; k++) particles[(Math.random() * particles.length) | 0].c = starColor(activeIdx);
    }

    // fondo: fade (más fuerte durante el salto para limpiar las estelas) + nebulosa
    ctx.fillStyle = "rgba(9,9,12," + (0.05 + 0.10 * warp).toFixed(3) + ")";
    ctx.fillRect(0, 0, W, H);
    nebula(fromIdx, nebA * (1 - blend));
    nebula(activeIdx, nebA * blend);

    const gspd = GAL[activeIdx % GAL.length].spd;
    const cx = mx * W, cy = my * H, vx0 = VPx(), vy0 = VPy();
    for (const pt of particles) {
      let ang = flow(pt.x, pt.y, t);
      const dx = cx - pt.x, dy = cy - pt.y, d = Math.hypot(dx, dy) + 1;
      if (d < 300 * DPR) ang += Math.atan2(dy, dx) * 0.18 * (1 - warp);
      let vx = Math.cos(ang) * pt.sp * gspd, vy = Math.sin(ang) * pt.sp * gspd;
      if (warp > 0) {
        const rx = pt.x - vx0, ry = pt.y - vy0, rl = Math.hypot(rx, ry) + 1;
        const ws = (3 + (rl / W) * 13) * warp;
        vx = vx * (1 - warp) + (rx / rl) * ws;
        vy = vy * (1 - warp) + (ry / rl) * ws;
      }
      const nx = pt.x + vx * DPR, ny = pt.y + vy * DPR;
      ctx.strokeStyle = pt.c; ctx.globalAlpha = 0.22 + 0.55 * warp; ctx.lineWidth = pt.w;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny); ctx.stroke();
      pt.x = nx; pt.y = ny; pt.life--;
      if (pt.life < 0 || pt.x < -5 || pt.x > W + 5 || pt.y < -5 || pt.y > H + 5) seed(pt);
    }
    ctx.globalAlpha = 1;
  }
  function frame() { render(); raf = requestAnimationFrame(frame); }
  window.__render = render;

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  addEventListener("resize", resize);
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
    ctx.globalAlpha = 1;
  } else {
    start();
  }
})();

/* ===== Cursor = cohete que sigue al mouse ===== */
(function () {
  if (matchMedia("(pointer:coarse)").matches) return;   // en táctil se deja el cursor normal
  const style = document.createElement("style");
  style.textContent =
    "*{cursor:none!important}.cursor{display:none!important}" +
    "#rkt{position:fixed;left:0;top:0;z-index:100000;pointer-events:none;will-change:transform}" +
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
    '<path d="M14 30 L7 41 L14 38 Z" fill="#FF5B2E"/>' +
    '<path d="M26 30 L33 41 L26 38 Z" fill="#FF5B2E"/>' +
    '<path d="M20 3 C28 9 28 22 26 31 L26 37 L14 37 L14 31 C12 22 12 9 20 3 Z" fill="#F4F1EA"/>' +
    '<circle cx="20" cy="19" r="3.6" fill="#0A0A0B" stroke="#FF5B2E" stroke-width="2"/>' +
    '</svg>';
  document.body.appendChild(el);
  const fl = el.querySelector("#rkt-fl");

  let mX = innerWidth / 2, mY = innerHeight / 2, cX = mX, cY = mY, ang = -90, lx = cX, ly = cY;
  addEventListener("pointermove", (e) => { mX = e.clientX; mY = e.clientY; }, { passive: true });
  addEventListener("pointerdown", () => el.classList.add("boost"));

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

/* ===== OBRA — el viaje del cohete, planetas hiperrealistas =====
   INTRO (loader "ANDRÉ") = despegue desde la TIERRA.
   Landing (hero) = ya en la LUNA. Luego: Apps=Luna · E-commerce=Marte ·
   [Sol: minar energía + asteroides] · Branding=Júpiter · Games=galaxia.
   El cohete es el protagonista; lo seguimos. Los planetas se renderizan
   con iluminación 3D por píxel + atmósfera + texturas procedurales. */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, R, particles = [], bits = [], asteroids = [], t = 0, raf;
  let secEls = [], J = 0, rkx = 0.5, rky = 0.5;

  const cs = document.createElement("style");
  cs.textContent = "body{cursor:auto}.cursor{display:none!important}";
  document.head.appendChild(cs);

  const BONE = "#F4F1EA", ACCENT = "#FF5B2E", AMBER = "#F2A33C";
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 620 : 1400;

  // hero = Luna (ya llegamos en la intro). Tierra sólo en la intro.
  const STAGES = [
    { type: "moon",    tint: "rgba(200,205,220," },  // hero
    { type: "moon",    tint: "rgba(200,205,220," },  // apps
    { type: "mars",    tint: "rgba(230,110,70," },   // e-commerce
    { type: "jupiter", tint: "rgba(220,170,110," },  // branding
    { type: "galaxy",  tint: "rgba(157,124,255," },  // games
    { type: "galaxy",  tint: "rgba(124,176,255," },  // about
    { type: "galaxy",  tint: "rgba(180,150,255," },  // contact
  ];
  const GLOW = { moon: "rgba(205,210,225,", mars: "rgba(230,120,70,", jupiter: "rgba(225,175,120,", earth: "rgba(90,150,255," };

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const ss = (a, b, x) => { const k = seg(x, a, b); return k * k * (3 - 2 * k); };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (c1, c2, k) => [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];

  /* ---------- ruido procedural ---------- */
  function hash(i, j) { let n = (i * 374761393 + j * 668265263) | 0; n = (n ^ (n >> 13)) * 1274126177 | 0; return ((n ^ (n >> 16)) >>> 0) / 4294967295; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }
  function fbm(x, y) { let s = 0, amp = 0.5, f = 1; for (let o = 0; o < 5; o++) { s += amp * vnoise(x * f, y * f); f *= 2; amp *= 0.5; } return s; }

  /* ---------- generador de planetas (iluminación 3D por píxel) ---------- */
  const ATM = { earth: [30, 95, 220], mars: [150, 60, 35], jupiter: [130, 85, 45], moon: null };
  const TEX = {};
  function surface(type, lon, lat) {
    if (type === "moon") {
      const v = fbm(lon * 2.4 + 3, lat * 2.4);
      let g = 132 + v * 104;
      if (fbm(lon * 1.3 + 20, lat * 1.3) < 0.42) g -= 30;   // mares
      return [g, g, g * 0.98, 0];
    }
    if (type === "mars") {
      const v = fbm(lon * 2.1 + 1, lat * 2.1);
      let c = mix([205, 110, 66], [120, 52, 28], 1 - v);
      if (fbm(lon * 1.4 + 8, lat * 1.4) < 0.36) c = mix(c, [92, 46, 30], 0.7);
      if (Math.abs(lat) > 0.92 - fbm(lon * 4, 9) * 0.06) c = [232, 232, 238];
      return [c[0], c[1], c[2], 0];
    }
    if (type === "jupiter") {
      const turb = (fbm(lon * 3.0, lat * 9 + 5) - 0.5) * 0.10;
      const band = Math.sin((lat + turb) * 12);
      let c = mix([232, 208, 168], [150, 100, 62], band * 0.5 + 0.5);
      if (band > 0.6) c = mix(c, [245, 232, 205], 0.5);
      const dlon = lon - 0.55, dlat = lat + 0.34;
      const spot = (dlon / 0.5) ** 2 + (dlat / 0.17) ** 2;
      if (spot < 1) c = mix([200, 78, 52], c, spot * 0.5);
      return [c[0], c[1], c[2], 0];
    }
    // earth
    const h = fbm(lon * 4.6 + 5, lat * 4.6 + 2);
    let c, spec = 0;
    if (h < 0.5) { c = mix([14, 52, 122], [30, 92, 165], h * 2); spec = 0.5; }            // océano
    else { c = mix([46, 128, 54], [168, 140, 84], clamp((h - 0.5) * 3, 0, 1)); }          // tierra: verde->árido
    if (Math.abs(lat) > 0.86 - fbm(lon * 5, 3) * 0.06) c = mix(c, [236, 238, 244], 0.85); // casquetes
    const cl = fbm(lon * 5.2 + 9, lat * 5.2);
    if (cl > 0.58) c = mix(c, [244, 246, 250], clamp((cl - 0.58) * 4, 0, 1));            // nubes
    return [c[0], c[1], c[2], spec];
  }
  function makePlanet(type) {
    const S = 460, C = S / 2, RR = 206;
    const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
    const g = cv.getContext("2d");
    const im = g.createImageData(S, S), d = im.data;
    const ll = Math.hypot(-0.5, -0.55, 0.66), Lx = -0.5 / ll, Ly = -0.55 / ll, Lz = 0.66 / ll;
    const atm = ATM[type];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const nx = (x - C) / RR, ny = (y - C) / RR, d2 = nx * nx + ny * ny, i = (y * S + x) * 4;
      if (d2 > 1) { d[i + 3] = 0; continue; }
      const nz = Math.sqrt(1 - d2);
      const lon = Math.atan2(nx, nz), lat = Math.asin(clamp(ny, -1, 1));
      const col = surface(type, lon, lat);
      let lam = Math.max(0, nx * Lx + ny * Ly + nz * Lz);
      let sh = (0.26 + lam * 0.88) * (0.62 + 0.38 * nz);
      let r = col[0] * sh, gg = col[1] * sh, b = col[2] * sh;
      if (atm) { const rim = Math.pow(1 - nz, 2.6) * lam; r += atm[0] * rim; gg += atm[1] * rim; b += atm[2] * rim; }
      if (col[3]) { const hl = Math.hypot(Lx, Ly, Lz + 1); let sp = Math.max(0, (nx * Lx + ny * Ly + nz * (Lz + 1)) / hl); sp = Math.pow(sp, 42) * col[3]; r += 255 * sp; gg += 255 * sp; b += 255 * sp; }
      d[i] = Math.min(255, r); d[i + 1] = Math.min(255, gg); d[i + 2] = Math.min(255, b); d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    if (type === "moon") {           // cráteres 3D encima (piso oscuro + borde iluminado)
      for (let k = 0; k < 22; k++) {
        const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * RR * 0.9;
        const cx = C + Math.cos(a) * rr, cy = C + Math.sin(a) * rr, cr = 4 + Math.random() * 15;
        if ((cx - C) ** 2 + (cy - C) ** 2 > (RR - cr) ** 2) continue;
        const fg = g.createRadialGradient(cx, cy, 0, cx, cy, cr);
        fg.addColorStop(0, "rgba(48,48,54,0.5)"); fg.addColorStop(1, "rgba(48,48,54,0)");
        g.fillStyle = fg; g.beginPath(); g.arc(cx, cy, cr, 0, 7); g.fill();
        g.strokeStyle = "rgba(236,238,242,0.55)"; g.lineWidth = cr * 0.16;
        g.beginPath(); g.arc(cx, cy, cr * 0.85, Math.PI * 0.72, Math.PI * 1.7); g.stroke();
      }
    }
    return cv;
  }
  function buildTextures() { ["moon", "mars", "jupiter", "earth"].forEach((tp) => { TEX[tp] = makePlanet(tp); }); window.__TEX = TEX; }

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR; H = canvas.height = innerHeight * DPR; R = Math.min(W, H);
    canvas.style.width = innerWidth + "px"; canvas.style.height = innerHeight + "px";
    ctx.fillStyle = "#09090C"; ctx.fillRect(0, 0, W, H);
    collectSections();
  }
  function collectSections() { secEls = [...document.querySelectorAll("header.hero, main section")].filter((s) => !s.classList.contains("marquee")); }

  function flow(x, y, time) { const s = 0.0011; return (Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8) + Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4)) * Math.PI; }
  function seed(pt, atVP) {
    if (atVP) { const a = Math.random() * 6.283, r = Math.random() * 26 * DPR; pt.x = W / 2 + Math.cos(a) * r; pt.y = H * 0.45 + Math.sin(a) * r; }
    else { pt.x = Math.random() * W; pt.y = Math.random() * H; }
    pt.life = 50 + Math.random() * 200; pt.c = Math.random() < 0.72 ? BONE : (Math.random() < 0.5 ? AMBER : "#9D7CFF");
    pt.w = (Math.random() < 0.16 ? 2.0 : 0.7) * DPR; pt.sp = 2.8 + Math.random() * 1.8;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p, false); particles.push(p); }

  function journey() {
    if (secEls.length < 2) return 0;
    const cur = (scrollY || 0) + innerHeight / 2, n = secEls.length;
    const tops = secEls.map((s) => s.getBoundingClientRect().top + scrollY);
    const lastBot = (() => { const r = secEls[n - 1].getBoundingClientRect(); return r.top + scrollY + r.height; })();
    if (cur <= tops[0]) return 0;
    for (let i = 0; i < n; i++) { const hi = i < n - 1 ? tops[i + 1] : lastBot; if (cur < hi) { const prog = (cur - tops[i]) / Math.max(1, hi - tops[i]); return i + ss(0.68, 1.0, prog); } }
    return n - 1;
  }

  function nebula(tint, alpha) {
    if (alpha <= 0.002) return;
    const g = ctx.createRadialGradient(0.5 * W, 0.4 * H, 0, 0.5 * W, 0.4 * H, 0.75 * Math.max(W, H));
    g.addColorStop(0, tint + alpha.toFixed(3) + ")"); g.addColorStop(0.6, tint + (alpha * 0.3).toFixed(3) + ")"); g.addColorStop(1, tint + "0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function bodyPos(type) {
    if (type === "moon") return { x: 0.77 * W, y: 0.30 * H, r: 0.14 * R };
    if (type === "mars") return { x: 0.23 * W, y: 0.32 * H, r: 0.12 * R };
    if (type === "jupiter") return { x: 0.74 * W, y: 0.38 * H, r: 0.19 * R };
    return { x: 0.5 * W, y: 0.42 * H, r: 0.22 * R };
  }
  function blitPlanet(type, cx, cy, r, alpha) {
    const img = TEX[type]; if (!img) return;
    ctx.save(); ctx.globalAlpha = alpha;
    const gl = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.45);
    gl.addColorStop(0, GLOW[type] + "0.16)"); gl.addColorStop(1, GLOW[type] + "0)");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, r * 1.45, 0, 7); ctx.fill();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }
  function drawBody(idx, alpha) {
    if (alpha <= 0.01) return;
    const type = STAGES[clamp(idx, 0, STAGES.length - 1)].type;
    const p = bodyPos(type);
    if (alpha > 0.6 && Math.random() < 0.4) emit(p.x, p.y, p.r, type === "moon");
    if (type === "galaxy") drawGalaxy(p.x, p.y, p.r, alpha); else blitPlanet(type, p.x, p.y, p.r, alpha);
  }

  function drawGalaxy(cx, cy, r, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, "rgba(255,252,245,0.95)"); core.addColorStop(0.25, "rgba(210,190,255,0.5)"); core.addColorStop(1, "rgba(157,124,255,0)");
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    const spin = t * 0.05;
    for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 360; i++) {
      const f = i / 360, ang = f * 6.6 + arm * Math.PI + spin, rad = f * r * 1.05;
      const jit = Math.sin(i * 12.9) * r * 0.07;
      const x = cx + Math.cos(ang) * rad + Math.cos(ang * 3) * jit, y = cy + Math.sin(ang) * rad * 0.6 + Math.sin(ang * 3) * jit;
      ctx.globalAlpha = alpha * (1 - f) * 0.9; ctx.fillStyle = i % 5 === 0 ? "#C9B4FF" : BONE; ctx.fillRect(x, y, 1.7 * DPR, 1.7 * DPR);
    }
    ctx.restore();
  }
  function drawSun(cx, cy, r, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    const co = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.5);
    co.addColorStop(0, "rgba(255,244,200,1)"); co.addColorStop(0.28, "rgba(255,170,60,0.9)"); co.addColorStop(0.6, "rgba(255,91,46,0.3)"); co.addColorStop(1, "rgba(255,91,46,0)");
    ctx.fillStyle = co; ctx.beginPath(); ctx.arc(cx, cy, r * 2.5, 0, 7); ctx.fill();
    const bg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
    bg.addColorStop(0, "#FFF8DC"); bg.addColorStop(0.65, "#FFB03C"); bg.addColorStop(1, "#F0651E");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    // granulación
    ctx.globalAlpha = alpha * 0.5;
    for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, rr = Math.random() * r * 0.92, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,120,40,0.5)" : "rgba(255,240,190,0.5)"; ctx.beginPath(); ctx.arc(x, y, r * (0.03 + Math.random() * 0.05), 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function emit(bx, by, br, energy) {
    const a = Math.random() * 6.283, rr = br * (0.9 + Math.random() * 0.2), sx = bx + Math.cos(a) * rr, sy = by + Math.sin(a) * rr;
    const dx = rkx * W - sx, dy = rky * H - sy, dl = Math.hypot(dx, dy) + 1;
    bits.push({ x: sx, y: sy, vx: (dx / dl) * (0.8 + Math.random()) * DPR, vy: (dy / dl) * (0.8 + Math.random()) * DPR, life: 40 + Math.random() * 40, max: 80, c: energy ? (Math.random() < 0.5 ? "#DADCE4" : AMBER) : BONE, sz: (Math.random() < 0.5 ? 1.6 : 2.6) * DPR, energy });
  }
  function drawBits() {
    for (let i = bits.length - 1; i >= 0; i--) { const s = bits[i]; s.x += s.vx; s.y += s.vy; s.vx *= 0.99; s.vy *= 0.99; s.life--; const k = Math.max(0, s.life / s.max); ctx.globalAlpha = k * 0.9; ctx.fillStyle = s.c; if (s.energy && k > 0.6) { ctx.beginPath(); ctx.arc(s.x, s.y, s.sz, 0, 7); ctx.fill(); } else ctx.fillRect(s.x - s.sz / 2, s.y - s.sz / 2, s.sz, s.sz); if (s.life <= 0) bits.splice(i, 1); }
    ctx.globalAlpha = 1;
  }
  function drawAsteroids(alpha, drift) {
    if (asteroids.length === 0) for (let i = 0; i < 24; i++) asteroids.push({ x: Math.random(), y: Math.random(), s: 4 + Math.random() * 12, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.04 });
    ctx.save(); ctx.globalAlpha = alpha;
    for (const a of asteroids) { const x = ((a.x + drift * 0.3) % 1) * W, y = a.y * H; a.r += a.vr; ctx.save(); ctx.translate(x, y); ctx.rotate(a.r); const grad = ctx.createRadialGradient(-a.s * DPR * 0.3, -a.s * DPR * 0.3, 0, 0, 0, a.s * DPR); grad.addColorStop(0, "#6a655c"); grad.addColorStop(1, "#37332d"); ctx.fillStyle = grad; ctx.beginPath(); const n = 8, rr = a.s * DPR; for (let i = 0; i < n; i++) { const ang = (i / n) * 6.283, rad = rr * (0.7 + Math.sin(i * 3.1) * 0.3); ctx[i ? "lineTo" : "moveTo"](Math.cos(ang) * rad, Math.sin(ang) * rad); } ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
  }

  /* ---------- cohete (protagonista, detallado) ---------- */
  function drawRocket(cx, cy, k, ang, thrust) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
    // plasma / llama
    const fl = (0.9 + thrust * 1.8 + Math.random() * 0.4) * k;
    ctx.shadowColor = ACCENT; ctx.shadowBlur = 22;
    const og = ctx.createLinearGradient(0, k * 3.1, 0, k * 3.1 + fl * 3.4);
    og.addColorStop(0, "rgba(255,210,120,0.95)"); og.addColorStop(0.4, "rgba(255,120,40,0.85)"); og.addColorStop(1, "rgba(255,80,40,0)");
    ctx.fillStyle = og; ctx.beginPath(); ctx.moveTo(-k * 1.0, k * 3.1); ctx.quadraticCurveTo(0, k * (3.1 + fl * 3.6), k * 1.0, k * 3.1); ctx.closePath(); ctx.fill();
    const bl = ctx.createLinearGradient(0, k * 3.1, 0, k * 3.1 + fl * 1.7);
    bl.addColorStop(0, "rgba(200,235,255,0.95)"); bl.addColorStop(1, "rgba(120,180,255,0)");
    ctx.fillStyle = bl; ctx.beginPath(); ctx.moveTo(-k * 0.5, k * 3.1); ctx.quadraticCurveTo(0, k * (3.1 + fl * 1.9), k * 0.5, k * 3.1); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // aletas (sombreadas)
    const finR = ctx.createLinearGradient(k * 1.0, 0, k * 2.4, 0); finR.addColorStop(0, "#FF7A45"); finR.addColorStop(1, "#B4361A");
    ctx.fillStyle = finR; ctx.beginPath(); ctx.moveTo(k * 1.05, k * 1.4); ctx.lineTo(k * 2.3, k * 3.4); ctx.lineTo(k * 1.05, k * 3.0); ctx.closePath(); ctx.fill();
    const finL = ctx.createLinearGradient(-k * 1.0, 0, -k * 2.4, 0); finL.addColorStop(0, "#E8663A"); finL.addColorStop(1, "#8E2A12");
    ctx.fillStyle = finL; ctx.beginPath(); ctx.moveTo(-k * 1.05, k * 1.4); ctx.lineTo(-k * 2.3, k * 3.4); ctx.lineTo(-k * 1.05, k * 3.0); ctx.closePath(); ctx.fill();
    // cuerpo metálico (sombreado cilíndrico)
    const body = ctx.createLinearGradient(-k * 1.9, 0, k * 1.9, 0);
    body.addColorStop(0, "#8f8b82"); body.addColorStop(0.32, "#f2efe7"); body.addColorStop(0.5, "#ffffff"); body.addColorStop(0.7, "#e7e3da"); body.addColorStop(1, "#9c988e");
    ctx.fillStyle = body; ctx.beginPath();
    ctx.moveTo(0, -k * 4.1); ctx.bezierCurveTo(k * 1.95, -k * 2.3, k * 1.9, k * 1.7, k * 1.05, k * 3.1);
    ctx.lineTo(-k * 1.05, k * 3.1); ctx.bezierCurveTo(-k * 1.9, k * 1.7, -k * 1.95, -k * 2.3, 0, -k * 4.1); ctx.closePath(); ctx.fill();
    // cono / nariz acento
    const nose = ctx.createLinearGradient(-k, -k * 4, k, -k * 2); nose.addColorStop(0, "#FF7A45"); nose.addColorStop(1, "#E8481E");
    ctx.fillStyle = nose; ctx.beginPath(); ctx.moveTo(0, -k * 4.1); ctx.bezierCurveTo(k * 1.2, -k * 3.1, k * 1.1, -k * 2.4, k * 0.9, -k * 2.1); ctx.lineTo(-k * 0.9, -k * 2.1); ctx.bezierCurveTo(-k * 1.1, -k * 2.4, -k * 1.2, -k * 3.1, 0, -k * 4.1); ctx.closePath(); ctx.fill();
    // líneas de panel
    ctx.strokeStyle = "rgba(120,115,105,0.5)"; ctx.lineWidth = k * 0.09;
    ctx.beginPath(); ctx.moveTo(-k * 1.55, k * 0.4); ctx.lineTo(k * 1.55, k * 0.4); ctx.moveTo(-k * 1.35, k * 1.5); ctx.lineTo(k * 1.35, k * 1.5); ctx.stroke();
    // ventana con reflejo
    const win = ctx.createRadialGradient(-k * 0.25, -k * 0.9, 0, 0, -k * 0.6, k * 0.95);
    win.addColorStop(0, "#bfe3ff"); win.addColorStop(0.5, "#2a4a72"); win.addColorStop(1, "#0a1626");
    ctx.fillStyle = win; ctx.beginPath(); ctx.arc(0, -k * 0.6, k * 0.82, 0, 7); ctx.fill();
    ctx.strokeStyle = "#cfcabf"; ctx.lineWidth = k * 0.22; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(-k * 0.28, -k * 0.9, k * 0.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ---------- loop principal (#art) ---------- */
  let jOverride = null; window.__setJ = (v) => { jOverride = v; };
  function render() {
    t += 0.004;
    J = jOverride != null ? jOverride : journey();
    const N = STAGES.length;
    const from = clamp(Math.floor(J), 0, N - 1), to = clamp(from + 1, 0, N - 1), frac = clamp(J - from, 0, 1);
    const isSun = from === 2 && to >= 3;
    const stretch = ss(0.12, 0.4, frac) * (1 - ss(0.6, 0.92, frac));
    const flash = isSun ? 0 : Math.max(0, 1 - Math.abs(frac - 0.5) / 0.09);

    ctx.fillStyle = "rgba(9,9,12," + (0.05 + 0.10 * stretch).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H);
    nebula(STAGES[from].tint, (1 - frac) * 0.12 * (1 - stretch * 0.6));
    nebula(STAGES[to].tint, frac * 0.12 * (1 - stretch * 0.6));

    const vx0 = 0.5 * W, vy0 = 0.44 * H;
    for (const pt of particles) {
      if (stretch > 0.02) {
        const rx = pt.x - vx0, ry = pt.y - vy0, rl = Math.hypot(rx, ry) + 1, ru = rx / rl, rv = ry / rl;
        pt.x += ru * stretch * (7 + (rl / W) * 42) * DPR; pt.y += rv * stretch * (7 + (rl / W) * 42) * DPR;
        const len = stretch * (rl * 0.55 + 22 * DPR);
        ctx.strokeStyle = stretch > 0.55 ? BONE : pt.c; ctx.globalAlpha = 0.3 + 0.6 * stretch; ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x - ru * len, pt.y - rv * len); ctx.lineTo(pt.x, pt.y); ctx.stroke();
        if (rl > Math.max(W, H) * 0.75) seed(pt, true);
      } else {
        const ang = flow(pt.x, pt.y, t), nx = pt.x + Math.cos(ang) * pt.sp * DPR, ny = pt.y + Math.sin(ang) * pt.sp * DPR;
        ctx.strokeStyle = pt.c; ctx.globalAlpha = 0.2; ctx.lineWidth = pt.w;
        ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(nx, ny); ctx.stroke();
        pt.x = nx; pt.y = ny; pt.life--; if (pt.life < 0 || pt.x < -5 || pt.x > W + 5 || pt.y < -5 || pt.y > H + 5) seed(pt, false);
      }
    }
    ctx.globalAlpha = 1;

    const fromA = 1 - ss(0.12, 0.55, frac), toA = ss(0.6, 0.95, frac);
    if (isSun) {
      drawBody(2, 1 - ss(0.02, 0.28, frac));
      const sunA = ss(0.15, 0.4, frac) * (1 - ss(0.62, 0.85, frac));
      if (sunA > 0.01) {
        drawSun(0.5 * W, 0.4 * H, 0.16 * R, sunA);
        if (frac > 0.28 && frac < 0.6) { ctx.save(); ctx.globalAlpha = sunA * (0.5 + 0.5 * Math.sin(t * 6)); ctx.strokeStyle = AMBER; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.moveTo(rkx * W, rky * H); ctx.lineTo(0.5 * W, 0.4 * H); ctx.stroke(); ctx.restore(); if (Math.random() < 0.8) emit(0.5 * W, 0.4 * H, 0.16 * R, true); }
      }
      drawAsteroids(ss(0.5, 0.72, frac) * (1 - ss(0.8, 0.95, frac)), frac);
      drawBody(3, ss(0.78, 0.98, frac));
    } else { drawBody(from, fromA); drawBody(to, toA); }
    drawBits();

    const roundIdx = clamp(Math.round(J), 0, N - 1);
    const cbType = STAGES[roundIdx].type;
    const txr = cbType !== "galaxy" ? (bodyPos(cbType).x / W > 0.5 ? 0.40 : 0.60) : 0.5;
    rkx += (txr - rkx) * 0.05; rky += (0.52 - rky) * 0.08;
    const sway = Math.sin(t * 1.4) * 0.06 + (isSun ? (Math.atan2(0.4 * H - rky * H, 0.5 * W - rkx * W) + Math.PI / 2) * 0.15 : 0);
    drawRocket(rkx * W, rky * H, 5.4 * DPR, sway, 0.4 + stretch * 1.6);

    if (flash > 0.01) { const fg = ctx.createRadialGradient(vx0, vy0, 0, vx0, vy0, Math.max(W, H) * 0.7); fg.addColorStop(0, "rgba(244,241,234," + (0.5 * flash).toFixed(3) + ")"); fg.addColorStop(1, "rgba(244,241,234,0)"); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H); }
  }
  function frame() { render(); raf = requestAnimationFrame(frame); }
  window.__render = render;

  /* ---------- INTRO (#l-canvas): despegue desde la Tierra ---------- */
  function intro() {
    const lc = document.getElementById("l-canvas"); if (!lc) return;
    const g = lc.getContext("2d");
    let lw, lh, DPl, stars = [], lf = -1, iraf, loader = document.getElementById("loader");
    function lr() { DPl = Math.min(devicePixelRatio || 1, 2); lw = lc.width = innerWidth * DPl; lh = lc.height = innerHeight * DPl; lc.style.width = innerWidth + "px"; lc.style.height = innerHeight + "px"; if (stars.length === 0) for (let i = 0; i < 220; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.3, p: Math.random() * 6.28 }); }
    lr(); addEventListener("resize", lr);
    let f = 0;
    function loop() {
      if (loader.classList.contains("done")) { g.clearRect(0, 0, lw, lh); return; }
      iraf = requestAnimationFrame(loop); f++;
      const launching = loader.classList.contains("launch");
      if (launching && lf < 0) lf = f;
      const p = lf < 0 ? 0 : clamp((f - lf) / 78, 0, 1);   // progreso del despegue
      g.fillStyle = "#070709"; g.fillRect(0, 0, lw, lh);
      // estrellas
      for (const s of stars) { g.globalAlpha = 0.5 + 0.5 * Math.sin(f * 0.05 + s.p); g.fillStyle = BONE; g.fillRect(s.x * lw, s.y * lh, s.r * DPl, s.r * DPl); }
      g.globalAlpha = 1;
      // estelas de hiperespacio al final del despegue
      if (p > 0.55) { const st = ss(0.55, 0.9, p) * (1 - ss(0.9, 1, p)); g.strokeStyle = BONE; for (const s of stars) { const dx = (s.x - 0.5) * lw, dy = (s.y - 0.42) * lh, dl = Math.hypot(dx, dy) + 1, L = st * (dl * 0.5); g.globalAlpha = st; g.lineWidth = s.r * DPl; g.beginPath(); g.moveTo(s.x * lw, s.y * lh); g.lineTo(s.x * lw + dx / dl * L, s.y * lh + dy / dl * L); g.stroke(); } g.globalAlpha = 1; }
      // Tierra abajo (se aleja al despegar)
      const er = lerp(lh * 0.72, lh * 0.5, ss(0, 1, p)), ecy = lerp(lh * 1.34, lh * 1.7, ss(0, 1, p));
      if (TEX.earth) { g.save(); const gl = g.createRadialGradient(0.5 * lw, ecy, er * 0.9, 0.5 * lw, ecy, er * 1.4); gl.addColorStop(0, "rgba(90,150,255,0.35)"); gl.addColorStop(1, "rgba(90,150,255,0)"); g.fillStyle = gl; g.beginPath(); g.arc(0.5 * lw, ecy, er * 1.4, 0, 7); g.fill(); g.drawImage(TEX.earth, 0.5 * lw - er, ecy - er, er * 2, er * 2); g.restore(); }
      // cohete: en la superficie y despega hacia arriba
      const surfY = ecy - er, ry = lerp(surfY - 12 * DPl, -lh * 0.25, ss(0, 0.9, p) ** 1.6), rk = 7 * DPl;
      drawRocketOn(g, 0.5 * lw, ry, rk, Math.sin(f * 0.05) * 0.02, 0.5 + p * 2.2);
    }
    // cohete para el intro (mismo estilo, contexto g)
    function drawRocketOn(gg, cx, cy, k, ang, thrust) { const save = ctx; drawRocketCtx(gg, cx, cy, k, ang, thrust); }
    loop();
  }
  // versión de drawRocket que acepta un contexto (para el intro)
  function drawRocketCtx(g, cx, cy, k, ang, thrust) {
    g.save(); g.translate(cx, cy); g.rotate(ang);
    const fl = (0.9 + thrust * 1.8 + Math.random() * 0.4) * k;
    g.shadowColor = ACCENT; g.shadowBlur = 22;
    let og = g.createLinearGradient(0, k * 3.1, 0, k * 3.1 + fl * 3.4); og.addColorStop(0, "rgba(255,210,120,0.95)"); og.addColorStop(0.4, "rgba(255,120,40,0.85)"); og.addColorStop(1, "rgba(255,80,40,0)");
    g.fillStyle = og; g.beginPath(); g.moveTo(-k, k * 3.1); g.quadraticCurveTo(0, k * (3.1 + fl * 3.6), k, k * 3.1); g.closePath(); g.fill();
    let bl = g.createLinearGradient(0, k * 3.1, 0, k * 3.1 + fl * 1.7); bl.addColorStop(0, "rgba(200,235,255,0.95)"); bl.addColorStop(1, "rgba(120,180,255,0)");
    g.fillStyle = bl; g.beginPath(); g.moveTo(-k * 0.5, k * 3.1); g.quadraticCurveTo(0, k * (3.1 + fl * 1.9), k * 0.5, k * 3.1); g.closePath(); g.fill();
    g.shadowBlur = 0;
    let finR = g.createLinearGradient(k, 0, k * 2.4, 0); finR.addColorStop(0, "#FF7A45"); finR.addColorStop(1, "#B4361A");
    g.fillStyle = finR; g.beginPath(); g.moveTo(k * 1.05, k * 1.4); g.lineTo(k * 2.3, k * 3.4); g.lineTo(k * 1.05, k * 3.0); g.closePath(); g.fill();
    let finL = g.createLinearGradient(-k, 0, -k * 2.4, 0); finL.addColorStop(0, "#E8663A"); finL.addColorStop(1, "#8E2A12");
    g.fillStyle = finL; g.beginPath(); g.moveTo(-k * 1.05, k * 1.4); g.lineTo(-k * 2.3, k * 3.4); g.lineTo(-k * 1.05, k * 3.0); g.closePath(); g.fill();
    let body = g.createLinearGradient(-k * 1.9, 0, k * 1.9, 0); body.addColorStop(0, "#8f8b82"); body.addColorStop(0.32, "#f2efe7"); body.addColorStop(0.5, "#ffffff"); body.addColorStop(0.7, "#e7e3da"); body.addColorStop(1, "#9c988e");
    g.fillStyle = body; g.beginPath(); g.moveTo(0, -k * 4.1); g.bezierCurveTo(k * 1.95, -k * 2.3, k * 1.9, k * 1.7, k * 1.05, k * 3.1); g.lineTo(-k * 1.05, k * 3.1); g.bezierCurveTo(-k * 1.9, k * 1.7, -k * 1.95, -k * 2.3, 0, -k * 4.1); g.closePath(); g.fill();
    let nose = g.createLinearGradient(-k, -k * 4, k, -k * 2); nose.addColorStop(0, "#FF7A45"); nose.addColorStop(1, "#E8481E");
    g.fillStyle = nose; g.beginPath(); g.moveTo(0, -k * 4.1); g.bezierCurveTo(k * 1.2, -k * 3.1, k * 1.1, -k * 2.4, k * 0.9, -k * 2.1); g.lineTo(-k * 0.9, -k * 2.1); g.bezierCurveTo(-k * 1.1, -k * 2.4, -k * 1.2, -k * 3.1, 0, -k * 4.1); g.closePath(); g.fill();
    let win = g.createRadialGradient(-k * 0.25, -k * 0.9, 0, 0, -k * 0.6, k * 0.95); win.addColorStop(0, "#bfe3ff"); win.addColorStop(0.5, "#2a4a72"); win.addColorStop(1, "#0a1626");
    g.fillStyle = win; g.beginPath(); g.arc(0, -k * 0.6, k * 0.82, 0, 7); g.fill(); g.strokeStyle = "#cfcabf"; g.lineWidth = k * 0.22; g.stroke();
    g.restore();
  }

  /* ---------- arranque ---------- */
  buildTextures();
  resize(); addEventListener("resize", resize);
  addEventListener("pointermove", () => {});
  document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); raf = null; } else if (!reduce && !raf) frame(); });
  intro();
  if (reduce) render(); else if (!raf) frame();
})();

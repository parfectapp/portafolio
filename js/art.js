/* ===== OBRA — flow field abstracto que toma forma según el proyecto activo ===== */
(function () {
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false });
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  let W, H, DPR, particles = [], t = 0, raf, mx = 0.5, my = 0.5;

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || innerWidth < 760;
  const COUNT = lowEnd ? 700 : 1700;

  // paleta + forma actuales (cambian por proyecto vía window.__project)
  let palette = ["#FF5B2E", "#F4F1EA", "#9D7CFF"];
  let mode = "swirl", rcActive = false, rci = 0;
  window.__project = (cfg) => {
    if (!cfg) return;
    mode = cfg.mode || "swirl";
    if (cfg.palette && cfg.palette.length) palette = cfg.palette.slice();
    rcActive = true; rci = 0;           // recolorea TODO el campo, suave (~0.8s)
  };

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = canvas.width = innerWidth * DPR;
    H = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.fillStyle = "#0A0A0B";
    ctx.fillRect(0, 0, W, H);
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; });

  function base(x, y, time) {
    const s = 0.0011;
    const a = Math.sin(x * s + time) * Math.cos(y * s * 1.3 - time * 0.8);
    const b = Math.cos(x * s * 0.7 - time * 0.6) * Math.sin(y * s + time * 0.4);
    const c = Math.sin((x + y) * s * 0.5 + time * 1.2) * 0.6;
    return (a + b + c) * Math.PI;
  }

  // el ángulo del flujo depende de la FORMA del proyecto
  function angleAt(x, y, time, cx, cy) {
    const b = base(x, y, time);
    const dx = x - cx, dy = y - cy;
    switch (mode) {
      case "orbit":     return Math.atan2(dy, dx) + Math.PI / 2 + b * 0.12;                 // anillos concéntricos
      case "radial":    return Math.atan2(dy, dx) + b * 0.16;                                // rayos hacia afuera
      case "rise":      return -Math.PI / 2 + Math.sin(x * 0.004 + time * 1.5) * 0.55;       // crecimiento hacia arriba
      case "bars":      return ((Math.floor(x / (78 * DPR)) % 2) ? 1 : -1) * (Math.PI / 2) + b * 0.06; // columnas (velas)
      case "waves":     return Math.sin(x * 0.005 + time) * 0.62 + b * 0.18;                 // olas horizontales
      case "turbulent": return b * 1.7 + Math.sin(time * 3 + x * 0.01) * 0.9;                // caos
      default:          return b;                                                            // swirl
    }
  }

  function pick() { return palette[(Math.random() * palette.length) | 0]; }
  function seed(p) {
    p.x = Math.random() * W;
    p.y = Math.random() * H;
    p.life = 60 + Math.random() * 220;
    p.c = pick();
    p.w = (Math.random() < 0.18 ? 2.2 : 0.7) * DPR;
    p.sp = 2.6 + Math.random() * 1.8;
  }
  for (let i = 0; i < COUNT; i++) { const p = {}; seed(p); particles.push(p); }

  function render() {
    t += 0.0026;
    ctx.fillStyle = "rgba(10,10,11,0.036)";
    ctx.fillRect(0, 0, W, H);

    // recolorea todo el campo hacia la paleta activa (cobertura completa, suave)
    if (rcActive) {
      const step = Math.max(20, (particles.length / 48) | 0);
      for (let k = 0; k < step && rci < particles.length; k++, rci++) particles[rci].c = pick();
      if (rci >= particles.length) rcActive = false;
    }

    const cx = mx * W, cy = my * H, ccx = 0.5 * W, ccy = 0.45 * H;
    for (const p of particles) {
      let ang = angleAt(p.x, p.y, t, ccx, ccy);
      const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) + 1;
      if (d < 300 * DPR) ang += Math.atan2(dy, dx) * 0.22;

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
      if (p.life < 0 || p.x < -4 || p.x > W + 4 || p.y < -4 || p.y > H + 4) seed(p);
    }
    ctx.globalAlpha = 1;
  }
  function frame() { render(); raf = requestAnimationFrame(frame); }
  window.__render = render;

  function start() { if (!raf && !reduce) frame(); }
  function stop() { cancelAnimationFrame(raf); raf = null; }
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());

  if (window.__pendingProject) window.__project(window.__pendingProject);

  if (reduce) {
    for (let k = 0; k < 120; k++) {
      for (const p of particles) {
        const ang = angleAt(p.x, p.y, t, 0.5 * W, 0.45 * H);
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

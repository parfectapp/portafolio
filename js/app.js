/* ===== OBRA — interaction ===== */
(function () {
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  $("#yr").textContent = new Date().getFullYear();

  /* infinite scroller — duplicate cards for a seamless loop */
  $$("[data-dup]").forEach((track) => {
    track.innerHTML += track.innerHTML;
  });

  /* loader */
  const loader = $("#loader"), lnum = $(".l-num");
  pixelCoder();                           // monito pixel-art programando
  const t0 = Date.now();
  let p = 0;
  const tick = setInterval(() => {
    p += Math.random() * 11 + 4;
    if (p >= 100) { p = 100; clearInterval(tick); done(); }
    lnum.textContent = String(Math.floor(p)).padStart(3, "0");
  }, 140);
  function done() {
    const wait = Math.max(300, 2600 - (Date.now() - t0));   // deja ver el monito ~2.6s
    setTimeout(() => { loader.classList.add("done"); document.body.classList.add("ready"); reveals(); }, wait);
  }
  setTimeout(() => { if (!document.body.classList.contains("ready")) { clearInterval(tick); done(); } }, 5000);

  /* ---- monito SD pixel programando en una compu ---- */
  function pixelCoder() {
    const c = document.getElementById("l-pixel"); if (!c) return;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    const SKIN = "#e8b48b", HAIR = "#26242b", SHIRT = "#ff5b2e", SHIRTSH = "#c8431f",
      DESK = "#4a4038", DESKED = "#312a24", MON = "#1a1a22", MONLIP = "#2c2c36",
      SCREEN = "#0a130d", CODE = "#3fd68c", CODE2 = "#8af2c0", BONE = "#f4f1ea", CHAIR = "#2a2a31";
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    let rows = [22, 14, 28, 10, 20, 16, 24], t = 0;
    const rnd = () => 8 + ((Math.sin(t * 12.9 + rows.length) * 0.5 + 0.5) * 22 | 0);

    function draw() {
      t++;
      g.clearRect(0, 0, 120, 90);
      // silla detrás
      px(26, 34, 30, 26, CHAIR); px(28, 32, 26, 4, "#33333b");
      // cabeza
      px(29, 18, 22, 4, HAIR);           // fleco arriba
      px(27, 22, 26, 4, HAIR);
      px(29, 24, 22, 14, SKIN);          // cara
      px(27, 24, 2, 12, HAIR); px(51, 24, 2, 12, HAIR);  // pelo lados
      px(26, 30, 2, 3, SKIN); px(52, 30, 2, 3, SKIN);    // orejas
      // ojos (parpadeo)
      const blink = (t % 150) < 6;
      if (blink) { px(33, 31, 4, 1, "#26242b"); px(43, 31, 4, 1, "#26242b"); }
      else { px(34, 29, 3, 3, "#26242b"); px(44, 29, 3, 3, "#26242b"); }
      px(38, 33, 4, 1, "#b5714c");       // boca
      // cuello + cuerpo
      px(36, 37, 8, 3, SKIN);
      px(28, 40, 24, 18, SHIRT); px(28, 52, 24, 6, SHIRTSH);
      // monitor (a la derecha, mirando a nosotros)
      px(64, 14, 44, 38, MON); px(64, 50, 44, 3, MONLIP);
      px(68, 18, 36, 30, SCREEN);
      px(82, 52, 8, 8, MON); px(76, 60, 20, 3, MON);     // pie + base
      // código en pantalla (scroll)
      if (t % 9 === 0) { rows.push(rnd()); if (rows.length > 7) rows.shift(); }
      for (let i = 0; i < 7; i++) {
        const y = 21 + i * 4, w = rows[i] || 10;
        px(71, y, 3, 2, "#5a6b60");                       // gutter
        px(76, y, Math.min(w, 26), 2, i % 3 === 0 ? CODE2 : CODE);
      }
      if ((t % 24) < 12) px(76 + Math.min(rows[6] || 10, 26) + 1, 21 + 6 * 4, 2, 2, BONE); // cursor
      // escritorio (frente)
      px(0, 63, 120, 14, DESK); px(0, 63, 120, 2, DESKED);
      // teclado
      px(24, 60, 40, 4, "#2a2a31");
      for (let k = 0; k < 9; k++) px(26 + k * 4, 61, 2, 1, "#4a4a55");
      // brazos + manos tecleando (alternan)
      const up = Math.floor(t / 7) % 2;
      px(26, 44, 5, 14, SHIRT); px(30, 56 + (up ? -1 : 0), 5, 3, SKIN);   // izq
      px(49, 44, 5, 14, SHIRT); px(48, 56 + (up ? 0 : -1), 5, 3, SKIN);   // der
      if (!loader.classList.contains("done")) requestAnimationFrame(draw);
    }
    draw();
  }

  /* lenis smooth scroll */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    window.lenis = lenis;
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id); }
    }));
  } else {
    $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
      const el = $(a.getAttribute("href")); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth" }); }
    }));
  }

  /* reveals via IntersectionObserver (works regardless of gsap) */
  function reveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$(".rv, .ln, .rv-line").forEach((el, i) => {
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("rv")) : [];
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.transitionDelay = (idx * 0.07) + "s";
      io.observe(el);
    });
    // hero lines animate immediately on load
    $$(".hero .ln").forEach((el, i) => { el.style.transitionDelay = (0.1 + i * 0.12) + "s"; el.classList.add("in"); });
    $$(".hero .rv").forEach((el, i) => { el.style.transitionDelay = (0.45 + i * 0.1) + "s"; el.classList.add("in"); });
  }

  /* nav hide on scroll down */
  const nav = $("nav");
  let last = 0;
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    nav.classList.toggle("hide", y > 400 && y > last);
    last = y;
  };
  (lenis ? lenis.on("scroll", onScroll) : addEventListener("scroll", onScroll, { passive: true }));

  /* custom cursor */
  if (!reduce && !matchMedia("(pointer:coarse)").matches) {
    const cur = $(".cursor");
    const m = { x: innerWidth / 2, y: innerHeight / 2 }, c = { ...m };
    addEventListener("pointermove", (e) => { m.x = e.clientX; m.y = e.clientY; });
    (function loop() {
      c.x += (m.x - c.x) * 0.2; c.y += (m.y - c.y) * 0.2;
      cur.style.transform = `translate(${c.x}px,${c.y}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    $$("[data-hover], a, .tile").forEach((el) => {
      el.addEventListener("pointerenter", () => cur.classList.add("big"));
      el.addEventListener("pointerleave", () => cur.classList.remove("big"));
    });
  }
})();

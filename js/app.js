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
  let p = 0;
  const tick = setInterval(() => {
    p += Math.random() * 16 + 6;
    if (p >= 100) { p = 100; clearInterval(tick); done(); }
    lnum.textContent = String(Math.floor(p)).padStart(3, "0");
  }, 110);
  function done() {
    setTimeout(() => { loader.classList.add("done"); document.body.classList.add("ready"); reveals(); }, 300);
  }
  setTimeout(() => { if (!document.body.classList.contains("ready")) { clearInterval(tick); done(); } }, 4000);

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

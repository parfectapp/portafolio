/* ============================================================
   Portafolio — fondo WebGL: una órbita de partículas.
   Inspirado en la landing de Goal Achiever. Anillo (toro) de
   puntos hueso + polvo lejano, rotación lenta, parallax de
   mouse y deriva sutil con el scroll. Degrada con elegancia.
   ============================================================ */
(function () {
  "use strict";
  var canvas = document.getElementById("art");
  if (!canvas || typeof THREE === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var renderer, scene, camera, ring, ringAcc, dust;
  var st = { mx: 0, my: 0, smx: 0, smy: 0, p: 0 };

  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x080706, 1);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080706, 0.018);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 0, 27);

  var gauss = function () { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; };

  // anillo principal — hueso
  var N = 6000, R = 13;
  var pos = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var a = Math.random() * Math.PI * 2;
    var r = R + gauss() * 2.1;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = gauss() * 0.9;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  var g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  ring = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xece7dc, size: 0.07, transparent: true, opacity: 0.82,
    depthWrite: false, sizeAttenuation: true
  }));
  ring.rotation.x = 1.18;
  scene.add(ring);

  // segundo anillo delgado con el acento vermellón — un hilo de fuego en la órbita
  var Na = 700;
  var posA = new Float32Array(Na * 3);
  for (var j = 0; j < Na; j++) {
    var aa = Math.random() * Math.PI * 2;
    var ra = R + gauss() * 0.7;
    posA[j * 3] = Math.cos(aa) * ra;
    posA[j * 3 + 1] = gauss() * 0.35;
    posA[j * 3 + 2] = Math.sin(aa) * ra;
  }
  var gA = new THREE.BufferGeometry();
  gA.setAttribute("position", new THREE.BufferAttribute(posA, 3));
  ringAcc = new THREE.Points(gA, new THREE.PointsMaterial({
    color: 0xe8542b, size: 0.075, transparent: true, opacity: 0.7,
    depthWrite: false, sizeAttenuation: true
  }));
  ringAcc.rotation.x = 1.18;
  scene.add(ringAcc);

  // polvo lejano
  var M = 850;
  var pos2 = new Float32Array(M * 3);
  for (var k = 0; k < M; k++) {
    var v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize().multiplyScalar(42 + Math.random() * 60);
    pos2[k * 3] = v.x; pos2[k * 3 + 1] = v.y; pos2[k * 3 + 2] = v.z;
  }
  var g2 = new THREE.BufferGeometry();
  g2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
  dust = new THREE.Points(g2, new THREE.PointsMaterial({
    color: 0xece7dc, size: 0.14, transparent: true, opacity: 0.35, depthWrite: false
  }));
  scene.add(dust);

  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  window.addEventListener("mousemove", function (e) {
    st.mx = (e.clientX / window.innerWidth - 0.5) * 2;
    st.my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    var t = clock.getElapsedTime();

    // deriva suave con el scroll (0→1 en la primera pantalla)
    var target = Math.min(1, Math.max(0, (window.scrollY || 0) / Math.max(1, window.innerHeight)));
    st.p += (target - st.p) * 0.05;
    st.smx += (st.mx - st.smx) * 0.04;
    st.smy += (st.my - st.smy) * 0.04;
    var p = st.p;

    var s = 1 + p * 0.5;                 // crece apenas al entrar
    ring.scale.set(s, s, s);
    ring.rotation.z = t * 0.045 + p * 0.6;
    ring.rotation.x = 1.18 - p * 0.28;
    ring.material.opacity = 0.82 - p * 0.25;

    ringAcc.scale.set(s, s, s);
    ringAcc.rotation.z = -t * 0.06 - p * 0.4;
    ringAcc.rotation.x = ring.rotation.x;
    ringAcc.material.opacity = 0.7 - p * 0.35;

    dust.rotation.y = t * 0.008 + p * 0.4;

    camera.position.x = st.smx * 1.6;
    camera.position.y = -st.smy * 1.0 - p * 1.2;
    camera.lookAt(0, -p * 1.2, 0);

    renderer.render(scene, camera);
  })();
})();

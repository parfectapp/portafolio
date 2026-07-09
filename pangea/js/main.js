/* PANGEA — arranque y bucle principal */
(function(){
const G = window.G;

function boot(){
  G.bakeSprites();
  G.audio.init();

  const canvas = document.getElementById('game');

  const start = (mode) => {
    if (mode === 'load'){
      try {
        const data = JSON.parse(localStorage.getItem('pangea_save'));
        G.sim.load(data);
      } catch(e){
        G.sim.init((Math.random()*1e9)|0);
      }
    } else {
      G.clearSave();
      G.sim.init((Math.random()*1e9)|0);
    }
    G.render.init(canvas);
    G.ui.init(canvas);
    if (mode !== 'load') G.ui.tutorial();
    running = true;
  };

  G.ui.showIntro(G.hasSave(), () => start('new'), () => start('load'));

  let running = false, last = 0, acc = 0, saveT = 0;
  const STEP = 1/20;

  function frame(ts){
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (ts-last)/1000 || 0.016);
    last = ts;
    if (!running) return;

    if (!G.S.paused && !G.S.extinct){
      acc += dt * G.S.speed;
      let n = 0;
      while (acc > STEP && n < 60){
        G.sim.tick(STEP);
        if (G.pendingImpact){
          G.pendingImpact.t -= STEP;
          if (G.pendingImpact.t <= 0){ G.pendingImpact.fn(); G.pendingImpact = null; }
        }
        acc -= STEP; n++;
      }
    }
    G.render.draw(dt);
    G.ui.tick(dt);

    saveT += dt;
    if (saveT > 25){ saveT = 0; G.save(); }
  }
  requestAnimationFrame(frame);

  window.addEventListener('beforeunload', () => G.save());

  // gancho de depuración
  window.__pangea = {
    G,
    fe: n => G.sim.addFaith(n||100),
    saber: n => { G.S.know += (n||500); },
    era: i => { G.S.know = G.ERAS[Math.min(i, G.ERAS.length-1)].know; },
    vel: s => { G.S.speed = s; },
    estado: () => ({ era: G.ERAS[G.S.era].name, pop: G.S.villagers.length,
      food: Math.floor(G.S.food), wood: Math.floor(G.S.wood), stone: Math.floor(G.S.stone),
      know: Math.floor(G.S.know), faith: Math.floor(G.S.faith), dia: G.time().day }),
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();

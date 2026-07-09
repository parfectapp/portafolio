/* PANGEA — interfaz: HUD, poderes, entrada, intro y victoria */
(function(){
const G = window.G;

const ui = G.ui = { cursor: null, selPower: null, selected: null };
let cv, feedEl, clockEl, resEl, eraLabel, eraBar, eraNext, faithFill, faithNum, dockEl, miniCv, inspEl, colonyEl;
let dragging = false, dragMoved = false, lastMx = 0, lastMy = 0, mx = 0, my = 0, shiftDown = false;
let uiTimer = 0, miniTimer = 0;

ui.init = function(canvas){
  cv = canvas;
  feedEl = document.getElementById('feed');
  clockEl = document.getElementById('clock');
  resEl = document.getElementById('res');
  eraLabel = document.getElementById('eralabel');
  eraBar = document.getElementById('erafill');
  eraNext = document.getElementById('eranext');
  faithFill = document.getElementById('faithfill');
  faithNum = document.getElementById('faithnum');
  dockEl = document.getElementById('powers');
  miniCv = document.getElementById('minimap');
  inspEl = document.getElementById('inspector');
  colonyEl = document.getElementById('colony');

  buildDock();
  bindInput();

  G.on('notify', n => notify(n.text, n.cls));
  G.on('era', i => {
    eraLabel.textContent = G.ERAS[i].name.toUpperCase();
    flashEl(document.getElementById('erabox'));
  });
  G.on('victory', showVictory);
  G.on('extinct', showExtinct);

  eraLabel.textContent = G.ERAS[G.S.era].name.toUpperCase();
};

function flashEl(el){
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function notify(text, cls){
  const d = document.createElement('div');
  d.className = 'note ' + (cls||'');
  d.textContent = text;
  feedEl.prepend(d);
  while (feedEl.children.length > 5) feedEl.lastChild.remove();
  setTimeout(()=>{ d.classList.add('fade'); setTimeout(()=>d.remove(), 900); }, 6000);
}

// ---------- dock de poderes ----------
function buildDock(){
  for (const P of G.POWERS){
    const b = document.createElement('button');
    b.className = 'power';
    b.dataset.id = P.id;
    b.innerHTML = '<span class="pkey">'+P.key+'</span><span class="pname">'+P.name+'</span><span class="pcost">'+P.cost+' fe</span>';
    b.title = P.desc;
    b.addEventListener('click', e => {
      e.stopPropagation();
      selectPower(ui.selPower === P.id ? null : P.id);
    });
    dockEl.appendChild(b);
  }
}

function selectPower(id){
  ui.selPower = id;
  ui.selected = null;
  inspEl.classList.remove('show');
  for (const b of dockEl.children) b.classList.toggle('sel', b.dataset.id === id);
  if (id){
    G.emit('sfx', 'select');
    const P = G.POWERS.find(p=>p.id===id);
    document.getElementById('powerhint').textContent = P.desc + (id==='terraformar' ? '' : '') + '  ·  clic en el mundo para invocarlo';
    document.getElementById('powerhint').classList.add('show');
  } else {
    document.getElementById('powerhint').classList.remove('show');
  }
  updateCursor();
}

// ---------- entrada ----------
function screenToWorld(sx, sy){
  const cam = G.render.cam;
  return {
    x: (sx - cv.width/2)/cam.z + cam.x,
    y: (sy - cv.height/2)/cam.z + cam.y,
  };
}

function updateCursor(){
  if (!ui.selPower){ ui.cursor = null; return; }
  const P = G.POWERS.find(p=>p.id===ui.selPower);
  const w = screenToWorld(mx, my);
  ui.cursor = { tx: (w.x/G.TILE)|0, ty: (w.y/G.TILE)|0, r: P.r||0.6 };
}

function bindInput(){
  cv.addEventListener('mousedown', e => {
    dragging = true; dragMoved = false;
    lastMx = e.clientX; lastMy = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (dragging){
      const dx = e.clientX - lastMx, dy = e.clientY - lastMy;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragMoved = true;
      if (dragMoved){
        const cam = G.render.cam;
        cam.x -= dx/cam.z; cam.y -= dy/cam.z;
        clampCam();
      }
      lastMx = e.clientX; lastMy = e.clientY;
    }
    updateCursor();
  });
  window.addEventListener('mouseup', e => {
    if (dragging && !dragMoved && e.target === cv) click(e);
    dragging = false;
  });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const cam = G.render.cam;
    const before = screenToWorld(e.clientX, e.clientY);
    cam.z = G.clamp(cam.z * (e.deltaY > 0 ? 0.88 : 1.14), 0.6, 5);
    const after = screenToWorld(e.clientX, e.clientY);
    cam.x += before.x - after.x; cam.y += before.y - after.y;
    clampCam();
  }, { passive:false });

  window.addEventListener('keydown', e => {
    if (e.key === 'Shift') shiftDown = true;
    if (e.key === 'Escape') selectPower(null);
    if (e.key === ' '){ e.preventDefault(); togglePause(); }
    const P = G.POWERS.find(p=>p.key === e.key);
    if (P) selectPower(ui.selPower === P.id ? null : P.id);
  });
  window.addEventListener('keyup', e => { if (e.key === 'Shift') shiftDown = false; });

  miniCv.addEventListener('mousedown', e => {
    const r = miniCv.getBoundingClientRect();
    const cam = G.render.cam;
    cam.x = (e.clientX - r.left)/r.width * G.W * G.TILE;
    cam.y = (e.clientY - r.top)/r.height * G.H * G.TILE;
    clampCam();
    e.stopPropagation();
  });

  document.getElementById('btn-pause').addEventListener('click', () => togglePause());
  document.getElementById('btn-1x').addEventListener('click', () => setSpeed(1));
  document.getElementById('btn-3x').addEventListener('click', () => setSpeed(3));
  document.getElementById('btn-audio').addEventListener('click', e => {
    const on = G.audio.toggle();
    e.currentTarget.textContent = on ? 'SONIDO' : 'SILENCIO';
  });
}

function clampCam(){
  const cam = G.render.cam;
  const m = G.W*G.TILE;
  cam.x = G.clamp(cam.x, 0, m); cam.y = G.clamp(cam.y, 0, m);
}

function togglePause(){
  G.S.paused = !G.S.paused;
  document.getElementById('btn-pause').classList.toggle('sel', G.S.paused);
  document.getElementById('btn-pause').textContent = G.S.paused ? 'II' : 'II';
}
function setSpeed(s){
  G.S.speed = s;
  G.S.paused = false;
  document.getElementById('btn-pause').classList.remove('sel');
  document.getElementById('btn-1x').classList.toggle('sel', s===1);
  document.getElementById('btn-3x').classList.toggle('sel', s===3);
}
ui.setSpeed = setSpeed;

function click(e){
  const w = screenToWorld(e.clientX, e.clientY);
  const tx = (w.x/G.TILE)|0, ty = (w.y/G.TILE)|0;
  if (ui.selPower){
    if (G.castPower(ui.selPower, tx, ty, shiftDown)){
      G.emit('sfx', 'click');
    }
    return;
  }
  // inspección: aldeano o edificio más cercano al clic
  let best = null, bd = 20*20;
  for (const v of G.S.villagers){
    const d = (v.x-w.x)*(v.x-w.x)+(v.y-w.y)*(v.y-w.y);
    if (d < bd){ bd = d; best = { kind:'vill', o:v }; }
  }
  if (!best){
    for (const b of G.S.buildings){
      if (tx >= b.x && tx < b.x+b.w && ty >= b.y && ty < b.y+b.h){ best = { kind:'bld', o:b }; break; }
    }
  }
  ui.selected = best;
  showInspector();
}

const ROLE_NAMES = {
  recolector:'recolectando', lenador:'cortando madera', constructor:'construyendo',
  granjero:'cultivando', cazador:'cazando', devoto:'orando', minero:'picando piedra', ocioso:'paseando',
};

function showInspector(){
  if (!ui.selected){ inspEl.classList.remove('show'); return; }
  const s = ui.selected;
  if (s.kind === 'vill'){
    const v = s.o;
    inspEl.innerHTML = '<b>'+v.name+'</b><span>'+(ROLE_NAMES[v.role]||v.role)+' · '+Math.floor(v.age/G.YEAR_DAYS*20+16)+' años</span>';
  } else {
    const b = s.o;
    const bt = G.BTYPES[b.type];
    let extra = b.built ? '' : ' · en obra '+Math.round(b.progress*100)+'%';
    if (b.type === 'campo' && b.field){
      const st = { fallow:'en barbecho', grow:'creciendo '+Math.round(b.field.p*100)+'%', ready:'listo para cosechar' };
      extra = ' · ' + st[b.field.state];
    }
    inspEl.innerHTML = '<b>'+bt.name+'</b><span>'+ (b.built?'':'') + (extra||' ') +'</span>';
  }
  inspEl.classList.add('show');
}

// ---------- refresco del HUD ----------
ui.tick = function(dt){
  uiTimer -= dt;
  if (uiTimer <= 0){
    uiTimer = 0.25;
    const S = G.S, tm = G.time();
    clockEl.textContent = 'Año '+tm.year+' · '+G.SEASONS[tm.season]+' · Día '+(tm.day % G.SEASON_DAYS + 1) + (tm.night ? ' · noche' : '');
    resEl.innerHTML =
      '<span>POBLACIÓN '+S.villagers.length+'/'+G.sim.popcap()+'</span>' +
      '<span>ALIMENTO '+Math.floor(S.food)+'/'+G.sim.foodcap()+'</span>' +
      '<span>MADERA '+Math.floor(S.wood)+'</span>' +
      '<span>PIEDRA '+Math.floor(S.stone)+'</span>' +
      '<span>SABER '+Math.floor(S.know)+'</span>';

    // barra de era
    if (S.era < G.ERAS.length-1){
      const cur = G.ERAS[S.era].know, next = G.ERAS[S.era+1].know;
      eraBar.style.width = Math.min(100, (S.know-cur)/(next-cur)*100) + '%';
      eraNext.textContent = '→ ' + G.ERAS[S.era+1].name;
    } else if (!S.victory){
      const rocket = S.buildings.find(b=>b.type==='cohete');
      eraBar.style.width = rocket ? (rocket.progress*100)+'%' : '0%';
      eraNext.textContent = '→ Civilización interplanetaria';
    } else {
      eraBar.style.width = '100%';
      eraNext.textContent = 'Colonia Nova: ' + S.colony + ' colonos';
    }
    faithFill.style.width = (S.faith/300*100) + '%';
    faithNum.textContent = Math.floor(S.faith);
    for (const b of dockEl.children){
      const P = G.POWERS.find(p=>p.id===b.dataset.id);
      b.classList.toggle('poor', S.faith < P.cost);
    }
    if (ui.selected) showInspector();
    if (S.victory && colonyEl) colonyEl.classList.add('show');
  }
  miniTimer -= dt;
  if (miniTimer <= 0){ miniTimer = 0.6; G.render.mini(miniCv); }
};

// ---------- intro / victoria / extinción ----------
ui.showIntro = function(hasSave, onNew, onLoad){
  const el = document.getElementById('intro');
  el.classList.add('show');
  document.getElementById('btn-new').addEventListener('click', () => {
    G.audio.unlock();
    el.classList.remove('show');
    onNew();
  });
  const bl = document.getElementById('btn-load');
  if (hasSave){
    bl.style.display = '';
    bl.addEventListener('click', () => {
      G.audio.unlock();
      el.classList.remove('show');
      onLoad();
    });
  } else bl.style.display = 'none';
};

function showVictory(){
  G.emit('sfx', 'victory');
  const S = G.S, tm = G.time();
  document.getElementById('vstats').innerHTML =
    '<div><b>'+tm.year+'</b><span>años</span></div>' +
    '<div><b>'+S.villagers.length+'</b><span>habitantes</span></div>' +
    '<div><b>'+S.stats.births+'</b><span>nacimientos</span></div>' +
    '<div><b>'+S.stats.miracles+'</b><span>milagros</span></div>' +
    '<div><b>'+Math.floor(S.stats.faithSpent)+'</b><span>fe invertida</span></div>';
  document.getElementById('victory').classList.add('show');
  document.getElementById('btn-continue').addEventListener('click', () => {
    document.getElementById('victory').classList.remove('show');
  }, { once:true });
}

function showExtinct(){
  document.getElementById('extinct').classList.add('show');
  document.getElementById('btn-restart').addEventListener('click', () => {
    G.clearSave();
    location.reload();
  }, { once:true });
}

// pistas iniciales
ui.tutorial = function(){
  const msgs = [
    [2,  'Tu tribu despierta en la Edad de Piedra'],
    [7,  'Ellos recolectan, cazan y construyen solos: tú eres su dios'],
    [14, 'Invoca milagros con los poderes de abajo (cuestan fe)'],
    [22, 'La fe crece con la oración… y con el temor'],
    [30, 'El saber acumulado los llevará hasta las estrellas'],
  ];
  for (const [t, text] of msgs) setTimeout(()=>notify(text, 'hint'), t*1000);
};
})();

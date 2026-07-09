/* PANGEA — simulación: aldeanos, economía, eras, clima. Sin DOM (corre en Node). */
(function(){
const G = window.G;
const T = G.T;

G.BTYPES = {
  fogata:     { w:1,h:1, name:'Fogata',           cost:{},                    work:6 },
  tienda:     { w:1,h:1, name:'Tienda',           cost:{wood:3},              work:10 },
  casa:       { w:1,h:1, name:'Casa',             cost:{wood:10},             work:22 },
  campo:      { w:2,h:2, name:'Campo de cultivo', cost:{wood:4},              work:14 },
  granero:    { w:1,h:1, name:'Granero',          cost:{wood:14},             work:26 },
  santuario:  { w:1,h:1, name:'Santuario',        cost:{wood:10,stone:8},     work:30 },
  herreria:   { w:1,h:1, name:'Herrería',         cost:{wood:14,stone:12},    work:34 },
  templo:     { w:2,h:2, name:'Templo',           cost:{wood:20,stone:30},    work:48 },
  fabrica:    { w:2,h:2, name:'Fábrica',          cost:{wood:30,stone:40},    work:56 },
  planta:     { w:1,h:1, name:'Planta de energía',cost:{wood:20,stone:30},    work:44 },
  plataforma: { w:2,h:2, name:'Plataforma espacial', cost:{wood:40,stone:60}, work:70 },
  cohete:     { w:0,h:0, name:'Cohete',           cost:{wood:80,stone:100},   work:130 },
};
const KNOW_BONUS = { santuario:6, herreria:10, templo:18, fabrica:30, planta:45, plataforma:60 };
const FAITH_CAP = 300;

let S = null, nid = 1;
const sim = G.sim = {};

G.time = function(){
  const day = Math.floor(S.t / G.DAY);
  const dayFrac = (S.t % G.DAY) / G.DAY;
  const season = Math.floor(day / G.SEASON_DAYS) % 4;
  const year = Math.floor(day / G.YEAR_DAYS) + 1;
  const night = dayFrac > 0.80 || dayFrac < 0.14;
  return { day, dayFrac, season, year, night };
};

sim.init = function(seed){
  const res = G.world.generate(seed);
  S = G.S = {
    t: G.DAY*0.2, lastDay: 0, lastSeason: 0, speed: 1, paused: false,
    food: 45, wood: 30, stone: 0, faith: 90, know: 0, era: 0,
    villagers: [], buildings: [], deer: [],
    trees: res.trees, bushes: res.bushes, rocks: res.rocks,
    center: res.center, rainT: 0, sunT: 0, blessT: 0,
    victory: false, launch: null, rocketGone: false, colony: 0, colonyT: 0,
    extinct: false, famineNote: 0,
    stats: { births:0, deaths:0, starved:0, miracles:0, faithSpent:0 },
    jobT: 0, planT: 0,
  };
  nid = 1;
  const c = S.center;
  placeBuilding('fogata', c.x, c.y, true);
  for (let i=0;i<3;i++){
    const spot = G.world.findSpot(c.x, c.y, 1, 1, 2, 8);
    if (spot) placeBuilding('tienda', spot.x, spot.y, true);
  }
  for (let i=0;i<6;i++){
    sim.spawnVillager((c.x + G.rand()*4-2)*G.TILE, (c.y + G.rand()*4-2)*G.TILE);
    S.villagers[i].age = 18 + G.rand()*10;
  }
  // venados en los bosques
  for (let i=0;i<12 && S.trees.length;i++){
    const tr = G.pick(S.trees);
    S.deer.push(newDeer(tr.x*G.TILE, tr.y*G.TILE));
  }
  G.world.bake(0);
  return S;
};

function newDeer(x,y){ return { x, y, tx:x, ty:y, t:0, alive:true }; }

sim.spawnVillager = function(x,y){
  const v = {
    id: nid++, name: G.name(), x, y,
    age: 0, life: 55 + G.rand()*35, hunger: 0,
    role: 'ocioso', task: null, speed: 24 + G.rand()*8, ft: G.rand()*10,
    wx: x, wy: y, wt: 0,
  };
  S.villagers.push(v);
  return v;
};

function placeBuilding(type, x, y, instant){
  const bt = G.BTYPES[type];
  const b = { id: nid++, type, x, y, w: bt.w, h: bt.h, built: !!instant, progress: instant?1:0 };
  if (type === 'campo') b.field = { state:'fallow', p:0 };
  for (let dy=0;dy<bt.h;dy++) for (let dx=0;dx<bt.w;dx++) G.world.occSet(x+dx, y+dy, 4);
  if (type === 'campo'){
    for (let dy=0;dy<bt.h;dy++) for (let dx=0;dx<bt.w;dx++) G.world.setTile(x+dx, y+dy, T.SOIL);
    G.terrainDirty = true;
  }
  S.buildings.push(b);
  return b;
}

sim.queueBuilding = function(type){
  const bt = G.BTYPES[type];
  const cw = bt.cost.wood||0, cs = bt.cost.stone||0;
  if (S.wood < cw || S.stone < cs) return null;
  if (type === 'cohete'){
    const p = S.buildings.find(b=>b.type==='plataforma' && b.built);
    if (!p) return null;
    S.wood -= cw; S.stone -= cs;
    const b = { id: nid++, type, x: p.x, y: p.y, w:0, h:0, built:false, progress:0 };
    S.buildings.push(b);
    G.emit('notify', { text:'Comienza la construcción del cohete', cls:'era' });
    return b;
  }
  let spot = G.world.findSpot(S.center.x, S.center.y, bt.w, bt.h, 2, 26, 0);
  if (!spot) spot = G.world.findSpot(S.center.x, S.center.y, bt.w, bt.h, 2, 38, 1);
  if (!spot){
    // desmonte: abrir claro en el bosque para construir
    spot = G.world.findSpot(S.center.x, S.center.y, bt.w, bt.h, 2, 38, 2);
    if (spot){
      const inside = (o) => o.x >= spot.x && o.x < spot.x+bt.w && o.y >= spot.y && o.y < spot.y+bt.h;
      for (let i=S.trees.length-1;i>=0;i--) if (inside(S.trees[i])){ G.world.occSet(S.trees[i].x, S.trees[i].y, 0); S.trees.splice(i,1); }
      for (let i=S.bushes.length-1;i>=0;i--) if (inside(S.bushes[i])){ G.world.occSet(S.bushes[i].x, S.bushes[i].y, 0); S.bushes.splice(i,1); }
      for (let i=S.rocks.length-1;i>=0;i--) if (inside(S.rocks[i])){ G.world.occSet(S.rocks[i].x, S.rocks[i].y, 0); S.rocks.splice(i,1); }
    }
  }
  if (!spot) return null;
  S.wood -= cw; S.stone -= cs;
  return placeBuilding(type, spot.x, spot.y, false);
}

sim.popcap = function(){
  let cap = 0;
  const per = G.ERAS[S.era].cap;
  for (const b of S.buildings) if (b.built && (b.type==='tienda'||b.type==='casa')) cap += per;
  return cap;
};
sim.foodcap = function(){
  let g = 0;
  for (const b of S.buildings) if (b.built && b.type==='granero') g++;
  return 80 + g*120;
};
function addFood(n){ S.food = Math.min(sim.foodcap(), S.food + n); }
function addFaith(n){ S.faith = Math.min(FAITH_CAP, S.faith + n); }
sim.addFaith = addFaith;

sim.witnessMiracle = function(tx, ty){
  let n = 0;
  const px = tx*G.TILE, py = ty*G.TILE, R = 8*G.TILE;
  for (const v of S.villagers) if (G.dist(v.x,v.y,px,py) < R) n++;
  addFaith(n*1.5);
  S.stats.miracles++;
};

// ---------- tick principal ----------
sim.tick = function(dt){
  if (!S || S.extinct) return;
  S.t += dt;
  const tm = G.time();

  if (tm.season !== S.lastSeason){
    S.lastSeason = tm.season;
    G.world.bake(tm.season);
    G.emit('season', tm.season);
    G.emit('notify', { text:'Llega ' + G.SEASONS[tm.season].toLowerCase(), cls: tm.season===3?'warn':'' });
  }
  if (tm.day !== S.lastDay && tm.dayFrac > 0.2){ S.lastDay = tm.day; dawn(tm); }

  // saber y fe
  const pop = S.villagers.length;
  let knowDay = pop * 1.2 * (1 + S.era*0.2) + 2;
  for (const b of S.buildings) if (b.built && KNOW_BONUS[b.type]) knowDay += KNOW_BONUS[b.type];
  S.know += knowDay * dt / G.DAY;
  addFaith(0.012 * pop * dt);

  if (S.era < G.ERAS.length-1 && S.know >= G.ERAS[S.era+1].know) eraUp();

  if (S.rainT > 0) S.rainT -= dt;
  if (S.sunT > 0){ S.sunT -= dt; if (S.rainT > 0) S.rainT = 0; }
  if (S.blessT > 0) S.blessT -= dt;

  // cultivos
  const winter = tm.season === 3;
  for (const b of S.buildings){
    if (b.type !== 'campo' || !b.built || !b.field) continue;
    if (b.field.state === 'grow'){
      let mult = winter ? 0 : 1;
      if (S.rainT > 0) mult *= 1.6;
      if (S.sunT > 0) mult *= 1.4;
      if (S.blessT > 0) mult *= 2;
      b.field.p += dt * mult / (2.2*G.DAY);
      if (b.field.p >= 1){ b.field.p = 1; b.field.state = 'ready'; }
    }
  }

  // fuego
  for (const tr of S.trees){
    if (!tr.alive || tr.burn <= 0) continue;
    tr.burn -= dt;
    if (tr.spreadT === undefined) tr.spreadT = 0.8;
    tr.spreadT -= dt;
    if (tr.spreadT <= 0){
      tr.spreadT = 0.8;
      for (const o of S.trees){
        if (o.alive && o.burn <= 0 && Math.abs(o.x-tr.x)<=1 && Math.abs(o.y-tr.y)<=1 && G.rand()<0.5){
          o.burn = 3.5;
        }
      }
    }
    if (tr.burn <= 0) killTree(tr, true);
  }

  // asignación de trabajo y planeación
  S.jobT -= dt; S.planT -= dt;
  if (S.jobT <= 0){ S.jobT = 2; if (!tm.night) assignJobs(); }
  if (S.planT <= 0){ S.planT = 4; plan(); }

  for (let i=S.villagers.length-1;i>=0;i--) updateVillager(S.villagers[i], dt, tm);
  for (const d of S.deer) updateDeer(d, dt);

  // lanzamiento
  if (S.launch){
    S.launch.t += dt;
    if (S.launch.t > 9 && !S.victory){
      S.victory = true; S.rocketGone = true;
      G.emit('victory');
    }
  }
  if (S.victory){
    S.colonyT += dt;
    if (S.colonyT > 15){ S.colonyT = 0; S.colony++; }
  }

  if (S.villagers.length === 0 && !S.extinct){
    S.extinct = true;
    G.emit('extinct');
  }
};

function dawn(tm){
  const pop = S.villagers.length;
  const winter = tm.season === 3;
  const need = pop * (winter ? 1.2 : 1);
  if (S.food >= need){ S.food -= need; }
  else {
    S.food = 0;
    if (S.t - S.famineNote > G.DAY*1.5){
      S.famineNote = S.t;
      G.emit('notify', { text:'Hambruna: tu pueblo no tiene alimento', cls:'warn' });
    }
  }

  // nacimientos
  const cap = Math.min(160, sim.popcap());
  for (const b of S.buildings){
    if (!b.built || (b.type!=='tienda' && b.type!=='casa')) continue;
    if (S.villagers.length >= cap) break;
    const chance = (S.blessT > 0 ? 0.5 : 0.22);
    if (S.food > S.villagers.length*2 && G.rand() < chance){
      const v = sim.spawnVillager((b.x+0.5)*G.TILE, (b.y+1.2)*G.TILE);
      S.stats.births++;
      G.emit('float', { x:v.x, y:v.y, text:'nace ' + v.name, color:'#ecd9ac' });
    }
  }

  // arbustos y árboles
  for (const bu of S.bushes){ if (bu.food <= 0){ bu.t += 1; if (bu.t >= 1.5){ bu.t = 0; bu.food = 5; } } }
  const alive = S.trees.filter(t=>t.alive);
  for (let i=0;i<3 && alive.length;i++){
    if (G.rand() < 0.5){
      const tr = G.pick(alive);
      const nx = tr.x + G.randi(-1,1), ny = tr.y + G.randi(-1,1);
      const tl = G.world.tile(nx,ny);
      if ((tl===T.GRASS||tl===T.MEADOW) && G.world.occGet(nx,ny)===0){
        S.trees.push({ x:nx, y:ny, type:tr.type, alive:true, burn:0 });
        G.world.occSet(nx,ny,1);
      }
    }
  }
  // derrumbes: si queda poca piedra en el mundo, aflora roca nueva
  const stoneLeft = S.rocks.reduce((a,r)=>a+r.stone, 0);
  if (stoneLeft < 150 && S.rocks.length < 40 && G.rand() < 0.75){
    for (let tries=0;tries<120;tries++){
      // primero cerca del pueblo, luego donde sea
      const near = tries < 60;
      const x = near ? G.clamp(S.center.x + G.randi(-22,22), 1, G.W-2) : G.randi(1, G.W-2);
      const y = near ? G.clamp(S.center.y + G.randi(-22,22), 1, G.H-2) : G.randi(1, G.H-2);
      const tl = G.world.tile(x,y);
      const nearHill = near || [G.world.tile(x+1,y),G.world.tile(x-1,y),G.world.tile(x,y+1),G.world.tile(x,y-1)]
        .some(t=>t===T.HILL||t===T.MOUNT);
      if ((tl===T.HILL || (tl===T.GRASS && nearHill)) && G.world.occGet(x,y)===0){
        S.rocks.push({ x, y, stone:40 });
        G.world.occSet(x,y,3);
        break;
      }
    }
  }
  // venados
  if (S.deer.length < 10 && alive.length && G.rand() < 0.7){
    const tr = G.pick(alive);
    S.deer.push(newDeer(tr.x*G.TILE, tr.y*G.TILE));
  }
  // lluvia natural
  if (!winter && S.rainT <= 0 && G.rand() < 0.25){
    S.rainT = 20 + G.rand()*20;
  }
}

function eraUp(){
  S.era++;
  addFaith(50);
  G.emit('era', S.era);
  G.emit('notify', { text:'Nueva era: ' + G.ERAS[S.era].name, cls:'era' });
  G.emit('fx', { type:'sparkleburst', x:(S.center.x+0.5)*G.TILE, y:(S.center.y+0.5)*G.TILE, n:40 });
  G.emit('sfx', 'era');
}

function killTree(tr, burnt){
  tr.alive = false; tr.burn = 0;
  const idx = S.trees.indexOf(tr);
  if (idx >= 0) S.trees.splice(idx, 1);
  if (G.world.occGet(tr.x, tr.y) === 1) G.world.occSet(tr.x, tr.y, 0);
  if (burnt){ G.world.setTile(tr.x, tr.y, T.ASH); G.terrainDirty = true; }
}
sim.killTree = killTree;
sim.igniteTree = function(tr){ if (tr.alive && tr.burn <= 0) tr.burn = 3.5; };

// ---------- planeación del pueblo ----------
function plan(){
  const pending = S.buildings.filter(b=>!b.built);
  if (pending.length >= 3) return;
  const pop = S.villagers.length;

  // edificio especial de la era
  const special = G.ERAS[S.era].special;
  if (special && !S.buildings.some(b=>b.type===special)){
    if (sim.queueBuilding(special)) return;
  }
  // cohete
  if (S.era === G.ERAS.length-1 && !S.buildings.some(b=>b.type==='cohete') && !S.rocketGone){
    if (sim.queueBuilding('cohete')) return;
  }
  // vivienda
  if (sim.popcap() - pop <= 2){
    if (sim.queueBuilding(S.era === 0 ? 'tienda' : 'casa')) return;
  }
  // campos
  if (S.era >= 1){
    const farms = S.buildings.filter(b=>b.type==='campo').length;
    if (farms < Math.ceil(pop/3.5) && sim.queueBuilding('campo')) return;
  }
  // graneros
  if (S.era >= 1){
    const gr = S.buildings.filter(b=>b.type==='granero').length;
    if (gr < 6 && sim.foodcap() < pop*8 && sim.queueBuilding('granero')) return;
  }
}

// ---------- asignación de tareas ----------
function countRole(r){ let n=0; for (const v of S.villagers) if (v.role===r) n++; return n; }
function idles(){ return S.villagers.filter(v=>!v.task || v.task.kind==='idle'); }
function setTask(v, kind, o, role){
  v.task = { kind, o, phase:'go', t:0 };
  v.role = role;
}

function assignJobs(){
  const pop = S.villagers.length;
  let free = idles();
  if (!free.length) return;
  const take = (n, fn) => {
    while (n > 0 && free.length){
      const v = free.pop();
      if (fn(v) === false) { v.task = null; v.role='ocioso'; }
      n--;
    }
  };

  // constructores
  const sites = S.buildings.filter(b=>!b.built);
  if (sites.length){
    const want = Math.min(4, sites.length*2) - countRole('constructor');
    take(want, v => {
      const b = nearestOf(v, sites, s=>true);
      if (!b) return false;
      setTask(v, 'build', b, 'constructor');
    });
  }
  // granjeros
  const winter = G.time().season === 3;
  const fields = S.buildings.filter(b=>b.type==='campo' && b.built && b.field &&
    (b.field.state==='ready' || (b.field.state==='fallow' && !winter)));
  if (fields.length){
    const want = fields.length - countRole('granjero');
    take(want, v => {
      const b = nearestOf(v, fields, s=>true);
      if (!b) return false;
      setTask(v, 'farm', b, 'granjero');
    });
  }
  // alimento silvestre
  const foodLow = S.food < pop*2;
  let wantGather = (foodLow ? Math.ceil(pop*0.4) : (S.food < pop*4 ? Math.ceil(pop*0.15) : 1))
    - countRole('recolector') - countRole('cazador');
  take(wantGather, v => {
    const bush = nearestOf(v, S.bushes, b=>b.food>0);
    const deer = nearestOf(v, S.deer, d=>d.alive);
    if (bush && (!deer || dv(v,bush.x*G.TILE,bush.y*G.TILE) < dv(v,deer.x,deer.y))){
      setTask(v, 'forage', bush, 'recolector');
    } else if (deer){
      setTask(v, 'hunt', deer, 'cazador');
    } else return false;
  });
  // madera
  const woodTarget = 25 + S.era*15;
  let wantWood = (S.wood < woodTarget ? 2 + (pop/10|0) : (S.wood < woodTarget*2 ? 1 : 0)) - countRole('lenador');
  take(wantWood, v => {
    const tr = nearestOf(v, S.trees, t=>t.alive && t.burn<=0);
    if (!tr) return false;
    setTask(v, 'chop', tr, 'lenador');
  });
  // piedra
  if (S.era >= 2){
    const stoneTarget = 15 + S.era*12 + (S.era === G.ERAS.length-1 ? 120 : 0);
    const deficit = stoneTarget - S.stone;
    let wantStone = (deficit > 0 ? (deficit > 60 ? 4 : 2) : (S.stone < stoneTarget*2 ? 1 : 0)) - countRole('minero');
    take(wantStone, v => {
      const rk = nearestOf(v, S.rocks, r=>r.stone>0);
      if (!rk) return false;
      setTask(v, 'mine', rk, 'minero');
    });
  }
  // devotos
  const shrine = S.buildings.find(b=>b.built && b.type==='templo') || S.buildings.find(b=>b.built && b.type==='santuario');
  if (shrine && !foodLow){
    const want = Math.min(2 + S.era, (pop/5)|0) - countRole('devoto');
    take(want, v => setTask(v, 'worship', shrine, 'devoto'));
  }
  // el resto pasea
  for (const v of free){ if (!v.task) { v.task = { kind:'idle', t:0 }; v.role = 'ocioso'; } }
}

function dv(v,x,y){ return (v.x-x)*(v.x-x)+(v.y-y)*(v.y-y); }
function nearestOf(v, arr, ok){
  let best = null, bd = Infinity;
  for (const o of arr){
    if (!ok(o)) continue;
    // objetos de tile (árbol/arbusto/roca/edificio) vs entidades en px (venado)
    let px, py;
    if (o.tx !== undefined){ px = o.x; py = o.y; }           // venado
    else if (o.w !== undefined){ px = (o.x+o.w/2)*G.TILE; py = (o.y+o.h/2)*G.TILE; } // edificio
    else { px = o.x*G.TILE; py = o.y*G.TILE; }               // recurso en tile
    const d = dv(v, px, py);
    if (d < bd){ bd = d; best = o; }
  }
  return best;
}

// ---------- aldeanos ----------
function moveTo(v, tx, ty, dt, speed){
  const sp = speed || v.speed;
  const dx = tx - v.x, dy = ty - v.y;
  const d = Math.hypot(dx, dy);
  if (d < 3) return true;
  const step = sp * dt;
  let nx = v.x + dx/d*step, ny = v.y + dy/d*step;
  if (G.world.isWalk((nx/G.TILE)|0, (ny/G.TILE)|0)){ v.x = nx; v.y = ny; }
  else if (G.world.isWalk((nx/G.TILE)|0, (v.y/G.TILE)|0)){ v.x = nx; }
  else if (G.world.isWalk((v.x/G.TILE)|0, (ny/G.TILE)|0)){ v.y = ny; }
  else { v.x += (G.rand()-0.5)*step*2; v.y += (G.rand()-0.5)*step*2; }
  v.ft += dt*6;
  return false;
}

function die(v, starved){
  const i = S.villagers.indexOf(v);
  if (i >= 0) S.villagers.splice(i,1);
  S.stats.deaths++;
  if (starved) S.stats.starved++;
  G.emit('fx', { type:'puff', x:v.x, y:v.y });
}

function updateVillager(v, dt, tm){
  v.age += dt / G.DAY;
  if (v.age > v.life){ die(v, false); return; }
  if (S.food <= 0){ v.hunger += dt*2.2; if (v.hunger >= 100){ die(v, true); return; } }
  else v.hunger = Math.max(0, v.hunger - dt*10);

  // noche: a dormir junto al hogar (la tarea queda en pausa, no se pierde)
  if (tm.night && v.role !== 'devoto'){
    const home = nearestOf(v, S.buildings, b=>b.built && (b.type==='tienda'||b.type==='casa'||b.type==='fogata'));
    if (home) moveTo(v, (home.x+home.w/2)*G.TILE + (v.id%5)-2, (home.y+home.h)*G.TILE + (v.id%3), dt, v.speed*0.7);
    if (v.task && v.task.phase === 'work') v.task.phase = 'go';
    return;
  }

  const task = v.task;
  if (!task || task.kind === 'idle'){
    // paseo cerca del centro
    v.wt -= dt;
    if (v.wt <= 0){
      v.wt = 2 + G.rand()*4;
      v.wx = (S.center.x + (G.rand()*8-4)) * G.TILE;
      v.wy = (S.center.y + (G.rand()*8-4)) * G.TILE;
    }
    moveTo(v, v.wx, v.wy, dt, v.speed*0.6);
    return;
  }

  const o = task.o;
  const invalid =
    (task.kind==='forage' && (!o || o.food<=0)) ||
    (task.kind==='hunt'   && (!o || !o.alive)) ||
    (task.kind==='chop'   && (!o || !o.alive || o.burn>0)) ||
    (task.kind==='mine'   && (!o || o.stone<=0)) ||
    (task.kind==='build'  && (!o || o.built)) ||
    (task.kind==='farm'   && (!o || !o.field)) ||
    (task.kind==='worship'&& (!o || !o.built));
  if (invalid){ v.task = null; v.role = 'ocioso'; return; }

  let px, py;
  if (task.kind === 'hunt'){ px = o.x; py = o.y; }
  else if (o.w !== undefined){ px = (o.x+o.w/2)*G.TILE; py = (o.y+o.h/2)*G.TILE; }
  else { px = (o.x+0.5)*G.TILE; py = (o.y+0.5)*G.TILE; }

  if (task.kind === 'hunt'){
    o.flee = 1.2;
    if (moveTo(v, px, py, dt, v.speed*1.25)){
      o.alive = false;
      S.deer.splice(S.deer.indexOf(o),1);
      addFood(14);
      G.emit('float', { x:o.x, y:o.y, text:'+14', color:'#e8d34d' });
      v.task = null; v.role='ocioso';
    }
    return;
  }

  if (task.phase === 'go'){
    if (moveTo(v, px, py, dt)) task.phase = 'work';
    return;
  }

  // trabajando
  task.t += dt;
  switch (task.kind){
    case 'forage':
      if (task.t >= 2.5){
        addFood(o.food);
        G.emit('float', { x:px, y:py, text:'+'+o.food, color:'#e8d34d' });
        o.food = 0; o.t = 0;
        v.task = null; v.role='ocioso';
      }
      break;
    case 'chop':
      if (task.t >= 3.5){
        S.wood += 6;
        G.emit('float', { x:px, y:py, text:'+6', color:'#a97d4b' });
        G.emit('fx', { type:'chips', x:px, y:py });
        killTree(o, false);
        v.task = null; v.role='ocioso';
      }
      break;
    case 'mine':
      if (task.t >= 3.5){
        const got = Math.min(8, o.stone);
        S.stone += got; o.stone -= got;
        G.emit('float', { x:px, y:py, text:'+'+got, color:'#b5b2a2' });
        if (o.stone <= 0){
          S.rocks.splice(S.rocks.indexOf(o),1);
          if (G.world.occGet(o.x,o.y)===3) G.world.occSet(o.x,o.y,0);
        }
        v.task = null; v.role='ocioso';
      }
      break;
    case 'build': {
      const bt = G.BTYPES[o.type];
      o.progress += dt / bt.work;
      if (task.t > 1){ task.t = 0; G.emit('fx', { type:'chips', x:px, y:py-6 }); }
      if (o.progress >= 1){
        o.progress = 1; o.built = true;
        G.emit('fx', { type:'sparkleburst', x:px, y:py, n:12 });
        G.emit('notify', { text: bt.name + ' construido', cls:'' });
        G.emit('sfx', 'build');
        if (o.type === 'cohete'){ S.launch = { t: 0 }; G.emit('notify', { text:'¡El cohete está listo! Encendido…', cls:'era' }); G.emit('sfx','launch'); }
        v.task = null; v.role='ocioso';
      }
      break;
    }
    case 'farm':
      if (o.field.state === 'fallow'){
        if (G.time().season === 3){ v.task = null; v.role='ocioso'; break; }
        if (task.t >= 2.5){ o.field.state = 'grow'; o.field.p = 0; task.t = 0; v.task = null; v.role='ocioso'; }
      } else if (o.field.state === 'ready'){
        if (task.t >= 2.5){
          addFood(12);
          G.emit('float', { x:px, y:py, text:'+12', color:'#e8d34d' });
          o.field.state = 'fallow'; o.field.p = 0;
          v.task = null; v.role='ocioso';
        }
      } else { v.task = null; v.role='ocioso'; }
      break;
    case 'worship':
      addFaith(0.09 * dt);
      if (task.t > 3){ task.t = 0; G.emit('fx', { type:'spark', x:v.x, y:v.y-8 }); }
      break;
  }
}

function updateDeer(d, dt){
  d.t -= dt;
  if (d.flee > 0) d.flee -= dt;
  if (d.t <= 0){
    d.t = 2 + G.rand()*4;
    d.tx = d.x + (G.rand()*8-4)*G.TILE;
    d.ty = d.y + (G.rand()*8-4)*G.TILE;
  }
  const sp = d.flee > 0 ? 55 : 18;
  const dx = d.tx-d.x, dy = d.ty-d.y, dd = Math.hypot(dx,dy);
  if (dd > 4){
    const nx = d.x + dx/dd*sp*dt, ny = d.y + dy/dd*sp*dt;
    if (G.world.isWalk((nx/G.TILE)|0,(ny/G.TILE)|0)){ d.x = nx; d.y = ny; }
    else d.t = 0;
  }
}

// ---------- carga de partida ----------
sim.load = function(data){
  G.setSeed(data.seed);
  G.tiles = new Uint8Array(data.tiles);
  G.world.resetOcc();
  S = G.S = {
    t: data.t, lastDay: Math.floor(data.t/G.DAY), lastSeason: Math.floor(Math.floor(data.t/G.DAY)/G.SEASON_DAYS)%4,
    speed: 1, paused: false,
    food: data.food, wood: data.wood, stone: data.stone, faith: data.faith, know: data.know,
    era: data.era, villagers: [], buildings: [], deer: [],
    trees: [], bushes: [], rocks: [],
    center: data.center, rainT: data.rainT||0, sunT: data.sunT||0, blessT: data.blessT||0,
    victory: data.victory, launch: null, rocketGone: data.victory, colony: data.colony||0, colonyT: 0,
    extinct: false, famineNote: 0,
    stats: data.stats || { births:0, deaths:0, starved:0, miracles:0, faithSpent:0 },
    jobT: 0, planT: 0,
  };
  nid = 1;
  for (const t of data.trees){ S.trees.push({ ...t, burn:0 }); if (t.alive) G.world.occSet(t.x,t.y,1); }
  for (const b of data.bushes){ S.bushes.push({ ...b, t:0 }); G.world.occSet(b.x,b.y,2); }
  for (const r of data.rocks){ S.rocks.push({ ...r }); G.world.occSet(r.x,r.y,3); }
  for (const b of data.buildings){
    const bt = G.BTYPES[b.type];
    const nb = { id: nid++, type:b.type, x:b.x, y:b.y, w:bt.w, h:bt.h, built:b.built, progress:b.progress };
    if (b.type==='campo') nb.field = b.field || { state:'fallow', p:0 };
    for (let dy=0;dy<bt.h;dy++) for (let dx=0;dx<bt.w;dx++) G.world.occSet(b.x+dx,b.y+dy,4);
    S.buildings.push(nb);
  }
  for (const v of data.villagers){
    const nv = sim.spawnVillager(v.x, v.y);
    nv.name = v.name; nv.age = v.age; nv.life = v.life; nv.hunger = v.hunger;
  }
  for (const d of data.deer) S.deer.push(newDeer(d.x, d.y));
  G.world.bake(S.lastSeason);
  return S;
};
})();

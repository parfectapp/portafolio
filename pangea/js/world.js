/* PANGEA — mundo: terreno procedimental, recursos, horneado por estación */
(function(){
const G = window.G;
const T = G.T;

const world = G.world = {};
let occ = null; // 0 libre, 1 árbol, 2 arbusto, 3 roca, 4 edificio
world.resetOcc = function(){ occ = world.occ = new Uint8Array(G.W*G.H); };

world.generate = function(seed){
  G.setSeed(seed);
  const W = G.W, H = G.H;
  const tiles = G.tiles = new Uint8Array(W*H);
  world.resetOcc();
  const el = G.makeNoise(seed);
  const mo = G.makeNoise(seed + 999);
  const de = G.makeNoise(seed + 5555);

  for (let y=0;y<H;y++) for (let x=0;x<W;x++){
    const nx = x/W - 0.5, ny = y/H - 0.5;
    const r = Math.sqrt(nx*nx + ny*ny) * 2;
    let e = el(x*0.045, y*0.045, 4) * 1.2 - r*r*0.75;
    const m = mo(x*0.06, y*0.06, 3);
    let t;
    if      (e < 0.26) t = T.DEEP;
    else if (e < 0.34) t = T.WATER;
    else if (e < 0.39) t = T.SAND;
    else if (e > 0.82) t = (e > 0.90 ? T.SNOW : T.MOUNT);
    else if (e > 0.72) t = T.HILL;
    else t = (m > 0.62 ? T.MEADOW : T.GRASS);
    tiles[y*W+x] = t;
  }

  // recursos
  const trees = [], bushes = [], rocks = [];
  for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++){
    const t = tiles[y*W+x];
    const d = de(x*0.08, y*0.08, 3);
    if ((t === T.GRASS || t === T.MEADOW) && d > 0.55 && G.rand() < 0.55){
      trees.push({ x, y, type: d > 0.68 ? 1 : 0, alive:true, burn:0, regrow:0 });
      occ[y*W+x] = 1;
    } else if (t === T.GRASS && d > 0.42 && G.rand() < 0.06){
      bushes.push({ x, y, food:5, t:0 });
      occ[y*W+x] = 2;
    } else if (t === T.HILL && G.rand() < 0.22){
      rocks.push({ x, y, stone:40 });
      occ[y*W+x] = 3;
    } else if (t === T.GRASS && d > 0.78 && G.rand() < 0.25){
      rocks.push({ x, y, stone:40 });
      occ[y*W+x] = 3;
    }
  }

  // centro: la mejor zona de pasto abierto
  let best = null, bestScore = -1;
  for (let y=12;y<H-12;y+=2) for (let x=12;x<W-12;x+=2){
    if (tiles[y*W+x] !== T.GRASS) continue;
    let score = 0;
    for (let dy=-6;dy<=6;dy+=2) for (let dx=-6;dx<=6;dx+=2){
      const t = tiles[(y+dy)*W+(x+dx)];
      if (t === T.GRASS || t === T.MEADOW) score += (occ[(y+dy)*W+(x+dx)] === 0 ? 2 : 1);
      if (t === T.WATER || t === T.SAND) score += 0.5;
    }
    score -= (Math.abs(x-W/2) + Math.abs(y-H/2)) * 0.15;
    if (score > bestScore){ bestScore = score; best = {x, y}; }
  }
  return { trees, bushes, rocks, center: best || {x:G.W>>1, y:G.H>>1} };
};

world.tile = (x,y) => (x<0||y<0||x>=G.W||y>=G.H) ? T.DEEP : G.tiles[y*G.W+x];
world.setTile = (x,y,t) => { if (x>=0&&y>=0&&x<G.W&&y<G.H) G.tiles[y*G.W+x] = t; };
world.isWalk = (x,y) => (x>=0&&y>=0&&x<G.W&&y<G.H) && G.WALKABLE[G.tiles[y*G.W+x]];
world.occGet = (x,y) => (x<0||y<0||x>=G.W||y>=G.H) ? 9 : occ[y*G.W+x];
world.occSet = (x,y,v) => { if (x>=0&&y>=0&&x<G.W&&y<G.H) occ[y*G.W+x] = v; };
world.canBuild = function(x,y,w,h){
  for (let dy=0;dy<h;dy++) for (let dx=0;dx<w;dx++){
    const tx=x+dx, ty=y+dy;
    if (tx<1||ty<1||tx>=G.W-1||ty>=G.H-1) return false;
    if (!G.BUILDABLE[G.tiles[ty*G.W+tx]]) return false;
    if (occ[ty*G.W+tx] !== 0) return false;
  }
  return true;
};

// ¿se puede colocar? mode 0 = libre con margen, 1 = huella exacta, 2 = permite desmonte (árbol/arbusto/roca)
world.canPlace = function(x, y, w, h, mode){
  const mw = mode === 0 ? w+1 : w, mh = mode === 0 ? h+1 : h;
  for (let dy=0;dy<mh;dy++) for (let dx=0;dx<mw;dx++){
    const tx=x+dx, ty=y+dy;
    if (tx<1||ty<1||tx>=G.W-1||ty>=G.H-1) return false;
    if (!G.BUILDABLE[G.tiles[ty*G.W+tx]]) return false;
    const o = occ[ty*G.W+tx];
    if (mode === 2 ? o === 4 : o !== 0) return false;
  }
  return true;
};

// búsqueda en espiral de sitio alrededor de un punto
world.findSpot = function(cx, cy, w, h, minR, maxR, mode){
  minR = minR||2; maxR = maxR||30; mode = mode||0;
  for (let r=minR;r<=maxR;r++){
    const cand = [];
    for (let dx=-r;dx<=r;dx++){
      cand.push([cx+dx, cy-r], [cx+dx, cy+r]);
    }
    for (let dy=-r+1;dy<r;dy++){
      cand.push([cx-r, cy+dy], [cx+r, cy+dy]);
    }
    // baraja para que el pueblo crezca orgánico
    for (let i=cand.length-1;i>0;i--){ const j=(G.rand()*(i+1))|0; const t=cand[i]; cand[i]=cand[j]; cand[j]=t; }
    for (const [x,y] of cand){
      if (world.canPlace(x-((w/2)|0), y-((h/2)|0), w, h, mode)) return { x:x-((w/2)|0), y:y-((h/2)|0) };
    }
  }
  return null;
};

// ---------- horneado del terreno (solo navegador) ----------
const TILE_COLS = [
  // [base, variante] por estación se ajusta el pasto
  ['#1d3a52','#1a344a'],  // DEEP
  ['#2b5d7a','#28576f'],  // WATER
  ['#d9b98a','#cfae7d'],  // SAND
  null,                   // GRASS (estacional)
  null,                   // MEADOW (estacional)
  ['#7d7a66','#736f5c'],  // HILL
  ['#8b8b7f','#7d7d72'],  // MOUNT
  ['#e8e6da','#dcdacd'],  // SNOW
  ['#6e4e2c','#5f4326'],  // SOIL
  ['#3a352c','#332f27'],  // ASH
];
const GRASS_SEASON = [
  ['#5d9147','#548540','#68a04f'],  // primavera
  ['#4d8a3d','#458036','#579645'],  // verano
  ['#a08a3d','#948036','#ad9846'],  // otoño
  ['#c8cfc4','#bcc4ba','#d4dbd0'],  // invierno
];
const MEADOW_SEASON = [
  ['#6ca452','#62984a','#79b25e'],
  ['#5c9c48','#529040','#68aa53'],
  ['#b09a48','#a28d40','#bda753'],
  ['#d2d8ce','#c6cdc3','#dde3d9'],
];

world.bake = function(season){
  if (typeof document === 'undefined') return;
  if (!world.canvas){
    world.canvas = document.createElement('canvas');
    world.canvas.width = G.W*G.TILE; world.canvas.height = G.H*G.TILE;
  }
  const ctx = world.canvas.getContext('2d');
  const TS = G.TILE;
  for (let y=0;y<G.H;y++) for (let x=0;x<G.W;x++){
    const t = G.tiles[y*G.W+x];
    let base, v1, v2;
    if (t === T.GRASS){ [base,v1,v2] = GRASS_SEASON[season]; }
    else if (t === T.MEADOW){ [base,v1,v2] = MEADOW_SEASON[season]; }
    else { base = TILE_COLS[t][0]; v1 = TILE_COLS[t][1]; v2 = base; }
    ctx.fillStyle = base;
    ctx.fillRect(x*TS, y*TS, TS, TS);
    // moteado determinista
    const hsh = ((x*73856093) ^ (y*19349663)) >>> 0;
    ctx.fillStyle = v1;
    for (let i=0;i<5;i++){
      const px = (hsh >> (i*3)) % TS, py = (hsh >> (i*3+7)) % TS;
      ctx.fillRect(x*TS+px, y*TS+py, 2, 1);
    }
    if (v2 !== base){
      ctx.fillStyle = v2;
      ctx.fillRect(x*TS + (hsh%13), y*TS + ((hsh>>5)%13), 2, 2);
    }
    // orilla: línea de espuma junto al agua
    if (t === T.SAND){
      ctx.fillStyle = '#ecd9ac';
      if (world.tile(x,y-1) <= T.WATER) ctx.fillRect(x*TS, y*TS, TS, 2);
      if (world.tile(x,y+1) <= T.WATER) ctx.fillRect(x*TS, (y+1)*TS-2, TS, 2);
      if (world.tile(x-1,y) <= T.WATER) ctx.fillRect(x*TS, y*TS, 2, TS);
      if (world.tile(x+1,y) <= T.WATER) ctx.fillRect((x+1)*TS-2, y*TS, 2, TS);
    }
    // nieve de invierno sobre suelo/ceniza no
    if (season === 3 && (t === T.HILL || t === T.MOUNT)){
      ctx.fillStyle = 'rgba(232,230,218,0.45)';
      ctx.fillRect(x*TS, y*TS, TS, TS);
    }
  }
  world.bakeMini();
};

const MINI_COLS = ['#1d3a52','#2b5d7a','#d9b98a','#4d8a3d','#5c9c48','#7d7a66','#8b8b7f','#e8e6da','#6e4e2c','#3a352c'];
world.bakeMini = function(){
  if (typeof document === 'undefined') return;
  if (!world.mini){
    world.mini = document.createElement('canvas');
    world.mini.width = G.W; world.mini.height = G.H;
  }
  const ctx = world.mini.getContext('2d');
  const img = ctx.createImageData(G.W, G.H);
  for (let i=0;i<G.W*G.H;i++){
    const c = MINI_COLS[G.tiles[i]];
    img.data[i*4]   = parseInt(c.slice(1,3),16);
    img.data[i*4+1] = parseInt(c.slice(3,5),16);
    img.data[i*4+2] = parseInt(c.slice(5,7),16);
    img.data[i*4+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
};
})();

/* PANGEA — núcleo: constantes, RNG, ruido, eventos, guardado */
(function(){
const G = window.G = {};
G.VERSION = '1.0';

// mundo
G.W = 96; G.H = 96; G.TILE = 16;
G.T = { DEEP:0, WATER:1, SAND:2, GRASS:3, MEADOW:4, HILL:5, MOUNT:6, SNOW:7, SOIL:8, ASH:9 };
G.WALKABLE  = [false,false,true,true,true,true,false,false,true,true];
G.BUILDABLE = [false,false,false,true,true,false,false,false,false,false];

// tiempo: 1 día = 45 s a velocidad 1×
G.DAY = 45; G.SEASON_DAYS = 6; G.YEAR_DAYS = 24;
G.SEASONS = ['Primavera','Verano','Otoño','Invierno'];

// eras de la civilización
G.ERAS = [
  { name:'Edad de Piedra',    know:0,     house:'tienda',       cap:3,  special:null },
  { name:'Edad Agrícola',     know:120,   house:'cabana',       cap:4,  special:'granero' },
  { name:'Edad de Bronce',    know:350,   house:'casa_madera',  cap:5,  special:'santuario' },
  { name:'Edad de Hierro',    know:800,   house:'casa_hierro',  cap:5,  special:'herreria' },
  { name:'Edad Media',        know:1600,  house:'casa_piedra',  cap:6,  special:'templo' },
  { name:'Edad Industrial',   know:3000,  house:'casa_ladrillo',cap:8,  special:'fabrica' },
  { name:'Edad Moderna',      know:5200,  house:'edificio',     cap:12, special:'planta' },
  { name:'Era Espacial',      know:8500,  house:'torre',        cap:16, special:'plataforma' },
];

// RNG determinista (mulberry32)
let seed = (Math.random()*1e9)|0;
G.setSeed = s => { seed = s|0; };
G.getSeed = () => seed;
G.rand = function(){
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed>>>15, 1|seed);
  t = t + Math.imul(t ^ t>>>7, 61|t) ^ t;
  return ((t ^ t>>>14) >>> 0) / 4294967296;
};
G.randi = (a,b) => a + Math.floor(G.rand()*(b-a+1));
G.pick  = a => a[Math.floor(G.rand()*a.length)];
G.clamp = (v,a,b) => v<a?a : v>b?b : v;
G.lerp  = (a,b,t) => a+(b-a)*t;
G.dist  = (ax,ay,bx,by) => Math.hypot(bx-ax, by-ay);

// ruido de valor + fbm
G.makeNoise = function(s){
  const p = new Uint8Array(512); let r = s>>>0;
  const rnd = () => { r = r + 0x6D2B79F5 | 0; let t = Math.imul(r ^ r>>>15, 1|r); t = t + Math.imul(t ^ t>>>7, 61|t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; };
  for (let i=0;i<256;i++) p[i]=i;
  for (let i=255;i>0;i--){ const j=(rnd()*(i+1))|0; const tmp=p[i]; p[i]=p[j]; p[j]=tmp; }
  for (let i=0;i<256;i++) p[256+i]=p[i];
  const fade = t => t*t*(3-2*t);
  function val(x,y){
    const X = Math.floor(x)&255, Y = Math.floor(y)&255;
    const fx = x-Math.floor(x), fy = y-Math.floor(y);
    const a = p[(p[X]+Y)&511]/255,   b = p[(p[X+1]+Y)&511]/255;
    const c = p[(p[X]+Y+1)&511]/255, d = p[(p[X+1]+Y+1)&511]/255;
    const u = fade(fx), v = fade(fy);
    return G.lerp(G.lerp(a,b,u), G.lerp(c,d,u), v);
  }
  return function(x,y,oct){
    oct = oct||4;
    let f=1, amp=1, sum=0, tot=0;
    for (let o=0;o<oct;o++){ sum += val(x*f,y*f)*amp; tot += amp; amp*=0.5; f*=2; }
    return sum/tot;
  };
};

// bus de eventos
const subs = {};
G.on   = (ev,fn) => { (subs[ev] = subs[ev]||[]).push(fn); };
G.emit = (ev,data) => { const l = subs[ev]; if (l) for (const fn of l) fn(data); };

// nombres de aldeanos
const SYL = ['ka','ra','mi','to','na','be','lu','o','ta','ne','ki','su','pa','ye','mo','cha','ul','in','za','wa'];
G.name = () => {
  let n = G.pick(SYL) + G.pick(SYL);
  if (G.rand() < 0.4) n += G.pick(SYL);
  return n[0].toUpperCase() + n.slice(1);
};

// guardado en localStorage
G.save = function(){
  if (!G.S || G.S.launch) return;
  try {
    const S = G.S;
    const data = {
      v: G.VERSION, seed: G.getSeed(), tiles: Array.from(G.tiles),
      t:S.t, food:S.food, wood:S.wood, stone:S.stone, faith:S.faith, know:S.know,
      era:S.era, victory:S.victory, colony:S.colony, stats:S.stats,
      center:S.center, rainT:S.rainT, sunT:S.sunT, blessT:S.blessT,
      villagers: S.villagers.map(v=>({ name:v.name, x:v.x, y:v.y, age:v.age, life:v.life, hunger:v.hunger })),
      buildings: S.buildings.map(b=>({ type:b.type, x:b.x, y:b.y, progress:b.progress, built:b.built, field:b.field||null })),
      trees: S.trees.map(o=>({ x:o.x, y:o.y, type:o.type, alive:o.alive })),
      bushes: S.bushes.map(o=>({ x:o.x, y:o.y, food:o.food })),
      rocks: S.rocks.map(o=>({ x:o.x, y:o.y, stone:o.stone })),
      deer: S.deer.map(d=>({ x:d.x, y:d.y })),
    };
    localStorage.setItem('pangea_save', JSON.stringify(data));
  } catch(e){}
};
G.hasSave = () => { try { return !!localStorage.getItem('pangea_save'); } catch(e){ return false; } };
G.clearSave = () => { try { localStorage.removeItem('pangea_save'); } catch(e){} };
})();

/* PANGEA — prueba de balance headless: ¿la civilización llega a las estrellas sola? */
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
global.window = {};
const load = f => (0, eval)(fs.readFileSync(path.join(dir, '../js', f), 'utf8'));
load('core.js');
load('world.js');
load('sim.js');
load('powers.js');
const G = global.window.G;

const seed = process.argv[2] ? parseInt(process.argv[2]) : 42;
const MAXDAYS = 220;

G.on('notify', () => {});
G.sim.init(seed);
const S = G.S;

let lastEra = 0, lastReport = 0;
const eras = [[0, 0, 6]];
console.log('seed', seed, '— centro', S.center, '— árboles', S.trees.length, 'arbustos', S.bushes.length, 'rocas', S.rocks.length);

const STEP = 1/10;
while (!S.victory && !S.extinct){
  G.sim.tick(STEP);
  const day = Math.floor(S.t / G.DAY);
  if (day >= MAXDAYS) break;
  if (S.era !== lastEra){
    lastEra = S.era;
    eras.push([S.era, day, S.villagers.length]);
    console.log(`día ${String(day).padStart(3)} → ${G.ERAS[S.era].name}  (pop ${S.villagers.length}, comida ${S.food|0}, madera ${S.wood|0}, piedra ${S.stone|0})`);
  }
  if (day >= lastReport + 20){
    lastReport = day;
    console.log(`  · día ${String(day).padStart(3)}  pop ${String(S.villagers.length).padStart(3)}  comida ${String(S.food|0).padStart(4)}/${G.sim.foodcap()}  madera ${String(S.wood|0).padStart(4)}  piedra ${String(S.stone|0).padStart(4)}  saber ${String(S.know|0).padStart(5)}  fe ${S.faith|0}  hambre:${S.stats.starved}`);
  }
}

const day = Math.floor(S.t / G.DAY);
console.log('---');
if (S.victory) console.log(`VICTORIA el día ${day} (~${(day*G.DAY/60).toFixed(0)} min a 1×): pop ${S.villagers.length}, nacimientos ${S.stats.births}, muertes ${S.stats.deaths} (hambre ${S.stats.starved})`);
else if (S.extinct) console.log(`EXTINCIÓN el día ${day} — muertes ${S.stats.deaths}, por hambre ${S.stats.starved}`);
else console.log(`SIN VICTORIA tras ${day} días — era ${G.ERAS[S.era].name}, saber ${S.know|0}, pop ${S.villagers.length}, hambre ${S.stats.starved}`);

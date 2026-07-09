/* UMBRAL — data.js
   Zonas, salas (geometría por builder), reliquias, habilidades, estelas.
   Tiles: '#' sólido · '.' aire · '^' púas · '-' plataforma de un sentido */
'use strict';

const T = 32;

const ZONES = {
  sendas:  { name: 'SENDAS CENIZAS',  music: 'sendas',  sky: ['#0b0f16', '#18202e'], fog: '#1c2635', ink: '#07090d', edge: '#5d6f8a', accent: '#8fa3bd', deco: 'ash' },
  verde:   { name: 'HONDONADA VERDE', music: 'verde',   sky: ['#071009', '#10241a'], fog: '#142a1f', ink: '#04080a', edge: '#4f7a5a', accent: '#a8d08a', deco: 'moss' },
  ciudad:  { name: 'CIUDAD ANEGADA',  music: 'ciudad',  sky: ['#05080f', '#0d1626'], fog: '#101d33', ink: '#04060c', edge: '#4a5f85', accent: '#7fb2d9', deco: 'city', rain: true },
  hondura: { name: 'LA HONDURA',      music: 'hondura', sky: ['#050406', '#0b080d'], fog: '#0d0a10', ink: '#020203', edge: '#3a2f3f', accent: '#c23b3b', deco: 'webs', dark: true },
};

const RELICS = {
  musgo:  { name: 'Corazón de Musgo',  cost: 2, desc: '+1 candela.' },
  piedra: { name: 'Piedra de Ánima',   cost: 1, desc: 'La Chispa golpea +50%.' },
  rezo:   { name: 'Rezo Veloz',        cost: 1, desc: 'Rezas mucho más deprisa.' },
  iman:   { name: 'Imán de Esquirlas', cost: 1, desc: 'Las esquirlas vuelan hacia ti.' },
};

const ABILITIES = {
  chispa: { name: 'CHISPA ERRANTE',  hint: 'Pulsa V: la chispa vuela hacia lo que temes (33 de ánima).' },
  dash:   { name: 'MANTO DE CENIZA', hint: 'Pulsa C para desgarrar el aire.' },
  garra:  { name: 'GARRA DE SÍLEX',  hint: 'Aférrate a los muros y salta entre ellos.' },
  alas:   { name: 'ALAS DE VILANO',  hint: 'Salta otra vez en el aire.' },
};

const BOSS_DEFS = {
  guardian: { name: 'GUARDIÁN ROTO',   hp: 180, reward: 'dash' },
  regente:  { name: 'REGENTE AHOGADO', hp: 220, reward: 'alas' },
  lumbre:   { name: 'LA LUMBRE',       hp: 300, reward: null },
};

const ROOMS = {};
function _room(id, zone, w, h, map, build) {
  const r = { id, zone, w, h, map, exits: [], props: [], enemies: [], gates: [], boss: null, g: Array.from({ length: h }, () => new Array(w).fill('.')) };
  const H = {
    F(x, y, ww, hh, c) { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) { if (j >= 0 && j < h && i >= 0 && i < w) r.g[j][i] = c; } },
    exit(dir, a, b, to, tx, ty) {
      r.exits.push({ dir, a, b, to, tx, ty });
      if (dir === 'L') H.F(0, a, 1, b - a + 1, '.');
      if (dir === 'R') H.F(w - 1, a, 1, b - a + 1, '.');
      if (dir === 'U') H.F(a, 0, b - a + 1, 1, '.');
      if (dir === 'D') H.F(a, h - 1, b - a + 1, 1, '.');
    },
    prop(type, tx, ty, extra) { r.props.push({ type, tx, ty, extra }); },
    foe(type, tx, ty) { r.enemies.push({ type, tx, ty }); },
    boss(type, tx, ty) { r.boss = { type, tx, ty }; },
    gate(tx, ty, tw, th) { r.gates.push({ tx, ty, tw, th }); },
  };
  build(H);
  r.g = r.g.map(row => row.join(''));
  ROOMS[id] = r;
}

/* ============ SENDAS CENIZAS ============ */

_room('s1', 'sendas', 44, 18, [14, 1, 5, 2], H => {
  H.F(0, 0, 44, 1, '#'); H.F(0, 15, 44, 3, '#');
  H.F(0, 1, 1, 14, '#'); H.F(43, 1, 1, 14, '#');
  H.F(18, 11, 5, 1, '#'); H.F(28, 12, 4, 1, '#');
  H.exit('R', 12, 14, 's2', 2, 7);
  H.prop('estela', 7, 14, 'Muévete con ← →.  Salta con Z.  La Espina responde a X.\nApunta arriba o abajo con ↑ ↓.  Mantén L para rezar y sanar.');
  H.foe('rastrero', 22, 14); H.foe('rastrero', 33, 14);
  H.prop('urna', 39, 14);
});

_room('s2', 'sendas', 48, 26, [19, 1, 6, 3], H => {
  H.F(0, 0, 48, 1, '#'); H.F(0, 25, 48, 1, '#');
  H.F(0, 1, 1, 24, '#'); H.F(47, 1, 1, 24, '#');
  H.F(1, 8, 35, 1, '#');                        // corredor superior
  H.F(40, 11, 6, 1, '#'); H.F(34, 14, 5, 1, '#'); // escalera derecha
  H.F(40, 17, 5, 1, '#'); H.F(34, 20, 5, 1, '#');
  H.F(1, 23, 46, 2, '#');                        // suelo inferior
  H.F(1, 19, 12, 1, '#');                        // techo del paso del dash
  H.F(3, 23, 5, 1, '.'); H.F(3, 24, 5, 1, '^');  // foso de púas (gate: dash)
  H.F(30, 23, 4, 1, '-'); H.F(30, 24, 4, 1, '.'); H.F(30, 25, 4, 1, '.'); // reja al Pozo
  H.exit('L', 5, 7, 's1', 41, 14);
  H.exit('R', 5, 7, 's3', 2, 13);
  H.exit('L', 20, 22, 'v1', 36, 14);
  H.exit('D', 30, 33, 's5', 11, 2);
  H.prop('estela', 35, 22, 'El Pozo espera bajo la reja.  (↓ para dejarte caer.)');
  H.foe('zumbon', 20, 12); H.foe('zumbon', 28, 17); H.foe('rastrero', 15, 22);
  H.prop('urna', 44, 22);
});

_room('s3', 'sendas', 32, 18, [25, 1, 4, 2], H => {
  H.F(0, 0, 32, 1, '#'); H.F(0, 14, 32, 4, '#');
  H.F(0, 1, 1, 13, '#'); H.F(31, 1, 1, 13, '#');
  H.F(10, 10, 3, 1, '#');
  H.exit('L', 11, 13, 's2', 44, 7);
  H.exit('R', 11, 13, 's4', 2, 13);
  H.prop('brasa', 15, 13);
  H.prop('estela', 21, 13, 'Aquí ardió la primera brasa. El reino entero fue una constelación\nde fuegos. Ya solo quedas tú, pavesa.');
  H.prop('urna', 8, 13);
});

_room('s4', 'sendas', 28, 18, [29, 1, 3, 2], H => {
  H.F(0, 0, 28, 1, '#'); H.F(0, 14, 28, 4, '#');
  H.F(0, 1, 1, 13, '#'); H.F(27, 1, 1, 13, '#');
  H.F(10, 12, 3, 1, '#'); H.F(16, 10, 5, 1, '#');
  H.exit('L', 11, 13, 's3', 28, 13);
  H.prop('item', 18, 9, 'chispa');
  H.prop('estela', 23, 13, 'Toma la chispa del altar. Reza, y la chispa errará\nhacia aquello que temas.');
  H.foe('zumbon', 12, 6); H.foe('zumbon', 20, 6);
});

_room('s5', 'sendas', 24, 32, [21, 4, 3, 4], H => {
  H.F(0, 0, 24, 1, '#'); H.F(0, 29, 24, 3, '#');
  H.F(0, 1, 1, 28, '#'); H.F(23, 1, 1, 28, '#');
  H.F(15, 2, 4, 1, '#');
  H.F(9, 5, 6, 1, '#'); H.F(3, 8, 5, 1, '#'); H.F(9, 11, 5, 1, '#');
  H.F(3, 14, 5, 1, '#'); H.F(9, 17, 5, 1, '#'); H.F(17, 19, 6, 1, '#');
  H.F(3, 20, 5, 1, '#'); H.F(9, 23, 5, 1, '#'); H.F(3, 26, 5, 1, '#');
  H.F(22, 6, 1, 1, '^'); H.F(22, 12, 1, 1, '^'); H.F(1, 16, 1, 1, '^');
  H.F(15, 28, 4, 1, '^');
  H.exit('U', 10, 13, 's2', 31, 22);
  H.exit('D', 10, 13, 's6', 11, 1);
  H.prop('item', 20, 18, 'relic:rezo');
  H.foe('zumbon', 18, 10); H.foe('zumbon', 6, 23);
});

_room('s6', 'sendas', 36, 18, [20, 8, 4, 2], H => {
  H.F(0, 0, 36, 1, '#'); H.F(0, 15, 36, 3, '#');
  H.F(0, 1, 1, 14, '#'); H.F(35, 1, 1, 14, '#');
  H.F(9, 3, 6, 1, '#'); H.F(20, 6, 4, 1, '#');
  H.F(14, 9, 4, 1, '#'); H.F(20, 12, 4, 1, '#');
  H.exit('U', 10, 13, 's5', 5, 25);
  H.exit('R', 12, 14, 's7', 2, 14);
  H.prop('brasa', 6, 14);
  H.prop('urna', 27, 14);
  H.foe('rastrero', 30, 14);
});

_room('s7', 'sendas', 40, 18, [24, 8, 5, 2], H => {
  H.F(0, 0, 40, 1, '#'); H.F(0, 15, 40, 3, '#');
  H.F(0, 1, 1, 14, '#'); H.F(39, 1, 1, 14, '#');
  H.exit('L', 12, 14, 's6', 33, 14);
  H.boss('guardian', 30, 14);
  H.gate(1, 11, 1, 4);
});

/* ============ HONDONADA VERDE ============ */

_room('v1', 'verde', 40, 18, [14, 3, 5, 2], H => {
  H.F(0, 0, 40, 1, '#'); H.F(0, 15, 40, 3, '#');
  H.F(0, 1, 1, 14, '#'); H.F(39, 1, 1, 14, '#');
  H.F(18, 11, 5, 1, '#');
  H.exit('R', 12, 14, 's2', 2, 22);
  H.exit('L', 12, 14, 'v2', 41, 22);
  H.foe('escupidor', 10, 14); H.foe('escupidor', 27, 14);
  H.prop('urna', 33, 14);
});

_room('v2', 'verde', 44, 26, [8, 3, 5, 3], H => {
  H.F(0, 0, 44, 1, '#'); H.F(0, 23, 44, 3, '#');
  H.F(0, 1, 1, 22, '#'); H.F(43, 1, 1, 22, '#');
  H.F(30, 20, 5, 1, '#'); H.F(22, 17, 5, 1, '#'); H.F(14, 14, 5, 1, '#');
  H.F(6, 11, 5, 1, '#'); H.F(1, 8, 4, 1, '#');
  H.F(18, 23, 4, 3, '.');                        // pozo hacia v4
  H.exit('R', 20, 22, 'v1', 2, 14);
  H.exit('L', 5, 8, 'v3', 28, 13);
  H.exit('D', 18, 21, 'v4', 19, 1);
  H.prop('brasa', 38, 22);
  H.prop('estela', 33, 22, 'El musgo recuerda el agua. El agua recuerda a la Lumbre.\nNadie recuerda a los que cavaron.');
  H.foe('escupidor', 8, 22); H.foe('rastrero', 26, 22); H.foe('zumbon', 20, 12);
  H.prop('urna', 41, 22);
});

_room('v3', 'verde', 32, 18, [4, 3, 4, 2], H => {
  H.F(0, 0, 32, 1, '#'); H.F(0, 14, 32, 4, '#');
  H.F(0, 1, 1, 13, '#'); H.F(31, 1, 1, 13, '#');
  H.F(8, 12, 3, 1, '#'); H.F(14, 10, 4, 1, '#');
  H.exit('R', 11, 13, 'v2', 2, 7);
  H.prop('item', 15, 9, 'relic:musgo');
  H.prop('estela', 22, 13, 'Los canteros tallaron este sílex para un dios\nque nunca bajó a recogerlo.');
  H.foe('escupidor', 5, 13); H.foe('escupidor', 26, 13);
});

_room('v4', 'verde', 24, 30, [9, 6, 3, 4], H => {
  H.F(0, 0, 24, 1, '#'); H.F(0, 26, 24, 4, '#');
  H.F(0, 1, 1, 25, '#'); H.F(23, 1, 1, 25, '#');
  H.F(20, 2, 2, 1, '#');
  H.F(16, 4, 6, 1, '#'); H.F(9, 7, 5, 1, '#'); H.F(3, 10, 5, 1, '#');
  H.F(9, 13, 5, 1, '#'); H.F(15, 16, 5, 1, '#'); H.F(9, 19, 5, 1, '#');
  H.F(15, 22, 4, 1, '#'); H.F(9, 24, 4, 1, '#');
  H.F(22, 6, 1, 1, '^'); H.F(1, 12, 1, 1, '^'); H.F(22, 18, 1, 1, '^');
  H.exit('U', 18, 21, 'v2', 16, 22);
  H.exit('D', 5, 8, 'c1', 31, 1);
  H.prop('item', 12, 25, 'garra');
  H.foe('zumbon', 6, 5); H.foe('escupidor', 18, 25);
});

/* ============ CIUDAD ANEGADA ============ */

_room('c1', 'ciudad', 40, 18, [9, 10, 5, 2], H => {
  H.F(0, 0, 40, 1, '#'); H.F(0, 15, 40, 3, '#');
  H.F(0, 1, 1, 14, '#'); H.F(39, 1, 1, 14, '#');
  H.F(35, 12, 4, 1, '#'); H.F(29, 9, 5, 1, '#');
  H.F(35, 6, 4, 1, '#'); H.F(29, 3, 6, 1, '#');
  H.exit('U', 30, 33, 'v4', 4, 25);
  H.exit('R', 12, 14, 'c2', 2, 6);
  H.prop('estela', 8, 14, 'La ciudad no se ahogó en un día. El Regente abrió las compuertas\npara apagar lo que ardía. Después llovió para siempre.');
  H.foe('zumbon', 20, 8);
  H.prop('urna', 24, 14);
});

_room('c2', 'ciudad', 44, 30, [14, 10, 5, 4], H => {
  H.F(0, 0, 44, 1, '#'); H.F(0, 27, 44, 3, '#');
  H.F(0, 1, 1, 26, '#'); H.F(43, 1, 1, 26, '#');
  H.F(1, 7, 5, 1, '#');                          // repisa de entrada
  H.F(6, 20, 6, 7, '#');                          // torre 1
  H.F(18, 16, 6, 11, '#');                        // torre 2 (brasa arriba)
  H.F(30, 21, 6, 6, '#');                         // torre 3
  H.F(38, 13, 5, 1, '#');                         // repisa al Archivo
  H.F(25, 26, 4, 1, '^');
  H.exit('L', 4, 6, 'c1', 37, 14);
  H.exit('R', 12, 14, 'c3', 2, 13);
  H.exit('R', 24, 26, 'c4', 2, 16);
  H.prop('brasa', 20, 15);
  H.foe('acorazado', 14, 26); H.foe('zumbon', 27, 19); H.foe('zumbon', 10, 12);
  H.prop('urna', 40, 26);
});

_room('c3', 'ciudad', 32, 18, [19, 10, 4, 2], H => {
  H.F(0, 0, 32, 1, '#'); H.F(0, 14, 32, 4, '#');
  H.F(0, 1, 1, 13, '#'); H.F(31, 1, 1, 13, '#');
  H.F(22, 11, 4, 1, '#');
  H.exit('L', 11, 13, 'c2', 39, 12);
  H.prop('item', 23, 10, 'relic:piedra');
  H.prop('estela', 16, 13, 'El Archivo guardaba los nombres de todos los fuegos.\nEl agua los leyó primero.');
  H.prop('urna', 8, 13); H.prop('urna', 12, 13); H.prop('urna', 28, 13);
  H.foe('acorazado', 18, 13);
});

_room('c4', 'ciudad', 36, 20, [19, 13, 4, 2], H => {
  H.F(0, 0, 36, 1, '#'); H.F(0, 17, 36, 3, '#');
  H.F(0, 1, 1, 16, '#'); H.F(35, 1, 1, 16, '#');
  H.F(24, 8, 3, 9, '#');                          // pilar (gate: garra)
  H.F(30, 8, 5, 1, '#');
  H.exit('L', 14, 16, 'c2', 41, 26);
  H.exit('R', 5, 8, 'c5', 2, 7);
  H.prop('brasa', 8, 16);
  H.prop('estela', 14, 16, 'Tras la compuerta duerme el que ahogó la ciudad.\nNo bajes la Espina para hacer una reverencia.');
  H.foe('rastrero', 17, 16);
});

_room('c5', 'ciudad', 44, 20, [23, 13, 5, 2], H => {
  H.F(0, 0, 44, 1, '#'); H.F(0, 17, 44, 3, '#');
  H.F(0, 1, 1, 16, '#'); H.F(43, 1, 1, 16, '#');
  H.exit('L', 5, 8, 'c4', 31, 7);
  H.exit('R', 14, 16, 'h1', 2, 16);
  H.boss('regente', 30, 15);
  H.gate(1, 5, 1, 4); H.gate(42, 14, 1, 3);
});

/* ============ LA HONDURA ============ */

_room('h1', 'hondura', 40, 20, [23, 16, 5, 2], H => {
  H.F(0, 0, 40, 1, '#'); H.F(0, 17, 40, 3, '#');
  H.F(0, 1, 1, 16, '#'); H.F(39, 1, 1, 16, '#');
  H.F(16, 13, 4, 1, '#'); H.F(26, 11, 4, 1, '#');
  H.exit('L', 14, 16, 'c5', 40, 16);
  H.exit('R', 14, 16, 'h2', 2, 22);
  H.prop('estela', 6, 16, 'Baja la voz. La oscuridad de aquí abajo no está vacía:\nestá esperando.');
  H.foe('tejedora', 12, 1); H.foe('tejedora', 24, 1); H.foe('tejedora', 32, 1);
  H.prop('urna', 36, 16);
});

_room('h2', 'hondura', 44, 26, [17, 16, 5, 3], H => {
  H.F(0, 0, 44, 1, '#'); H.F(0, 23, 44, 3, '#');
  H.F(0, 1, 1, 22, '#'); H.F(43, 1, 1, 22, '#');
  H.F(28, 20, 4, 1, '#');
  H.F(20, 17, 6, 1, '#');
  H.F(14, 14, 4, 1, '#');
  H.F(28, 12, 6, 1, '#');                         // saliente (gate: alas)
  H.F(36, 10, 5, 1, '#');
  H.exit('L', 20, 22, 'h1', 36, 16);
  H.exit('R', 8, 10, 'h3', 2, 10);
  H.prop('brasa', 6, 22);
  H.prop('item', 15, 13, 'relic:iman');
  H.foe('tejedora', 18, 1); H.foe('tejedora', 30, 1); H.foe('acorazado', 26, 22);
  H.prop('urna', 40, 22);
});

_room('h3', 'hondura', 32, 18, [12, 17, 4, 2], H => {
  H.F(0, 0, 32, 1, '#'); H.F(0, 14, 32, 4, '#');
  H.F(0, 1, 1, 13, '#'); H.F(31, 1, 1, 13, '#');
  H.F(1, 11, 6, 1, '#');
  H.exit('L', 8, 10, 'h2', 38, 9);
  H.exit('R', 11, 13, 'h4', 2, 18);
  H.prop('brasa', 11, 13);
  H.prop('estela', 18, 13, 'La Lumbre no enloqueció por odio. Enloqueció por quedarse sola,\nalumbrando a nadie. Perdónala si puedes.');
});

_room('h4', 'hondura', 46, 22, [6, 16, 5, 3], H => {
  H.F(0, 0, 46, 1, '#'); H.F(0, 19, 46, 3, '#');
  H.F(0, 1, 1, 18, '#'); H.F(45, 1, 1, 18, '#');
  H.exit('L', 16, 18, 'h3', 28, 13);
  H.boss('lumbre', 30, 8);
  H.gate(1, 15, 1, 4);
});

const START = { room: 's1', tx: 4, ty: 14 };

/* PANGEA — sprites: pixel art procedimental horneado a canvas */
(function(){
const G = window.G;

// paleta global (cálida, tierra)
const PAL = {
  'k':'#16130e', // tinta
  'd':'#4a3421', // café oscuro
  'b':'#6e4e2c', // café
  't':'#a97d4b', // tan
  's':'#d9b98a', // arena
  'c':'#ecd9ac', // crema
  'F':'#24461f', // hoja oscura
  'G':'#2e5c33', // verde oscuro
  'g':'#4d8a3d', // verde
  'l':'#7ab648', // verde claro
  'x':'#5a5a52', // gris 1
  'X':'#8b8b7f', // gris 2
  'y':'#b5b2a2', // gris 3
  'r':'#b23a2e', // rojo
  'R':'#7e2a20', // rojo oscuro
  'a':'#e8a33d', // ámbar
  'A':'#c07f22', // ámbar oscuro
  'Y':'#e8d34d', // amarillo
  'u':'#3f6d8e', // azul
  'U':'#2b4d66', // azul oscuro
  'p':'#d8a37a', // piel
  'P':'#a8744c', // piel oscura
  'W':'#f2efe4', // blanco hueso
  'q':'#9fd0d8', // vidrio
  'o':'#e07b39', // naranja fuego
  'm':'#6b3fa0', // violeta (noche)
};

const baked = {};
const pending = [];
function bakeLater(key, rows, extra){ pending.push([key, rows, extra]); }
function bake(key, rows, extra){
  const h = rows.length, w = rows[0].length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const ch = rows[y][x];
    if (ch === '.' || ch === ' ') continue;
    const col = (extra && extra[ch]) || PAL[ch];
    if (!col) continue;
    ctx.fillStyle = col;
    ctx.fillRect(x,y,1,1);
  }
  baked[key] = cv;
  return cv;
}
G.sprite = key => baked[key];

// ---------- aldeanos: 8×8, 2 frames, color de ropa por rol ----------
const VILL_A = [
'..pppp..',
'..pppp..',
'.CCCCCC.',
'.CCCCCC.',
'..CCCC..',
'..CCCC..',
'..k..k..',
'..k..k..'];
const VILL_B = [
'..pppp..',
'..pppp..',
'.CCCCCC.',
'.CCCCCC.',
'..CCCC..',
'..CCCC..',
'.k....k.',
'.k....k.'];
G.ROLE_COLOR = {
  recolector:'#7ab648', lenador:'#8a6238', constructor:'#e8a33d',
  granjero:'#c9c94d', cazador:'#b25a3a', devoto:'#f2efe4',
  minero:'#8b8b7f', ocioso:'#b5a68c',
};
function bakeVillagers(){
  for (const role in G.ROLE_COLOR){
    bake('vill_'+role+'_a', VILL_A, {'C':G.ROLE_COLOR[role]});
    bake('vill_'+role+'_b', VILL_B, {'C':G.ROLE_COLOR[role]});
  }
}
G.villSprite = (role, frame) => baked['vill_'+(G.ROLE_COLOR[role]?role:'ocioso')+'_'+(frame?'b':'a')];

// ---------- venado 10×8 ----------
bakeLater('deer', [
'.......bb.',
'..bbbbbbb.',
'.bbbbbbbb.',
'.bbbbbbb..',
'..b....b..',
'..b....b..',
'..d....d..',
'..........'
]);

// ---------- árboles (por estación) ----------
const OAK = [
'....LLLL....',
'..LLLLLLLL..',
'.LLLMLLLMLL.',
'.LLLLLLLLLL.',
'.LMLLLLLLLL.',
'..LLLLMLLL..',
'...LLLLLL...',
'.....bb.....',
'.....bb.....',
'.....bb.....',
'....dbbd....'];
const PINE = [
'.....GG.....',
'....GGGG....',
'...GGGGGG...',
'....GGGG....',
'...GGGGGG...',
'..GGGGGGGG..',
'...GGGGGG...',
'..GGGGGGGG..',
'.GGGGGGGGGG.',
'.....bb.....',
'.....bb.....'];
const OAK_SEASON = [
  {L:'#4d8a3d', M:'#7ab648'},   // primavera
  {L:'#2e5c33', M:'#4d8a3d'},   // verano
  {L:'#c07f22', M:'#b23a2e'},   // otoño
  {L:'#8b8b7f', M:'#b5b2a2'},   // invierno (ramas grises)
];
const PINE_SEASON = [
  {G:'#2e5c33'}, {G:'#24461f'}, {G:'#2e5c33'}, {G:'#3d5c48'},
];
function bakeTrees(){
  for (let s=0;s<4;s++){
    bake('oak_'+s, OAK, OAK_SEASON[s]);
    bake('pine_'+s, PINE, PINE_SEASON[s]);
  }
  bake('tree_burnt', OAK.map(r=>r.replace(/[LM]/g,'k').replace(/b/g,'d')), {});
}
G.treeSprite = (type, season, burnt) => burnt ? baked['tree_burnt'] : baked[(type?'pine_':'oak_')+season];

// ---------- arbusto de bayas ----------
bakeLater('bush_full', [
'..GGGG..',
'.GGrGGG.',
'.GGGGrG.',
'.GrGGGG.',
'..GGGG..',
'...d....']);
bakeLater('bush_empty', [
'........',
'..GGGG..',
'.GGGGGG.',
'..GGGG..',
'...d....',
'........']);

// ---------- roca ----------
bakeLater('rock', [
'...XX...',
'..XXXX..',
'.XXxXXX.',
'.XxxXXy.',
'.XXXXXX.',
'........']);

// ---------- cultivos 6×8, 4 etapas ----------
bakeLater('crop_0', ['......','......','......','......','......','..g...','......','......']);
bakeLater('crop_1', ['......','......','......','..g...','..g...','.ggg..','......','......']);
bakeLater('crop_2', ['......','..l...','.lgl..','..g...','.ggg..','..g...','......','......']);
bakeLater('crop_3', ['..Y...','.YlY..','.lYl..','..g...','.ggg..','..g...','......','......']);

// ---------- edificios ----------
// tienda (era piedra) 16×14
bakeLater('tienda', [
'................',
'.......tt.......',
'......tsst......',
'.....tsssst.....',
'....tsssssst....',
'...tsssssssst...',
'..tssstddtssst..',
'..tsstddddtsst..',
'.tssstddddtssst.',
'.tsstdddddDtsst.',
'tssstddddddtssst',
'tsstdddddddDtsst',
'dddddddddddddddd',
'................'], {D:'#2b2016'});

// fogata 8×8 (2 frames)
bakeLater('fogata_a', [
'........','...o....','..oYo...','..oYo...','.ooYoo..','.dxxxd..','.d...d..','........']);
bakeLater('fogata_b', [
'...o....','..oo....','..YoY...','.ooYoo..','..oYo...','.dxxxd..','.d...d..','........']);
bakeLater('fogata_off', [
'........','........','........','........','........','.dxxxd..','.d...d..','........']);

// cabaña agrícola 16×14
bakeLater('cabana', [
'................',
'......gggg......',
'....gggggggg....',
'..gggggggggggg..',
'.gggggggggggggg.',
'.bbbbbbbbbbbbbb.',
'.btttttttttttdb.',
'.bttttttttttddb.',
'.bttdddttttttdb.',
'.bttdkkdtttttdb.',
'.bttdkkdtttttdb.',
'.bttdddttttttdb.',
'.bbbbbbbbbbbbbb.',
'................']);

// casa de madera (bronce) 16×15
bakeLater('casa_madera', [
'................',
'.....dddddd.....',
'...dddddddddd...',
'..dddddddddddd..',
'.dddddddddddddd.',
'.tttttttttttttt.',
'.tbbtbbtbbtbbtt.',
'.tttttttttttttt.',
'.ttccttttttddtt.',
'.ttccttttttdktt.',
'.ttccttttttdktt.',
'.ttttttttttddtt.',
'.tttttttttttttt.',
'.dddddddddddddd.',
'................']);

// casa de hierro 16×15
bakeLater('casa_hierro', [
'................',
'.....xxxxxx.....',
'...xxxxxxxxxx...',
'..xxxxxxxxxxxx..',
'.xxxxxxxxxxxxxx.',
'.tttttttttttttt.',
'.ttccttccttddtt.',
'.ttccttccttdktt.',
'.tttttttttтdktt.'.replace('т','t'),
'.ttttttttttddtt.',
'.tbbtbbtbbtbbtt.',
'.tttttttttttttt.',
'.dddddddddddddd.',
'................',
'................']);

// casa de piedra medieval 16×16
bakeLater('casa_piedra', [
'.......rr.......',
'.....rrRRrr.....',
'...rrRRrrRRrr...',
'..rrRRrrRRrrRR..',
'.rrRRrrRRrrRRrr.',
'.XXXXXXXXXXXXXX.',
'.XyyXXqqXXqqXyX.',
'.XyyXXqqXXqqXyX.',
'.XXXXXXXXXXXXXX.',
'.XXXXXXXXXXddXX.',
'.XqqXXqqXXXdkXX.',
'.XqqXXqqXXXdkXX.',
'.XXXXXXXXXXddXX.',
'.XXXXXXXXXXXXXX.',
'.xxxxxxxxxxxxxx.',
'................']);

// casa de ladrillo industrial 16×18
bakeLater('casa_ladrillo', [
'..xx............',
'..xx............',
'.dddddddddddddd.',
'.rRrrRrrRrrRrrR.',
'.rrRrrRrrRrrRrr.',
'.rqqrrqqrrqqrrr.',
'.rqqrrqqrrqqrrr.',
'.rRrrRrrRrrRrrR.',
'.rrRrrRrrRrrRrr.',
'.rqqrrqqrrqqrrr.',
'.rqqrrqqrrqqrrr.',
'.rRrrRrrRrrRrrR.',
'.rrRrrRrrRrdddr.',
'.rRrrRrrRrrdkdr.',
'.rrRrrRrrRrdkdr.',
'.rRrrRrrRrrdddr.',
'.xxxxxxxxxxxxxx.',
'................']);

// edificio moderno 16×22
bakeLater('edificio', [
'................',
'.XXXXXXXXXXXXXX.',
'.XyyyyyyyyyyyyX.',
'.XqqXqqXqqXqqXX.',
'.XqqXqqXqqXqqXX.',
'.XXXXXXXXXXXXXX.',
'.XqqXqqXqqXqqXX.',
'.XqqXqqXqqXqqXX.',
'.XXXXXXXXXXXXXX.',
'.XqqXqqXqqXqqXX.',
'.XqqXqqXqqXqqXX.',
'.XXXXXXXXXXXXXX.',
'.XqqXqqXqqXqqXX.',
'.XqqXqqXqqXqqXX.',
'.XXXXXXXXXXXXXX.',
'.XqqXqqXqqXqqXX.',
'.XqqXqqXqqXqqXX.',
'.XXXXXXXXXXXXXX.',
'.XqqXXXddXXXqqX.',
'.XqqXXXdkXXXqqX.',
'.XXXXXXXXXXXXXX.',
'.xxxxxxxxxxxxxx.']);

// torre espacial 16×26
bakeLater('torre', [
'.......aa.......',
'......Wqqw......'.replace('w','W'),
'.....WqqqqW.....',
'.....WqqqqW.....',
'....WWWWWWWW....',
'....WqqWWqqW....',
'....WqqWWqqW....',
'....WWWWWWWW....',
'....WqqWWqqW....',
'....WqqWWqqW....',
'....WWWWWWWW....',
'....WqqWWqqW....',
'....WqqWWqqW....',
'....WWWWWWWW....',
'....WqqWWqqW....',
'....WqqWWqqW....',
'....WWWWWWWW....',
'....WqqWWqqW....',
'....WqqWWqqW....',
'....WWWWWWWW....',
'...WWqqWWqqWW...',
'...WWqqWWqqWW...',
'...WWWWddWWWW...',
'...WWWWdkWWWW...',
'...WWWWWWWWWW...',
'...xxxxxxxxxx...']);

// granero 16×15
bakeLater('granero', [
'................',
'......aAAa......',
'....aAAAAAAa....',
'..aAAAAAAAAAAa..',
'.AAAAAAAAAAAAAA.',
'.rRrrrrrrrrrrRr.',
'.rrrrrrrrrrrrrr.',
'.rrWWrrrrrrWWrr.',
'.rrWWrrddrrWWrr.',
'.rrrrrdddDrrrrr.'.replace('D','d'),
'.rrrrrddddrrrrr.',
'.rrrrrdkkdrrrrr.',
'.rrrrrdkkdrrrrr.',
'.dddddddddddddd.',
'................']);

// santuario 16×15
bakeLater('santuario', [
'.......aa.......',
'......aYYa......',
'.......aa.......',
'....XXXXXXXX....',
'...XXXXXXXXXX...',
'...XX......XX...',
'...XX......XX...',
'...XX......XX...',
'...XX......XX...',
'...XX......XX...',
'..XXXX....XXXX..',
'..XXXXXXXXXXXX..',
'.XXXXXXXXXXXXXX.',
'.xxxxxxxxxxxxxx.',
'................']);

// herrería 16×15
bakeLater('herreria', [
'..xx............',
'..xx............',
'.dddddddddddddd.',
'.xxxxxxxxxxxxxx.',
'.xXXXXXXXXXXXXx.',
'.xXXooXXXXXXXXx.',
'.xXooooXXXddXXx.',
'.xXXooXXXXXdkXx.',
'.xXXXXXXXXXdkXx.',
'.xXXXXXXXXXddXx.',
'.xXXXXXXXXXXXXx.',
'.xxxxxxxxxxxxxx.',
'.dddddddddddddd.',
'................',
'................']);

// templo 32×22 (2×2)
bakeLater('templo', [
'...............aa...............',
'..............aYYa..............',
'...............aa...............',
'..........WWWWWWWWWWWW..........',
'........WWWWWWWWWWWWWWWW........',
'......WWWWWWWWWWWWWWWWWWWW......',
'....WWWWWWWWWWWWWWWWWWWWWWWW....',
'...WWWWWWWWWWWWWWWWWWWWWWWWWW...',
'...yyyyyyyyyyyyyyyyyyyyyyyyyy...',
'...WW..WW..WW..WW..WW..WW..WW...',
'...WW..WW..WW..WW..WW..WW..WW...',
'...WW..WW..WW..WW..WW..WW..WW...',
'...WW..WW..WW..WW..WW..WW..WW...',
'...WW..WW..WW..WW..WW..WW..WW...',
'...WW..WW..WW..WW..WW..WW..WW...',
'...yyyyyyyyyyyyyyyyyyyyyyyyyy...',
'..WWWWWWWWWWWWWWWWWWWWWWWWWWWW..',
'..yyyyyyyyyyyyyyyyyyyyyyyyyyyy..',
'.WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.',
'.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
'................................',
'................................']);

// fábrica 32×20 (2×2)
bakeLater('fabrica', [
'...xx......xx...................',
'...xx......xx...................',
'...xx......xx...................',
'.dddddddddddddddddddddddddddddd.',
'.rRrrRrrRrrRrrRrrRrrRrrRrrRrrRr.',
'.rrRrrRrrRrrRrrRrrRrrRrrRrrRrrR.',
'.rqqqrrqqqrrqqqrrqqqrrqqqrrqqqr.',
'.rqqqrrqqqrrqqqrrqqqrrqqqrrqqqr.',
'.rRrrRrrRrrRrrRrrRrrRrrRrrRrrRr.',
'.rrRrrRrrRrrRrrRrrRrrRrrRrrRrrR.',
'.rqqqrrqqqrrqqqrrqqqrrqqqrrqqqr.',
'.rqqqrrqqqrrqqqrrqqqrrqqqrrqqqr.',
'.rRrrRrrRrrRrrRrrRrrRrrRrrRrrRr.',
'.rrRrrRrrRrrRrrddddrrRrrRrrRrrR.',
'.rRrrRrrRrrRrrRdkkdRrrRrrRrrRrr.',
'.rrRrrRrrRrrRrrdkkdrRrrRrrRrrRr.',
'.rRrrRrrRrrRrrRddddRrrRrrRrrRrr.',
'.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
'................................',
'................................']);

// planta de energía 16×16
bakeLater('planta', [
'....yy....yy....',
'...yXXy..yXXy...',
'...yXXy..yXXy...',
'...yXXy..yXXy...',
'..yXXXXyyXXXXy..',
'..yXXXXyyXXXXy..',
'.yXXXXXXXXXXXXy.',
'.XXXXXXXXXXXXXX.',
'.XXXXXXXXXXXXXX.',
'.XXaYaXXXXXddXX.',
'.XXYaYXXXXXdkXX.',
'.XXaYaXXXXXdkXX.',
'.XXXXXXXXXXddXX.',
'.XXXXXXXXXXXXXX.',
'.xxxxxxxxxxxxxx.',
'................']);

// plataforma de lanzamiento 32×14 (2×2, el cohete se dibuja aparte)
bakeLater('plataforma', [
'................................',
'.xx..........................xx',
'.xx..........................xx',
'.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
'.xXXXXXXXXXXXXXXXXXXXXXXXXXXXXx',
'.xXyyXXyyXXyyXXyyXXyyXXyyXXyyXx',
'.xXXXXXXXXXXXXXXXXXXXXXXXXXXXXx',
'.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
'..XXXXXXXXXXXXXXXXXXXXXXXXXXXX.',
'..XaXXXXXXXXXXXXXXXXXXXXXXXXaX.',
'..XXXXXXXXXXXXXXXXXXXXXXXXXXXX.',
'.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.'.slice(0,32),
'.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
'................................']);

// cohete 12×34
bakeLater('cohete', [
'.....WW.....',
'....WWWW....',
'....WWWW....',
'...WWWWWW...',
'...WWWWWW...',
'...WWrrWW...',
'...WWrrWW...',
'...WWWWWW...',
'...WqqqqW...',
'...WqqqqW...',
'...WWWWWW...',
'...WWWWWW...',
'...WWWWWW...',
'...WWWWWW...',
'...WWrrWW...',
'...WWrrWW...',
'...WWWWWW...',
'...WWWWWW...',
'...WWWWWW...',
'...WWWWWW...',
'...WWWWWW...',
'...WWWWWW...',
'..WWWWWWWW..',
'..WWWWWWWW..',
'..WWWWWWWW..',
'.rWWWWWWWWr.',
'.rrWWWWWWrr.',
'.rrWWWWWWrr.',
'.rrrWWWWrrr.',
'.rr.WWWW.rr.',
'.r..xxxx..r.',
'....xxxx....',
'....x..x....',
'............']);

// sitio en construcción 16×10
bakeLater('obra', [
'................',
'.b..b..b..b..b..',
'.bbbbbbbbbbbbbb.',
'.b..b..b..b..b..',
'.b..b..b..b..b..',
'.bbbbbbbbbbbbbb.',
'.b..b..b..b..b..',
'.dddddddddddddd.',
'................',
'................']);

G.bakeSprites = function(){
  for (const [key, rows, extra] of pending) bake(key, rows, extra);
  bakeVillagers();
  bakeTrees();
};
})();

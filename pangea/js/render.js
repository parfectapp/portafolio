/* PANGEA — render: cámara, mundo, partículas, noche, clima, lanzamiento */
(function(){
const G = window.G;
const T = G.T;

const R = G.render = {};
let cv, ctx, nightCv, nightCtx;
let shake = 0, shakeX = 0, shakeY = 0;
const fx = [];       // partículas en espacio mundo
const floats = [];   // textos flotantes
let smokeT = 0, introT = 0, intro = null;

R.cam = { x: 0, y: 0, z: 2 };

R.init = function(canvas){
  cv = canvas;
  ctx = cv.getContext('2d');
  nightCv = document.createElement('canvas');
  nightCtx = nightCv.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  const c = G.S.center;
  R.cam.x = (c.x+0.5)*G.TILE; R.cam.y = (c.y+0.5)*G.TILE;
  intro = { t: 0, fromZ: 0.7, toZ: 2.4 };
  R.cam.z = 0.7;

  G.on('shake', n => { shake = Math.max(shake, n); });
  G.on('fx', spawnFx);
  G.on('float', f => floats.push({ ...f, t: 0 }));
};

function resize(){
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  nightCv.width = cv.width; nightCv.height = cv.height;
  ctx.imageSmoothingEnabled = false;
}

function spawnFx(e){
  switch (e.type){
    case 'sparkleburst':
      for (let i=0;i<(e.n||12);i++){
        const a = G.rand()*Math.PI*2, s = 12+G.rand()*30;
        fx.push({ k:'spark', x:e.x, y:e.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-14, t:0, life:0.7+G.rand()*0.5, c:'#e8d34d' });
      }
      break;
    case 'spark':
      fx.push({ k:'spark', x:e.x, y:e.y, vx:(G.rand()-0.5)*8, vy:-12-G.rand()*8, t:0, life:0.9, c:'#ecd9ac' });
      break;
    case 'chips':
      for (let i=0;i<5;i++)
        fx.push({ k:'spark', x:e.x, y:e.y, vx:(G.rand()-0.5)*36, vy:-20-G.rand()*20, t:0, life:0.5, c:'#a97d4b', g:80 });
      break;
    case 'puff':
      for (let i=0;i<7;i++)
        fx.push({ k:'smoke', x:e.x+(G.rand()-0.5)*6, y:e.y-(G.rand()*6), vx:(G.rand()-0.5)*6, vy:-8-G.rand()*6, t:0, life:1.2, r:2+G.rand()*2, c:'rgba(200,196,180,' });
      break;
    case 'lightning':
      fx.push({ k:'bolt', x:e.x, y:e.y, t:0, life:0.35, seed:G.rand()*99 });
      break;
    case 'blessring':
      fx.push({ k:'ring', x:e.x, y:e.y, t:0, life:1.1, r:e.r||48, c:'#e8a33d' });
      break;
    case 'meteor':
      fx.push({ k:'meteor', x:e.x, y:e.y, t:0, life:0.9, r:e.r||64 });
      break;
  }
}

// ---------- dibujo principal ----------
R.draw = function(dt){
  const S = G.S;
  if (!S) return;
  const tm = G.time();
  const W = cv.width, H = cv.height;
  const cam = R.cam;

  // intro cinematográfica
  if (intro){
    intro.t += dt;
    const k = Math.min(1, intro.t/3.2);
    const e = 1 - Math.pow(1-k, 3);
    cam.z = G.lerp(intro.fromZ, intro.toZ, e);
    if (k >= 1) intro = null;
  }
  // lanzamiento: la cámara busca la plataforma
  if (S.launch && !S.victory){
    const p = S.buildings.find(b=>b.type==='plataforma');
    if (p){
      cam.x = G.lerp(cam.x, (p.x+1)*G.TILE, dt*2);
      cam.y = G.lerp(cam.y, (p.y+1)*G.TILE - Math.max(0, (S.launch.t-3))*20, dt*2);
      if (S.launch.t < 3) shake = Math.max(shake, 2);
    }
  }

  if (shake > 0){
    shake = Math.max(0, shake - dt*14);
    shakeX = (G.rand()-0.5)*shake*2; shakeY = (G.rand()-0.5)*shake*2;
  } else { shakeX = shakeY = 0; }

  if (G.terrainDirty){ G.terrainDirty = false; G.world.bake(tm.season); }

  ctx.fillStyle = '#101410';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(W/2 + shakeX, H/2 + shakeY);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
  ctx.imageSmoothingEnabled = false;

  // terreno
  ctx.drawImage(G.world.canvas, 0, 0);

  // límites visibles en mundo
  const vx0 = cam.x - W/2/cam.z - 40, vx1 = cam.x + W/2/cam.z + 40;
  const vy0 = cam.y - H/2/cam.z - 40, vy1 = cam.y + H/2/cam.z + 40;
  const vis = (x,y) => x>vx0 && x<vx1 && y>vy0 && y<vy1;

  // cultivos sobre el suelo
  for (const b of S.buildings){
    if (b.type !== 'campo' || !b.built || !b.field) continue;
    const px = b.x*G.TILE, py = b.y*G.TILE;
    if (!vis(px, py)) continue;
    let stage = 0;
    if (b.field.state === 'grow') stage = b.field.p < 0.5 ? 1 : 2;
    else if (b.field.state === 'ready') stage = 3;
    const spr = G.sprite('crop_'+stage);
    if (b.field.state !== 'fallow' || stage > 0)
      for (let i=0;i<4;i++){
        ctx.drawImage(spr, px + (i%2)*16 + 5, py + ((i/2)|0)*16 + 4);
      }
  }

  // lista de dibujables ordenada por y
  const items = [];
  for (const tr of S.trees) if (tr.alive && vis(tr.x*G.TILE, tr.y*G.TILE)) items.push({ y:(tr.y+1)*G.TILE, k:'tree', o:tr });
  for (const bu of S.bushes) if (vis(bu.x*G.TILE, bu.y*G.TILE)) items.push({ y:(bu.y+0.9)*G.TILE, k:'bush', o:bu });
  for (const rk of S.rocks) if (vis(rk.x*G.TILE, rk.y*G.TILE)) items.push({ y:(rk.y+0.9)*G.TILE, k:'rock', o:rk });
  for (const b of S.buildings) if (b.type!=='campo' && vis((b.x+b.w/2)*G.TILE, (b.y+b.h/2)*G.TILE)) items.push({ y:(b.y+b.h)*G.TILE, k:'bld', o:b });
  for (const v of S.villagers) if (vis(v.x, v.y)) items.push({ y:v.y, k:'vill', o:v });
  for (const d of S.deer) if (vis(d.x, d.y)) items.push({ y:d.y, k:'deer', o:d });
  items.sort((a,b)=>a.y-b.y);

  const season = tm.season;
  for (const it of items){
    const o = it.o;
    if (it.k === 'tree'){
      const spr = G.treeSprite(o.type, season, false);
      const px = o.x*G.TILE + (G.TILE-spr.width)/2, py = (o.y+1)*G.TILE - spr.height;
      ctx.drawImage(spr, px, py);
      if (o.burn > 0){
        ctx.fillStyle = G.rand()<0.5 ? '#e07b39' : '#e8d34d';
        for (let i=0;i<4;i++)
          ctx.fillRect(px + 2 + G.rand()*(spr.width-4), py + G.rand()*spr.height*0.7, 2, 2);
        if (G.rand() < dt*8) spawnFx({ type:'puff', x:o.x*G.TILE+8, y:py });
      }
    }
    else if (it.k === 'bush') ctx.drawImage(G.sprite(o.food>0?'bush_full':'bush_empty'), o.x*G.TILE+4, o.y*G.TILE+4);
    else if (it.k === 'rock') ctx.drawImage(G.sprite('rock'), o.x*G.TILE+4, o.y*G.TILE+5);
    else if (it.k === 'deer') ctx.drawImage(G.sprite('deer'), o.x-5, o.y-6);
    else if (it.k === 'vill'){
      const spr = G.villSprite(o.role, ((o.ft|0)%2));
      ctx.drawImage(spr, o.x-4, o.y-7);
    }
    else if (it.k === 'bld') drawBuilding(o, tm);
  }

  drawFx(dt);
  drawFloats(dt);

  // anillo del cursor con poder seleccionado
  if (G.ui && G.ui.cursor){
    const c = G.ui.cursor;
    ctx.strokeStyle = 'rgba(232,163,61,0.85)';
    ctx.lineWidth = 1.5/cam.z;
    ctx.beginPath();
    ctx.arc((c.tx+0.5)*G.TILE, (c.ty+0.5)*G.TILE, Math.max(6, c.r*G.TILE), 0, Math.PI*2);
    ctx.stroke();
  }

  ctx.restore();

  drawNight(tm, W, H);
  drawWeather(dt, tm, W, H);

  // humo de chimeneas
  smokeT -= dt;
  if (smokeT <= 0){
    smokeT = 0.5;
    for (const b of S.buildings){
      if (!b.built) continue;
      const px = (b.x+b.w/2)*G.TILE, py = b.y*G.TILE;
      if (!vis(px, py)) continue;
      if (b.type === 'fogata') spawnFx({ type:'puff', x:px, y:py-4 });
      else if ((b.type==='fabrica' || b.type==='herreria' || b.type==='casa_ladrillo') && G.rand()<0.8)
        spawnFx({ type:'puff', x:b.x*G.TILE+4, y:py-14 });
      else if (b.type==='casa' && G.S.era>=5 && G.rand()<0.2)
        spawnFx({ type:'puff', x:px, y:py-8 });
    }
  }
};

function drawBuilding(b, tm){
  const bt = G.BTYPES[b.type];
  const S = G.S;
  if (b.type === 'cohete' && b.built) return; // el cohete construido lo dibuja la plataforma
  if (!b.built){
    if (b.type !== 'cohete'){
      const spr = G.sprite('obra');
      ctx.drawImage(spr, b.x*G.TILE + (b.w*G.TILE-spr.width)/2, (b.y+b.h)*G.TILE - spr.height);
    }
    // barra de progreso
    const px = b.x*G.TILE, pw = Math.max(16, b.w*G.TILE);
    ctx.fillStyle = 'rgba(22,19,14,0.8)';
    ctx.fillRect(px, (b.y+b.h)*G.TILE + 2, pw, 3);
    ctx.fillStyle = '#e8a33d';
    ctx.fillRect(px, (b.y+b.h)*G.TILE + 2, pw*b.progress, 3);
    if (b.type === 'cohete') drawRocket(b, Math.min(1, b.progress*1.05), 0);
    return;
  }
  let key = b.type;
  if (b.type === 'casa') key = G.ERAS[S.era].house === 'tienda' ? 'cabana' : G.ERAS[S.era].house;
  if (b.type === 'fogata') key = (G.S.t*3|0)%2 ? 'fogata_a' : 'fogata_b';
  const spr = G.sprite(key);
  if (!spr) return;
  ctx.drawImage(spr, b.x*G.TILE + (b.w*G.TILE - spr.width)/2, (b.y+b.h)*G.TILE - spr.height);
  if (b.type === 'cohete') return;
  if (b.type === 'plataforma'){
    const rocket = S.buildings.find(x=>x.type==='cohete');
    if (rocket && rocket.built && !S.rocketGone){
      const t = S.launch ? S.launch.t : 0;
      const rise = t > 3 ? Math.pow(t-3, 2.2)*26 : 0;
      drawRocket(b, 1, rise);
      if (S.launch){
        // escape del cohete
        for (let i=0;i<3;i++)
          fx.push({ k:'smoke', x:(b.x+1)*G.TILE+(G.rand()-0.5)*8, y:(b.y+0.6)*G.TILE-rise+30, vx:(G.rand()-0.5)*30, vy:20+G.rand()*30, t:0, life:1.0, r:3+G.rand()*3, c: G.rand()<0.4?'rgba(224,123,57,':'rgba(220,216,200,' });
      }
    }
  }
}

function drawRocket(b, prog, rise){
  const spr = G.sprite('cohete');
  const h = Math.max(1, (spr.height*prog)|0);
  const px = b.x*G.TILE + (2*G.TILE - spr.width)/2;
  const baseY = (b.y+1.55)*G.TILE - rise;
  ctx.drawImage(spr, 0, spr.height-h, spr.width, h, px, baseY-h, spr.width, h);
}

function drawFx(dt){
  for (let i=fx.length-1;i>=0;i--){
    const p = fx[i];
    p.t += dt;
    if (p.t >= p.life){ fx.splice(i,1); continue; }
    const k = p.t/p.life;
    if (p.k === 'spark'){
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += (p.g||30)*dt;
      ctx.fillStyle = p.c;
      ctx.globalAlpha = 1-k;
      ctx.fillRect(p.x, p.y, 1.6, 1.6);
      ctx.globalAlpha = 1;
    } else if (p.k === 'smoke'){
      p.x += p.vx*dt; p.y += p.vy*dt;
      ctx.fillStyle = p.c + (0.35*(1-k)) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r*(0.6+k), 0, Math.PI*2);
      ctx.fill();
    } else if (p.k === 'bolt'){
      ctx.strokeStyle = 'rgba(240,244,255,'+(1-k)+')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      let x = p.x, y = p.y - 260;
      ctx.moveTo(x, y);
      let sd = p.seed;
      while (y < p.y){
        sd = (sd*16807)%2147483647;
        x = p.x + ((sd%100)/100-0.5)*26*(1-(y-(p.y-260))/260+0.2);
        y += 22;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,240,'+(0.5*(1-k))+')';
      ctx.beginPath(); ctx.arc(p.x, p.y, 10*(1-k)+3, 0, Math.PI*2); ctx.fill();
    } else if (p.k === 'ring'){
      ctx.strokeStyle = 'rgba(232,163,61,'+(1-k)+')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r*k+4, 0, Math.PI*2); ctx.stroke();
    } else if (p.k === 'meteor'){
      const fall = 1-k;
      const mx = p.x + fall*220, my = p.y - fall*440;
      ctx.fillStyle = '#e07b39';
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5a5a52';
      ctx.beginPath(); ctx.arc(mx-1, my-1, 3.5, 0, Math.PI*2); ctx.fill();
      if (G.rand()<0.9) fx.push({ k:'spark', x:mx, y:my, vx:(G.rand()-0.5)*20, vy:(G.rand())*10, t:0, life:0.4, c:'#e8a33d' });
      if (p.t+dt >= p.life){
        for (let j=0;j<26;j++){
          const a = G.rand()*Math.PI*2, s = 30+G.rand()*70;
          fx.push({ k:'spark', x:p.x, y:p.y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-20, t:0, life:0.8, c: G.rand()<0.5?'#e07b39':'#e8d34d', g:120 });
        }
        for (let j=0;j<10;j++)
          fx.push({ k:'smoke', x:p.x+(G.rand()-0.5)*16, y:p.y-(G.rand())*8, vx:(G.rand()-0.5)*14, vy:-10-G.rand()*14, t:0, life:2, r:4+G.rand()*4, c:'rgba(90,90,82,' });
      }
    }
  }
}

function drawFloats(dt){
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  for (let i=floats.length-1;i>=0;i--){
    const f = floats[i];
    f.t += dt;
    if (f.t > 1.6){ floats.splice(i,1); continue; }
    ctx.globalAlpha = 1 - f.t/1.6;
    ctx.fillStyle = f.color || '#f2efe4';
    ctx.fillText(f.text, f.x, f.y - 10 - f.t*12);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

function drawNight(tm, W, H){
  const f = tm.dayFrac;
  let dark = 0;
  if (f > 0.75) dark = Math.min(1, (f-0.75)/0.12);
  else if (f < 0.20) dark = Math.min(1, (0.20-f)/0.12);
  dark *= 0.68;
  if (dark <= 0.01) return;

  nightCtx.clearRect(0, 0, W, H);
  nightCtx.fillStyle = 'rgba(10,14,30,'+dark+')';
  nightCtx.fillRect(0, 0, W, H);

  // luces: fogata + ventanas según la era
  const cam = R.cam, S = G.S;
  nightCtx.globalCompositeOperation = 'destination-out';
  for (const b of S.buildings){
    if (!b.built) continue;
    let r = 0;
    if (b.type === 'fogata') r = 46;
    else if (S.era >= 1 && (b.type==='casa'||b.type==='tienda')) r = 20;
    else if (b.type === 'planta' || b.type === 'fabrica') r = 40;
    else if (b.type === 'plataforma') r = 44;
    else if (b.type === 'templo' || b.type === 'santuario') r = 26;
    if (!r) continue;
    const sx = ((b.x+b.w/2)*G.TILE - cam.x)*cam.z + W/2;
    const sy = ((b.y+b.h/2)*G.TILE - cam.y)*cam.z + H/2;
    if (sx < -100 || sy < -100 || sx > W+100 || sy > H+100) continue;
    const rad = r*cam.z;
    const gr = nightCtx.createRadialGradient(sx, sy, 0, sx, sy, rad);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    nightCtx.fillStyle = gr;
    nightCtx.beginPath(); nightCtx.arc(sx, sy, rad, 0, Math.PI*2); nightCtx.fill();
  }
  nightCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(nightCv, 0, 0);
}

let rainDrops = null, snowFlakes = null;
function drawWeather(dt, tm, W, H){
  const S = G.S;
  if (S.rainT > 0){
    if (!rainDrops){ rainDrops = []; for (let i=0;i<120;i++) rainDrops.push({ x:Math.random()*W, y:Math.random()*H, s:300+Math.random()*200 }); }
    ctx.strokeStyle = 'rgba(159,208,216,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of rainDrops){
      d.y += d.s*dt; d.x -= d.s*dt*0.18;
      if (d.y > H){ d.y = -8; d.x = Math.random()*(W+80); }
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x+3, d.y+11);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(30,40,60,0.10)';
    ctx.fillRect(0,0,W,H);
  }
  if (tm.season === 3){
    if (!snowFlakes){ snowFlakes = []; for (let i=0;i<90;i++) snowFlakes.push({ x:Math.random()*W, y:Math.random()*H, s:26+Math.random()*30, w:Math.random()*99 }); }
    ctx.fillStyle = 'rgba(242,239,228,0.75)';
    for (const f of snowFlakes){
      f.y += f.s*dt; f.w += dt;
      f.x += Math.sin(f.w*1.4)*0.5;
      if (f.y > H){ f.y = -4; f.x = Math.random()*W; }
      ctx.fillRect(f.x, f.y, 2, 2);
    }
  }
}

// minimapa
R.mini = function(mcv){
  const mctx = mcv.getContext('2d');
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(G.world.mini, 0, 0, mcv.width, mcv.height);
  const sc = mcv.width/G.W;
  mctx.fillStyle = '#f2efe4';
  for (const v of G.S.villagers) mctx.fillRect(v.x/G.TILE*sc, v.y/G.TILE*sc, 1.5, 1.5);
  mctx.fillStyle = '#e8a33d';
  for (const b of G.S.buildings) if (b.built) mctx.fillRect(b.x*sc, b.y*sc, Math.max(2,b.w*sc), Math.max(2,b.h*sc));
  // encuadre de cámara
  const cam = R.cam;
  const vw = cv.width/cam.z/G.TILE*sc, vh = cv.height/cam.z/G.TILE*sc;
  mctx.strokeStyle = 'rgba(242,239,228,0.7)';
  mctx.lineWidth = 1;
  mctx.strokeRect(cam.x/G.TILE*sc - vw/2, cam.y/G.TILE*sc - vh/2, vw, vh);
};
})();

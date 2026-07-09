/* PANGEA — poderes divinos */
(function(){
const G = window.G;
const T = G.T;

G.POWERS = [
  { id:'lluvia',      name:'Lluvia',       cost:30,  r:0, key:'1', desc:'Riega el mundo: los cultivos crecen ×1.6 un rato y apaga incendios.' },
  { id:'sol',         name:'Sol',          cost:25,  r:0, key:'2', desc:'Despeja el cielo: crecimiento ×1.4 mientras dura.' },
  { id:'rayo',        name:'Rayo',         cost:25,  r:1, key:'3', desc:'Golpe del cielo: incendia árboles y aterroriza (la fe crece con el temor).' },
  { id:'bendicion',   name:'Bendición',    cost:60,  r:4, key:'4', desc:'Fertilidad: más nacimientos y cosechas ×2 durante un día.' },
  { id:'bosque',      name:'Bosque',       cost:35,  r:3, key:'5', desc:'Brotan árboles nuevos donde señales.' },
  { id:'terraformar', name:'Terraformar',  cost:40,  r:1, key:'6', desc:'Levanta tierra del mar (agua→arena→pasto). Con Shift, húndela.' },
  { id:'inspiracion', name:'Inspiración',  cost:80,  r:0, key:'7', desc:'Un destello de genio: +60 de saber al instante.' },
  { id:'meteorito',   name:'Meteorito',    cost:120, r:4, key:'8', desc:'Castigo divino: destrucción y un cráter humeante.' },
];

G.castPower = function(id, tx, ty, alt){
  const S = G.S;
  const P = G.POWERS.find(p=>p.id===id);
  if (!P || !S) return false;
  if (S.faith < P.cost) { G.emit('notify', { text:'Fe insuficiente para ' + P.name, cls:'warn' }); return false; }
  S.faith -= P.cost;
  S.stats.faithSpent += P.cost;

  switch (id){
    case 'lluvia':
      S.rainT = 30; S.sunT = 0;
      for (const tr of S.trees) tr.burn = 0;
      G.emit('sfx', 'rain');
      break;

    case 'sol':
      S.sunT = 30; S.rainT = 0;
      G.emit('fx', { type:'sparkleburst', x:tx*G.TILE, y:ty*G.TILE, n:10 });
      G.emit('sfx', 'chime');
      break;

    case 'rayo': {
      G.emit('fx', { type:'lightning', x:(tx+0.5)*G.TILE, y:(ty+0.5)*G.TILE });
      G.emit('sfx', 'thunder');
      G.emit('shake', 5);
      for (const tr of S.trees){
        if (Math.abs(tr.x-tx)<=1 && Math.abs(tr.y-ty)<=1) G.sim.igniteTree(tr);
      }
      // los aldeanos cercanos huyen (sueltan su tarea)
      for (const v of S.villagers){
        if (G.dist(v.x, v.y, tx*G.TILE, ty*G.TILE) < 4*G.TILE){ v.task = null; v.role='ocioso'; }
      }
      G.sim.addFaith(10);
      break;
    }

    case 'bendicion':
      S.blessT = G.DAY;
      for (const b of S.buildings){
        if (b.type==='campo' && b.built && b.field && b.field.state==='grow'){
          const d = G.dist((b.x+1)*G.TILE,(b.y+1)*G.TILE, tx*G.TILE, ty*G.TILE);
          if (d < P.r*G.TILE*2) b.field.p = Math.min(1, b.field.p + 0.6);
        }
      }
      G.emit('fx', { type:'blessring', x:(tx+0.5)*G.TILE, y:(ty+0.5)*G.TILE, r:P.r*G.TILE });
      G.emit('sfx', 'chime');
      break;

    case 'bosque': {
      let planted = 0;
      for (let i=0;i<26 && planted<10;i++){
        const nx = tx + G.randi(-P.r, P.r), ny = ty + G.randi(-P.r, P.r);
        const tl = G.world.tile(nx, ny);
        if ((tl===T.GRASS || tl===T.MEADOW || tl===T.ASH) && G.world.occGet(nx,ny)===0){
          if (tl===T.ASH){ G.world.setTile(nx,ny,T.GRASS); G.terrainDirty = true; }
          S.trees.push({ x:nx, y:ny, type: G.rand()<0.3?1:0, alive:true, burn:0 });
          G.world.occSet(nx,ny,1);
          planted++;
        }
      }
      G.emit('fx', { type:'sparkleburst', x:(tx+0.5)*G.TILE, y:(ty+0.5)*G.TILE, n:16 });
      G.emit('sfx', 'grow');
      break;
    }

    case 'terraformar': {
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++){
        const x = tx+dx, y = ty+dy;
        const t = G.world.tile(x,y);
        if (!alt){
          if (t === T.DEEP) G.world.setTile(x,y,T.WATER);
          else if (t === T.WATER) G.world.setTile(x,y,T.SAND);
          else if (t === T.SAND) G.world.setTile(x,y,T.GRASS);
          else if (t === T.ASH) G.world.setTile(x,y,T.GRASS);
        } else {
          if (t === T.GRASS || t === T.MEADOW || t === T.SOIL || t === T.ASH){
            if (G.world.occGet(x,y)===0) G.world.setTile(x,y,T.SAND);
          }
          else if (t === T.SAND) G.world.setTile(x,y,T.WATER);
          else if (t === T.WATER) G.world.setTile(x,y,T.DEEP);
        }
      }
      G.terrainDirty = true;
      G.emit('fx', { type:'sparkleburst', x:(tx+0.5)*G.TILE, y:(ty+0.5)*G.TILE, n:12 });
      G.emit('shake', 2);
      G.emit('sfx', 'rumble');
      break;
    }

    case 'inspiracion':
      G.S.know += 60;
      G.emit('fx', { type:'sparkleburst', x:(G.S.center.x+0.5)*G.TILE, y:(G.S.center.y+0.5)*G.TILE, n:24 });
      G.emit('float', { x:(G.S.center.x+0.5)*G.TILE, y:(G.S.center.y-1)*G.TILE, text:'+60 saber', color:'#9fd0d8' });
      G.emit('sfx', 'chime');
      break;

    case 'meteorito': {
      G.emit('fx', { type:'meteor', x:(tx+0.5)*G.TILE, y:(ty+0.5)*G.TILE, r:P.r*G.TILE });
      G.emit('sfx', 'meteor');
      // el impacto real se aplica cuando cae (0.9 s después) vía evento
      const impact = () => {
        const R = P.r;
        for (let dy=-R;dy<=R;dy++) for (let dx=-R;dx<=R;dx++){
          if (dx*dx+dy*dy > R*R) continue;
          const x = tx+dx, y = ty+dy;
          const t = G.world.tile(x,y);
          if (t>=T.SAND && t!==T.MOUNT && t!==T.SNOW) G.world.setTile(x,y,T.ASH);
        }
        for (let i=G.S.trees.length-1;i>=0;i--){
          const tr = G.S.trees[i];
          if ((tr.x-tx)*(tr.x-tx)+(tr.y-ty)*(tr.y-ty) <= R*R) G.sim.killTree(tr, true);
        }
        for (let i=G.S.buildings.length-1;i>=0;i--){
          const b = G.S.buildings[i];
          const bx = b.x+b.w/2, by = b.y+b.h/2;
          if ((bx-tx)*(bx-tx)+(by-ty)*(by-ty) <= R*R && b.type!=='fogata'){
            for (let yy=0;yy<b.h;yy++) for (let xx=0;xx<b.w;xx++) G.world.occSet(b.x+xx,b.y+yy,0);
            G.S.buildings.splice(i,1);
          }
        }
        for (let i=G.S.villagers.length-1;i>=0;i--){
          const v = G.S.villagers[i];
          if (G.dist(v.x,v.y,(tx+0.5)*G.TILE,(ty+0.5)*G.TILE) < R*G.TILE){
            G.S.villagers.splice(i,1);
            G.S.stats.deaths++;
            G.emit('fx', { type:'puff', x:v.x, y:v.y });
          }
        }
        G.terrainDirty = true;
        G.emit('shake', 14);
        G.sim.addFaith(30); // el temor alimenta la fe
        G.emit('notify', { text:'El cielo castigó la tierra', cls:'warn' });
      };
      G.pendingImpact = { t: 0.9, fn: impact };
      break;
    }
  }
  G.sim.witnessMiracle(tx, ty);
  return true;
};
})();

/* PANGEA — audio: WebAudio sintetizado, sutil */
(function(){
const G = window.G;
let ac = null, master = null, on = true;
let rainNode = null;

function ctx(){
  if (!ac){
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function noiseBuf(sec){
  const a = ctx();
  const buf = a.createBuffer(1, a.sampleRate*sec, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  return buf;
}

function tone(freq, dur, type, vol, when){
  const a = ctx();
  const o = a.createOscillator(), g = a.createGain();
  o.type = type||'sine'; o.frequency.value = freq;
  const t = a.currentTime + (when||0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol||0.1, t+0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t+dur+0.05);
}

function noise(dur, vol, freq, q){
  const a = ctx();
  const src = a.createBufferSource();
  src.buffer = noiseBuf(dur+0.1);
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq||800; f.Q.value = q||0.7;
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(vol||0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t); src.stop(t+dur+0.1);
}

const SFX = {
  click(){ tone(880, 0.05, 'square', 0.03); },
  select(){ tone(660, 0.06, 'square', 0.04); tone(990, 0.06, 'square', 0.03, 0.05); },
  build(){ tone(392, 0.12, 'triangle', 0.08); tone(523, 0.15, 'triangle', 0.07, 0.08); },
  era(){ [392,494,587,784].forEach((f,i)=>tone(f, 0.5, 'triangle', 0.09, i*0.14)); },
  chime(){ tone(1046, 0.4, 'sine', 0.07); tone(1568, 0.5, 'sine', 0.05, 0.1); },
  grow(){ tone(523, 0.1, 'triangle', 0.06); tone(659, 0.12, 'triangle', 0.05, 0.07); },
  thunder(){ noise(1.4, 0.5, 400, 0.5); tone(60, 0.9, 'sine', 0.2); },
  rumble(){ noise(0.8, 0.3, 200); tone(50, 0.6, 'sine', 0.15); },
  meteor(){ noise(1.8, 0.55, 300); tone(45, 1.4, 'sine', 0.25, 0.85); },
  rain(){ noise(1.2, 0.15, 2000, 0.3); },
  launch(){ noise(3.5, 0.5, 250); tone(40, 3, 'sawtooth', 0.1); },
  victory(){ [523,659,784,1046,1318].forEach((f,i)=>tone(f, 0.8, 'triangle', 0.09, i*0.16)); },
};

G.audio = {
  init(){
    G.on('sfx', name => { if (on && SFX[name]) try { SFX[name](); } catch(e){} });
  },
  toggle(){ on = !on; return on; },
  isOn(){ return on; },
  unlock(){ try { ctx(); } catch(e){} },
};
})();

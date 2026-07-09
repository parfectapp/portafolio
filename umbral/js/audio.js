/* UMBRAL — audio.js
   Sintetizador WebAudio: instrumentos, temas originales (leitmotiv D-F-E-C#-D) y SFX.
   Cero samples. Todo generado. */
'use strict';

const AUDIO = (() => {
  let ac = null, master, musicGain, sfxGain, wetIn, rainGain;
  let theme = null, themeName = null, beatPos = 0, nextTime = 0, timer = null;
  let healOsc = null;

  function makeIR(seconds, decay) {
    const rate = ac.sampleRate, len = rate * seconds;
    const buf = ac.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function noiseBuf(seconds) {
    const rate = ac.sampleRate, len = Math.floor(rate * seconds);
    const buf = ac.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function init() {
    if (ac) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
    // reverb catedral
    const conv = ac.createConvolver(); conv.buffer = makeIR(2.6, 2.4);
    const wg = ac.createGain(); wg.gain.value = 0.4;
    conv.connect(wg); wg.connect(master);
    wetIn = conv;
    musicGain = ac.createGain(); musicGain.gain.value = 0.5;
    musicGain.connect(master); musicGain.connect(wetIn);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.55;
    sfxGain.connect(master);
    const sfxWet = ac.createGain(); sfxWet.gain.value = 0.25;
    sfxGain.connect(sfxWet); sfxWet.connect(wetIn);
    // lluvia (Ciudad Anegada)
    const rn = ac.createBufferSource(); rn.buffer = noiseBuf(3); rn.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
    rainGain = ac.createGain(); rainGain.gain.value = 0;
    rn.connect(hp); hp.connect(lp); lp.connect(rainGain); rainGain.connect(master);
    rn.start();
    timer = setInterval(tick, 80);
  }
  function unlock() { init(); if (ac.state === 'suspended') ac.resume(); }
  const F = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------------- instrumentos ---------------- */
  function piano(t, midi, dur, vel) {
    const f = F(midi);
    const g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = Math.min(2600, f * 6);
    const o1 = ac.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
    const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.001;
    const g2 = ac.createGain(); g2.gain.value = 0.25;
    o1.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(musicGain);
    const peak = 0.5 * vel, end = t + Math.max(dur * 1.3, 1.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o1.start(t); o2.start(t); o1.stop(end + 0.1); o2.stop(end + 0.1);
  }
  function strings(t, midi, dur, vel) {
    const f = F(midi), g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 850 + vel * 900;
    [0.996, 1, 1.005].forEach(dt => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * dt;
      o.connect(fl); o.start(t); o.stop(t + dur + 1.2);
    });
    fl.connect(g); g.connect(musicGain);
    const a = Math.min(0.6, dur * 0.2 + 0.12), sus = 0.22 * vel;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(sus, t + a);
    g.gain.setValueAtTime(sus, t + Math.max(a, dur * 0.85));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.0);
  }
  function stacc(t, midi, dur, vel) { // cuerdas staccato de jefe
    const f = F(midi), g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 1400 + vel * 1200;
    [0.995, 1.004].forEach(dt => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * dt;
      o.connect(fl); o.start(t); o.stop(t + 0.5);
    });
    fl.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.32));
  }
  function choir(t, midi, dur, vel) {
    const f = F(midi), g = ac.createGain();
    const b1 = ac.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = 650; b1.Q.value = 2.5;
    const b2 = ac.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = 1250; b2.Q.value = 3.5;
    [1, 1.007].forEach(dt => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * dt;
      o.connect(b1); o.connect(b2); o.start(t); o.stop(t + dur + 1.6);
    });
    const mix = ac.createGain(); mix.gain.value = 1.6;
    b1.connect(mix); b2.connect(mix); mix.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.3 * vel, t + Math.min(0.7, dur * 0.3 + 0.2));
    g.gain.setValueAtTime(0.3 * vel, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.4);
  }
  function flute(t, midi, dur, vel) {
    const f = F(midi), g = ac.createGain();
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
    const g2 = ac.createGain(); g2.gain.value = 0.3;
    const lfo = ac.createOscillator(); lfo.frequency.value = 5;
    const lg = ac.createGain(); lg.gain.value = f * 0.006;
    lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.28 * vel, t + 0.09);
    g.gain.setValueAtTime(0.28 * vel, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.35);
    o.start(t); o2.start(t); lfo.start(t);
    o.stop(t + dur + 0.5); o2.stop(t + dur + 0.5); lfo.stop(t + dur + 0.5);
  }
  function harp(t, midi, dur, vel) {
    const f = F(midi), g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 2800;
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    const g2 = ac.createGain(); g2.gain.value = 0.18;
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.start(t); o2.start(t); o.stop(t + 0.7); o2.stop(t + 0.7);
  }
  function bass(t, midi, dur, vel) {
    const f = F(midi), g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 320;
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
    const g2 = ac.createGain(); g2.gain.value = 0.35;
    o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.4 * vel, t + 0.02);
    g.gain.setValueAtTime(0.4 * vel, t + dur * 0.85);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
    o.start(t); o2.start(t); o.stop(t + dur + 0.5); o2.stop(t + dur + 0.5);
  }
  function timpani(t, midi, dur, vel) {
    const f = Math.max(40, F(midi) * 0.5);
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f * 2.1, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    const g = ac.createGain();
    o.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.7 * vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.start(t); o.stop(t + 0.8);
    const n = ac.createBufferSource(); n.buffer = noiseBuf(0.16);
    const nf = ac.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 360;
    const ng = ac.createGain();
    n.connect(nf); nf.connect(ng); ng.connect(musicGain);
    ng.gain.setValueAtTime(0.35 * vel, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    n.start(t);
  }
  function blip(t, midi, dur, vel) {
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = F(midi);
    const g = ac.createGain(); o.connect(g); g.connect(musicGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2 * vel, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.start(t); o.stop(t + 0.6);
  }
  const INST = { piano, strings, stacc, choir, flute, harp, bass, timpani, blip };

  /* ---------------- temas (composición original) ----------------
     Leitmotiv de UMBRAL: D F E C# D ("la chispa que no se apaga") */
  function motif(track, beat, root, vel, oct) {
    const o = (oct || 0) * 12;
    // grados: 1, b3, 2, #7(bajo), 1
    track.push([beat, root + o, 1.5, vel], [beat + 2, root + 3 + o, 1, vel * 0.9],
      [beat + 3, root + 2 + o, 1, vel * 0.85], [beat + 4, root - 1 + o, 1.5, vel * 0.8],
      [beat + 5.5, root + o, 2.5, vel]);
  }
  function motifMajor(track, beat, root, vel, oct) {
    const o = (oct || 0) * 12;
    track.push([beat, root + o, 1.5, vel], [beat + 2, root + 4 + o, 1, vel * 0.9],
      [beat + 3, root + 2 + o, 1, vel * 0.85], [beat + 4, root - 1 + o, 1, vel * 0.8],
      [beat + 5.5, root + o, 2.5, vel]);
  }

  const THEMES = {
    title() {
      const p = [], st = [], ch = [], bs = [];
      motif(p, 0, 62, 0.85, 0);                       // D4
      p.push([10, 57, 1, 0.5], [11, 60, 1, 0.55], [12, 62, 3, 0.7]);
      motif(p, 16, 62, 0.75, 1);                      // octava arriba
      p.push([26, 69, 1, 0.5], [27, 72, 1, 0.5], [28, 74, 3, 0.6]);
      bs.push([0, 38, 7.5, 0.5], [8, 43, 7.5, 0.5], [16, 45, 7.5, 0.5], [24, 38, 7.5, 0.55]);
      st.push([0, 50, 8, 0.55], [0, 53, 8, 0.45], [0, 57, 8, 0.4],
        [8, 55, 8, 0.5], [8, 58, 8, 0.42], [8, 62, 8, 0.36],
        [16, 57, 8, 0.5], [16, 61, 8, 0.38], [16, 64, 8, 0.36],
        [24, 50, 8, 0.55], [24, 53, 8, 0.45], [24, 57, 8, 0.4]);
      ch.push([24, 62, 8, 0.5], [24, 65, 8, 0.4]);
      return { bpm: 66, loop: 32, tracks: [{ inst: 'piano', notes: p }, { inst: 'strings', notes: st }, { inst: 'choir', notes: ch }, { inst: 'bass', notes: bs }] };
    },
    sendas() {
      const p = [], st = [], bs = [];
      p.push([0, 57, 2, 0.6], [3, 60, 1, 0.45], [6, 59, 2, 0.5], [12, 64, 2.5, 0.55],
        [16, 57, 2, 0.55], [19, 55, 1, 0.4], [22, 57, 4, 0.5], [28, 52, 3, 0.4]);
      bs.push([0, 33, 15, 0.4], [16, 29, 15, 0.35]);
      st.push([0, 52, 16, 0.3], [0, 57, 16, 0.24], [16, 53, 16, 0.3], [16, 57, 16, 0.24]);
      return { bpm: 76, loop: 32, tracks: [{ inst: 'piano', notes: p }, { inst: 'strings', notes: st }, { inst: 'bass', notes: bs }] };
    },
    verde() {
      const h = [], fl = [], bs = [];
      const arps = [[52, 55, 59, 64, 67, 64, 59, 55], [48, 52, 55, 60, 64, 60, 55, 52],
        [45, 48, 52, 57, 60, 57, 52, 48], [47, 51, 54, 59, 63, 59, 54, 51]];
      for (let rep = 0; rep < 2; rep++) for (let c = 0; c < 4; c++)
        for (let i = 0; i < 8; i++) h.push([rep * 16 + c * 4 + i * 0.5, arps[c][i], 0.5, 0.42]);
      const roots = [40, 36, 33, 35];
      for (let rep = 0; rep < 2; rep++) for (let c = 0; c < 4; c++) bs.push([rep * 16 + c * 4, roots[c], 3.6, 0.4]);
      fl.push([16, 64, 1.5, 0.5], [18, 67, 1, 0.45], [19, 66, 1, 0.4], [20, 63, 1.5, 0.35],
        [21.5, 64, 2.5, 0.5], [26, 59, 1, 0.3], [27, 62, 1, 0.3], [28, 64, 3, 0.45]);
      return { bpm: 92, loop: 32, tracks: [{ inst: 'harp', notes: h }, { inst: 'flute', notes: fl }, { inst: 'bass', notes: bs }] };
    },
    ciudad() {
      const p = [], st = [], bs = [];
      // mano izquierda: arpegios lentos F#m / D / Bm / C#
      const lh = [[42, 49, 54, 57], [50, 57, 62, 66], [47, 54, 59, 62], [49, 56, 61, 65]];
      for (let c = 0; c < 4; c++) for (let i = 0; i < 4; i++)
        p.push([c * 8 + i * 2, lh[c][i], 1.8, 0.34]);
      motif(p, 0, 66, 0.65, 0);                        // F#4 menor
      p.push([10, 61, 1, 0.4], [11, 64, 1, 0.45], [12, 66, 3, 0.55]);
      motif(p, 16, 66, 0.5, 1);
      p.push([28, 73, 4, 0.4]);
      st.push([16, 54, 8, 0.34], [16, 57, 8, 0.28], [16, 61, 8, 0.24],
        [24, 49, 8, 0.34], [24, 56, 8, 0.26], [24, 61, 8, 0.22]);
      bs.push([0, 30, 8, 0.35], [8, 38, 8, 0.3], [16, 35, 8, 0.32], [24, 37, 8, 0.32]);
      return { bpm: 63, loop: 32, tracks: [{ inst: 'piano', notes: p }, { inst: 'strings', notes: st }, { inst: 'bass', notes: bs }] };
    },
    hondura() {
      const bs = [], tp = [], bl = [], ch = [];
      bs.push([0, 26, 30, 0.5], [0, 38, 30, 0.18]);
      for (let i = 0; i < 4; i++) tp.push([i * 8, 38, 0.5, 0.5], [i * 8 + 0.6, 38, 0.5, 0.32]);
      bl.push([5, 85, 0.25, 0.5], [13, 90, 0.25, 0.4], [21, 83, 0.25, 0.5], [29, 88, 0.25, 0.35]);
      ch.push([16, 62, 10, 0.16], [16, 63, 10, 0.12]);
      return { bpm: 50, loop: 32, tracks: [{ inst: 'bass', notes: bs }, { inst: 'timpani', notes: tp }, { inst: 'blip', notes: bl }, { inst: 'choir', notes: ch }] };
    },
    boss() { return bossTheme(132, false); },
    lumbre() { return bossTheme(144, true); },
    alba() {
      const p = [], st = [], ch = [];
      motifMajor(p, 0, 62, 0.7, 0);
      p.push([12, 69, 2, 0.5]);
      motifMajor(p, 16, 62, 0.6, 1);
      st.push([0, 50, 8, 0.44], [0, 54, 8, 0.36], [0, 57, 8, 0.3],
        [8, 43, 8, 0.44], [8, 55, 8, 0.34], [8, 59, 8, 0.28],
        [16, 45, 8, 0.44], [16, 57, 8, 0.36], [16, 61, 8, 0.28],
        [24, 50, 8, 0.48], [24, 54, 8, 0.4], [24, 57, 8, 0.34], [24, 62, 8, 0.26]);
      ch.push([16, 62, 8, 0.3], [24, 66, 8, 0.32], [24, 62, 8, 0.36]);
      return { bpm: 60, loop: 32, tracks: [{ inst: 'piano', notes: p }, { inst: 'strings', notes: st }, { inst: 'choir', notes: ch }] };
    },
  };
  function bossTheme(bpm, final) {
    const bs = [], tp = [], sc = [], ch = [], hi = [];
    for (let b = 0; b < 32; b += 0.5) bs.push([b, b % 8 === 7.5 ? 36 : 38, 0.4, final ? 0.55 : 0.45]);
    const tpat = [0, 0.75, 2, 4, 4.75, 6, 7, 7.5];
    for (let bar = 0; bar < 4; bar++) tpat.forEach(x => tp.push([bar * 8 + x, 38, 0.5, 0.55]));
    const chords = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]];
    const idx = [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 2, 1, 0, 1];
    for (let c = 0; c < 4; c++) for (let i = 0; i < 16; i++)
      sc.push([c * 8 + i * 0.5, chords[c][idx[i]], 0.5, 0.5]);
    ch.push([0, 62, 7, 0.42], [8, 58, 7, 0.42], [16, 55, 7, 0.42], [24, 57, 7, 0.46], [24, 61, 7, 0.36]);
    motif(hi, 16, 74, final ? 0.7 : 0.55, 0);
    if (final) { motif(ch, 16, 62, 0.5, 0); tpat.forEach(x => tp.push([16 + x * 0.5, 43, 0.4, 0.4])); }
    return { bpm, loop: 32, tracks: [{ inst: 'bass', notes: bs }, { inst: 'timpani', notes: tp }, { inst: 'stacc', notes: sc }, { inst: 'choir', notes: ch }, { inst: 'strings', notes: hi }] };
  }

  /* ---------------- secuenciador ---------------- */
  function tick() {
    if (!ac || !theme || ac.state !== 'running') return;
    const spb = 60 / theme.bpm, step = 0.25;
    if (nextTime < ac.currentTime - 0.5) { nextTime = ac.currentTime + 0.05; }
    while (nextTime < ac.currentTime + 0.35) {
      for (const tr of theme.tracks) {
        const fn = INST[tr.inst];
        for (const n of tr.notes) {
          if (n[0] >= beatPos && n[0] < beatPos + step)
            fn(nextTime + (n[0] - beatPos) * spb, n[1], n[2] * spb, n[3]);
        }
      }
      beatPos += step;
      if (beatPos >= theme.loop) beatPos = 0;
      nextTime += step * spb;
    }
  }
  function playTheme(name, fade = 1.4) {
    if (!ac || themeName === name) return;
    themeName = name;
    const now = ac.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now + fade * 0.45);
    setTimeout(() => {
      if (themeName !== name) return;
      theme = THEMES[name] ? THEMES[name]() : null;
      beatPos = 0; nextTime = ac.currentTime + 0.08;
      const n2 = ac.currentTime;
      musicGain.gain.cancelScheduledValues(n2);
      musicGain.gain.setValueAtTime(0.0001, n2);
      musicGain.gain.linearRampToValueAtTime(0.5, n2 + fade);
    }, fade * 460);
  }
  function stopMusic(fade = 0.8) {
    if (!ac) return; themeName = null;
    const now = ac.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now + fade);
    setTimeout(() => { if (!themeName) theme = null; }, fade * 1000);
  }
  function setRain(on) {
    if (!ac) return;
    const now = ac.currentTime;
    rainGain.gain.cancelScheduledValues(now);
    rainGain.gain.setValueAtTime(rainGain.gain.value, now);
    rainGain.gain.linearRampToValueAtTime(on ? 0.05 : 0, now + 1.5);
  }

  /* ---------------- SFX ---------------- */
  function burst(dur, filterType, f0, f1, vol) {
    if (!ac) return;
    const t = ac.currentTime;
    const n = ac.createBufferSource(); n.buffer = noiseBuf(dur + 0.05);
    const fl = ac.createBiquadFilter(); fl.type = filterType;
    fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain();
    n.connect(fl); fl.connect(g); g.connect(sfxGain);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.start(t);
  }
  function tone(type, f0, f1, dur, vol, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ac.createGain();
    o.connect(g); g.connect(sfxGain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.1);
  }
  const sfx = {
    slash() { burst(0.09, 'bandpass', 2600, 900, 0.2); tone('sine', 1900, 700, 0.06, 0.08); },
    hit() { burst(0.07, 'lowpass', 900, 300, 0.3); tone('square', 220, 110, 0.06, 0.1); },
    clang() { tone('square', 1300, 1250, 0.09, 0.14); burst(0.05, 'highpass', 3000, 0, 0.12); },
    pogo() { tone('sine', 500, 900, 0.1, 0.14); },
    hurt() { tone('sine', 110, 45, 0.3, 0.4); burst(0.18, 'lowpass', 500, 120, 0.35); },
    jump() { tone('sine', 300, 430, 0.1, 0.07); },
    wing() { burst(0.12, 'bandpass', 900, 500, 0.14); },
    dash() { burst(0.2, 'bandpass', 2600, 500, 0.22); },
    coin() { tone('sine', 1450, 0, 0.06, 0.08); tone('sine', 2170, 0, 0.05, 0.06, 0.04); },
    spell() { burst(0.22, 'bandpass', 1200, 300, 0.25); tone('sawtooth', 220, 80, 0.25, 0.12); },
    healDone() { tone('sine', 660, 0, 0.3, 0.12); tone('sine', 990, 0, 0.35, 0.1, 0.06); },
    death() { tone('sine', 70, 28, 1.2, 0.4); burst(0.5, 'lowpass', 600, 80, 0.35); tone('sine', 880, 870, 1.6, 0.08, 0.35); },
    eco() { for (let i = 0; i < 4; i++) tone('sine', 500 + i * 220, 0, 0.2, 0.09, i * 0.07); },
    bench() { tone('sine', 293, 0, 1.2, 0.1); tone('sine', 440, 0, 1.2, 0.08, 0.1); tone('sine', 587, 0, 1.4, 0.06, 0.2); },
    breakUrn() { burst(0.13, 'lowpass', 1600, 300, 0.3); },
    roar() { tone('sawtooth', 75, 48, 0.8, 0.25); burst(0.8, 'lowpass', 320, 90, 0.3); },
    bossHit() { burst(0.1, 'lowpass', 700, 200, 0.35); tone('sine', 160, 70, 0.12, 0.2); },
    bossDie() { tone('sine', 60, 25, 2, 0.4); burst(1.2, 'lowpass', 900, 60, 0.4); tone('sine', 1174, 1170, 2.4, 0.07, 0.5); },
    ability() { [587, 698, 880, 1174].forEach((f, i) => tone('sine', f, 0, 0.5, 0.12, i * 0.12)); },
    uiTick() { tone('sine', 900, 0, 0.04, 0.05); },
    uiSel() { tone('sine', 1200, 0, 0.07, 0.07); },
    stagger() { burst(0.25, 'lowpass', 800, 150, 0.35); tone('square', 300, 90, 0.2, 0.12); },
  };
  function healStart() {
    if (!ac || healOsc) return;
    const o = ac.createOscillator(); o.type = 'triangle';
    const g = ac.createGain();
    o.frequency.setValueAtTime(420, ac.currentTime);
    o.frequency.linearRampToValueAtTime(940, ac.currentTime + 0.9);
    o.connect(g); g.connect(sfxGain);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.linearRampToValueAtTime(0.09, ac.currentTime + 0.2);
    o.start(); healOsc = { o, g };
  }
  function healStop() {
    if (!healOsc) return;
    const { o, g } = healOsc; healOsc = null;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.setValueAtTime(g.gain.value, ac.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.08);
    o.stop(ac.currentTime + 0.12);
  }

  return { unlock, playTheme, stopMusic, setRain, sfx, healStart, healStop, get ready() { return !!ac; } };
})();

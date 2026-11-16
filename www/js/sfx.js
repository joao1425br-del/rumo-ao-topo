// Sons sintetizados com WebAudio (sem arquivos): apito, torcida, gol e clique. O botão 🔊 da partida liga/desliga (fica salvo).
export const SFX = (() => {
  let ac = null, master = null, crowd = null, on = true;
  try { on = localStorage.getItem('rat_sfx') !== '0'; } catch { /* sem storage */ }
  const tone = (f, t0, d, v, type = 'sine', vib = 0) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 38; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + d); }
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + .02); g.gain.setValueAtTime(v, t0 + d - .04); g.gain.linearRampToValueAtTime(0, t0 + d);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + .02);
  };
  const noise = () => { const b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = b; s.loop = true; return s; };
  return {
    get on() { return on; },
    init() {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = on ? .5 : 0; master.connect(ac.destination); } catch { ac = null; } }
      if (ac && ac.state === 'suspended') ac.resume();
    },
    toggle() { on = !on; try { localStorage.setItem('rat_sfx', on ? '1' : '0'); } catch { /* ok */ } if (master) master.gain.value = on ? .5 : 0; return on; },
    blip() { if (ac) tone(660, ac.currentTime, .06, .12, 'triangle'); },
    whistle(n = 1) { if (!ac) return; for (let k = 0; k < n; k++) tone(2700, ac.currentTime + k * .38, k === n - 1 && n > 1 ? .8 : .26, .22, 'sine', 90); },
    crowdStart() {
      if (!ac || crowd) return; const s = noise(), f = ac.createBiquadFilter(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain();
      f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = .5; g.gain.value = .07; l.frequency.value = .18; lg.gain.value = .03; l.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(master); s.start(); l.start(); crowd = { s, g, f, l };
    },
    crowdStop() { if (!crowd) return; const c = crowd; crowd = null; c.g.gain.setTargetAtTime(0, ac.currentTime, .3); setTimeout(() => { try { c.s.stop(); c.l.stop(); } catch { /* ok */ } }, 1500); },
    goal(vol = 1) {
      if (!ac) return; const t = ac.currentTime;
      if (crowd) { crowd.g.gain.cancelScheduledValues(t); crowd.g.gain.setValueAtTime(crowd.g.gain.value, t); crowd.g.gain.linearRampToValueAtTime(.45 * vol, t + .25); crowd.g.gain.setTargetAtTime(.07, t + 1.6, 1); crowd.f.frequency.setTargetAtTime(1100, t, .1); crowd.f.frequency.setTargetAtTime(650, t + 2, 1); }
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * .09, .35, .12 * vol, 'triangle'));
    },
  };
})();

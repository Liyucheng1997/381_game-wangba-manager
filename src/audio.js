// 合成音效（WebAudio，无需音频文件）
export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.ambOn = false; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  tone(freq, dur, { type = 'sine', vol = 0.2, at = 0, slide = 0, attack = 0.005 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise(dur, { vol = 0.2, at = 0, freq = 2000, q = 1, type = 'bandpass', sweep = 0 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(50, freq + sweep), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'cash': this.tone(1568, 0.12, { type: 'triangle', vol: 0.18 }); this.tone(2093, 0.35, { type: 'triangle', vol: 0.16, at: 0.07 }); this.noise(0.08, { vol: 0.08, freq: 5000 }); break;
      case 'door': this.tone(1318, 0.6, { vol: 0.12 }); this.tone(1046, 0.8, { vol: 0.1, at: 0.18 }); break;
      case 'need': this.tone(880, 0.12, { vol: 0.08, type: 'sine' }); this.tone(1175, 0.14, { vol: 0.07, at: 0.08 }); break;
      case 'alert': this.tone(660, 0.15, { type: 'square', vol: 0.06 }); this.tone(520, 0.2, { type: 'square', vol: 0.06, at: 0.16 }); break;
      case 'pick': this.noise(0.05, { vol: 0.15, freq: 3000 }); this.tone(500, 0.06, { vol: 0.05 }); break;
      case 'ok': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.1, at: i * 0.07 })); break;
      case 'click': this.tone(1200, 0.04, { type: 'square', vol: 0.03 }); break;
      case 'clean': this.noise(0.5, { vol: 0.12, freq: 1500, sweep: 2000 }); break;
      case 'water': this.noise(0.9, { vol: 0.1, freq: 900, q: 3, sweep: 600 }); break;
      case 'smash': this.noise(0.6, { vol: 0.5, freq: 1800, type: 'lowpass' }); this.tone(90, 0.4, { vol: 0.4, slide: -50 }); this.noise(0.4, { vol: 0.25, freq: 6000, at: 0.05 }); break;
      case 'powerdown': this.tone(400, 1.2, { type: 'sawtooth', vol: 0.12, slide: -360 }); break;
      case 'powerup': this.tone(80, 0.8, { type: 'sawtooth', vol: 0.08, slide: 500 }); break;
      case 'cheer': for (let i = 0; i < 6; i++) this.noise(0.8, { vol: 0.08, freq: 800 + i * 300, q: 0.5, at: i * 0.05 }); break;
      case 'qq': this.tone(1600, 0.07, { vol: 0.06 }); this.tone(1600, 0.07, { vol: 0.06, at: 0.12 }); this.tone(1600, 0.07, { vol: 0.06, at: 0.24 }); break;
      case 'type': this.noise(0.03, { vol: 0.04, freq: 3500, q: 2 }); break;
      case 'text': this.tone(900 + Math.random() * 200, 0.025, { type: 'square', vol: 0.015 }); break;
      case 'fail': this.tone(300, 0.3, { type: 'square', vol: 0.06, slide: -120 }); break;
      case 'hit': this.tone(700 + Math.random() * 300, 0.08, { type: 'triangle', vol: 0.1 }); break;
      case 'gun': this.noise(0.12, { vol: 0.2, freq: 1200, type: 'lowpass' }); break;
    }
  }

  // 背景音乐：慢节奏 lo-fi，程序合成（Am - F - C - G）
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    if (!this.musicGain) {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
      this.musicGain.connect(lp); lp.connect(this.master);
    }
    this.musicGain.gain.setTargetAtTime(0.32, this.ctx.currentTime, 0.5);
    const bpm = 76, beat = 60 / bpm;
    const chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
    const scale = [57, 60, 62, 64, 67, 69, 72, 74, 76];
    const f = (m) => 440 * Math.pow(2, (m - 69) / 12);
    let next = this.ctx.currentTime + 0.1, step = 0;
    const note = (freq, t, dur, type, vol) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + dur + 0.05);
    };
    const tick = () => {
      if (!this.musicOn) return;
      while (next < this.ctx.currentTime + 0.4) {
        const bar = Math.floor(step / 8) % 4, sub = step % 8;
        const ch = chords[bar];
        if (sub === 0) { ch.forEach((m) => note(f(m), next, beat * 3.8, 'triangle', 0.035)); note(f(ch[0] - 12), next, beat * 1.8, 'sine', 0.09); }
        if (sub === 4) note(f(ch[0] - 12), next, beat * 1.6, 'sine', 0.07);
        if (sub % 2 === 0 && Math.random() < 0.55) note(f(scale[Math.floor(Math.random() * scale.length)]), next, beat * 0.9, 'sine', 0.045);
        if (sub === 2 || sub === 6) this.noise(0.05, { vol: 0.025, freq: 7000, q: 1, at: next - this.ctx.currentTime });
        next += beat / 2; step++;
      }
      this.musicT = setTimeout(tick, 120);
    };
    tick();
  }
  stopMusic() {
    this.musicOn = false;
    clearTimeout(this.musicT);
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }
  toggleMusic() { if (this.musicOn) this.stopMusic(); else this.startMusic(); return this.musicOn; }

  // 网吧环境音：低频嗡嗡 + 随机键盘声 + 偶尔的QQ声
  startAmbience() {
    if (!this.ctx || this.ambOn) return;
    this.ambOn = true;
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
    const g = c.createGain(); g.gain.value = 0.05;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start();
    const hum = c.createOscillator(); hum.frequency.value = 50; const hg = c.createGain(); hg.gain.value = 0.008;
    hum.connect(hg); hg.connect(this.master); hum.start();
    const tick = () => {
      if (!this.muted && this.busy > 0) {
        const n = Math.min(6, Math.ceil(this.busy / 3));
        for (let i = 0; i < n; i++) if (Math.random() < 0.6) this.noise(0.025, { vol: 0.02 + Math.random() * 0.02, freq: 2500 + Math.random() * 2500, q: 2, at: Math.random() * 0.2 });
        if (Math.random() < 0.004 * this.busy) this.play('qq');
        if (Math.random() < 0.003 * this.busy) this.play('gun');
      }
      setTimeout(tick, 220);
    };
    this.busy = 0;
    tick();
  }
}

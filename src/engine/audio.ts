// Procedural sound: a soft bubbling room tone plus a few synthesized effects. No samples, so the
// game ships with no audio files until the audio milestone (PLAN.md, M10).

export type Sfx = 'click' | 'coin' | 'place' | 'splash' | 'bubble' | 'letter' | 'chime' | 'error' | 'scrape';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  volume = 0.6;
  ambientLevel = 0.5;

  /** Browsers only allow audio after a user gesture; the app calls this on the first click. */
  unlock() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.startAmbience();
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  /** crowd murmur and pump hum rise with visitor numbers (0..1) */
  setCrowd(level: number) {
    if (this.ambience && this.ctx) this.ambience.gain.setTargetAtTime(0.04 + level * 0.06 * this.ambientLevel, this.ctx.currentTime, 0.5);
  }

  private startAmbience() {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = last * 0.98 + (Math.random() * 2 - 1) * 0.02;
      d[i] = last * 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0.05;
    src.connect(lp).connect(this.ambience).connect(this.master!);
    src.start();
    const bubble = () => {
      if (!this.ctx) return;
      if (Math.random() < 0.6) this.play('bubble', 0.25);
      setTimeout(bubble, 600 + Math.random() * 2400);
    };
    setTimeout(bubble, 1000);
  }

  play(s: Sfx, gain = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(this.master);
    const o = ctx.createOscillator();
    o.connect(g);
    const env = (a: number, peak: number, dur: number) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak * gain, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    };
    switch (s) {
      case 'click':
        o.type = 'triangle'; o.frequency.setValueAtTime(880, t); env(0.005, 0.08, 0.06); break;
      case 'coin':
        o.type = 'square'; o.frequency.setValueAtTime(1320, t); o.frequency.setValueAtTime(1760, t + 0.06); env(0.005, 0.05, 0.25); break;
      case 'place':
        o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.15); env(0.005, 0.2, 0.2); break;
      case 'splash':
        o.type = 'sine'; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.3); env(0.01, 0.15, 0.35); break;
      case 'bubble':
        o.type = 'sine'; o.frequency.setValueAtTime(300 + Math.random() * 400, t); o.frequency.exponentialRampToValueAtTime(900 + Math.random() * 600, t + 0.08); env(0.005, 0.04, 0.1); break;
      case 'letter':
        o.type = 'triangle'; o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(990, t + 0.1); env(0.01, 0.1, 0.4); break;
      case 'chime':
        o.type = 'sine'; o.frequency.setValueAtTime(784, t); o.frequency.setValueAtTime(1046, t + 0.12); o.frequency.setValueAtTime(1318, t + 0.24); env(0.01, 0.12, 0.8); break;
      case 'error':
        o.type = 'square'; o.frequency.setValueAtTime(160, t); env(0.005, 0.06, 0.18); break;
      case 'scrape':
        o.type = 'sawtooth'; o.frequency.setValueAtTime(90 + Math.random() * 40, t); env(0.005, 0.02, 0.06); break;
    }
    o.start(t);
    o.stop(t + 1);
  }
}

// Procedural sound, all synthesized with Web Audio (the game ships no audio files). Two buses under
// the master volume: effects, and an ambience that follows what is on screen. The ambience is a
// set of looping layers faded in and out by the scene the app describes every frame:
//   room     a low, soft room tone, always there
//   trickle  a hang-on-back or sump spilling water (canisters are near silent)
//   hum      a reef's return pump and chiller
//   surge    the slow swell of a wavemaker or a kelp tower's surge device
//   murmur   visitors talking, rising with traffic (closed at night)
//   rain     on the street window on rainy days
// plus scheduled one-shots: airstone and sponge-filter bubbles, rain drips and the shop's door bell.

export type Sfx = 'click' | 'coin' | 'place' | 'splash' | 'bubble' | 'letter' | 'chime' | 'error' | 'scrape' | 'feed' | 'door';

/** What the ambience should sound like right now (the app fills this in from the shown tank). */
export interface SoundScene {
  filter: 'none' | 'sponge' | 'hob' | 'canister' | 'sump';
  /** airstone bubbling 0..1 */
  air: number;
  /** pump and chiller hum 0..1 */
  hum: number;
  /** wave surge 0..1 */
  surge: number;
  /** visitors 0..1 */
  crowd: number;
  /** rain on the window 0..1 */
  rain: number;
  night: boolean;
  /** 1 at the glass (tank view), less in the hall, 0 on the title screen's quiet */
  near: number;
}

export const QUIET: SoundScene = { filter: 'none', air: 0, hum: 0, surge: 0, crowd: 0, rain: 0, night: false, near: 0.6 };

interface Layer {
  gain: GainNode;
  level: number;
}

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private white: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private layers = new Map<string, Layer>();
  /** seconds until the next scheduled one-shot of each kind */
  private next = { bubble: 1, drip: 0.5, door: 8 };
  volume = 0.6;
  ambience = 0.7;

  /** Browsers only allow audio after a user gesture; the app calls this on every pointer down. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.ambBus = ctx.createGain();
      this.ambBus.gain.value = this.ambience;
      this.ambBus.connect(this.master);
      this.white = noise(ctx, 'white');
      this.brown = noise(ctx, 'brown');
      this.buildLayers();
    } catch {
      this.ctx = null;
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  setAmbience(v: number) {
    this.ambience = v;
    if (this.ambBus && this.ctx) this.ambBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.2);
  }

  /** Follow the scene: fade the layers toward it and schedule the one-shots. Call every frame. */
  update(dt: number, scene: SoundScene) {
    const ctx = this.ctx;
    if (!ctx) return;
    const n = scene.near, quiet = scene.night ? 0.6 : 1;
    const trickle = { none: 0, sponge: 0.15, hob: 1, canister: 0.25, sump: 1.2 }[scene.filter];
    this.fade('room', 0.05);
    this.fade('trickle', 0.2 * trickle * n * quiet);
    this.fade('hum', 0.06 * scene.hum * (0.5 + 0.5 * n));
    this.fade('surge', 0.09 * scene.surge * n);
    this.fade('murmur', scene.night ? 0 : 0.35 * Math.sqrt(scene.crowd));
    this.fade('rain', 0.05 * scene.rain);
    // one-shots
    const rate = {
      bubble: (scene.air * 5 + (scene.filter === 'sponge' ? 3 : 0) + 0.25) * n,
      drip: scene.rain * 5,
      door: scene.night ? 0 : scene.crowd / 35,
    };
    for (const k of ['bubble', 'drip', 'door'] as const) {
      if (rate[k] <= 0) continue;
      this.next[k] -= dt;
      if (this.next[k] > 0) continue;
      this.next[k] = expo(rate[k]);
      if (k === 'bubble') this.play('bubble', 0.35 + Math.random() * 0.4, true);
      else if (k === 'drip') this.drip();
      else this.play('door', 0.8, true);
    }
  }

  private fade(name: string, level: number) {
    const l = this.layers.get(name);
    if (!l || !this.ctx || Math.abs(l.level - level) < 0.0005) return;
    l.level = level;
    l.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.6);
  }

  private buildLayers() {
    const ctx = this.ctx!;
    const add = (name: string, src: AudioNode) => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(this.ambBus!);
      this.layers.set(name, { gain, level: 0 });
    };
    // room tone: brown noise under 300 Hz
    add('room', chain(this.loop(this.brown!), biquad(ctx, 'lowpass', 300, 0.7)));
    // trickle: bright noise, its loudness wobbling at two unrelated rates like falling water
    {
      const f = biquad(ctx, 'bandpass', 2300, 0.8);
      const am = ctx.createGain();
      am.gain.value = 0.7;
      lfo(ctx, 3.1, 0.22).connect(am.gain);
      lfo(ctx, 4.7, 0.16).connect(am.gain);
      lfo(ctx, 0.37, 0.12).connect(f.frequency);
      add('trickle', chain(this.loop(this.white!), f, biquad(ctx, 'highshelf', 4000, 0.7, -8), am));
    }
    // hum: a pump at mains frequency with its harmonic, and a low rumble of water through pipes
    {
      const mix = ctx.createGain();
      for (const [hz, g] of [[59, 1], [118, 0.45], [177, 0.15]] as const) {
        const o = ctx.createOscillator();
        o.frequency.value = hz;
        const og = ctx.createGain();
        og.gain.value = g * 0.5;
        o.connect(og).connect(mix);
        o.start();
      }
      const rumble = chain(this.loop(this.brown!), biquad(ctx, 'lowpass', 160, 0.7));
      rumble.connect(mix);
      add('hum', mix);
    }
    // surge: low noise that swells and ebbs every nine seconds or so
    {
      const swell = ctx.createGain();
      swell.gain.value = 0.55;
      lfo(ctx, 0.11, 0.45).connect(swell.gain);
      const f = biquad(ctx, 'lowpass', 650, 0.6);
      lfo(ctx, 0.11, 250).connect(f.frequency);
      add('surge', chain(this.loop(this.brown!), f, swell));
    }
    // murmur: three wandering formant bands over noise, chopped into syllables
    {
      const mix = ctx.createGain();
      const src = this.loop(this.white!);
      for (const [hz, rate] of [[520, 0.41], [1150, 0.63], [2300, 0.29]] as const) {
        const f = biquad(ctx, 'bandpass', hz, 4);
        lfo(ctx, rate, hz * 0.3).connect(f.frequency);
        src.connect(f).connect(mix);
      }
      const syll = ctx.createGain();
      syll.gain.value = 0.6;
      lfo(ctx, 3.7, 0.3).connect(syll.gain);
      lfo(ctx, 5.3, 0.2).connect(syll.gain);
      add('murmur', chain(mix, biquad(ctx, 'lowpass', 2600, 0.7), syll));
    }
    // rain: a hiss on the glass
    add('rain', chain(this.loop(this.white!), biquad(ctx, 'highpass', 2800, 0.7), biquad(ctx, 'lowpass', 9000, 0.7)));
  }

  private loop(buf: AudioBuffer): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    // start each loop somewhere different so layers sharing a buffer do not phase
    s.start(0, Math.random() * buf.duration);
    return s;
  }

  private drip() {
    const ctx = this.ctx!;
    this.burst(0.012, 'bandpass', 4500 + Math.random() * 3000, 3, 0.02 + Math.random() * 0.02, ctx.currentTime, this.ambBus!);
  }

  /** a short filtered noise burst, optionally sweeping the filter */
  private burst(dur: number, type: BiquadFilterType, hz: number, q: number, peak: number, t: number, out: AudioNode, sweepTo?: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.white;
    const f = biquad(ctx, type, hz, q);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }

  /** a tone with an attack and an exponential decay; sweepTo glides the pitch */
  private tone(hz: number, type: OscillatorType, attack: number, decay: number, peak: number, t: number, out: AudioNode, sweepTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(hz, t);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay * 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  /** a struck bell: inharmonic partials, the high ones dying first */
  private bell(hz: number, peak: number, decay: number, t: number, out: AudioNode) {
    for (const [ratio, g, d] of [[1, 1, 1], [2.76, 0.4, 0.55], [5.4, 0.18, 0.3], [0.5, 0.25, 1.2]] as const) this.tone(hz * ratio, 'sine', 0.004, decay * d, peak * g, t, out);
  }

  /** a bubble leaving the water: a sine that chirps upward as it rises and pops */
  private bloop(t: number, peak: number, out: AudioNode) {
    const f = 280 + Math.random() * 520;
    this.tone(f, 'sine', 0.004, 0.05 + Math.random() * 0.04, peak, t, out, f * (2.2 + Math.random()));
  }

  /** ambient one-shots go through the ambience bus so its slider governs them */
  play(s: Sfx, gain = 1, ambient = false) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime;
    const out = ambient ? this.ambBus! : this.sfxBus;
    switch (s) {
      case 'click':
        // a soft wooden tick
        this.burst(0.02, 'bandpass', 2800, 2.5, 0.25 * gain, t, out);
        this.tone(1500, 'triangle', 0.002, 0.03, 0.035 * gain, t, out);
        break;
      case 'coin':
        this.bell(1568, 0.045 * gain, 0.4, t, out);
        this.bell(2093, 0.04 * gain, 0.5, t + 0.07, out);
        break;
      case 'place':
        this.tone(150, 'sine', 0.004, 0.18, 0.16 * gain, t, out, 70);
        this.burst(0.08, 'lowpass', 500, 0.7, 0.05 * gain, t, out);
        break;
      case 'splash':
        this.burst(0.35, 'lowpass', 3200, 0.8, 0.25 * gain, t, out, 380);
        for (let i = 0; i < 4; i++) this.bloop(t + 0.06 + Math.random() * 0.35, 0.03 * gain, out);
        break;
      case 'bubble':
        this.bloop(t, 0.06 * gain, out);
        if (Math.random() < 0.3) this.bloop(t + 0.03 + Math.random() * 0.05, 0.02 * gain, out);
        break;
      case 'letter':
        // paper unfolding, then a little bell
        for (let i = 0; i < 3; i++) this.burst(0.04 + Math.random() * 0.03, 'bandpass', 2600 + Math.random() * 1600, 1.5, 0.08 * gain, t + i * 0.06, out);
        this.bell(1318, 0.03 * gain, 0.6, t + 0.22, out);
        break;
      case 'chime':
        [1046, 1318, 1568].forEach((hz, i) => this.bell(hz, 0.045 * gain, 1.2, t + i * 0.11, out));
        break;
      case 'error':
        this.tone(233, 'triangle', 0.005, 0.12, 0.08 * gain, t, out);
        this.tone(196, 'triangle', 0.005, 0.16, 0.08 * gain, t + 0.1, out);
        break;
      case 'scrape':
        // the squeak of a magnet cleaner on glass
        this.burst(0.07, 'bandpass', 1500 + Math.random() * 400, 9, 0.4 * gain, t, out, 2300);
        break;
      case 'feed':
        // flakes landing on the surface
        for (let i = 0; i < 7; i++) this.burst(0.012, 'bandpass', 4200 + Math.random() * 2500, 4, 0.12 * gain, t + Math.random() * 0.35, out);
        this.bloop(t + 0.3, 0.02 * gain, out);
        break;
      case 'door':
        // the shop bell over the door: two notes, a little uneven
        this.bell(1318, 0.03 * gain, 1.4, t, out);
        this.bell(1046, 0.026 * gain, 1.6, t + 0.16 + Math.random() * 0.04, out);
        break;
    }
  }
}

function noise(ctx: AudioContext, kind: 'white' | 'brown'): AudioBuffer {
  const len = ctx.sampleRate * 3;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w * 0.5;
    else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function biquad(ctx: AudioContext, type: BiquadFilterType, hz: number, q: number, gain = 0): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  f.Q.value = q;
  f.gain.value = gain;
  return f;
}

/** an oscillator scaled to +-depth, for modulating a parameter */
function lfo(ctx: AudioContext, hz: number, depth: number): GainNode {
  const o = ctx.createOscillator();
  o.frequency.value = hz;
  const g = ctx.createGain();
  g.gain.value = depth;
  o.connect(g);
  o.start();
  return g;
}

function chain(first: AudioNode, ...rest: AudioNode[]): AudioNode {
  let n = first;
  for (const r of rest) n = n.connect(r);
  return n;
}

/** seconds to the next event of a Poisson process with this rate per second */
function expo(rate: number): number {
  return -Math.log(1 - Math.random()) / rate;
}

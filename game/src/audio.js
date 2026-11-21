// All sound is synthesised with WebAudio — no audio files, no network.
// Footsteps are short filtered thuds, the alarm is a two-tone sting, and
// pickups and the win play a small rising figure. Nothing starts until
// the first user gesture, as browsers require.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // A short thud: a low sine burst through a low-pass filter.
  thud(freq, duration, volume) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.4), t + duration);
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // A tone with a clear pitch, for pickups and the win figure.
  blip(freq, duration, volume, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // The player's own step: soft, so it never masks a guard's.
  playerStep(sneaking) {
    this.thud(sneaking ? 95 : 120, 0.07, sneaking ? 0.05 : 0.09);
  }

  // A guard's step. Volume falls with distance, so footsteps tell the
  // player where a guard is — that is the point of them.
  guardStep(distancePx) {
    const closeness = Math.max(0, 1 - distancePx / 340);
    if (closeness <= 0.02) return;
    this.thud(82, 0.09, 0.04 + 0.22 * closeness);
  }

  // Near miss: a guard's suspicion crossed the line. Two sharp tones.
  spottedSting() {
    this.blip(622, 0.16, 0.22, 0);
    this.blip(466, 0.22, 0.22, 0.14);
  }

  // Full alert: a rising alarm, three beats.
  alarmSting() {
    [0, 0.16, 0.32].forEach((when, i) => {
      this.blip(i % 2 === 0 ? 740 : 554, 0.14, 0.24, when);
    });
  }

  pickup() {
    this.blip(880, 0.12, 0.18, 0);
    this.blip(1318, 0.18, 0.18, 0.09);
  }

  fileTaken() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.16, 0.2, i * 0.09));
  }

  caught() {
    [392, 311, 233].forEach((f, i) => this.blip(f, 0.3, 0.22, i * 0.16));
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.blip(f, 0.22, 0.2, i * 0.11));
  }
}

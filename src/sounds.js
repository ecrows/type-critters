// Simple sound effects using Web Audio API — no external files needed
class SoundFX {
  constructor() {
    this.ctx = null; // lazy-init on first user gesture
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(fn) {
    if (this.muted) return;
    this.init();
    fn(this.ctx);
  }

  // Bright pop for correct letter — pitch rises with each step in the word
  // step: 0-based index of the letter just typed (0 = first letter)
  pop(step = 0) {
    this.play((ctx) => {
      // 2 semitones up per step — satisfying climb from ~660Hz to ~1320Hz over 6 steps
      const baseFreq = 660;
      const freq = baseFreq * Math.pow(2, step / 6);
      const topFreq = freq * 1.5;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(topFreq, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    });
  }

  // Soft boop for wrong letter
  boop() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    });
  }

  // Cheerful fanfare for word completion — pitch rises with each word in the round
  // step: 1-5 (word position in round); each step = 2 semitones higher
  fanfare(step = 1) {
    this.play((ctx) => {
      const transpose = Math.pow(2, (step - 1) * 2 / 12);
      const notes = [523, 659, 784, 1047].map(f => f * transpose); // C5 E5 G5 C6 + transposition
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.start(t);
        osc.stop(t + 0.4);
      });
    });
  }

  // Fireworks blast: rising whistle + noise burst — randomized for variety
  blast() {
    this.play((ctx) => {
      const t = ctx.currentTime;
      const whistleStart = 300 + Math.random() * 300;
      const whistleEnd  = 1400 + Math.random() * 1000;

      // Rising whistle
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(whistleStart, t);
      osc.frequency.exponentialRampToValueAtTime(whistleEnd, t + 0.32);
      oscGain.gain.setValueAtTime(0.12, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.start(t);
      osc.stop(t + 0.32);

      // Noise burst
      const bufLen = Math.floor(ctx.sampleRate * 0.55);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

      const noise = ctx.createBufferSource();
      noise.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600 + Math.random() * 600;
      filter.Q.value = 0.6;

      const burstGain = ctx.createGain();
      noise.connect(filter);
      filter.connect(burstGain);
      burstGain.connect(ctx.destination);

      const bt = t + 0.28;
      burstGain.gain.setValueAtTime(0, bt);
      burstGain.gain.linearRampToValueAtTime(0.38, bt + 0.025);
      burstGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.5);

      noise.start(bt);
      noise.stop(bt + 0.55);
    });
  }

  // FF-style victory fanfare for round completion — two-phrase triumphant tune
  victory() {
    this.play((ctx) => {
      // [freq (Hz), startTime (s), duration (s), volume]
      const notes = [
        // Phrase 1 — ascending pickup
        [330, 0.00, 0.09, 0.20],  // E4
        [415, 0.09, 0.09, 0.20],  // G#4
        [440, 0.18, 0.09, 0.22],  // A4
        // Phrase 1 — main hit
        [659, 0.27, 0.38, 0.26],  // E5
        // Phrase 1 — ascending run
        [440, 0.72, 0.13, 0.18],  // A4
        [494, 0.85, 0.13, 0.18],  // B4
        [554, 0.98, 0.13, 0.18],  // C#5
        [659, 1.11, 0.38, 0.24],  // E5
        // Phrase 2 — pickup (one step higher)
        [440, 1.56, 0.09, 0.18],  // A4
        [554, 1.65, 0.09, 0.18],  // C#5
        [659, 1.74, 0.09, 0.18],  // E5
        // Phrase 2 — main hit
        [880, 1.83, 0.38, 0.26],  // A5
        // Phrase 2 — final ascending run
        [659, 2.28, 0.12, 0.18],  // E5
        [740, 2.40, 0.12, 0.18],  // F#5
        [831, 2.52, 0.12, 0.18],  // G#5
        [880, 2.64, 0.85, 0.30],  // A5 — held final note
      ];

      notes.forEach(([freq, start, dur, vol]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        const t = ctx.currentTime + start;
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.02);
        gain.gain.setValueAtTime(vol, t + dur * 0.72);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc.start(t);
        osc.stop(t + dur + 0.01);
      });
    });
  }

  // Click sound for UI buttons
  click() {
    this.play((ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    });
  }
}

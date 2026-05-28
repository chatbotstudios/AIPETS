export class AudioSynth {
  private ctx: AudioContext | null = null;

  private init() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  playBeep(freq: number, duration: number, type: OscillatorType = 'sine') {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playSuccessArpeggio() {
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playBeep(freq, 0.25, 'triangle');
      }, idx * 80);
    });
  }

  playErrorWarning() {
    this.init();
    if (!this.ctx) return;

    this.playBeep(180, 0.2, 'sawtooth');
    setTimeout(() => {
      this.playBeep(150, 0.25, 'sawtooth');
    }, 120);
  }

  playSpaceyChime() {
    this.init();
    if (!this.ctx) return;

    const notes = [880, 987.77, 1174.66, 1318.51]; // A5, B5, D6, E6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playBeep(freq, 0.4, 'sine');
      }, idx * 100);
    });
  }
}

export const audioSynth = new AudioSynth();

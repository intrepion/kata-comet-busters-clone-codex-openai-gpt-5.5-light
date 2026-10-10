export class ArcadeAudio {
  private context: AudioContext | null = null;

  constructor(private muted: boolean) {}

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  blip(kind: "fire" | "hit" | "life" | "wave"): void {
    if (this.muted) {
      return;
    }
    const context = this.getContext();
    if (!context) {
      return;
    }
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequency = kind === "fire" ? 640 : kind === "hit" ? 220 : kind === "life" ? 120 : 480;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.type = kind === "life" ? "sawtooth" : "triangle";
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContextCtor();
    }
    return this.context;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

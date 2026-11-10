/** Pitidos de confirmación: permiten saber qué ha pasado sin mirar la pantalla. */

let ctx: AudioContext | null = null;

/** Debe llamarse desde un gesto del usuario (clic) para que el navegador permita el audio. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
  } catch {
    ctx = null;
  }
}

const TONES = {
  ok: [660, 880],
  saved: [740, 740],
  skip: [330],
  done: [523, 659, 784],
} as const;

export type Tone = keyof typeof TONES;

export function beep(tone: Tone) {
  if (!ctx) return;
  const start = ctx.currentTime;
  TONES[tone].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.frequency.value = freq;
    const t = start + i * 0.12;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

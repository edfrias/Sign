/**
 * Lógica de práctica y calibración "manos libres": se alimenta con un fotograma cada vez
 * y decide sola cuándo validar, saltar, grabar o pasar al siguiente signo.
 * Sin React ni DOM, para poder probarla con tiempos simulados.
 */
import { jitter } from './classifier';

// ---------------------------------------------------------------- Práctica

export interface PracticeOptions {
  /** Tiempo que hay que mantener el signo correcto */
  holdMs: number;
  /** Fallos breves de detección tolerados sin reiniciar el contador */
  graceMs: number;
  /** Tiempo con la mano visible antes de saltar el signo */
  timeoutMs: number;
  /** Duración del mensaje de acierto/salto antes de pasar al siguiente */
  feedbackMs: number;
}

export const PRACTICE_DEFAULTS: PracticeOptions = { holdMs: 1000, graceMs: 300, timeoutMs: 20000, feedbackMs: 1500 };

export type PracticePhase = 'signing' | 'success' | 'skipped' | 'finished';
export type PracticeEvent = 'success' | 'skipped' | 'next' | 'finished';
export type Outcome = 'ok' | 'skipped';

export interface PracticeSnapshot {
  index: number;
  signId?: string;
  phase: PracticePhase;
  /** 0–1: cuánto llevas mantenido el signo correcto */
  hold: number;
  /** ms restantes antes de saltar */
  remainingMs: number;
  results: ReadonlyMap<string, Outcome>;
}

export class PracticeSession {
  private index = 0;
  private phase: PracticePhase = 'signing';
  private holdStart: number | null = null;
  private lastOk = -Infinity;
  private activeMs = 0;
  private lastFrame: number | null = null;
  private phaseUntil = 0;
  private hold = 0;
  private readonly results = new Map<string, Outcome>();

  constructor(
    readonly signIds: readonly string[],
    private readonly opts: PracticeOptions = PRACTICE_DEFAULTS,
  ) {
    if (signIds.length === 0) this.phase = 'finished';
  }

  /** Procesa un fotograma. Devuelve el evento ocurrido, si lo hay. */
  update(now: number, handVisible: boolean, correct: boolean): PracticeEvent | null {
    const dt = this.lastFrame === null ? 0 : Math.max(0, now - this.lastFrame);
    this.lastFrame = now;

    if (this.phase === 'finished') return null;
    if (this.phase === 'success' || this.phase === 'skipped') {
      return now >= this.phaseUntil ? this.advance() : null;
    }

    if (handVisible) this.activeMs += dt;
    if (correct) {
      this.lastOk = now;
      this.holdStart ??= now;
    } else if (now - this.lastOk > this.opts.graceMs) {
      this.holdStart = null;
    }
    this.hold = this.holdStart === null ? 0 : Math.min(1, (now - this.holdStart) / this.opts.holdMs);

    if (this.hold >= 1) return this.finishCurrent('ok', now);
    if (this.activeMs >= this.opts.timeoutMs) return this.finishCurrent('skipped', now);
    return null;
  }

  /** Saltar a mano (por ejemplo con la barra espaciadora). */
  skip(now: number): PracticeEvent | null {
    return this.phase === 'signing' ? this.finishCurrent('skipped', now) : null;
  }

  snapshot(): PracticeSnapshot {
    return {
      index: this.index,
      signId: this.signIds[this.index],
      phase: this.phase,
      hold: this.hold,
      remainingMs: Math.max(0, this.opts.timeoutMs - this.activeMs),
      results: this.results,
    };
  }

  private finishCurrent(outcome: Outcome, now: number): PracticeEvent {
    this.results.set(this.signIds[this.index]!, outcome);
    this.phase = outcome === 'ok' ? 'success' : 'skipped';
    this.phaseUntil = now + this.opts.feedbackMs;
    return outcome === 'ok' ? 'success' : 'skipped';
  }

  private advance(): PracticeEvent {
    this.index += 1;
    this.holdStart = null;
    this.lastOk = -Infinity;
    this.activeMs = 0;
    this.hold = 0;
    if (this.index >= this.signIds.length) {
      this.phase = 'finished';
      return 'finished';
    }
    this.phase = 'signing';
    return 'next';
  }
}

// ---------------------------------------------------------------- Calibración

export interface CalibrationOptions {
  /** Tiempo para colocar la mano tras mostrar un signo nuevo */
  prepareMs: number;
  /** Tiempo que la mano debe estar quieta antes de grabar */
  stableMs: number;
  /** Dispersión máxima para considerar la mano quieta (unidades de palma) */
  maxJitter: number;
  /** Fotogramas en la ventana de estabilidad */
  window: number;
  /** Tiempo de grabación por signo (independiente de los fotogramas por segundo del dispositivo) */
  captureMs: number;
  /** Máximo de muestras guardadas por signo */
  maxSamples: number;
  feedbackMs: number;
}

export const CALIBRATION_DEFAULTS: CalibrationOptions = {
  prepareMs: 1500,
  stableMs: 800,
  maxJitter: 0.08,
  window: 6,
  captureMs: 1000,
  maxSamples: 40,
  feedbackMs: 1200,
};

export type CalibrationPhase = 'preparing' | 'waiting' | 'capturing' | 'saved' | 'finished';

export interface CalibrationSnapshot {
  index: number;
  signId?: string;
  phase: CalibrationPhase;
  /** 0–1 dentro de la fase actual */
  progress: number;
  saved: ReadonlySet<string>;
}

export type CalibrationEvent =
  | { type: 'captured'; signId: string; vectors: number[][] }
  | { type: 'finished' };

export class CalibrationSession {
  private index = 0;
  private phase: CalibrationPhase = 'preparing';
  private phaseStart: number | null = null;
  private stableSince: number | null = null;
  private recent: number[][] = [];
  private captured: number[][] = [];
  private progress = 0;
  private readonly saved = new Set<string>();

  constructor(
    readonly signIds: readonly string[],
    private readonly opts: CalibrationOptions = CALIBRATION_DEFAULTS,
  ) {
    if (signIds.length === 0) this.phase = 'finished';
  }

  /** `vector` es la mano normalizada del fotograma, o null si no hay mano. */
  update(now: number, vector: number[] | null): CalibrationEvent | null {
    this.phaseStart ??= now;
    const elapsed = now - this.phaseStart;

    switch (this.phase) {
      case 'finished':
        return null;

      case 'preparing':
        this.progress = Math.min(1, elapsed / this.opts.prepareMs);
        if (elapsed >= this.opts.prepareMs) this.enter('waiting', now);
        return null;

      case 'waiting': {
        if (!vector) {
          this.recent = [];
          this.stableSince = null;
          this.progress = 0;
          return null;
        }
        this.recent.push(vector);
        if (this.recent.length > this.opts.window) this.recent.shift();
        const still = this.recent.length === this.opts.window && jitter(this.recent) <= this.opts.maxJitter;
        if (!still) this.stableSince = null;
        else this.stableSince ??= now;
        this.progress = this.stableSince === null ? 0 : Math.min(1, (now - this.stableSince) / this.opts.stableMs);
        if (this.progress >= 1) this.enter('capturing', now);
        return null;
      }

      case 'capturing':
        if (!vector) {
          // Se perdió la mano: volver a esperar sin guardar nada a medias
          this.enter('waiting', now);
          return null;
        }
        if (this.captured.length < this.opts.maxSamples) this.captured.push(vector);
        this.progress = Math.min(1, elapsed / this.opts.captureMs);
        if (elapsed >= this.opts.captureMs) {
          const signId = this.signIds[this.index]!;
          const result: CalibrationEvent = { type: 'captured', signId, vectors: this.captured };
          this.saved.add(signId);
          this.enter('saved', now);
          return result;
        }
        return null;

      case 'saved':
        this.progress = 1;
        if (elapsed >= this.opts.feedbackMs) {
          this.index += 1;
          if (this.index >= this.signIds.length) {
            this.enter('finished', now);
            return { type: 'finished' };
          }
          this.enter('preparing', now);
        }
        return null;
    }
  }

  snapshot(): CalibrationSnapshot {
    return {
      index: this.index,
      signId: this.signIds[this.index],
      phase: this.phase,
      progress: this.progress,
      saved: this.saved,
    };
  }

  private enter(phase: CalibrationPhase, now: number) {
    this.phase = phase;
    this.phaseStart = now;
    this.stableSince = null;
    this.recent = [];
    this.captured = [];
    this.progress = 0;
  }
}

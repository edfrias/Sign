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
  /** Duración del mensaje de acierto antes de pasar al siguiente */
  feedbackMs: number;
  /**
   * Duración del mensaje de salto. Más larga que la de acierto: es el momento de comparar
   * tu mano con la foto modelo, que se resalta mientras dura.
   */
  skipFeedbackMs?: number;
}

export const PRACTICE_DEFAULTS: PracticeOptions = {
  holdMs: 1000,
  graceMs: 300,
  timeoutMs: 20000,
  feedbackMs: 1500,
  skipFeedbackMs: 3000,
};

/**
 * Hueco máximo entre dos fotogramas que aún se considera práctica continua. Por encima, la sesión
 * ha estado interrumpida. Generoso a propósito: un equipo lento a 1 fps debe poder validar letras.
 */
export const MAX_FRAME_GAP_MS = 2000;

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
    const gap = this.lastFrame === null ? 0 : Math.max(0, now - this.lastFrame);
    this.lastFrame = now;

    if (this.phase === 'finished') return null;
    if (this.phase === 'success' || this.phase === 'skipped') {
      return now >= this.phaseUntil ? this.advance() : null;
    }

    // Un hueco largo entre fotogramas es una interrupción (pestaña en segundo plano, equipo
    // bloqueado), no tiempo de práctica: ni cuenta para saltar ni completa la barra de mantener.
    const interrupted = gap > MAX_FRAME_GAP_MS;
    if (interrupted) this.holdStart = null;
    else if (handVisible) this.activeMs += gap;
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
    this.phaseUntil =
      now + (outcome === 'skipped' ? (this.opts.skipFeedbackMs ?? this.opts.feedbackMs) : this.opts.feedbackMs);
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

export type CalibrationPhase = 'preparing' | 'waiting' | 'capturing' | 'saved' | 'rejected' | 'finished';

/** Intentos por letra antes de pasar a la siguiente sin guardar nada. */
export const CALIBRATION_ATTEMPTS = 2;

export interface CalibrationSnapshot {
  index: number;
  signId?: string;
  phase: CalibrationPhase;
  /** 0–1 dentro de la fase actual */
  progress: number;
  saved: ReadonlySet<string>;
  /** Intento actual para esta letra (1…CALIBRATION_ATTEMPTS) */
  attempt: number;
  /** En fase 'rejected': si tras el aviso se pasa a la siguiente letra (no quedan intentos) */
  givingUp: boolean;
}

export type CalibrationEvent =
  | { type: 'captured'; signId: string; vectors: number[][] }
  | { type: 'rejected'; signId: string; givingUp: boolean }
  | { type: 'finished' };

/**
 * Decide si lo grabado se parece lo bastante a la letra pedida para guardarlo como calibración.
 * Evita que una forma equivocada quede registrada como «calibrada con tu mano».
 */
export type CalibrationCheck = (signId: string, vectors: number[][]) => boolean;

export class CalibrationSession {
  private index = 0;
  private phase: CalibrationPhase = 'preparing';
  private phaseStart: number | null = null;
  private stableSince: number | null = null;
  private recent: number[][] = [];
  private captured: number[][] = [];
  private progress = 0;
  private attempt = 1;
  private givingUp = false;
  private readonly saved = new Set<string>();

  constructor(
    readonly signIds: readonly string[],
    private readonly opts: CalibrationOptions = CALIBRATION_DEFAULTS,
    private readonly check?: CalibrationCheck,
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
          if (this.check && !this.check(signId, this.captured)) {
            this.givingUp = this.attempt >= CALIBRATION_ATTEMPTS;
            this.enter('rejected', now);
            return { type: 'rejected', signId, givingUp: this.givingUp };
          }
          const result: CalibrationEvent = { type: 'captured', signId, vectors: this.captured };
          this.saved.add(signId);
          this.enter('saved', now);
          return result;
        }
        return null;

      case 'rejected':
        this.progress = 1;
        if (elapsed >= this.opts.feedbackMs * 2) {
          if (this.givingUp) return this.next(now);
          this.attempt += 1; // otro intento con la misma letra
          this.enter('preparing', now);
        }
        return null;

      case 'saved':
        this.progress = 1;
        if (elapsed >= this.opts.feedbackMs) return this.next(now);
        return null;
    }
  }

  private next(now: number): CalibrationEvent | null {
    this.index += 1;
    this.attempt = 1;
    this.givingUp = false;
    if (this.index >= this.signIds.length) {
      this.enter('finished', now);
      return { type: 'finished' };
    }
    this.enter('preparing', now);
    return null;
  }

  snapshot(): CalibrationSnapshot {
    return {
      index: this.index,
      signId: this.signIds[this.index],
      phase: this.phase,
      progress: this.progress,
      saved: this.saved,
      attempt: this.attempt,
      givingUp: this.givingUp,
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

// ---------------------------------------------------------------- Inactividad

export interface IdleOptions {
  /** Sin mano a la vista durante este tiempo: preguntar «¿Sigues ahí?» */
  idleMs: number;
  /** Sin mano durante este tiempo: apagar la cámara (privacidad y batería) */
  abandonMs: number;
}

export const IDLE_DEFAULTS: IdleOptions = { idleMs: 30_000, abandonMs: 180_000 };

export type IdleState = 'active' | 'idle' | 'abandoned';

/**
 * Detecta cuándo no hay nadie delante de la cámara. Manos libres: vuelve a 'active' en cuanto
 * aparece una mano, sin que haya que tocar nada. Las pausas largas entre fotogramas (pestaña en
 * segundo plano) no cuentan como tiempo sin mano.
 */
export class IdleTracker {
  private lastHand: number | null = null;
  private lastFrame: number | null = null;
  private absentMs = 0;

  constructor(private readonly opts: IdleOptions = IDLE_DEFAULTS) {}

  update(now: number, handVisible: boolean): IdleState {
    const gap = this.lastFrame === null ? 0 : Math.max(0, now - this.lastFrame);
    this.lastFrame = now;
    if (handVisible) {
      this.lastHand = now;
      this.absentMs = 0;
      return 'active';
    }
    this.lastHand ??= now;
    if (gap <= MAX_FRAME_GAP_MS) this.absentMs += gap;
    if (this.absentMs >= this.opts.abandonMs) return 'abandoned';
    if (this.absentMs >= this.opts.idleMs) return 'idle';
    return 'active';
  }
}

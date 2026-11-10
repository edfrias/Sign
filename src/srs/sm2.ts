/** Repetición espaciada basada en SM-2 (SuperMemo 2). */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_EASE = 1.3;

export interface ReviewState {
  signId: string;
  lang: string;
  ease: number;
  /** Intervalo en días */
  interval: number;
  repetitions: number;
  /** Fecha de próximo repaso (ms desde epoch) */
  due: number;
}

/** Calidad de la respuesta: 0 = no lo sabía … 5 = perfecto. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function newReview(signId: string, lang: string, now: number): ReviewState {
  return { signId, lang, ease: 2.5, interval: 0, repetitions: 0, due: now };
}

export function review(state: ReviewState, quality: Quality, now: number): ReviewState {
  let { ease, interval, repetitions } = state;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }

  ease = Math.max(MIN_EASE, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  return { ...state, ease, interval, repetitions, due: now + interval * DAY_MS };
}

export function isDue(state: ReviewState, now: number): boolean {
  return state.due <= now;
}

import { describe, expect, it } from 'vitest';
import { DAY_MS, MIN_EASE, isDue, newReview, review } from './sm2';

const NOW = 1_700_000_000_000;

describe('SM-2', () => {
  it('un signo nuevo está pendiente de inmediato', () => {
    expect(isDue(newReview('x', 'lse', NOW), NOW)).toBe(true);
  });

  it('respuestas correctas siguen la secuencia 1, 6, 6×ease días', () => {
    let s = newReview('x', 'lse', NOW);
    s = review(s, 4, NOW);
    expect(s.interval).toBe(1);
    s = review(s, 4, NOW);
    expect(s.interval).toBe(6);
    s = review(s, 4, NOW);
    expect(s.interval).toBe(Math.round(6 * s.ease));
    expect(s.due).toBe(NOW + s.interval * DAY_MS);
  });

  it('un fallo reinicia las repeticiones y vuelve a 1 día', () => {
    let s = newReview('x', 'lse', NOW);
    s = review(review(review(s, 5, NOW), 5, NOW), 5, NOW);
    s = review(s, 1, NOW);
    expect(s.repetitions).toBe(0);
    expect(s.interval).toBe(1);
  });

  it('la facilidad nunca baja del mínimo', () => {
    let s = newReview('x', 'lse', NOW);
    for (let i = 0; i < 20; i++) s = review(s, 0, NOW);
    expect(s.ease).toBe(MIN_EASE);
  });
});

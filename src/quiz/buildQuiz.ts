import type { Sign } from '../content/types';

export interface Question {
  sign: Sign;
  options: Sign[];
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Una pregunta por signo objetivo, con hasta `optionCount` opciones.
 * Los distractores se eligen primero de la misma categoría (más difícil y más útil).
 */
export function buildQuiz(targets: Sign[], pool: Sign[], optionCount = 4, random = Math.random): Question[] {
  return shuffle(targets, random).map((sign) => {
    const others = pool.filter((s) => s.id !== sign.id);
    const same = shuffle(others.filter((s) => s.category === sign.category), random);
    const rest = shuffle(others.filter((s) => s.category !== sign.category), random);
    const distractors = [...same, ...rest].slice(0, optionCount - 1);
    return { sign, options: shuffle([sign, ...distractors], random) };
  });
}

import type { Sign } from '../content/types';

/**
 * - `recognize`: se ve el signo (foto) y se elige la palabra.
 * - `recall`: se da la palabra y se elige la foto, el ejercicio inverso.
 */
export type QuestionKind = 'recognize' | 'recall';

export interface Question {
  kind: QuestionKind;
  sign: Sign;
  options: Sign[];
}

export interface QuizOptions {
  optionCount?: number;
  random?: () => number;
  /** Proporción aproximada de preguntas «recordar» (solo para signos con foto). */
  recallShare?: number;
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const key = (s: Sign) => s.gloss.toLocaleLowerCase('es');
const media = (s: Sign) => s.media?.video ?? s.media?.image;

/** Hasta `count` distractores, primero de la misma categoría, sin glosas repetidas. */
function pickDistractors(sign: Sign, candidates: Sign[], count: number, random: () => number): Sign[] {
  const same = shuffle(candidates.filter((s) => s.category === sign.category), random);
  const rest = shuffle(candidates.filter((s) => s.category !== sign.category), random);
  const used = new Set([key(sign)]);
  const distractors: Sign[] = [];
  for (const s of [...same, ...rest]) {
    if (distractors.length >= count) break;
    if (used.has(key(s))) continue;
    used.add(key(s));
    distractors.push(s);
  }
  return distractors;
}

/**
 * Una pregunta por signo objetivo, con hasta `optionCount` opciones.
 * Los distractores se eligen primero de la misma categoría (más difícil y más útil).
 * Nunca se ofrecen dos respuestas que podrían ser correctas a la vez:
 * - misma glosa: variantes («Bañador» y su variante 2) o palabras de temas distintos («Naranja» fruta y color);
 * - misma foto o vídeo que el signo preguntado: palabras que se signan igual («Fruta» y «Manzana»).
 * Las preguntas «recordar» solo usan signos con foto, en la pregunta y en todas las opciones.
 */
export function buildQuiz(targets: Sign[], pool: Sign[], options: QuizOptions = {}): Question[] {
  const { optionCount = 4, random = Math.random, recallShare = 0.5 } = options;
  return shuffle(targets, random).map((sign): Question => {
    const targetMedia = media(sign);
    const others = pool.filter(
      (s) => s.id !== sign.id && key(s) !== key(sign) && !(targetMedia && media(s) === targetMedia),
    );

    if (sign.media?.image && random() < recallShare) {
      const withPhoto = pickDistractors(sign, others.filter((s) => s.media?.image), optionCount - 1, random);
      // Con menos de 4 fotos distintas, mejor reconocer que un «elige entre dos»
      if (withPhoto.length === optionCount - 1) {
        return { kind: 'recall', sign, options: shuffle([sign, ...withPhoto], random) };
      }
    }
    const distractors = pickDistractors(sign, others, optionCount - 1, random);
    return { kind: 'recognize', sign, options: shuffle([sign, ...distractors], random) };
  });
}

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

const key = (s: Sign) => s.gloss.toLocaleLowerCase('es');
const media = (s: Sign) => s.media?.video ?? s.media?.image;

/**
 * Una pregunta por signo objetivo, con hasta `optionCount` opciones.
 * Los distractores se eligen primero de la misma categoría (más difícil y más útil).
 * Nunca se ofrecen dos respuestas que podrían ser correctas a la vez:
 * - misma glosa: variantes («Bañador» y su variante 2) o palabras de temas distintos («Naranja» fruta y color);
 * - misma foto o vídeo que el signo preguntado: palabras que se signan igual («Fruta» y «Manzana»).
 */
export function buildQuiz(targets: Sign[], pool: Sign[], optionCount = 4, random = Math.random): Question[] {
  return shuffle(targets, random).map((sign) => {
    const targetMedia = media(sign);
    const others = pool.filter(
      (s) => s.id !== sign.id && key(s) !== key(sign) && !(targetMedia && media(s) === targetMedia),
    );
    const same = shuffle(others.filter((s) => s.category === sign.category), random);
    const rest = shuffle(others.filter((s) => s.category !== sign.category), random);
    const used = new Set([key(sign)]);
    const distractors: Sign[] = [];
    for (const s of [...same, ...rest]) {
      if (distractors.length >= optionCount - 1) break;
      if (used.has(key(s))) continue;
      used.add(key(s));
      distractors.push(s);
    }
    return { sign, options: shuffle([sign, ...distractors], random) };
  });
}

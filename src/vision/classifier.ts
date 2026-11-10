/** Clasificador por vecino más cercano contra plantillas grabadas por el usuario. */

export interface Template {
  signId: string;
  vector: number[];
}

export interface Match {
  signId: string;
  /** Distancia media por punto, en unidades de "longitud de palma" */
  distance: number;
  /** 0–100 */
  score: number;
}

/** Distancia a partir de la cual la puntuación es 0. Ajustar con pruebas reales. */
export const MAX_DISTANCE = 0.5;
/** Puntuación mínima para dar el signo por correcto. */
export const PASS_SCORE = 60;

/** Distancia euclídea media por punto (cada punto son 3 coordenadas). */
export function landmarkDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectores de distinta longitud');
  let total = 0;
  for (let i = 0; i < a.length; i += 3) {
    total += Math.hypot(a[i]! - b[i]!, a[i + 1]! - b[i + 1]!, a[i + 2]! - b[i + 2]!);
  }
  return total / (a.length / 3);
}

export function distanceToScore(distance: number): number {
  return Math.round(100 * Math.max(0, 1 - distance / MAX_DISTANCE));
}

/** Devuelve cada signo con su plantilla más cercana, ordenado de mejor a peor. */
export function rankSigns(vector: number[], templates: Template[]): Match[] {
  const best = new Map<string, number>();
  for (const t of templates) {
    const d = landmarkDistance(vector, t.vector);
    const prev = best.get(t.signId);
    if (prev === undefined || d < prev) best.set(t.signId, d);
  }
  return [...best.entries()]
    .map(([signId, distance]) => ({ signId, distance, score: distanceToScore(distance) }))
    .sort((a, b) => a.distance - b.distance);
}

export interface Evaluation {
  /** Puntuación respecto al signo objetivo (undefined si no tiene plantillas) */
  target?: Match;
  /** El signo calibrado que más se parece */
  best?: Match;
  correct: boolean;
}

export function evaluate(vector: number[], templates: Template[], targetSignId: string): Evaluation {
  const ranking = rankSigns(vector, templates);
  const target = ranking.find((m) => m.signId === targetSignId);
  const best = ranking[0];
  const correct = !!target && best?.signId === targetSignId && target.score >= PASS_SCORE;
  return { target, best, correct };
}

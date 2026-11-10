/** Clasificador por vecino más cercano contra plantillas (de referencia y del usuario). */

export interface Template {
  signId: string;
  vector: number[];
}

export interface Match {
  signId: string;
  /** Distancia media por punto, en unidades de "longitud de palma" */
  distance: number;
  /** Parecido 0–100, solo para mostrar */
  score: number;
}

/**
 * Distancia máxima a la plantilla del signo objetivo para darlo por bueno.
 * Valores iniciales: ajustarlos con pruebas reales de cámara.
 */
export const TOLERANCE = {
  estricta: 0.25,
  normal: 0.35,
  flexible: 0.45,
} as const;
export type Tolerance = keyof typeof TOLERANCE;

/** Distancia a partir de la cual el parecido mostrado es 0. */
const DISPLAY_MAX_DISTANCE = 0.7;

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
  return Math.round(100 * Math.max(0, 1 - distance / DISPLAY_MAX_DISTANCE));
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
  /** Coincidencia con el signo objetivo (undefined si no tiene plantillas) */
  target?: Match;
  /** El signo que más se parece */
  best?: Match;
  correct: boolean;
}

/** Correcto si el signo más parecido es el objetivo y está lo bastante cerca. */
export function evaluate(
  vector: number[],
  templates: Template[],
  targetSignId: string,
  maxDistance: number = TOLERANCE.normal,
): Evaluation {
  const ranking = rankSigns(vector, templates);
  const target = ranking.find((m) => m.signId === targetSignId);
  const best = ranking[0];
  const correct = !!target && best?.signId === targetSignId && target.distance <= maxDistance;
  return { target, best, correct };
}

export type Proximity = 'muy-cerca' | 'cerca' | 'lejos';

/**
 * Cercanía al signo objetivo en tres niveles, en lugar de un porcentaje: el clasificador no es tan
 * preciso como para que "58 %" signifique algo. "Muy cerca" = dentro de la tolerancia elegida.
 */
export function proximity(distance: number | undefined, maxDistance: number): Proximity {
  if (distance === undefined) return 'lejos';
  if (distance <= maxDistance) return 'muy-cerca';
  if (distance <= maxDistance * 1.6) return 'cerca';
  return 'lejos';
}

/** Dispersión media de una ventana de vectores respecto a su media (mano quieta → valor bajo). */
export function jitter(vectors: number[][]): number {
  const n = vectors.length;
  const first = vectors[0];
  if (!first || n < 2) return Infinity;
  const mean = new Array<number>(first.length).fill(0);
  for (const v of vectors) for (let i = 0; i < v.length; i++) mean[i]! += v[i]! / n;
  return vectors.reduce((acc, v) => acc + landmarkDistance(v, mean), 0) / n;
}

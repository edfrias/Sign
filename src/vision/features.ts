/** Convierte los 21 puntos de MediaPipe en un vector comparable entre personas y posiciones. */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type Handedness = 'Left' | 'Right';

export const LANDMARK_COUNT = 21;
const WRIST = 0;
const MIDDLE_MCP = 9;

/**
 * - Traslada la muñeca al origen (independiente de dónde esté la mano en la imagen).
 * - Escala por la longitud muñeca → nudillo del corazón (independiente de la distancia a la cámara).
 * - Refleja la mano izquierda para que coincida con la derecha (independiente de la mano dominante).
 * No rota: la orientación distingue signos.
 */
export function normalizeHand(landmarks: Landmark[], handedness: Handedness): number[] {
  if (landmarks.length !== LANDMARK_COUNT) {
    throw new Error(`Se esperaban ${LANDMARK_COUNT} puntos, llegaron ${landmarks.length}`);
  }
  const wrist = landmarks[WRIST]!;
  const mid = landmarks[MIDDLE_MCP]!;
  const scale = Math.hypot(mid.x - wrist.x, mid.y - wrist.y, mid.z - wrist.z) || 1;
  const flip = handedness === 'Left' ? -1 : 1;

  const out = new Array<number>(LANDMARK_COUNT * 3);
  landmarks.forEach((p, i) => {
    out[i * 3] = (flip * (p.x - wrist.x)) / scale;
    out[i * 3 + 1] = (p.y - wrist.y) / scale;
    out[i * 3 + 2] = (p.z - wrist.z) / scale;
  });
  return out;
}

/** Media elemento a elemento de varios vectores (suaviza el temblor entre fotogramas). */
export function averageVectors(vectors: number[][]): number[] {
  const first = vectors[0];
  if (!first) return [];
  const sum = new Array<number>(first.length).fill(0);
  for (const v of vectors) for (let i = 0; i < v.length; i++) sum[i]! += v[i]!;
  return sum.map((x) => x / vectors.length);
}

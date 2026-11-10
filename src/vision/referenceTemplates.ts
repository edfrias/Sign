import type { Sign } from '../content/types';
import type { Template } from './classifier';
import { normalizeHand, type Handedness } from './features';
import { getHandLandmarker } from './handLandmarker';

export interface ReferenceResult {
  templates: Template[];
  /** Signos estáticos cuya foto no permitió detectar la mano */
  missing: string[];
}

const cache = new Map<string, Promise<ReferenceResult>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

/**
 * Plantillas de referencia obtenidas de las fotos de cada signo estático.
 * Permiten validar sin calibración previa; la calibración del usuario las complementa.
 */
export function getReferenceTemplates(cacheKey: string, signs: Sign[]): Promise<ReferenceResult> {
  let result = cache.get(cacheKey);
  if (!result) {
    result = (async () => {
      const landmarker = await getHandLandmarker('IMAGE');
      const templates: Template[] = [];
      const missing: string[] = [];
      for (const sign of signs) {
        if (sign.kind !== 'static' || !sign.media?.image) continue;
        const img = await loadImage(sign.media.image);
        const res = landmarker.detect(img);
        const hand = res.landmarks[0];
        const side = res.handedness[0]?.[0]?.categoryName as Handedness | undefined;
        if (hand && side) templates.push({ signId: sign.id, vector: normalizeHand(hand, side) });
        else missing.push(sign.id);
      }
      return { templates, missing };
    })().catch((err) => {
      cache.delete(cacheKey);
      throw err;
    });
    cache.set(cacheKey, result);
  }
  return result;
}

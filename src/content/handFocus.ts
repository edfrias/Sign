import type { HandFocus } from './types';

/** Caja de las manos en la foto, en fracciones 0–1. */
export interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Fracción del círculo que deben ocupar las manos: margen para ver dedos y muñeca. */
const FILL = 0.7;
export const MIN_SCALE = 1.6;
export const MAX_SCALE = 3.2;

const round = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** De la caja de las manos al foco del zoom: centro de la caja y ampliación (entre 1,6× y 3,2×). */
export function focusFromBox(box: Box): HandFocus {
  const side = Math.max(box.maxX - box.minX, box.maxY - box.minY, 0.01);
  return {
    x: round((box.minX + box.maxX) / 2),
    y: round((box.minY + box.maxY) / 2),
    scale: round(clamp(FILL / side, MIN_SCALE, MAX_SCALE)),
  };
}

/**
 * Posición del zoom: la imagen se amplía `scale` veces y se desplaza para centrar el foco,
 * sin dejar ver nada fuera de la foto. Devuelve el desplazamiento en % del círculo.
 */
export function zoomTransform(focus: HandFocus, fallbackScale = 2.8) {
  const scale = clamp(focus.scale ?? fallbackScale, 1, MAX_SCALE);
  const half = 0.5 / scale; // media ventana visible, en fracción de la foto
  const x = clamp(focus.x, half, 1 - half);
  const y = clamp(focus.y, half, 1 - half);
  return { scale, left: round((0.5 - x * scale) * 100), top: round((0.5 - y * scale) * 100) };
}

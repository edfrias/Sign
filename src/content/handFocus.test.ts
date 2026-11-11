import { describe, expect, it } from 'vitest';
import { MAX_SCALE, MIN_SCALE, focusFromBox, zoomTransform } from './handFocus';

describe('focusFromBox', () => {
  it('centra la caja y amplía para que las manos ocupen el 70 % del círculo', () => {
    expect(focusFromBox({ minX: 0.4, maxX: 0.6, minY: 0.5, maxY: 0.75 })).toEqual({ x: 0.5, y: 0.625, scale: 2.8 });
  });

  it('limita la ampliación a [1,6×, 3,2×]', () => {
    expect(focusFromBox({ minX: 0.5, maxX: 0.51, minY: 0.5, maxY: 0.51 }).scale).toBe(MAX_SCALE);
    expect(focusFromBox({ minX: 0, maxX: 0.9, minY: 0.2, maxY: 0.5 }).scale).toBe(MIN_SCALE);
  });
});

describe('zoomTransform', () => {
  it('desplaza la foto para que el foco quede en el centro del círculo', () => {
    // foco (0,5, 0,5) a 2×: la foto mide 200 % y empieza en -50 %
    expect(zoomTransform({ x: 0.5, y: 0.5, scale: 2 })).toEqual({ scale: 2, left: -50, top: -50 });
  });

  it('no deja ver nada fuera de la foto cuando el foco está en un borde', () => {
    const t = zoomTransform({ x: 0, y: 1, scale: 2 });
    expect(t.left).toBe(0); // borde izquierdo de la foto pegado al del círculo
    expect(t.top).toBe(-100); // borde inferior de la foto pegado al del círculo
  });

  it('usa 2,8× si no hay escala', () => {
    expect(zoomTransform({ x: 0.5, y: 0.5 }).scale).toBe(2.8);
  });
});

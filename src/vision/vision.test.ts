import { describe, expect, it } from 'vitest';
import { averageVectors, normalizeHand, type Landmark } from './features';
import { evaluate, landmarkDistance, rankSigns } from './classifier';

/** Mano sintética: los puntos se separan de la muñeca según `spread`. */
function fakeHand(spread: number, offset = { x: 0.5, y: 0.5 }, size = 0.2): Landmark[] {
  return Array.from({ length: 21 }, (_, i) => ({
    x: offset.x + size * (i === 9 ? 0 : Math.cos(i * spread) * (i / 21)),
    y: offset.y + size * (i === 9 ? -1 : Math.sin(i * spread) * (i / 21)),
    z: 0,
  }));
}

describe('normalizeHand', () => {
  it('no depende de la posición ni del tamaño de la mano en la imagen', () => {
    const a = normalizeHand(fakeHand(0.3), 'Right');
    const b = normalizeHand(fakeHand(0.3, { x: 0.1, y: 0.8 }, 0.05), 'Right');
    expect(landmarkDistance(a, b)).toBeLessThan(1e-9);
  });

  it('la mano izquierda reflejada coincide con la derecha', () => {
    const right = fakeHand(0.3);
    const left = right.map((p) => ({ ...p, x: 1 - p.x }));
    expect(landmarkDistance(normalizeHand(right, 'Right'), normalizeHand(left, 'Left'))).toBeLessThan(1e-9);
  });

  it('rechaza un número de puntos incorrecto', () => {
    expect(() => normalizeHand([], 'Right')).toThrow();
  });
});

describe('clasificador', () => {
  const A = normalizeHand(fakeHand(0.3), 'Right');
  const B = normalizeHand(fakeHand(1.2), 'Right');
  const templates = [
    { signId: 'A', vector: A },
    { signId: 'B', vector: B },
  ];

  it('identifica el signo más parecido', () => {
    expect(rankSigns(A, templates)[0]?.signId).toBe('A');
    expect(rankSigns(B, templates)[0]?.signId).toBe('B');
  });

  it('una coincidencia exacta puntúa 100 y es correcta', () => {
    const r = evaluate(A, templates, 'A');
    expect(r.target?.score).toBe(100);
    expect(r.correct).toBe(true);
  });

  it('hacer otro signo no cuenta como correcto', () => {
    expect(evaluate(B, templates, 'A').correct).toBe(false);
  });

  it('sin plantillas del objetivo no hay puntuación', () => {
    expect(evaluate(A, templates, 'C').target).toBeUndefined();
  });
});

describe('averageVectors', () => {
  it('promedia elemento a elemento', () => {
    expect(averageVectors([[0, 2], [2, 4]])).toEqual([1, 3]);
  });
});

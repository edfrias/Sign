import { describe, expect, it } from 'vitest';
import type { Sign } from '../content/types';
import { buildQuiz } from './buildQuiz';

const sign = (id: string, category: string): Sign => ({ id, gloss: id, category, kind: 'static', description: {} });
const pool = [sign('a', 'x'), sign('b', 'x'), sign('c', 'x'), sign('d', 'y'), sign('e', 'y')];

describe('buildQuiz', () => {
  it('cada pregunta incluye la respuesta correcta y opciones distintas', () => {
    for (const q of buildQuiz(pool, pool)) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.id)).toContain(q.sign.id);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
    }
  });

  it('prioriza distractores de la misma categoría', () => {
    const [q] = buildQuiz([pool[0]!], pool);
    const sameCategory = q!.options.filter((o) => o.category === 'x');
    expect(sameCategory).toHaveLength(3);
  });

  it('con pocos signos genera menos opciones sin fallar', () => {
    const [q] = buildQuiz([pool[0]!], pool.slice(0, 2));
    expect(q!.options).toHaveLength(2);
  });
});

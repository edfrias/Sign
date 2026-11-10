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

  it('nunca muestra dos opciones con la misma glosa', () => {
    const dup = [
      sign('comida', 'x'),
      { ...sign('comida-2', 'x'), gloss: 'comida', variant: 'Variante 2' },
      { ...sign('naranja-fruta', 'x'), gloss: 'naranja' },
      { ...sign('naranja-color', 'y'), gloss: 'naranja' },
      sign('pan', 'x'),
      sign('sal', 'x'),
    ];
    for (let i = 0; i < 50; i++) {
      for (const q of buildQuiz(dup, dup)) {
        const glosses = q.options.map((o) => o.gloss);
        expect(new Set(glosses).size).toBe(glosses.length);
      }
    }
  });

  it('no ofrece como distractor un signo con la misma foto', () => {
    const img = (id: string, image: string): Sign => ({ ...sign(id, 'x'), media: { image } });
    const fruits = [img('fruta', '/m/manzana.webp'), img('manzana', '/m/manzana.webp'), img('pera', '/m/pera.webp'), img('uva', '/m/uva.webp'), img('sandia', '/m/sandia.webp')];
    for (let i = 0; i < 50; i++) {
      const [q] = buildQuiz([fruits[0]!], fruits);
      expect(q!.options.map((o) => o.id)).not.toContain('manzana');
    }
  });

  it('con pocos signos genera menos opciones sin fallar', () => {
    const [q] = buildQuiz([pool[0]!], pool.slice(0, 2));
    expect(q!.options).toHaveLength(2);
  });
});

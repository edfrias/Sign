import { describe, expect, it } from 'vitest';
import type { Unit } from '../content/types';
import { nextLesson, reviewMinutes } from './today';

const unit = (id: string, lessons: string[]): Unit => ({
  id,
  title: id,
  description: '',
  lessons: lessons.map((l) => ({ id: l, title: l, signIds: [] })),
});
const units = [unit('alfabeto', ['a1', 'a2', 'a3']), unit('saludos', ['s1', 's2'])];

describe('nextLesson', () => {
  it('sin progreso propone la primera lección del curso', () => {
    const next = nextLesson(units, new Set());
    expect(next?.lesson.id).toBe('a1');
    expect(next).toMatchObject({ lessonIndex: 0, unitDone: 0, started: false });
  });

  it('propone la primera lección sin completar y cuenta las hechas de su unidad', () => {
    const next = nextLesson(units, new Set(['a1', 'a3']));
    expect(next?.lesson.id).toBe('a2');
    expect(next).toMatchObject({ lessonIndex: 1, unitDone: 2, started: true });
  });

  it('pasa a la unidad siguiente cuando la actual está completa', () => {
    const next = nextLesson(units, new Set(['a1', 'a2', 'a3']));
    expect(next?.unit.id).toBe('saludos');
    expect(next).toMatchObject({ lessonIndex: 0, unitDone: 0, started: true });
  });

  it('devuelve null con todo completado', () => {
    expect(nextLesson(units, new Set(['a1', 'a2', 'a3', 's1', 's2']))).toBeNull();
  });
});

describe('reviewMinutes', () => {
  it('nunca baja de 1 minuto', () => {
    expect(reviewMinutes(1)).toBe(1);
  });

  it('se limita a una sesión de repaso', () => {
    expect(reviewMinutes(8)).toBe(2);
    expect(reviewMinutes(500)).toBe(reviewMinutes(10));
  });
});

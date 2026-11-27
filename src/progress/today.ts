import type { Lesson, Unit } from '../content/types';

/** Preguntas como máximo en una sesión de quiz o repaso. */
export const SESSION_SIZE = 10;
/** Tiempo medio estimado por pregunta de repaso (mirar la foto y elegir). */
const SECONDS_PER_QUESTION = 15;

export interface NextLesson {
  unit: Unit;
  lesson: Lesson;
  /** Posición de la lección dentro de su unidad (desde 0) */
  lessonIndex: number;
  /** Lecciones completadas de esa unidad */
  unitDone: number;
  /** true si ya hay alguna lección completada en la lengua: «Continúa» en vez de «Empieza» */
  started: boolean;
}

/**
 * Siguiente lección: la primera no completada, en el orden del curso.
 * `null` si ya están todas hechas (o no hay lecciones).
 */
export function nextLesson(units: Unit[], completed: ReadonlySet<string>): NextLesson | null {
  const started = units.some((u) => u.lessons.some((l) => completed.has(l.id)));
  for (const unit of units) {
    const lessonIndex = unit.lessons.findIndex((l) => !completed.has(l.id));
    if (lessonIndex === -1) continue;
    return {
      unit,
      lesson: unit.lessons[lessonIndex]!,
      lessonIndex,
      unitDone: unit.lessons.filter((l) => completed.has(l.id)).length,
      started,
    };
  }
  return null;
}

/** Minutos aproximados de la próxima sesión de repaso (como mínimo 1). */
export function reviewMinutes(dueCount: number): number {
  const questions = Math.min(dueCount, SESSION_SIZE);
  return Math.max(1, Math.ceil((questions * SECONDS_PER_QUESTION) / 60));
}

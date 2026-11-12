import { Link } from 'react-router-dom';
import type { Unit } from '../content/types';
import { CheckIcon, ReviewIcon } from './icons';

/**
 * Camino vertical de una unidad: lecciones hechas (✓), la actual destacada con su botón
 * y el resto numeradas. Todo está desbloqueado: cualquier lección se puede abrir.
 * Al final, el repaso de la unidad.
 */
export function LessonPath({ unit, completed }: { unit: Unit; completed: ReadonlySet<string> }) {
  const currentId = unit.lessons.find((l) => !completed.has(l.id))?.id;

  return (
    <ol className="path">
      {unit.lessons.map((lesson, i) => {
        const done = completed.has(lesson.id);
        const current = lesson.id === currentId;
        return (
          <li key={lesson.id} className={`path-step ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`}>
            <span className="path-node" aria-hidden="true">{done ? <CheckIcon /> : i + 1}</span>
            <div className="path-body">
              <Link to={`/leccion/${lesson.id}`} className="path-link">
                <span className="path-title">{lesson.title}</span>
                <span className="path-meta">
                  {lesson.signIds.length} signos
                  {done && ' · Hecha'}
                  {current && ' · Siguiente'}
                </span>
              </Link>
              {current && (
                <Link to={`/leccion/${lesson.id}`} className="button primary path-cta" aria-label={`Empezar ${lesson.title}`}>
                  Empezar
                </Link>
              )}
              {done && (
                <Link to={`/quiz/${lesson.id}`} className="path-quiz" aria-label={`Quiz de ${lesson.title}`}>
                  Quiz
                </Link>
              )}
            </div>
          </li>
        );
      })}
      <li className="path-step is-review">
        <span className="path-node" aria-hidden="true"><ReviewIcon /></span>
        <div className="path-body">
          <Link to={`/quiz/unidad/${unit.id}`} className="path-link">
            <span className="path-title">Repaso de la unidad</span>
            <span className="path-meta">Preguntas de todas las lecciones de «{unit.title}»</span>
          </Link>
        </div>
      </li>
    </ol>
  );
}

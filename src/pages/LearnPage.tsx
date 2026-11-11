import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useLanguage } from '../state/LanguageContext';

/** Aprender: todas las unidades y lecciones (todo desbloqueado). */
export function LearnPage() {
  const { lang, content } = useLanguage();
  const completed = useLiveQuery(
    async () => new Set((await db.progress.where('lang').equals(lang).toArray()).map((p) => p.lessonId)),
    [lang],
  );
  return (
    <>
      <header className="page-head">
        <h1>Aprender</h1>
        <p className="muted">{content.language.name}</p>
      </header>

      <p className="muted">
        {content.signs.length} signos en {content.units.length} unidades
        {completed && completed.size > 0 && ` · ${completed.size} ${completed.size === 1 ? 'lección completada' : 'lecciones completadas'}`}
      </p>

      {content.units.map((unit, unitIndex) => {
        const doneCount = unit.lessons.filter((l) => completed?.has(l.id)).length;
        const total = unit.lessons.length;
        const started = doneCount > 0 && doneCount < total;
        // Abiertas: la primera unidad si aún no hay progreso, y las que estén a medias
        const open = started || (unitIndex === 0 && !completed?.size);
        return (
        <details key={unit.id} className="unit" open={open}>
          <summary>
            <span className="unit-title">
              <h2>{unit.title}</h2>
              <span className="muted">{unit.description}</span>
            </span>
            <span className={`badge ${doneCount === total ? 'ok' : ''}`}>
              {doneCount} de {total} {total === 1 ? 'lección' : 'lecciones'}
            </span>
          </summary>
          <ul className="lesson-list">
            {unit.lessons.map((lesson) => {
              const done = completed?.has(lesson.id);
              return (
                <li key={lesson.id} className="card lesson-item">
                  <div>
                    <strong>{lesson.title}</strong>
                    <span className="muted"> · {lesson.signIds.length} signos</span>
                    {done && <span className="badge ok">Completada</span>}
                  </div>
                  <div className="actions">
                    <Link to={`/leccion/${lesson.id}`} className="button">{done ? 'Ver' : 'Empezar'}</Link>
                    {done && <Link to={`/quiz/${lesson.id}`} className="button">Quiz</Link>}
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
        );
      })}
    </>
  );
}

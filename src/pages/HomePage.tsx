import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useLanguage } from '../state/LanguageContext';

export function HomePage() {
  const { lang, content } = useLanguage();
  const completed = useLiveQuery(
    async () => new Set((await db.progress.where('lang').equals(lang).toArray()).map((p) => p.lessonId)),
    [lang],
  );
  const dueCount = useLiveQuery(
    () => db.reviews.where('due').belowOrEqual(Date.now()).filter((r) => r.lang === lang).count(),
    [lang],
  );

  return (
    <>
      <section className="hero">
        <h1>{content.language.name}</h1>
        <p>{content.language.region}</p>
        {!!dueCount && (
          <Link to="/repaso" className="button primary">
            Repasar {dueCount} {dueCount === 1 ? 'signo' : 'signos'}
          </Link>
        )}
      </section>

      {content.units.map((unit) => (
        <section key={unit.id} className="unit">
          <h2>{unit.title}</h2>
          <p className="muted">{unit.description}</p>
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
        </section>
      ))}
    </>
  );
}

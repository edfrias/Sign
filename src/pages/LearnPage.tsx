import { Link } from 'react-router-dom';
import { useLanguage } from '../state/LanguageContext';
import { useCompletedLessons, useLearnedSigns } from '../progress/hooks';
import { nextLesson } from '../progress/today';
import { LessonPath } from '../components/LessonPath';
import { UnitRow, isAlphabetUnit, unitPreview } from '../components/UnitRow';
import { PhotoCredit } from '../components/PhotoCredit';

/** Aprender: progreso global, la unidad en curso como camino y el resto de unidades. */
export function LearnPage() {
  const { lang, content } = useLanguage();
  const completed = useCompletedLessons(lang);
  const learned = useLearnedSigns(lang);

  if (!completed) return null; // un instante, mientras se lee el progreso

  const totalLessons = content.units.reduce((n, u) => n + u.lessons.length, 0);
  const current = nextLesson(content.units, completed)?.unit ?? content.units[0];
  const others = content.units.filter((u) => u !== current);
  const doneIn = (lessons: { id: string }[]) => lessons.filter((l) => completed.has(l.id)).length;

  return (
    <>
      <header className="page-head">
        <h1>Aprender</h1>
        <p className="muted">{content.language.name}</p>
      </header>

      <section className="learn-summary" aria-label="Tu progreso">
        <p>
          <strong>{completed.size}</strong> de {totalLessons} lecciones
          <span className="muted"> · </span>
          <strong>{learned?.size ?? 0}</strong> de {content.signs.length} signos
        </p>
        <span className="bar" aria-hidden="true">
          <span style={{ width: `${(completed.size / Math.max(totalLessons, 1)) * 100}%` }} />
        </span>
      </section>

      {current && (
        <section className="learn-current" aria-labelledby="unidad-actual">
          <div className="section-head">
            <div>
              <p className="label muted">Unidad actual</p>
              <h2 id="unidad-actual">{current.title}</h2>
              <p className="muted">{current.description}</p>
            </div>
            <Link to={`/aprender/${current.id}`} className="button">
              {isAlphabetUnit(content, current) ? 'Ver las letras' : 'Ver la unidad'}
            </Link>
          </div>
          <LessonPath unit={current} completed={completed} />
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="otras-unidades">
          <h2 id="otras-unidades" className="section-title">Otras unidades</h2>
          <ul className="unit-list">
            {others.map((u) => (
              <li key={u.id}>
                <UnitRow content={content} unit={u} done={doneIn(u.lessons)} />
              </li>
            ))}
          </ul>
          {others.some((u) => unitPreview(content, u)) && <PhotoCredit />}
        </section>
      )}
    </>
  );
}

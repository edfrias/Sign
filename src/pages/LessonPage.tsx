import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { findLesson } from '../content/loader';
import { completeLesson } from '../db/actions';
import { useLanguage } from '../state/LanguageContext';
import { SignDescriptionList, SignLinks, SignMedia, UnverifiedBadge } from '../components/SignCard';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const { lang, content } = useLanguage();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const found = findLesson(content, lessonId);
  if (!found) return <p>Esta lección no existe en {content.language.short}. <Link to="/">Volver</Link></p>;

  const { unit, lesson } = found;
  const signs = lesson.signIds.flatMap((id) => content.signById.get(id) ?? []);
  const sign = signs[index];
  const isLast = index === signs.length - 1;

  async function finish() {
    await completeLesson(lang, lesson.id, lesson.signIds);
    navigate(`/quiz/${lesson.id}`);
  }

  if (!sign) return <p>La lección no tiene signos.</p>;

  return (
    <section className="lesson">
      <p className="muted">{unit.title} · {lesson.title}</p>
      <progress value={index + 1} max={signs.length} aria-label="Progreso de la lección" />

      <article className="card lesson-sign">
        <SignMedia sign={sign} />
        <div>
          <h1>{sign.gloss} <UnverifiedBadge sign={sign} /></h1>
          <SignDescriptionList sign={sign} />
          <SignLinks sign={sign} />
          {sign.kind === 'static' && (
            <Link to={`/practica?signo=${encodeURIComponent(sign.id)}`} className="button">Practicar con cámara</Link>
          )}
        </div>
      </article>

      <div className="actions spread">
        <button type="button" className="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Anterior
        </button>
        <span className="muted">{index + 1} / {signs.length}</span>
        {isLast ? (
          <button type="button" className="button primary" onClick={finish}>Completar y hacer quiz</button>
        ) : (
          <button type="button" className="button primary" onClick={() => setIndex((i) => i + 1)}>Siguiente</button>
        )}
      </div>
    </section>
  );
}

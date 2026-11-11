import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { findLesson } from '../content/loader';
import { completeLesson } from '../db/actions';
import { useLanguage } from '../state/LanguageContext';
import { FocusBar } from '../components/FocusLayout';
import { SignDescriptionList, SignLinks, SignMedia, UnverifiedBadge, VariantLabel } from '../components/SignCard';
import { ArrowLeftIcon, CameraIcon, MoveIcon } from '../components/icons';

type View = 'full' | 'hand';

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const [params] = useSearchParams();
  const { lang, content } = useLanguage();
  const navigate = useNavigate();

  const found = findLesson(content, lessonId);
  const signs = found ? found.lesson.signIds.flatMap((id) => content.signById.get(id) ?? []) : [];
  // ?signo=… abre la lección por ese signo (desde la cuadrícula del alfabeto)
  const startIndex = Math.max(0, signs.findIndex((s) => s.id === params.get('signo')));
  const [index, setIndex] = useState(startIndex);
  const [view, setView] = useState<View>('full');

  useEffect(() => setIndex(startIndex), [lessonId, startIndex]);

  const sign = signs[index];
  const isLast = index === signs.length - 1;
  const go = (delta: number) => setIndex((i) => Math.min(signs.length - 1, Math.max(0, i + delta)));

  // Flechas del teclado para pasar de signo (salvo si se está escribiendo o en un control)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!found) {
    return (
      <>
        <FocusBar exitTo="/aprender" exitLabel="Salir a Aprender" />
        <section className="hero">
          <h1>Lección no encontrada</h1>
          <p className="muted">Esta lección no existe en {content.language.short} o ha cambiado de nombre.</p>
          <Link to="/aprender" className="button primary">Ver las lecciones</Link>
        </section>
      </>
    );
  }

  const { unit, lesson } = found;

  async function finish() {
    await completeLesson(lang, lesson.id, lesson.signIds);
    navigate(`/quiz/${lesson.id}`);
  }

  if (!sign) return <p>La lección no tiene signos.</p>;
  const canZoom = !!sign.handFocus && !!sign.media?.image;

  return (
    <section className="lesson">
      <FocusBar exitTo={`/aprender/${unit.id}`} exitLabel={`Salir a ${unit.title}`}>
        <span className="segments" aria-hidden="true">
          {signs.map((s, i) => (
            <span key={s.id} className={i < index ? 'is-done' : i === index ? 'is-current' : ''} />
          ))}
        </span>
        <span className="lesson-count">
          <span aria-hidden="true">{index + 1}/{signs.length}</span>
          <span className="visually-hidden">Signo {index + 1} de {signs.length}</span>
        </span>
      </FocusBar>

      <article className="lesson-layout">
        <header className="lesson-head">
          <p className="muted lesson-context">{unit.title} · {lesson.title}</p>
          <h1 className="gloss">{sign.gloss} <VariantLabel sign={sign} /></h1>
          <ul className="sign-badges">
            {sign.kind === 'static' ? (
              <>
                <li className="badge">Estático</li>
                <li className="badge"><CameraIcon /> Cámara</li>
              </>
            ) : (
              <li className="badge"><MoveIcon /> Con movimiento</li>
            )}
            {sign.verified === false && <li><UnverifiedBadge sign={sign} /></li>}
          </ul>
        </header>

        <div className="lesson-media">
          {canZoom && (
            <div className="segmented" role="group" aria-label="Vista de la foto">
              <button type="button" aria-pressed={view === 'full'} onClick={() => setView('full')}>Signo completo</button>
              <button type="button" aria-pressed={view === 'hand'} onClick={() => setView('hand')}>Solo la mano</button>
            </div>
          )}
          <SignMedia sign={sign} handZoom view={canZoom ? view : 'full'} />
        </div>

        <div className="lesson-details">
          <SignDescriptionList sign={sign} />
          <SignLinks sign={sign} />
        </div>
      </article>

      <nav className="lesson-bar" aria-label="Pasar de signo">
        <div className="lesson-bar-inner">
          <button type="button" className="icon-button bordered" disabled={index === 0} onClick={() => go(-1)} aria-label="Signo anterior">
            <ArrowLeftIcon />
          </button>
          {sign.kind === 'static' && (
            <Link to={`/practica?signo=${encodeURIComponent(sign.id)}`} className="button">
              <CameraIcon /> Probar
            </Link>
          )}
          {isLast ? (
            <button type="button" className="button primary lesson-next" onClick={finish}>Completar y hacer quiz</button>
          ) : (
            <button type="button" className="button primary lesson-next" onClick={() => go(1)}>Siguiente</button>
          )}
        </div>
      </nav>
    </section>
  );
}

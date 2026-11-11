import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { LanguageContent, Unit } from '../content/types';
import { useLanguage } from '../state/LanguageContext';
import { useCompletedLessons, useLearnedSigns } from '../progress/hooks';
import { LessonPath } from '../components/LessonPath';
import { isAlphabetUnit } from '../components/UnitRow';
import { ArrowLeftIcon, CameraIcon, CheckIcon, MoveIcon } from '../components/icons';

/** /aprender/:unitId — el camino de lecciones de una unidad; el alfabeto, además, como cuadrícula. */
export function UnitPage() {
  const { unitId = '' } = useParams();
  const { lang, content } = useLanguage();
  const completed = useCompletedLessons(lang);
  const unit = content.units.find((u) => u.id === unitId);

  if (!unit) {
    return (
      <section className="hero">
        <h1>Unidad no encontrada</h1>
        <p className="muted">Esta unidad no existe en {content.language.short} o ha cambiado de nombre.</p>
        <Link to="/aprender" className="button primary">Ver las unidades</Link>
      </section>
    );
  }
  if (!completed) return null;

  const done = unit.lessons.filter((l) => completed.has(l.id)).length;
  return (
    <>
      <Link to="/aprender" className="back-link"><ArrowLeftIcon /> Aprender</Link>
      <header className="page-head">
        <h1>{unit.title}</h1>
        <p className="muted">{unit.description} · {done} de {unit.lessons.length} lecciones hechas</p>
      </header>

      {isAlphabetUnit(content, unit) && <AlphabetGrid content={content} unit={unit} lang={lang} />}

      <section aria-labelledby="unidad-lecciones">
        <h2 id="unidad-lecciones" className="section-title">Lecciones</h2>
        <LessonPath unit={unit} completed={completed} />
      </section>
    </>
  );
}

type Filter = 'all' | 'static' | 'dynamic';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'static', label: 'Estáticas' },
  { id: 'dynamic', label: 'Con movimiento' },
];

/** Las letras del alfabeto en cuadrícula de 5: aprendida, estática (se practica con cámara) o con movimiento. */
function AlphabetGrid({ content, unit, lang }: { content: LanguageContent; unit: Unit; lang: string }) {
  const learned = useLearnedSigns(lang);
  const [filter, setFilter] = useState<Filter>('all');

  const letters = unit.lessons.flatMap((lesson) =>
    lesson.signIds.flatMap((id) => {
      const sign = content.signById.get(id);
      return sign ? [{ sign, lessonId: lesson.id }] : [];
    }),
  );
  const shown = letters.filter(({ sign }) => filter === 'all' || sign.kind === filter);
  const learnedCount = letters.filter(({ sign }) => learned?.has(sign.id)).length;
  const hasStatic = letters.some(({ sign }) => sign.kind === 'static');

  return (
    <section className="alphabet" aria-labelledby="letras-titulo">
      <div className="section-head">
        <div>
          <h2 id="letras-titulo" className="section-title">Letras</h2>
          <p className="muted">{learnedCount} de {letters.length} aprendidas</p>
        </div>
        {hasStatic && (
          <Link to="/practica" className="button primary"><CameraIcon /> Deletrear con cámara</Link>
        )}
      </div>

      <div className="segmented" role="group" aria-label="Filtrar letras">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <ul className="legend" aria-label="Leyenda">
        <li><span className="legend-icon is-ok"><CheckIcon /></span> Aprendida</li>
        <li><span className="legend-icon"><CameraIcon /></span> Estática: se practica con cámara</li>
        <li><span className="legend-icon"><MoveIcon /></span> Con movimiento</li>
      </ul>

      <ul className="letter-grid">
        {shown.map(({ sign, lessonId }) => {
          const isLearned = learned?.has(sign.id);
          const status = [
            isLearned ? 'aprendida' : 'sin aprender',
            sign.kind === 'static' ? 'estática, se practica con cámara' : 'con movimiento',
          ].join(', ');
          return (
            <li key={sign.id}>
              <Link
                to={`/leccion/${lessonId}?signo=${encodeURIComponent(sign.id)}`}
                className={`letter-cell ${isLearned ? 'is-learned' : ''}`}
                aria-label={`${sign.gloss}: ${status}`}
              >
                <span className="letter-glyph">{sign.gloss}</span>
                <span className="letter-icons" aria-hidden="true">
                  {sign.kind === 'static' ? <CameraIcon /> : <MoveIcon />}
                  {isLearned && <span className="is-ok"><CheckIcon /></span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

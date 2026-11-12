import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Sign } from '../content/types';
import { useLanguage } from '../state/LanguageContext';
import { useLearnedSigns } from '../progress/hooks';
import { HandZoom } from '../components/HandZoom';
import { PhotoCredit } from '../components/PhotoCredit';
import { VariantLabel } from '../components/SignCard';
import { CameraIcon, CheckIcon, DictionaryIcon } from '../components/icons';

const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function DictionaryPage() {
  const { lang, content } = useLanguage();
  const learned = useLearnedSigns(lang);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => [...new Set(content.signs.map((s) => s.category))], [content]);
  // Cada tarjeta abre la lección del signo, por ese signo (allí está la foto completa con su atribución)
  const lessonOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of content.units) for (const l of unit.lessons) for (const id of l.signIds) if (!map.has(id)) map.set(id, l.id);
    return map;
  }, [content]);

  const q = normalize(query.trim());
  const results = content.signs.filter((s) => (!category || s.category === category) && normalize(s.gloss).includes(q));
  const hasPhotos = results.some((s) => s.media?.image);

  return (
    <section className="dictionary">
      <header className="page-head">
        <h1>Diccionario</h1>
        <p className="muted">{content.language.name} · {content.signs.length} signos</p>
      </header>

      <label className="search">
        <span className="visually-hidden">Buscar palabra</span>
        <DictionaryIcon />
        <input type="search" placeholder="Buscar palabra…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      <div className="chips" role="group" aria-label="Categoría">
        <button type="button" className="chip" aria-pressed={category === ''} onClick={() => setCategory('')}>Todas</button>
        {categories.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="dict-meta">
        <p role="status">{results.length} {results.length === 1 ? 'signo' : 'signos'}</p>
        <ul className="legend" aria-label="Leyenda">
          <li><span className="is-ok"><CheckIcon /></span> Aprendido</li>
          <li><CameraIcon /> Se practica con cámara</li>
        </ul>
      </div>

      {results.length === 0 ? (
        <p className="muted">Ningún signo coincide. Prueba con otra palabra o con «Todas» las categorías.</p>
      ) : (
        <>
          {hasPhotos && <PhotoCredit />}
          <ul className="dict-grid">
            {results.map((s) => (
              <li key={s.id}>
                <DictCard sign={s} learned={!!learned?.has(s.id)} lessonId={lessonOf.get(s.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DictCard({ sign, learned, lessonId }: { sign: Sign; learned: boolean; lessonId?: string }) {
  const body = (
    <>
      <span className="dict-photo">
        {sign.media?.image ? (
          <>
            <img src={sign.media.image} alt="" loading="lazy" />
            <HandZoom sign={sign} className="media-zoom" />
          </>
        ) : (
          <span className="dict-photo-empty">Sin foto</span>
        )}
      </span>
      <span className="dict-name">
        <span className="dict-gloss">{sign.gloss} <VariantLabel sign={sign} /></span>
        <span className="dict-icons">
          {learned && <span className="is-ok"><CheckIcon /></span>}
          {sign.kind === 'static' && <CameraIcon />}
        </span>
        <span className="visually-hidden">
          {learned ? ', aprendido' : ''}
          {sign.kind === 'static' ? ', se practica con cámara' : ''}
        </span>
      </span>
    </>
  );
  return lessonId ? (
    <Link to={`/leccion/${lessonId}?signo=${encodeURIComponent(sign.id)}`} className="dict-card">{body}</Link>
  ) : (
    <div className="dict-card">{body}</div>
  );
}

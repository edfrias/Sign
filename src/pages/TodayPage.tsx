import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useLanguage } from '../state/LanguageContext';

/**
 * Hoy: la portada. Versión mínima del paso 2 del rediseño (repaso, aprender, cámara);
 * la tarjeta «Continúa» con la lección en curso llega en el paso 3.
 */
export function TodayPage() {
  const { lang, content } = useLanguage();
  const dueCount = useLiveQuery(
    () => db.reviews.where('due').belowOrEqual(Date.now()).filter((r) => r.lang === lang).count(),
    [lang],
  );
  const hasStatic = content.signs.some((s) => s.kind === 'static');

  return (
    <>
      <header className="page-head">
        <h1>Hoy</h1>
        <p className="muted">{content.language.name}</p>
      </header>

      <div className="today-cards">
        <section className="card today-card" aria-labelledby="hoy-repaso">
          <h2 id="hoy-repaso">Repaso</h2>
          {dueCount ? (
            <>
              <p>{dueCount} {dueCount === 1 ? 'signo pendiente' : 'signos pendientes'} de repasar.</p>
              <Link to="/repaso" className="button primary">Repasar</Link>
            </>
          ) : (
            <p className="muted">Nada pendiente por ahora. Los signos de cada lección vuelven aquí cuando toca repasarlos.</p>
          )}
        </section>

        <section className="card today-card" aria-labelledby="hoy-aprender">
          <h2 id="hoy-aprender">Aprender</h2>
          <p className="muted">{content.signs.length} signos en {content.units.length} unidades.</p>
          <Link to="/aprender" className={dueCount ? 'button' : 'button primary'}>Ver las lecciones</Link>
        </section>

        {hasStatic && (
          <section className="card today-card" aria-labelledby="hoy-camara">
            <h2 id="hoy-camara">Cámara</h2>
            <p className="muted">Comprueba tu configuración de la mano con las letras estáticas del alfabeto.</p>
            <Link to="/practica" className="button">Practicar con cámara</Link>
          </section>
        )}
      </div>
    </>
  );
}

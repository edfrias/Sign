import { getContent, languages } from '../content/loader';
import { LICENSE_URLS } from '../content/licenses';
import type { Sign } from '../content/types';

const BANCO_LSE = 'https://www.fundacioncnse.org/educa/bancolse/';
const FUNDACION_CNSE = 'https://www.fundacioncnse.org/';

/** Todo el material de terceros incluido en la app, agrupado por autoría y licencia. */
function thirdPartyMedia() {
  const groups = new Map<string, { credit: string; license?: string; items: { lang: string; sign: Sign }[] }>();
  for (const lang of languages) {
    for (const sign of getContent(lang.id).signs) {
      const credit = sign.media?.credit;
      if (!credit) continue;
      const key = `${credit}|${sign.media?.license ?? ''}`;
      if (!groups.has(key)) groups.set(key, { credit, license: sign.media?.license, items: [] });
      groups.get(key)!.items.push({ lang: lang.short, sign });
    }
  }
  return [...groups.values()];
}

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

function SourceList({ items }: { items: { lang: string; sign: Sign }[] }) {
  return (
    <details>
      <summary>Página original de cada imagen ({items.length})</summary>
      <ul className="credit-list">
        {items.map(({ lang, sign }) => (
          <li key={sign.id}>
            <span>{lang} · {sign.gloss}</span>{' '}
            {sign.source?.startsWith('http') ? <a href={sign.source} {...ext}>{sign.source}</a> : sign.source}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function CreditsPage() {
  const groups = thirdPartyMedia();

  return (
    <section className="credits">
      <h1>Créditos y licencias</h1>
      <p>
        Sign es un proyecto personal, educativo y sin ánimo de lucro. Respeta las condiciones de uso de cada
        fuente: solo incluye material cuya licencia lo permite, citando su autoría, y el resto únicamente lo enlaza.
      </p>

      <h2>Imágenes de signos incluidas en la app</h2>
      {groups.map((g) => g.credit.startsWith('Fundación CNSE') ? (
        <article key={g.credit + g.license} className="card credit-block">
          <h3>Banco de imágenes y signos LSE — Fundación CNSE</h3>
          <dl className="desc">
            <div>
              <dt>Autoría</dt>
              <dd>
                <a href={FUNDACION_CNSE} {...ext}>Fundación CNSE para la Supresión de las Barreras de Comunicación</a>.
                Obra financiada por el Ministerio de Educación y Formación Profesional, Fundación ONCE y Fundación
                Solidaridad Carrefour.
              </dd>
            </div>
            <div>
              <dt>Fuente</dt>
              <dd><a href={BANCO_LSE} {...ext}>{BANCO_LSE}</a></dd>
            </div>
            <div>
              <dt>Licencia</dt>
              <dd>
                {g.license && LICENSE_URLS[g.license] ? (
                  <a href={LICENSE_URLS[g.license]} {...ext} rel="noopener noreferrer license">
                    Creative Commons Reconocimiento-NoComercial-CompartirIgual 3.0 ({g.license})
                  </a>
                ) : (
                  g.license
                )}
                . Uso educativo y no comercial.
              </dd>
            </div>
            <div>
              <dt>Cambios realizados</dt>
              <dd>
                Recortadas a 640×640 píxeles y convertidas a formato WebP. No se ha alterado el contenido y se
                conserva la marca de agua original. La app analiza estas fotos en el navegador para obtener la
                posición de la mano y usarla como referencia en la práctica con cámara.
              </dd>
            </div>
            <div>
              <dt>Licencia del contenido derivado</dt>
              <dd>Las imágenes y el contenido de signos de esta app se comparten con la misma licencia ({g.license}).</dd>
            </div>
          </dl>

          <SourceList items={g.items} />
        </article>
      ) : (
        <article key={g.credit + g.license} className="card credit-block">
          <h3>{g.credit}</h3>
          <p>
            Licencia:{' '}
            {g.license && LICENSE_URLS[g.license] ? <a href={LICENSE_URLS[g.license]} {...ext}>{g.license}</a> : g.license}
          </p>
          <SourceList items={g.items} />
        </article>
      ))}

      <p className="muted">
        Sign no está afiliada a la Fundación CNSE ni cuenta con su respaldo. Si eres titular de algún contenido y
        quieres que se retire o se corrija su atribución, se retirará de inmediato.
      </p>

      <h2>Fuentes consultadas (solo enlazadas)</h2>
      <p>De estas fuentes no se copia ni descarga contenido; la app solo enlaza a ellas.</p>
      <ul>
        <li>
          <a href="https://fundacioncnse-dilse.org/" {...ext}>DILSE</a>, diccionario normativo de la LSE de la
          Fundación CNSE, también disponible en{' '}
          <a href="https://dilse.bartol.es/" {...ext}>dilse.bartol.es</a>, una presentación no oficial de esos mismos datos.
        </li>
        <li><a href="https://www.spreadthesign.com/es.es/alphabet/22/" {...ext}>Spread the Sign</a>, European Sign Language Centre.</li>
        <li><a href="https://www.sematos.eu/es/lse" {...ext}>Sématos</a>.</li>
      </ul>

      <h2>Software</h2>
      <ul>
        <li>
          Detección de manos: <a href="https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker" {...ext}>MediaPipe Hand Landmarker</a>{' '}
          (Google), licencia Apache 2.0.
        </li>
        <li>React, React Router, Dexie y Vite, licencias MIT / Apache 2.0.</li>
      </ul>
    </section>
  );
}

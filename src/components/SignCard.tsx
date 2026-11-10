import { useState } from 'react';
import type { Sign } from '../content/types';

const LABELS: Record<string, string> = {
  handshape: 'Configuración',
  orientation: 'Orientación',
  location: 'Ubicación',
  movement: 'Movimiento',
  nonManual: 'Expresión',
};

function Credit({ sign, noLink }: { sign: Sign; noLink?: boolean }) {
  const media = sign.media;
  if (!media?.credit) return null;
  const text = `${media.credit}${media.license ? ` · ${media.license}` : ''}`;
  return (
    <figcaption>
      {!noLink && sign.source?.startsWith('http') ? (
        <a href={sign.source} target="_blank" rel="noopener noreferrer">{text}</a>
      ) : (
        text
      )}
    </figcaption>
  );
}

export function SignLinks({ sign }: { sign: Sign }) {
  if (!sign.links?.length) return null;
  return (
    <p className="links">
      Ver en:{' '}
      {sign.links.map((l, i) => (
        <span key={l.url}>
          {i > 0 && ' · '}
          <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
        </span>
      ))}
    </p>
  );
}

/** `hideAnswer`: en los quizzes, no revelar la glosa en textos alternativos ni enlaces. */
export function SignMedia({ sign, hideAnswer }: { sign: Sign; hideAnswer?: boolean }) {
  const [slow, setSlow] = useState(false);
  const media = sign.media;
  const label = hideAnswer ? 'Signo a adivinar' : `Signo ${sign.gloss}`;

  if (media?.video) {
    return (
      <figure className="media">
        <video
          key={media.video}
          src={media.video}
          poster={media.image}
          autoPlay
          loop
          muted
          playsInline
          ref={(el) => {
            if (el) el.playbackRate = slow ? 0.5 : 1;
          }}
          aria-label={`Vídeo: ${label}`}
        />
        <button type="button" className="chip" onClick={() => setSlow((s) => !s)}>
          {slow ? 'Velocidad normal' : 'Más lento (0,5×)'}
        </button>
        <Credit sign={sign} noLink={hideAnswer} />
      </figure>
    );
  }
  if (media?.image) {
    return (
      <figure className="media">
        <img src={media.image} alt={label} loading="lazy" />
        <Credit sign={sign} noLink={hideAnswer} />
      </figure>
    );
  }
  return (
    <div className="media media-empty" role="img" aria-label={`Sin vídeo: ${label}`}>
      <span aria-hidden="true">✋</span>
      <small>Sin vídeo todavía</small>
    </div>
  );
}

export function SignDescriptionList({ sign }: { sign: Sign }) {
  const entries = Object.entries(sign.description).filter(([, v]) => v);
  if (entries.length === 0) {
    return sign.media ? <p className="muted desc">Fíjate en la imagen: es la referencia de este signo.</p> : null;
  }
  return (
    <dl className="desc">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt>{LABELS[k] ?? k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function UnverifiedBadge({ sign }: { sign: Sign }) {
  if (sign.verified !== false) return null;
  return (
    <span className="badge warn" title="Descripción pendiente de contrastar con un diccionario o una persona signante">
      Sin verificar
    </span>
  );
}

export function SignCard({ sign }: { sign: Sign }) {
  return (
    <article className="card sign-card">
      <SignMedia sign={sign} />
      <h3>
        {sign.gloss} <UnverifiedBadge sign={sign} />
      </h3>
      <SignDescriptionList sign={sign} />
      <SignLinks sign={sign} />
    </article>
  );
}

import { useState } from 'react';
import type { Sign } from '../content/types';

const LABELS: Record<string, string> = {
  handshape: 'Configuración',
  orientation: 'Orientación',
  location: 'Ubicación',
  movement: 'Movimiento',
  nonManual: 'Expresión',
};

export function SignMedia({ sign }: { sign: Sign }) {
  const [slow, setSlow] = useState(false);
  const media = sign.media;

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
          aria-label={`Vídeo del signo ${sign.gloss}`}
        />
        <button type="button" className="chip" onClick={() => setSlow((s) => !s)}>
          {slow ? 'Velocidad normal' : 'Más lento (0,5×)'}
        </button>
        {media.credit && <figcaption>{media.credit}{media.license && ` · ${media.license}`}</figcaption>}
      </figure>
    );
  }
  if (media?.image) {
    return (
      <figure className="media">
        <img src={media.image} alt={`Signo ${sign.gloss}`} />
        {media.credit && <figcaption>{media.credit}{media.license && ` · ${media.license}`}</figcaption>}
      </figure>
    );
  }
  return (
    <div className="media media-empty" role="img" aria-label={`Sin vídeo para ${sign.gloss}`}>
      <span aria-hidden="true">✋</span>
      <small>Sin vídeo todavía</small>
    </div>
  );
}

export function SignDescriptionList({ sign }: { sign: Sign }) {
  const entries = Object.entries(sign.description).filter(([, v]) => v);
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
    </article>
  );
}

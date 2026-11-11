import type { Sign } from '../content/types';
import { zoomTransform } from '../content/handFocus';

/**
 * Recorte circular ampliado de las manos de la foto. Decorativo (alt=""): el signo ya está
 * descrito en texto y la foto completa lleva su atribución al lado.
 * Sin `handFocus` (no se detectó la mano) no se muestra nada.
 */
export function HandZoom({ sign, className = '' }: { sign: Sign; className?: string }) {
  const image = sign.media?.image;
  if (!image || !sign.handFocus) return null;
  const { scale, left, top } = zoomTransform(sign.handFocus);
  return (
    <span className={`hand-zoom ${className}`}>
      <img
        src={image}
        alt=""
        loading="lazy"
        style={{ width: `${scale * 100}%`, left: `${left}%`, top: `${top}%` }}
      />
    </span>
  );
}

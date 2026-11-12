import { Link } from 'react-router-dom';
import type { LanguageContent, Unit } from '../content/types';
import { HandZoom } from './HandZoom';
import { CheckIcon } from './icons';

/** Primer signo de la unidad con la mano localizada: la «foto» de la unidad. */
export function unitPreview(content: LanguageContent, unit: Unit) {
  for (const lesson of unit.lessons) {
    for (const id of lesson.signIds) {
      const sign = content.signById.get(id);
      if (sign?.handFocus && sign.media?.image) return sign;
    }
  }
  return undefined;
}

/** Fila de unidad: foto, título, subtítulo y barra de lecciones hechas. */
export function UnitRow({ content, unit, done }: { content: LanguageContent; unit: Unit; done: number }) {
  const total = unit.lessons.length;
  const preview = unitPreview(content, unit);
  const complete = done === total;
  return (
    <Link to={`/aprender/${unit.id}`} className="unit-row">
      {preview ? <HandZoom sign={preview} className="unit-row-photo" /> : <span className="unit-row-photo" aria-hidden="true" />}
      <span className="unit-row-body">
        <span className="unit-row-title">{unit.title}</span>
        <span className="unit-row-sub">{unit.description}</span>
        <span className="unit-row-progress">
          <span className="bar" aria-hidden="true">
            <span style={{ width: `${(done / total) * 100}%` }} />
          </span>
          <span className={complete ? 'unit-row-count is-complete' : 'unit-row-count'}>
            {complete && <CheckIcon />}
            {done} de {total}
            <span className="visually-hidden"> lecciones hechas</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Unidad de dactilología (todas sus letras son de la categoría «Alfabeto»): se ve como cuadrícula. */
export function isAlphabetUnit(content: LanguageContent, unit: Unit) {
  const ids = unit.lessons.flatMap((l) => l.signIds);
  return ids.length > 0 && ids.every((id) => content.signById.get(id)?.category === 'Alfabeto');
}

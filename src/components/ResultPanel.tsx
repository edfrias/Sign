import { useEffect, useRef, useState } from 'react';
import type { Sign } from '../content/types';
import type { QuestionKind } from '../quiz/buildQuiz';
import { SignDescriptionList, SignMedia } from './SignCard';
import { CheckIcon, CloseIcon } from './icons';

/** Texto de una línea con lo que ha pasado: también es lo que se anuncia al lector de pantalla. */
export function resultMessage(correct: boolean, sign: Sign, kind: QuestionKind, comesBack: boolean) {
  if (correct) return `¡Correcto! Es «${sign.gloss}».`;
  const why = kind === 'recall' ? `«${sign.gloss}» es la foto marcada como correcta.` : `Era «${sign.gloss}».`;
  return `Casi. ${why}${comesBack ? ' Volverá a salir antes de terminar.' : ''}`;
}

/**
 * Panel inferior tras responder, común a «reconocer» y «recordar»: ✓ o ✕ con texto (nunca solo color),
 * una línea de explicación, «Continuar» y, si se ha fallado, «Ver signo» para repasarlo en el momento.
 */
export function ResultPanel({
  correct,
  sign,
  kind,
  comesBack,
  onContinue,
}: {
  correct: boolean;
  sign: Sign;
  kind: QuestionKind;
  comesBack: boolean;
  onContinue: () => void;
}) {
  const [showSign, setShowSign] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);

  // El botón pulsado queda desactivado: el foco pasa a «Continuar» para seguir con el teclado
  useEffect(() => continueRef.current?.focus(), []);

  const detail = resultMessage(correct, sign, kind, comesBack).replace(/^(¡Correcto!|Casi\.) /, '');
  return (
    <section className={`result-panel ${correct ? 'is-correct' : 'is-wrong'}`} aria-labelledby="resultado-titulo">
      <div className="result-inner">
        {showSign && (
          <div className="result-sign">
            <SignMedia sign={sign} handZoom />
            <SignDescriptionList sign={sign} />
          </div>
        )}
        <div className="result-row">
          <div className="result-text">
            <h2 id="resultado-titulo" className="result-title">
              <span className="result-icon">{correct ? <CheckIcon /> : <CloseIcon />}</span>
              {correct ? '¡Correcto!' : 'Casi'}
            </h2>
            <p>{detail}</p>
          </div>
          <div className="result-actions">
            {!correct && (
              <button type="button" className="button" aria-expanded={showSign} onClick={() => setShowSign((v) => !v)}>
                {showSign ? 'Ocultar signo' : 'Ver signo'}
              </button>
            )}
            <button ref={continueRef} type="button" className="button primary" onClick={onContinue}>
              Continuar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getContent, languages } from '../content/loader';
import { languageSummary } from '../content/summary';
import { useLanguage } from '../state/LanguageContext';
import { markWelcomed, useGoal } from '../progress/useStudy';
import { GoalChoice } from '../components/GoalChoice';
import { isAlphabetUnit } from '../components/UnitRow';

/** Primera vez: elegir lengua y ritmo diario, y empezar por la primera lección. Sin cuenta. */
export function WelcomePage() {
  const { lang, setLang } = useLanguage();
  const [goal, setGoal] = useGoal();
  const [chosen, setChosen] = useState(lang);
  const navigate = useNavigate();

  const content = getContent(chosen);
  const firstUnit = content.units[0];
  const firstLesson = firstUnit?.lessons[0];
  const startsWithAlphabet = !!firstUnit && isAlphabetUnit(content, firstUnit);

  function finish(to: string) {
    setLang(chosen);
    markWelcomed();
    navigate(to, { replace: true });
  }

  return (
    <section className="welcome">
      <header className="welcome-head">
        <img src="/icon.svg" alt="" width={56} height={56} />
        <h1>Aprende lengua de signos a tu ritmo</h1>
        <p className="muted">
          Lecciones cortas, repaso para no olvidar y práctica del alfabeto con la cámara. Sin cuenta: tu progreso
          vive en este dispositivo.
        </p>
      </header>

      <fieldset className="choice-list">
        <legend className="welcome-legend">¿Qué lengua quieres aprender?</legend>
        {languages.map((l) => {
          const { count, testing } = languageSummary(l.id);
          return (
            <label key={l.id} className="choice">
              <input type="radio" name="lengua-inicio" value={l.id} checked={chosen === l.id} onChange={() => setChosen(l.id)} />
              <span className="choice-text">
                <strong>{l.name} ({l.short})</strong>
                <span className="muted">{count} · {l.region}</span>
              </span>
              {testing && <span className="badge warn">En pruebas</span>}
            </label>
          );
        })}
      </fieldset>

      <fieldset className="choice-list">
        <legend className="welcome-legend">¿Cuánto tiempo al día?</legend>
        <GoalChoice name="meta-inicio" value={goal} onChange={setGoal} />
        <p className="muted small">Poco y a menudo funciona mejor que una sesión larga. Puedes cambiarlo en «Tú».</p>
      </fieldset>

      <div className="welcome-actions">
        {firstLesson && (
          <button type="button" className="button primary welcome-start" onClick={() => finish(`/leccion/${firstLesson.id}`)}>
            {startsWithAlphabet ? 'Empezar con el alfabeto' : 'Empezar la primera lección'}
          </button>
        )}
        <Link
          to="/"
          replace
          className="welcome-skip"
          onClick={() => {
            setLang(chosen);
            markWelcomed();
          }}
        >
          Ver la app primero
        </Link>
      </div>
    </section>
  );
}

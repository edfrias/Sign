import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { languages } from '../content/loader';
import { languageSummary } from '../content/summary';
import { dayKey } from '../progress/activity';
import { useDailyProgress, useGoal } from '../progress/useStudy';
import { GoalChoice } from '../components/GoalChoice';
import { useLanguage } from '../state/LanguageContext';
import { SOUND_KEY, useStoredBoolean } from '../state/preferences';
import { BackupPanel } from '../components/BackupPanel';

/** Tú: resumen, lengua, ajustes de cámara, datos y créditos. */
export function YouPage() {
  const { lang, setLang } = useLanguage();
  const [sound, setSound] = useStoredBoolean(SOUND_KEY, true);
  const [goal, setGoal] = useGoal();
  const daily = useDailyProgress(goal);

  const stats = useLiveQuery(async () => {
    const [lessons, signs] = await Promise.all([
      db.progress.where('lang').equals(lang).toArray(),
      db.reviews.where('lang').equals(lang).count(),
    ]);
    return { signs, lessons: lessons.length, lessonDays: lessons.map((l) => dayKey(l.completedAt)) };
  }, [lang]);
  // Días de estudio: con al menos un minuto contado o con alguna lección completada (anteriores al reloj)
  const studyDays = new Set([...(daily?.studyDays ?? []), ...(stats?.lessonDays ?? [])]).size;
  const calibrated = useLiveQuery(async () => new Set(await db.templates.orderBy('signId').keys()).size);

  return (
    <>
      <header className="page-head">
        <h1>Tú</h1>
        <p className="muted">Sin cuenta: tu progreso vive en este dispositivo.</p>
      </header>

      <section className="you-section" aria-labelledby="tu-resumen">
        <h2 id="tu-resumen">Resumen</h2>
        <dl className="stats">
          <div className="stat">
            <dt>Signos aprendidos</dt>
            <dd>{stats?.signs ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Lecciones completadas</dt>
            <dd>{stats?.lessons ?? 0}</dd>
          </div>
          <div className="stat">
            <dt>Días de estudio</dt>
            <dd>{studyDays}</dd>
          </div>
          <div className="stat">
            <dt>Racha (días seguidos con la meta)</dt>
            <dd>{daily?.count ?? 0}</dd>
          </div>
        </dl>
      </section>

      <section className="you-section" aria-labelledby="tu-lengua">
        <h2 id="tu-lengua">Lengua y meta diaria</h2>
        <fieldset className="choice-list">
          <legend className="visually-hidden">Lengua de signos que estudias</legend>
          {languages.map((l) => (
            <label key={l.id} className="choice">
              <input type="radio" name="lengua" value={l.id} checked={l.id === lang} onChange={() => setLang(l.id)} />
              <span className="choice-text">
                <strong>{l.name} ({l.short})</strong>
                <span className="muted">
                  {languageSummary(l.id).count} · {l.region}
                  {languageSummary(l.id).testing && ' · En pruebas'}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="choice-list goal-fieldset">
          <legend>Meta diaria</legend>
          <GoalChoice name="meta-tu" value={goal} onChange={setGoal} />
          <p className="muted small">
            Cuenta el tiempo en lecciones, repasos y práctica con cámara. La racha suma los días seguidos en que la cumples.
          </p>
        </fieldset>
      </section>

      <section className="you-section" aria-labelledby="tu-camara">
        <h2 id="tu-camara">Cámara</h2>
        <label className="check-row">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
          <span>
            Pitidos al acertar o saltar una letra
            <span className="muted small"> · siempre acompañados de un aviso visual</span>
          </span>
        </label>
        <p className="muted">
          {calibrated
            ? `Calibración con tu mano guardada para ${calibrated} ${calibrated === 1 ? 'letra' : 'letras'}.`
            : 'Sin calibración: se usan las fotos de referencia.'}{' '}
          La exigencia y la calibración se ajustan en <Link to="/practica">Cámara › Ajustes</Link>.
        </p>
      </section>

      <section className="you-section" aria-labelledby="tu-datos">
        <h2 id="tu-datos">Datos y privacidad</h2>
        <p className="muted">
          Sin cuentas ni analítica. La imagen de la cámara se procesa en tu dispositivo y no se guarda ni se envía.
        </p>
        <BackupPanel />
      </section>

      <section className="you-section" aria-labelledby="tu-creditos">
        <h2 id="tu-creditos">Créditos</h2>
        <p className="muted">
          Las fotos de los signos son de la Fundación CNSE (CC BY-NC-SA 3.0). Sign no está afiliada a la Fundación CNSE.
        </p>
        <Link to="/creditos" className="button">Créditos y licencias</Link>
      </section>
    </>
  );
}

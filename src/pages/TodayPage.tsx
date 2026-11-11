import { Link, Navigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { languages } from '../content/loader';
import { useLanguage } from '../state/LanguageContext';
import { nextLesson, reviewMinutes } from '../progress/today';
import { CameraIcon, ReviewIcon } from '../components/icons';
import { HandZoom } from '../components/HandZoom';
import { GoalRing, StreakChip } from '../components/GoalRing';
import { useDailyProgress, useGoal, useWelcomed } from '../progress/useStudy';

/** Hoy: la portada. Una acción principal (seguir con la lección) y, al lado, repaso y cámara. */
export function TodayPage() {
  const { lang, setLang, content } = useLanguage();
  const completed = useLiveQuery(
    async () => new Set((await db.progress.where('lang').equals(lang).toArray()).map((p) => p.lessonId)),
    [lang],
  );
  const dueCount = useLiveQuery(
    () => db.reviews.where('due').belowOrEqual(Date.now()).filter((r) => r.lang === lang).count(),
    [lang],
  );
  const hasStatic = content.signs.some((s) => s.kind === 'static');
  const [goal] = useGoal();
  const daily = useDailyProgress(goal);
  const welcomed = useWelcomed();

  // Primera vez (sin progreso guardado): elegir lengua y ritmo antes de nada
  if (welcomed === false) return <Navigate to="/bienvenida" replace />;

  return (
    <>
      <header className="page-head today-head">
        <h1>Hoy</h1>
        {daily && <StreakChip count={daily.count} />}
        {/* En escritorio la lengua se elige en la barra lateral */}
        <label className="today-lang">
          <span className="visually-hidden">Lengua de signos</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {languages.map((l) => (
              <option key={l.id} value={l.id}>{l.short}</option>
            ))}
          </select>
        </label>
      </header>

      {daily && (
        <section className="goal" aria-labelledby="hoy-meta">
          <GoalRing fraction={daily.fraction} done={daily.todayDone} />
          <div>
            <h2 id="hoy-meta" className="goal-title">Meta de hoy</h2>
            <p className="goal-text">
              {daily.todayDone ? (
                <>Cumplida: {daily.minutes} de {goal} min</>
              ) : (
                <>{Math.min(daily.minutes, goal)} de {goal} min</>
              )}
              <span className="muted"> · cuenta el tiempo en lecciones, repasos y cámara</span>
            </p>
          </div>
          <Link to="/tu#tu-lengua" className="goal-change" aria-label="Cambiar la meta diaria">Cambiar</Link>
        </section>
      )}

      {/* Hasta que se lea el progreso no se sabe qué lección toca: mejor vacío que un salto */}
      {completed && <ContinueCard completed={completed} />}

      <div className="today-cards">
        <section className="card today-card" aria-labelledby="hoy-repaso">
          <h2 id="hoy-repaso" className="today-card-title"><ReviewIcon /> Repaso</h2>
          {dueCount ? (
            <>
              <p>
                <strong>{dueCount} {dueCount === 1 ? 'signo pendiente' : 'signos pendientes'}</strong>
                <span className="muted"> · unos {reviewMinutes(dueCount)} min</span>
              </p>
              <Link to="/repaso" className="button">Repasar</Link>
            </>
          ) : (
            <p className="muted">
              Nada pendiente por ahora. Los signos de cada lección vuelven aquí cuando toca repasarlos.
            </p>
          )}
        </section>

        {hasStatic && (
          <section className="card today-card" aria-labelledby="hoy-camara">
            <h2 id="hoy-camara" className="today-card-title"><CameraIcon /> Cámara</h2>
            <p className="muted">Comprueba tu configuración de la mano con las letras estáticas del alfabeto.</p>
            <Link to="/practica" className="button">Practicar con cámara</Link>
          </section>
        )}
      </div>
    </>
  );
}

function ContinueCard({ completed }: { completed: ReadonlySet<string> }) {
  const { content } = useLanguage();
  const next = nextLesson(content.units, completed);

  if (!next) {
    return (
      <section className="continue" aria-labelledby="hoy-continua">
        <p className="label continue-kicker">Curso completado</p>
        <h2 id="hoy-continua" className="continue-title">Has hecho todas las lecciones</h2>
        <p className="continue-meta">Sigue con el repaso diario para no olvidarlas, o vuelve a cualquier lección.</p>
        <Link to="/aprender" className="button continue-button">Ver las lecciones</Link>
      </section>
    );
  }

  const { unit, lesson, lessonIndex, unitDone, started } = next;
  const total = unit.lessons.length;
  // Primer signo de la lección con la mano localizada, para el recorte
  const preview = lesson.signIds.map((id) => content.signById.get(id)).find((s) => s?.handFocus && s.media?.image);
  return (
    <section className="continue" aria-labelledby="hoy-continua">
      {preview && (
        <figure className="continue-figure">
          <HandZoom sign={preview} />
          {preview.media?.credit && (
            <figcaption>
              {preview.media.credit.split(' · ')[0]}
              {preview.media.license && ` · ${preview.media.license}`}
            </figcaption>
          )}
        </figure>
      )}
      <p className="label continue-kicker">{started ? 'Continúa' : 'Empieza aquí'}</p>
      <h2 id="hoy-continua" className="continue-title">{lesson.title}</h2>
      <p className="continue-meta">
        {unit.title} · Lección {lessonIndex + 1} de {total} · {lesson.signIds.length} signos
      </p>
      <div className="continue-progress">
        <progress value={unitDone} max={total} aria-labelledby="hoy-unidad" />
        <span id="hoy-unidad">{unitDone} de {total} {total === 1 ? 'lección hecha' : 'lecciones hechas'} en la unidad</span>
      </div>
      <Link to={`/leccion/${lesson.id}`} className="button continue-button">
        {started ? 'Seguir aprendiendo' : 'Empezar'}
      </Link>
    </section>
  );
}

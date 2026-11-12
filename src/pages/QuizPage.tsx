import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { recordAnswer } from '../db/actions';
import { findLesson } from '../content/loader';
import { buildQuiz, shuffle, type Question } from '../quiz/buildQuiz';
import { useLanguage } from '../state/LanguageContext';
import { SignDescriptionList, SignMedia } from '../components/SignCard';
import { ResultPanel, resultMessage } from '../components/ResultPanel';
import { PhotoCredit } from '../components/PhotoCredit';
import { CheckIcon, CloseIcon } from '../components/icons';
import { SESSION_SIZE } from '../progress/today';
import { useStudyClock } from '../progress/useStudy';

/** Pregunta de la sesión; `retry` si vuelve tras un fallo (no cuenta otra vez para el repaso espaciado). */
type Item = Question & { retry?: boolean };

export function QuizPage() {
  const { lessonId, unitId } = useParams();
  const mode = lessonId ? 'lesson' : unitId ? 'unit' : 'review';
  const { lang, content } = useLanguage();
  const [queue, setQueue] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  useStudyClock(!!queue?.length);

  // Las preguntas se generan una vez al entrar, no en cada respuesta.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let targetIds: string[];
      if (lessonId) {
        targetIds = findLesson(content, lessonId)?.lesson.signIds ?? [];
      } else if (unitId) {
        // Repaso de la unidad: una muestra al azar de todas sus lecciones
        targetIds = shuffle(content.units.find((u) => u.id === unitId)?.lessons.flatMap((l) => l.signIds) ?? []);
      } else {
        const due = await db.reviews.where('due').belowOrEqual(Date.now()).filter((r) => r.lang === lang).toArray();
        targetIds = due.sort((a, b) => a.due - b.due).map((r) => r.signId);
      }
      const targets = targetIds.flatMap((id) => content.signById.get(id) ?? []).slice(0, SESSION_SIZE);
      if (!cancelled) {
        const questions = buildQuiz(targets, content.signs);
        setQueue(questions);
        setTotal(questions.length);
        setIndex(0);
        setPicked(null);
        setCorrectCount(0);
        setAnnouncement('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, unitId, lang, content]);

  if (!queue) return <p>Cargando…</p>;

  if (queue.length === 0) {
    return (
      <section className="hero">
        <h1>{mode === 'review' ? 'Nada que repasar' : 'Sin preguntas'}</h1>
        <p className="muted">
          {mode === 'lesson'
            ? 'Esta lección no tiene signos.'
            : mode === 'unit'
              ? 'Esta unidad no existe o no tiene signos.'
              : 'Completa una lección y sus signos aparecerán aquí cuando toque repasarlos.'}
        </p>
        <Link to="/aprender" className="button primary">Ir a las lecciones</Link>
      </section>
    );
  }

  const q = queue[index];
  if (!q) {
    return (
      <section className="hero">
        <h1>¡Hecho!</h1>
        <p>{correctCount} de {total} a la primera.</p>
        <p className="muted">Los signos que fallaste volverán antes en el repaso diario.</p>
        <Link to={mode === 'review' ? '/' : unitId ? `/aprender/${unitId}` : '/aprender'} className="button primary">
          Volver
        </Link>
      </section>
    );
  }

  const answered = picked !== null;
  const correct = picked === q.sign.id;
  // Un fallo vuelve una vez al final de la sesión (si no era ya la repetición)
  const comesBack = answered && !correct && !q.retry;

  async function answer(optionId: string) {
    if (picked || !q) return;
    const ok = optionId === q.sign.id;
    setPicked(optionId);
    setAnnouncement(resultMessage(ok, q.sign, q.kind, !ok && !q.retry));
    if (q.retry) return;
    if (ok) setCorrectCount((c) => c + 1);
    else setQueue((list) => [...(list ?? []), { ...q, options: shuffle(q.options), retry: true }]);
    await recordAnswer(lang, q.sign.id, ok ? 4 : 1);
  }

  function next() {
    setIndex((i) => i + 1);
    setPicked(null);
    setAnnouncement('');
  }

  const optionState = (id: string) => (!answered ? '' : id === q.sign.id ? 'right' : id === picked ? 'wrong' : '');
  const stateIcon = (id: string) =>
    optionState(id) === 'right' ? <CheckIcon /> : optionState(id) === 'wrong' ? <CloseIcon /> : null;
  const stateText = (id: string) =>
    optionState(id) === 'right' ? ' (correcta)' : optionState(id) === 'wrong' ? ' (tu respuesta)' : '';
  const isLetter = q.sign.category === 'Alfabeto';
  const label = mode === 'lesson' ? 'Quiz de lección' : mode === 'unit' ? 'Repaso de la unidad' : 'Repaso';

  return (
    <section className={`quiz ${answered ? 'is-answered' : ''}`}>
      <p className="muted quiz-meta">
        {label} · {Math.min(index + 1, total)} / {total}
        {q.retry && <span className="badge">Otra vez</span>}
      </p>
      <span className="bar quiz-bar" aria-hidden="true">
        <span style={{ width: `${(Math.min(index, total) / total) * 100}%` }} />
      </span>

      {q.kind === 'recognize' ? (
        <>
          <h1 className="quiz-prompt">{isLetter ? '¿Qué letra es?' : '¿Qué signo es?'}</h1>
          <div className="quiz-media">
            <SignMedia sign={q.sign} hideAnswer={!answered} handZoom />
            {/* Mientras no haya vídeos, la descripción es la pista */}
            {!q.sign.media?.video && !q.sign.media?.image && <SignDescriptionList sign={q.sign} />}
          </div>
          <div className="options" role="group" aria-label="Opciones">
            {q.options.map((o) => (
              <button key={o.id} type="button" className={`option ${optionState(o.id)}`} disabled={answered} onClick={() => answer(o.id)}>
                {stateIcon(o.id)}
                {o.gloss}
                <span className="visually-hidden">{stateText(o.id)}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="quiz-prompt">
            {isLetter ? <>¿Cuál es la letra «{q.sign.gloss}»?</> : <>¿Cuál es «{q.sign.gloss}»?</>}
          </h1>
          <div className="options options-photos" role="group" aria-label="Elige la foto">
            {q.options.map((o, i) => (
              <button
                key={o.id}
                type="button"
                className={`option option-photo ${optionState(o.id)}`}
                disabled={answered}
                onClick={() => answer(o.id)}
              >
                <img src={o.media?.image} alt="" />
                <span className="option-photo-label">
                  {answered ? (
                    <>
                      {stateIcon(o.id)}
                      {o.gloss}
                    </>
                  ) : (
                    <>Foto {i + 1}</>
                  )}
                  <span className="visually-hidden">{stateText(o.id)}</span>
                </span>
              </button>
            ))}
          </div>
          <PhotoCredit />
        </>
      )}

      <p className="visually-hidden" role="status">{announcement}</p>
      {answered && (
        <ResultPanel key={index} correct={correct} sign={q.sign} kind={q.kind} comesBack={comesBack} onContinue={next} />
      )}
    </section>
  );
}

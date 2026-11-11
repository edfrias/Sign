import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { recordAnswer } from '../db/actions';
import { findLesson } from '../content/loader';
import { buildQuiz, type Question } from '../quiz/buildQuiz';
import { useLanguage } from '../state/LanguageContext';
import { SignDescriptionList, SignMedia } from '../components/SignCard';
import { SESSION_SIZE } from '../progress/today';

export function QuizPage() {
  const { lessonId } = useParams();
  const { lang, content } = useLanguage();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  // Las preguntas se generan una vez al entrar, no en cada respuesta.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let targetIds: string[];
      if (lessonId) {
        targetIds = findLesson(content, lessonId)?.lesson.signIds ?? [];
      } else {
        const due = await db.reviews.where('due').belowOrEqual(Date.now()).filter((r) => r.lang === lang).toArray();
        targetIds = due.sort((a, b) => a.due - b.due).map((r) => r.signId);
      }
      const targets = targetIds.flatMap((id) => content.signById.get(id) ?? []).slice(0, SESSION_SIZE);
      if (!cancelled) {
        setQuestions(buildQuiz(targets, content.signs));
        setIndex(0);
        setPicked(null);
        setCorrectCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, lang, content]);

  if (!questions) return <p>Cargando…</p>;

  if (questions.length === 0) {
    return (
      <section className="hero">
        <h1>{lessonId ? 'Sin preguntas' : 'Nada que repasar'}</h1>
        <p className="muted">
          {lessonId ? 'Esta lección no tiene signos.' : 'Completa una lección y sus signos aparecerán aquí cuando toque repasarlos.'}
        </p>
        <Link to="/aprender" className="button primary">Ir a las lecciones</Link>
      </section>
    );
  }

  const q = questions[index];
  if (!q) {
    return (
      <section className="hero">
        <h1>¡Hecho!</h1>
        <p>{correctCount} de {questions.length} correctas.</p>
        <p className="muted">Las que fallaste volverán a salir mañana en el repaso.</p>
        <Link to={lessonId ? '/aprender' : '/'} className="button primary">Volver</Link>
      </section>
    );
  }

  async function answer(optionId: string) {
    if (picked || !q) return;
    setPicked(optionId);
    const ok = optionId === q.sign.id;
    if (ok) setCorrectCount((c) => c + 1);
    await recordAnswer(lang, q.sign.id, ok ? 4 : 1);
  }

  return (
    <section className="quiz">
      <p className="muted">{lessonId ? 'Quiz de lección' : 'Repaso'} · {index + 1} / {questions.length}</p>
      <h1>¿Qué signo es?</h1>
      <article className="card lesson-sign">
        <SignMedia sign={q.sign} hideAnswer={!picked} />
        {/* Mientras no haya vídeos, la descripción es la pista */}
        {!q.sign.media?.video && !q.sign.media?.image && <SignDescriptionList sign={q.sign} />}
      </article>

      <div className="options" role="group" aria-label="Opciones">
        {q.options.map((o) => {
          const state = !picked ? '' : o.id === q.sign.id ? 'right' : o.id === picked ? 'wrong' : '';
          return (
            <button key={o.id} type="button" className={`option ${state}`} disabled={!!picked} onClick={() => answer(o.id)}>
              {o.gloss}
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="actions spread" aria-live="polite">
          <strong>{picked === q.sign.id ? '¡Correcto!' : `Era «${q.sign.gloss}»`}</strong>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setIndex((i) => i + 1);
              setPicked(null);
            }}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import { db } from '../db/db';
import { clearTemplates, replaceTemplates } from '../db/actions';
import { getHandLandmarker } from '../vision/handLandmarker';
import { getReferenceTemplates, type ReferenceResult } from '../vision/referenceTemplates';
import { averageVectors, normalizeHand, type Handedness } from '../vision/features';
import { TOLERANCE, evaluate, rankSigns, type Evaluation, type Tolerance } from '../vision/classifier';
import {
  CalibrationSession,
  PracticeSession,
  type CalibrationSnapshot,
  type PracticeSnapshot,
} from '../vision/sessions';
import { beep, unlockAudio } from '../vision/sound';
import { useLanguage } from '../state/LanguageContext';
import { SignDescriptionList, SignMedia } from '../components/SignCard';

const SMOOTHING_FRAMES = 8;
const TOLERANCE_KEY = 'sign.tolerance';
const TOLERANCE_LABELS: Record<Tolerance, string> = { estricta: 'Estricta', normal: 'Normal', flexible: 'Flexible' };

type Status = 'idle' | 'loading' | 'running' | 'error';
type Session = { kind: 'practice'; s: PracticeSession } | { kind: 'calibrate'; s: CalibrationSession };

function loadTolerance(): Tolerance {
  try {
    const v = localStorage.getItem(TOLERANCE_KEY);
    if (v && v in TOLERANCE) return v as Tolerance;
  } catch {
    /* sin almacenamiento */
  }
  return 'normal';
}

/** La lista de signos empezando por `startId` y dando la vuelta. */
function rotate(ids: string[], startId?: string) {
  const i = Math.max(0, startId ? ids.indexOf(startId) : 0);
  return [...ids.slice(i), ...ids.slice(0, i)];
}

export function PracticePage() {
  const { lang, content } = useLanguage();
  const [params, setParams] = useSearchParams();
  const staticSigns = useMemo(() => content.signs.filter((s) => s.kind === 'static'), [content]);
  const staticIds = useMemo(() => staticSigns.map((s) => s.id), [staticSigns]);
  const startId = staticIds.includes(params.get('signo') ?? '') ? params.get('signo')! : staticIds[0];
  const gloss = (id?: string) => (id ? content.signById.get(id)?.gloss ?? id : '');

  // Plantillas: referencias de las fotos + calibración propia
  const [refs, setRefs] = useState<ReferenceResult | null>(null);
  const [refsError, setRefsError] = useState('');
  useEffect(() => {
    setRefs(null);
    getReferenceTemplates(lang, content.signs)
      .then(setRefs)
      .catch((e: Error) => setRefsError(e.message));
  }, [lang, content]);
  const userTemplates = useLiveQuery(() => db.templates.toArray(), []);
  const calibratedIds = useMemo(() => new Set(userTemplates?.map((t) => t.signId)), [userTemplates]);
  const templates = useMemo(() => [...(refs?.templates ?? []), ...(userTemplates ?? [])], [refs, userTemplates]);

  const [tolerance, setToleranceState] = useState<Tolerance>(loadTolerance);
  const setTolerance = (t: Tolerance) => {
    setToleranceState(t);
    try {
      localStorage.setItem(TOLERANCE_KEY, t);
    } catch {
      /* sin persistencia */
    }
  };
  const [sound, setSound] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [handVisible, setHandVisible] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [guess, setGuess] = useState<string | undefined>();
  const [practice, setPractice] = useState<PracticeSnapshot | null>(null);
  const [calibration, setCalibration] = useState<CalibrationSnapshot | null>(null);

  const session = useRef<Session | null>(null);
  // Lo que lee el bucle de la cámara sin reiniciarse
  const live = useRef({ templates, tolerance, sound });
  live.current = { templates, tolerance, sound };

  const play = (tone: Parameters<typeof beep>[0]) => live.current.sound && beep(tone);

  function startSession(kind: Session['kind']) {
    unlockAudio(); // este clic es el último gesto necesario
    const order = rotate(staticIds, startId);
    session.current =
      kind === 'practice' ? { kind, s: new PracticeSession(order) } : { kind, s: new CalibrationSession(order) };
    setPractice(kind === 'practice' ? session.current.s.snapshot() as PracticeSnapshot : null);
    setCalibration(kind === 'calibrate' ? session.current.s.snapshot() as CalibrationSnapshot : null);
    if (status !== 'running') setStatus('loading');
  }

  function stopSession() {
    session.current = null;
    setPractice(null);
    setCalibration(null);
  }

  // Barra espaciadora: saltar el signo (por si tienes una mano libre)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || session.current?.kind !== 'practice') return;
      e.preventDefault();
      if (session.current.s.skip(performance.now())) play('skip');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cameraActive = status === 'loading' || status === 'running';

  useEffect(() => {
    if (!cameraActive) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const buffer: number[][] = [];
    let lastTime = -1;

    (async () => {
      try {
        const [landmarker, media] = await Promise.all([
          getHandLandmarker('VIDEO'),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false }),
        ]);
        stream = media;
        if (stopped) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = media;
        await video.play();
        setStatus('running');
        loop(landmarker, video);
      } catch (e) {
        if (stopped) return;
        setError(
          e instanceof DOMException && e.name === 'NotAllowedError'
            ? 'Has denegado el permiso de la cámara.'
            : `No se pudo iniciar la cámara o el detector: ${(e as Error).message}`,
        );
        setStatus('error');
      }
    })();

    function loop(landmarker: HandLandmarker, video: HTMLVideoElement) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const draw = ctx ? new DrawingUtils(ctx) : null;

      const tick = () => {
        if (stopped) return;
        if (video.currentTime !== lastTime && video.videoWidth) {
          lastTime = video.currentTime;
          const now = performance.now();
          const res = landmarker.detectForVideo(video, now);

          if (canvas && ctx && draw) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const hand of res.landmarks) {
              draw.drawConnectors(hand, HandLandmarker.HAND_CONNECTIONS, { color: '#58a6ff', lineWidth: 3 });
              draw.drawLandmarks(hand, { color: '#f0f6fc', lineWidth: 1, radius: 3 });
            }
          }

          const hand = res.landmarks[0];
          const side = res.handedness[0]?.[0]?.categoryName as Handedness | undefined;
          const vec = hand && side ? normalizeHand(hand, side) : null;
          if (vec) {
            buffer.push(vec);
            if (buffer.length > SMOOTHING_FRAMES) buffer.shift();
          } else {
            buffer.length = 0;
          }
          const smooth = vec ? averageVectors(buffer) : null;
          const { templates: tpl, tolerance: tol } = live.current;
          setHandVisible(!!vec);
          setGuess(smooth && tpl.length ? rankSigns(smooth, tpl)[0]?.signId : undefined);

          const sess = session.current;
          if (sess?.kind === 'practice') {
            const target = sess.s.snapshot().signId;
            const ev = smooth && target && tpl.length ? evaluate(smooth, tpl, target, TOLERANCE[tol]) : null;
            const event = sess.s.update(now, !!vec, !!ev?.correct);
            if (event === 'success') play('ok');
            if (event === 'skipped') play('skip');
            if (event === 'finished') play('done');
            setEvaluation(ev);
            setPractice({ ...sess.s.snapshot() });
          } else if (sess?.kind === 'calibrate') {
            const event = sess.s.update(now, vec);
            if (event?.type === 'captured') {
              void replaceTemplates(event.signId, event.vectors);
              play('saved');
            }
            if (event?.type === 'finished') play('done');
            setEvaluation(null);
            setCalibration({ ...sess.s.snapshot() });
          } else {
            setEvaluation(null);
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      setHandVisible(false);
      setEvaluation(null);
      setGuess(undefined);
    };
  }, [cameraActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (staticSigns.length === 0) return <p>Esta lengua aún no tiene signos estáticos para practicar.</p>;

  const active = practice ?? calibration;
  const targetId = active?.signId ?? startId;
  const target = targetId ? content.signById.get(targetId) : undefined;
  const refsReady = !!refs;

  // Texto y barra del panel de la cámara
  let headline = '';
  let progress = 0;
  let flash: 'ok' | 'skip' | 'saved' | null = null;
  if (practice) {
    if (practice.phase === 'signing') {
      const lookalike = evaluation?.best && evaluation.best.signId !== practice.signId ? gloss(evaluation.best.signId) : '';
      headline = !handVisible
        ? 'Pon la mano delante de la cámara'
        : evaluation?.correct ? '¡Así! Mantenla…'
        : lookalike ? `Parece una «${lookalike}»`
        : 'Casi: ajusta la forma de la mano';
      progress = practice.hold;
    } else if (practice.phase === 'success') flash = 'ok';
    else if (practice.phase === 'skipped') flash = 'skip';
  } else if (calibration) {
    const p = calibration.phase;
    headline =
      p === 'preparing' ? 'Prepárate…'
      : p === 'waiting' ? (handVisible ? 'Mantén la mano quieta' : 'Pon la mano delante de la cámara')
      : p === 'capturing' ? 'Grabando…'
      : '';
    progress = calibration.progress;
    if (p === 'saved') flash = 'saved';
  }

  const finished = active?.phase === 'finished';
  const okCount = practice ? [...practice.results.values()].filter((r) => r === 'ok').length : 0;

  return (
    <section className="practice">
      <h1>Práctica con cámara</h1>
      <p className="muted">
        Manos libres: pulsa un botón, colócate y signa. La app valida sola cada letra al mantenerla
        un segundo y pasa a la siguiente. La imagen se procesa en tu dispositivo y no se guarda.
      </p>

      <div className="toolbar card">
        <button type="button" className="button primary" disabled={!refsReady} onClick={() => startSession('practice')}>
          {practice ? 'Reiniciar práctica' : 'Empezar práctica'}
        </button>
        <button type="button" className="button" disabled={!refsReady} onClick={() => startSession('calibrate')}>
          Calibración guiada
        </button>
        {active && (
          <button type="button" className="button" onClick={stopSession}>Parar</button>
        )}
        <label>
          Empezar en
          <select value={startId} onChange={(e) => setParams({ signo: e.target.value })}>
            {staticSigns.map((s) => <option key={s.id} value={s.id}>{s.gloss}</option>)}
          </select>
        </label>
        <label>
          Tolerancia
          <select value={tolerance} onChange={(e) => setTolerance(e.target.value as Tolerance)}>
            {Object.keys(TOLERANCE).map((t) => <option key={t} value={t}>{TOLERANCE_LABELS[t as Tolerance]}</option>)}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sonido
        </label>
      </div>
      {!refsReady && !refsError && <p className="muted" role="status">Preparando las referencias a partir de las fotos…</p>}
      {refsError && <p role="alert">No se pudieron preparar las referencias: {refsError}</p>}

      <div className="practice-grid">
        <div className="card">
          <div className={`camera ${flash ? `flash-${flash}` : ''}`}>
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />

            {status === 'running' && active && !finished && (
              <>
                <div className="camera-target" aria-live="polite">{gloss(targetId)}</div>
                {flash ? (
                  <div className="camera-flash" aria-live="assertive">
                    {flash === 'ok' ? '✓ ¡Bien!' : flash === 'saved' ? '✓ Guardado' : 'Siguiente…'}
                  </div>
                ) : (
                  <div className="camera-hint">{headline}</div>
                )}
                <div className="camera-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              </>
            )}

            {status === 'running' && finished && (
              <div className="camera-overlay">
                {practice ? (
                  <p><strong>¡Ronda terminada!</strong><br />{okCount} de {practice.results.size} letras validadas.</p>
                ) : (
                  <p><strong>Calibración terminada.</strong><br />{calibration?.saved.size} letras grabadas con tu mano.</p>
                )}
              </div>
            )}

            {status !== 'running' && (
              <div className="camera-overlay">
                {status === 'loading' ? (
                  <p>Cargando detector y cámara…</p>
                ) : status === 'error' ? (
                  <p role="alert">{error}</p>
                ) : (
                  <button type="button" className="button" onClick={() => { unlockAudio(); setStatus('loading'); }}>
                    Solo activar la cámara
                  </button>
                )}
              </div>
            )}
          </div>

          {status === 'running' && (
            <div className="actions spread">
              <span className="muted">
                {!handVisible
                  ? 'Sin mano a la vista'
                  : practice?.phase === 'signing'
                    ? `Parecido: ${evaluation?.target?.score ?? 0}% · quedan ${Math.ceil(practice.remainingMs / 1000)} s`
                    : guess ? `Parece: ${gloss(guess)}` : 'Mano detectada'}
              </span>
              <button type="button" className="button" onClick={() => { stopSession(); setStatus('idle'); }}>
                Apagar cámara
              </button>
            </div>
          )}
          {practice?.phase === 'signing' && (
            <p className="muted small">Si te atascas, la letra se salta sola a los 20 s con la mano a la vista (o pulsa espacio).</p>
          )}
        </div>

        <div className="card">
          {target && (
            <>
              <h2>{target.gloss}</h2>
              <SignMedia sign={target} />
              <SignDescriptionList sign={target} />
            </>
          )}

          <h3>{calibration ? 'Calibración' : 'Letras'}</h3>
          <ul className="letter-chips" aria-label="Estado de cada letra">
            {rotate(staticIds, startId).map((id) => {
              const result = practice?.results.get(id);
              const state = calibration
                ? calibration.saved.has(id) ? 'ok' : ''
                : result ?? '';
              const current = active && !finished && id === targetId;
              return (
                <li key={id} className={`chip-letter ${state} ${current ? 'current' : ''}`} title={calibratedIds.has(id) ? 'Calibrada con tu mano' : undefined}>
                  {gloss(id)}{calibratedIds.has(id) && <sup aria-label="calibrada">•</sup>}
                </li>
              );
            })}
          </ul>
          <p className="muted small">
            No hace falta calibrar: se usan como referencia las fotos de la Fundación CNSE. La calibración
            guiada añade muestras de tu propia mano (las marcadas con •) y mejora la precisión.
          </p>
          {calibratedIds.size > 0 && !calibration && (
            <button type="button" className="button" onClick={() => clearTemplates()}>
              Borrar mi calibración ({calibratedIds.size} letras)
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import { db } from '../db/db';
import { clearTemplates, replaceTemplates } from '../db/actions';
import { getHandLandmarker } from '../vision/handLandmarker';
import { getReferenceTemplates, type ReferenceResult } from '../vision/referenceTemplates';
import { averageVectors, normalizeHand, type Handedness } from '../vision/features';
import { TOLERANCE, evaluate, proximity, rankSigns, type Evaluation, type Proximity, type Tolerance } from '../vision/classifier';
import {
  CalibrationSession,
  IdleTracker,
  PracticeSession,
  type CalibrationCheck,
  type CalibrationSnapshot,
  type IdleState,
  type PracticeSnapshot,
} from '../vision/sessions';
import type { StoredTemplate } from '../db/db';
import { beep, unlockAudio } from '../vision/sound';
import { useLanguage } from '../state/LanguageContext';
import { SignDescriptionList, SignMedia } from '../components/SignCard';

/**
 * Suavizado por tiempo, no por número de fotogramas: a 1 fps, 8 fotogramas serían 8 s mezclando
 * la letra anterior con la nueva.
 */
const SMOOTHING_MS = 300;
/** Para guardar una calibración, la letra pedida debe estar entre las N referencias más parecidas. */
const CALIBRATION_TOP_N = 3;
const TOLERANCE_KEY = 'sign.tolerance';
/** Cuánto se parece tu mano antes de darla por buena (internamente, la tolerancia del clasificador). */
const TOLERANCE_LABELS: Record<Tolerance, string> = { estricta: 'Alta', normal: 'Normal', flexible: 'Baja' };
const PROXIMITY_LABELS: Record<Proximity, string> = { 'muy-cerca': 'Muy cerca', cerca: 'Cerca', lejos: 'Lejos' };
/** «¡Así!» solo cuando ya llevas este tramo de la barra: antes sería un elogio sin resultado. */
const HOLD_PRAISE = 0.2;

/** Icono de acierto (trazo único, hereda el color del texto). */
function CheckIcon() {
  return (
    <svg className="band-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.5 12.5l5 5L19.5 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function cameraError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError') {
    return 'La cámara está bloqueada para esta página. Permite el acceso desde el icono de la cámara en la barra de direcciones y vuelve a intentarlo.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No se encuentra ninguna cámara. Conecta una webcam y vuelve a intentarlo.';
  }
  if (name === 'NotReadableError') {
    return 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentarlo.';
  }
  return `No se pudo iniciar la cámara: ${(e as Error)?.message ?? 'error desconocido'}. Vuelve a intentarlo.`;
}

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
  const [sessionTotal, setSessionTotal] = useState(0);
  const [idle, setIdle] = useState<IdleState>('active');
  /** Aviso en la página cuando la sesión terminó sola (p. ej. nadie delante de la cámara) */
  const [notice, setNotice] = useState('');
  const idleTracker = useRef(new IdleTracker());

  const session = useRef<Session | null>(null);
  // Lo que lee el bucle de la cámara sin reiniciarse
  const refTemplates = refs?.templates ?? [];
  const live = useRef({ templates, refTemplates, tolerance, sound });
  live.current = { templates, refTemplates, tolerance, sound };

  const play = (tone: Parameters<typeof beep>[0]) => live.current.sound && beep(tone);

  /**
   * Antes de guardar una calibración: la letra pedida debe estar entre las más parecidas de las
   * fotos de referencia. Si no hay referencia para esa letra, se acepta.
   */
  const checkCalibration: CalibrationCheck = (signId, vectors) => {
    const refsNow = live.current.refTemplates;
    if (!refsNow.some((t) => t.signId === signId)) return true;
    const ranking = rankSigns(averageVectors(vectors), refsNow);
    const position = ranking.findIndex((m) => m.signId === signId);
    return position >= 0 && position < CALIBRATION_TOP_N;
  };

  // Borrar la calibración se puede deshacer durante unos segundos (mejor que pedir confirmación)
  const [deleted, setDeleted] = useState<StoredTemplate[] | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(undoTimer.current), []);
  async function deleteCalibration() {
    const rows = await db.templates.toArray();
    await clearTemplates();
    setDeleted(rows);
    window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setDeleted(null), 8000);
  }
  async function undoDelete() {
    window.clearTimeout(undoTimer.current);
    if (deleted?.length) await db.templates.bulkPut(deleted);
    setDeleted(null);
  }

  /** `ids`: una ronda con solo esas letras (p. ej. repetir las saltadas). Si no, todas desde `fromId`. */
  function startSession(kind: Session['kind'], fromId = startId, ids?: string[]) {
    unlockAudio(); // este clic es el último gesto necesario
    const order = ids?.length ? ids : rotate(staticIds, fromId);
    setSessionTotal(order.length);
    setNotice('');
    setIdle('active');
    idleTracker.current = new IdleTracker();
    session.current =
      kind === 'practice'
        ? { kind, s: new PracticeSession(order) }
        : { kind, s: new CalibrationSession(order, undefined, checkCalibration) };
    setPractice(kind === 'practice' ? session.current.s.snapshot() as PracticeSnapshot : null);
    setCalibration(kind === 'calibrate' ? session.current.s.snapshot() as CalibrationSnapshot : null);
    if (status !== 'running') setStatus('loading');
  }

  function stopSession() {
    session.current = null;
    setPractice(null);
    setCalibration(null);
  }

  /** Terminar: cierra la sesión y la cámara y devuelve el foco al botón de empezar. */
  function endSession() {
    stopSession();
    setStatus('idle');
    requestAnimationFrame(() => startButtonRef.current?.focus());
  }
  const endSessionRef = useRef(endSession);
  endSessionRef.current = endSession;

  // Modo práctica: la sesión ocupa la pantalla. Se bloquea el scroll de la página y el foco
  // pasa al propio panel (no a un botón, para que Espacio siga sirviendo para saltar).
  const focusMode = !!(practice || calibration);
  const stageRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focusMode) return;
    document.documentElement.classList.add('practice-focus');
    stageRef.current?.focus();
    return () => document.documentElement.classList.remove('practice-focus');
  }, [focusMode]);

  /** Mantiene Tab dentro del panel mientras está a pantalla completa. */
  function trapFocus(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === e.currentTarget)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Teclado durante la sesión: Esc termina; Espacio salta la letra (salvo sobre un botón o control,
  // donde Espacio conserva su función normal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && session.current) {
        e.preventDefault();
        endSessionRef.current();
        return;
      }
      if (e.code !== 'Space' || session.current?.kind !== 'practice') return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
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
    const buffer: { t: number; vec: number[] }[] = [];
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
        // Cámara desconectada a mitad de sesión (USB, permiso retirado, otra app): avisar y dejar reintentar
        media.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (stopped) return;
          setError('Se ha desconectado la cámara. Vuelve a conectarla y pulsa «Reintentar».');
          setStatus('error');
        });
        await video.play();
        setStatus('running');
        loop(landmarker, video);
      } catch (e) {
        if (stopped) return;
        setError(cameraError(e));
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
            buffer.push({ t: now, vec });
            while (buffer.length > 1 && buffer[0]!.t < now - SMOOTHING_MS) buffer.shift();
          } else {
            buffer.length = 0;
          }
          const smooth = vec ? averageVectors(buffer.map((b) => b.vec)) : null;
          const { templates: tpl, tolerance: tol } = live.current;
          setHandVisible(!!vec);
          setGuess(smooth && tpl.length ? rankSigns(smooth, tpl)[0]?.signId : undefined);

          const sess = session.current;
          if (sess) {
            const idleState = idleTracker.current.update(now, !!vec);
            setIdle(idleState);
            if (idleState === 'abandoned') {
              // Nadie delante de la cámara desde hace minutos: se apaga por privacidad y batería
              setNotice('La cámara se apagó porque no se vio a nadie durante 3 minutos.');
              endSessionRef.current();
              return;
            }
          }
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
            if (event?.type === 'rejected') play('skip');
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

  // Texto y barra del panel de la cámara. Un solo mensaje cada vez, coherente con lo que mide la app.
  const letter = `«${gloss(targetId)}»`;
  const near: Proximity | null =
    practice?.phase === 'signing' && handVisible ? proximity(evaluation?.target?.distance, TOLERANCE[tolerance]) : null;
  let headline = '';
  let flashText = '';
  let progress = 0;
  let flash: 'ok' | 'skip' | 'saved' | null = null;
  if (practice) {
    if (practice.phase === 'signing') {
      const lookalike = evaluation?.best && evaluation.best.signId !== practice.signId ? gloss(evaluation.best.signId) : '';
      headline = !handVisible
        ? 'Pon la mano delante de la cámara'
        : evaluation?.correct && practice.hold >= HOLD_PRAISE ? '¡Así! Mantenla…'
        : evaluation?.correct ? 'Casi: mantén la forma'
        : lookalike ? `Parece una «${lookalike}»`
        : near === 'cerca' ? 'Cerca: ajusta la forma de la mano'
        : 'Fíjate en la foto y vuelve a probar';
      progress = practice.hold;
    } else if (practice.phase === 'success') {
      flash = 'ok';
      flashText = `${letter} ¡bien hecha!`;
    } else if (practice.phase === 'skipped') {
      flash = 'skip';
      flashText = `Saltada: ${letter}`;
    }
  } else if (calibration) {
    const p = calibration.phase;
    headline =
      p === 'preparing' ? `Calibración: prepárate para la ${letter}`
      : p === 'waiting' ? (handVisible ? `Mantén la ${letter} quieta` : 'Pon la mano delante de la cámara')
      : p === 'capturing' ? `Grabando tu ${letter}…`
      : '';
    progress = calibration.progress;
    if (p === 'saved') {
      flash = 'saved';
      flashText = `${letter} guardada`;
    } else if (p === 'rejected') {
      // Mismo tratamiento que un salto: ámbar y foto modelo resaltada para comparar
      flash = 'skip';
      flashText = calibration.givingUp
        ? `No se parece a la ${letter}: pasamos a la siguiente`
        : `No se parece a la ${letter} de la foto: otra vez`;
    }
  }

  // Nadie a la vista desde hace un rato: la sesión espera, y sigue sola en cuanto vuelve la mano
  const away = idle === 'idle' && !flash && active?.phase !== 'finished';
  if (away) headline = '¿Sigues ahí? Pon la mano delante de la cámara';

  const finished = active?.phase === 'finished';
  const okCount = practice ? [...practice.results.values()].filter((r) => r === 'ok').length : 0;
  const skippedIds = practice ? [...practice.results].filter(([, r]) => r === 'skipped').map(([id]) => id) : [];
  const skippedGlosses = skippedIds.map((id) => gloss(id));

  // Lo que oye un lector de pantalla: solo cambia con hechos (letra nueva, acierto, salto, fin),
  // no con cada fotograma
  const announcement =
    status !== 'running' || !active ? ''
    : finished
      ? practice
        ? `Ronda terminada. Has validado ${okCount} de ${practice.results.size}.${skippedGlosses.length ? ` Te han costado: ${skippedGlosses.join(', ')}.` : ''}`
        : `Calibración terminada. ${calibration?.saved.size ?? 0} guardadas.`
    : away ? headline
    : flash ? flashText
    : practice ? `Letra ${gloss(targetId)}, ${practice.index + 1} de ${sessionTotal}`
    : calibration?.phase === 'preparing' ? `Calibración: prepárate para la ${letter}, ${calibration.index + 1} de ${sessionTotal}`
    : '';

  // Línea de estado bajo la cámara
  const statusLine = away
    ? 'Si la mano está delante y no se detecta, busca más luz de frente.'
    : calibration && !finished
      ? `Calibrando ${calibration.index + 1} de ${sessionTotal}${handVisible ? '' : ' · sin mano a la vista'}`
      : !handVisible
        ? 'Sin mano a la vista'
        : practice?.phase === 'signing'
          ? `${PROXIMITY_LABELS[near ?? 'lejos']} · se salta en ${Math.ceil(practice.remainingMs / 1000)} s`
          : guess ? `Parece una «${gloss(guess)}»` : 'Mano detectada';

  return (
    <section className="practice">
      <h1>Práctica con cámara</h1>
      <p className="muted">
        Signa la letra que aparece y mantenla un segundo: se valida sola y pasa a la siguiente, sin tocar
        nada. La imagen se procesa en tu dispositivo y no se guarda.
      </p>

      <div className="practice-start">
        <button
          ref={startButtonRef}
          type="button"
          className="button primary practice-start-button"
          disabled={!refsReady}
          onClick={() => startSession('practice')}
        >
          Empezar práctica <span className="button-sub">desde la {gloss(startId)}</span>
        </button>
        <details className="practice-settings">
          <summary>Ajustes</summary>
          <div className="practice-settings-body">
            <div className="practice-settings-row">
              <label>
                Exigencia
                <select value={tolerance} onChange={(e) => setTolerance(e.target.value as Tolerance)} aria-describedby="exigencia-help">
                  {Object.keys(TOLERANCE).map((t) => <option key={t} value={t}>{TOLERANCE_LABELS[t as Tolerance]}</option>)}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sonido
              </label>
            </div>
            <p id="exigencia-help" className="muted small">Cuánto debe parecerse tu mano a la foto para dar la letra por buena.</p>

            <div className="practice-settings-row">
              <button type="button" className="button" disabled={!refsReady} onClick={() => startSession('calibrate')}>
                Calibrar con mi mano
              </button>
              <span role="status" className="undo-status">{deleted && 'Calibración borrada.'}</span>
              {deleted ? (
                <button type="button" className="button" onClick={undoDelete}>Deshacer</button>
              ) : (
                calibratedIds.size > 0 && (
                  <button type="button" className="button" onClick={deleteCalibration}>
                    Borrar mi calibración ({calibratedIds.size === 1 ? '1 letra' : `${calibratedIds.size} letras`})
                  </button>
                )
              )}
            </div>
            <p className="muted small">
              Funciona sin calibrar: compara tu mano con las fotos de la Fundación CNSE. Si alguna letra no se
              valida aunque la hagas bien, grábala con tu mano. Las letras calibradas llevan un punto.
            </p>
          </div>
        </details>
      </div>
      <div role="status">{notice && <p className="notice">{notice}</p>}</div>
      {!refsReady && !refsError && <p className="muted" role="status">Preparando las letras de referencia…</p>}
      {refsError && (
        <p role="alert">
          No se pudieron preparar las letras de referencia ({refsError}). Comprueba la conexión y recarga la página.
        </p>
      )}

      <div className="practice-grid">
        {/* El mismo contenedor pasa a pantalla completa durante una sesión: así el <video> no se desmonta
            y no se pierde la imagen de la cámara. */}
        <div
          ref={stageRef}
          className={focusMode ? 'stage is-focus' : 'card stage'}
          role={focusMode ? 'dialog' : undefined}
          aria-modal={focusMode || undefined}
          aria-label={focusMode ? (practice ? 'Práctica en curso' : 'Calibración en curso') : undefined}
          tabIndex={focusMode ? -1 : undefined}
          onKeyDown={focusMode ? trapFocus : undefined}
        >
          <p className="visually-hidden" aria-live="polite" aria-atomic="true">{announcement}</p>
          {focusMode && (
            <div className="stage-bar">
              <span className="stage-count">
                {practice ? 'Práctica' : 'Calibración'}
                {!finished && active && <> · <strong>{active.index + 1}</strong> de {sessionTotal}</>}
              </span>
              <button type="button" className="button stage-exit" onClick={endSession}>
                Terminar <kbd>Esc</kbd>
              </button>
            </div>
          )}
          <div className="stage-main">
          <div className={`camera ${flash ? `flash-${flash}` : ''}`}>
            <video ref={videoRef} playsInline muted aria-hidden="true" />
            <canvas ref={canvasRef} aria-hidden="true" />

            {status === 'running' && active && !finished && (
              <>
                <div className="camera-target" aria-hidden="true">{gloss(targetId)}</div>
                {/* Mensaje y barra de mantener en una sola banda: se llena de verde mientras mantienes el
                    signo, queda verde al acertar y ámbar al saltar. Cambia varias veces por segundo, así que
                    los lectores de pantalla oyen la región `announcement`, que solo cambia con los hechos. */}
                <div className={`camera-band ${flash ? `is-${flash}` : ''}`} aria-hidden="true">
                  <span className="camera-band-fill" style={{ transform: `scaleX(${flash ? 1 : progress})` }} aria-hidden="true" />
                  <span className="camera-band-text">
                    {(flash === 'ok' || flash === 'saved') && <CheckIcon />}
                    {flash ? flashText : headline}
                  </span>
                </div>
              </>
            )}

            {status === 'running' && finished && (
              <div className="camera-overlay round-end">
                {practice ? (
                  <>
                    <h2>{skippedIds.length === 0 ? '¡Todas validadas!' : 'Ronda terminada'}</h2>
                    <p>
                      Has validado <strong>{okCount}</strong> de {practice.results.size}{' '}
                      {practice.results.size === 1 ? 'letra' : 'letras'}.
                      {skippedIds.length > 0 && <> Te han costado: {skippedGlosses.join(', ')}.</>}
                    </p>
                    <div className="round-end-actions">
                      {skippedIds.length > 0 ? (
                        <button type="button" className="button primary" autoFocus onClick={() => startSession('practice', undefined, skippedIds)}>
                          Repetir las saltadas ({skippedIds.length})
                        </button>
                      ) : (
                        <button type="button" className="button primary" autoFocus onClick={() => startSession('practice')}>
                          Otra ronda
                        </button>
                      )}
                      <button type="button" className="button stage-exit" onClick={endSession}>Volver</button>
                    </div>
                    <p className="round-end-note">Unos minutos cada día fijan mejor el alfabeto que una sesión larga.</p>
                  </>
                ) : (
                  <>
                    <h2>Calibración terminada</h2>
                    <p>
                      {calibration?.saved.size === 1 ? 'Se ha guardado 1 letra' : `Se han guardado ${calibration?.saved.size ?? 0} letras`} con tu mano.
                    </p>
                    <div className="round-end-actions">
                      <button type="button" className="button primary" autoFocus onClick={() => startSession('practice')}>
                        Empezar práctica
                      </button>
                      <button type="button" className="button stage-exit" onClick={endSession}>Volver</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {status !== 'running' && (
              <div className="camera-overlay">
                {status === 'loading' ? (
                  <p>Cargando detector y cámara…</p>
                ) : status === 'error' ? (
                  <>
                    <p role="alert">{error}</p>
                    <button type="button" className="button" onClick={() => setStatus('loading')}>
                      Reintentar
                    </button>
                  </>
                ) : (
                  <div className="camera-setup">
                    <p className="camera-setup-title">Antes de empezar</p>
                    <ul>
                      <li>Colócate a un metro, con la cara y el pecho dentro de la imagen.</li>
                      <li>Busca luz de frente; con una ventana detrás, la mano se ve oscura.</li>
                      <li>Signa con la mano que prefieras: la app reconoce las dos.</li>
                    </ul>
                    <button type="button" className="button" onClick={() => { unlockAudio(); setStatus('loading'); }}>
                      Probar la cámara
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Foto modelo junto a la cámara. Al saltar una letra se resalta: es el momento de comparar. */}
          {focusMode && target?.media?.image && !finished && (
            <figure className={`stage-model ${flash === 'skip' ? 'is-highlight' : ''}`}>
              <img src={target.media.image} alt={`Modelo de la letra ${target.gloss}`} />
              <figcaption>{flash === 'skip' ? `Así es la ${letter}` : 'Modelo'}</figcaption>            </figure>
          )}
          </div>

          {status === 'running' && !finished && (
            <div className="stage-status">
              <span className={focusMode ? '' : 'muted'}>{statusLine}</span>
              {!focusMode && (
                <button type="button" className="button" onClick={endSession}>
                  Apagar cámara
                </button>
              )}
            </div>
          )}
          {focusMode && (
            <p className="stage-foot">
              {practice?.phase === 'signing' && (
                <>Si una letra se te resiste, se salta sola a los 20 s<span className="kbd-only"> o con Espacio</span>. </>
              )}
              Fotos modelo: Fundación CNSE · CC BY-NC-SA 3.0
            </p>
          )}
        </div>

        <div className="card side">
          <h2 id="letras-titulo" className="side-title">Empieza por</h2>
          {/* Fuera de la sesión: elegir letra cambia la que se ve aquí y por dónde empieza la práctica.
              Durante la sesión este panel queda tapado por el modo práctica. */}
          <ul className="letter-chips" aria-labelledby="letras-titulo">
            {staticIds.map((id) => {
              const current = id === startId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`chip-letter ${current ? 'current' : ''}`}
                    aria-current={current || undefined}
                    aria-label={`${gloss(id)}${calibratedIds.has(id) ? ' (calibrada con tu mano)' : ''}`}
                    onClick={() => setParams({ signo: id })}
                  >
                    {gloss(id)}{calibratedIds.has(id) && <sup aria-hidden="true">•</sup>}
                  </button>
                </li>
              );
            })}
          </ul>
          {target && (
            <>
              <h3 className="side-letter">{target.gloss}</h3>
              <SignMedia sign={target} />
              <SignDescriptionList sign={target} />
            </>
          )}

        </div>
      </div>
    </section>
  );
}

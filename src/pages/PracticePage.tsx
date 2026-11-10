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
  PracticeSession,
  type CalibrationSnapshot,
  type PracticeSnapshot,
} from '../vision/sessions';
import { beep, unlockAudio } from '../vision/sound';
import { useLanguage } from '../state/LanguageContext';
import { SignDescriptionList, SignMedia } from '../components/SignCard';

const SMOOTHING_FRAMES = 8;
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

  const session = useRef<Session | null>(null);
  // Lo que lee el bucle de la cámara sin reiniciarse
  const live = useRef({ templates, tolerance, sound });
  live.current = { templates, tolerance, sound };

  const play = (tone: Parameters<typeof beep>[0]) => live.current.sound && beep(tone);

  /** `ids`: una ronda con solo esas letras (p. ej. repetir las saltadas). Si no, todas desde `fromId`. */
  function startSession(kind: Session['kind'], fromId = startId, ids?: string[]) {
    unlockAudio(); // este clic es el último gesto necesario
    const order = ids?.length ? ids : rotate(staticIds, fromId);
    setSessionTotal(order.length);
    session.current =
      kind === 'practice' ? { kind, s: new PracticeSession(order) } : { kind, s: new CalibrationSession(order) };
    setPractice(kind === 'practice' ? session.current.s.snapshot() as PracticeSnapshot : null);
    setCalibration(kind === 'calibrate' ? session.current.s.snapshot() as CalibrationSnapshot : null);
    if (status !== 'running') setStatus('loading');
  }

  /** Elegir una letra (desplegable o panel). Si hay una ronda en marcha, sigue desde esa letra. */
  function selectSign(id: string) {
    setParams({ signo: id });
    if (session.current) startSession(session.current.kind, id);
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
    }
  }

  const finished = active?.phase === 'finished';
  const okCount = practice ? [...practice.results.values()].filter((r) => r === 'ok').length : 0;
  const skippedIds = practice ? [...practice.results].filter(([, r]) => r === 'skipped').map(([id]) => id) : [];
  const skippedGlosses = skippedIds.map((id) => gloss(id));

  // Línea de estado bajo la cámara
  const statusLine =
    calibration && !finished
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
        Pulsa «Empezar práctica», colócate a un metro y signa la letra que aparece. Si la mantienes bien
        un segundo, se valida sola y pasa a la siguiente: no hace falta tocar nada. La imagen se procesa en
        tu dispositivo y no se guarda.
      </p>

      <div className="toolbar card">
        <button
          ref={startButtonRef}
          type="button"
          className="button primary"
          disabled={!refsReady}
          onClick={() => startSession('practice')}
        >
          Empezar práctica
        </button>
        <button type="button" className="button" disabled={!refsReady} onClick={() => startSession('calibrate')}>
          Calibrar con mi mano
        </button>
        <label>
          Empezar en
          <select value={startId} onChange={(e) => selectSign(e.target.value)}>
            {staticSigns.map((s) => <option key={s.id} value={s.id}>{s.gloss}</option>)}
          </select>
        </label>
        <label title="Cuánto debe parecerse tu mano a la referencia para dar la letra por buena">
          Exigencia
          <select value={tolerance} onChange={(e) => setTolerance(e.target.value as Tolerance)}>
            {Object.keys(TOLERANCE).map((t) => <option key={t} value={t}>{TOLERANCE_LABELS[t as Tolerance]}</option>)}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sonido
        </label>
      </div>
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
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />

            {status === 'running' && active && !finished && (
              <>
                <div className="camera-target" aria-live="polite">{gloss(targetId)}</div>
                {/* Mensaje y barra de mantener en una sola banda: se llena de verde mientras mantienes el
                    signo, queda verde al acertar y ámbar al saltar. Es una sola región anunciada que no se
                    desmonta, para que los lectores de pantalla oigan cada cambio. */}
                <div className={`camera-band ${flash ? `is-${flash}` : ''}`} aria-live="polite" aria-atomic="true">
                  <span className="camera-band-fill" style={{ transform: `scaleX(${flash ? 1 : progress})` }} aria-hidden="true" />
                  <span className="camera-band-text">
                    {(flash === 'ok' || flash === 'saved') && <CheckIcon />}
                    {flash ? flashText : headline}
                  </span>
                </div>
              </>
            )}

            {status === 'running' && finished && (
              <div className="camera-overlay round-end" role="status">
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
                        <button type="button" className="button primary" onClick={() => startSession('practice', undefined, skippedIds)}>
                          Repetir las saltadas ({skippedIds.length})
                        </button>
                      ) : (
                        <button type="button" className="button primary" onClick={() => startSession('practice')}>
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
                      <button type="button" className="button primary" onClick={() => startSession('practice')}>
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
              <figcaption>{flash === 'skip' ? `Así es la ${letter}` : 'Modelo'}</figcaption>
            </figure>
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
              {practice?.phase === 'signing' && 'Si una letra se te resiste, se salta sola a los 20 s o con Espacio. '}
              Fotos modelo: Fundación CNSE · CC BY-NC-SA 3.0
            </p>
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
          <ul className="letter-chips" aria-label="Elige una letra">
            {staticIds.map((id) => {
              const result = practice?.results.get(id);
              const state = calibration
                ? calibration.saved.has(id) ? 'ok' : ''
                : result ?? '';
              const current = (!active || !finished) && id === targetId;
              const hints = [
                calibratedIds.has(id) && 'calibrada con tu mano',
                state === 'ok' && (calibration ? 'grabada' : 'validada'),
                state === 'skipped' && 'saltada',
              ].filter(Boolean);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`chip-letter ${state} ${current ? 'current' : ''}`}
                    aria-pressed={current}
                    aria-label={`${gloss(id)}${hints.length ? ` (${hints.join(', ')})` : ''}`}
                    title={active ? `Seguir desde la ${gloss(id)}` : `Ver la ${gloss(id)}`}
                    onClick={() => selectSign(id)}
                  >
                    {gloss(id)}{calibratedIds.has(id) && <sup aria-hidden="true">•</sup>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="muted small">
            Funciona sin calibrar: compara tu mano con las fotos de la Fundación CNSE. Si alguna letra no se
            valida aunque la hagas bien, usa «Calibrar con mi mano». Las letras calibradas llevan •.
          </p>
          {calibratedIds.size > 0 && !calibration && (
            <button type="button" className="button" onClick={() => clearTemplates()}>
              Borrar mi calibración ({calibratedIds.size === 1 ? '1 letra' : `${calibratedIds.size} letras`})
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

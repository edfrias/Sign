import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import { db } from '../db/db';
import { clearTemplates, saveTemplates } from '../db/actions';
import { getHandLandmarker } from '../vision/handLandmarker';
import { averageVectors, normalizeHand, type Handedness } from '../vision/features';
import { evaluate, type Evaluation } from '../vision/classifier';
import { useLanguage } from '../state/LanguageContext';
import { SignDescriptionList, SignMedia } from '../components/SignCard';

const SMOOTHING_FRAMES = 10;
const CALIBRATION_SAMPLES = 30;

type Status = 'idle' | 'loading' | 'running' | 'error';

export function PracticePage() {
  const { content } = useLanguage();
  const [params, setParams] = useSearchParams();
  const staticSigns = content.signs.filter((s) => s.kind === 'static');
  const signId = staticSigns.some((s) => s.id === params.get('signo')) ? params.get('signo')! : staticSigns[0]?.id;
  const sign = signId ? content.signById.get(signId) : undefined;

  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const targetSamples = templates?.filter((t) => t.signId === signId).length ?? 0;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [handVisible, setHandVisible] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [capturing, setCapturing] = useState(0); // muestras capturadas durante la calibración

  // Valores que lee el bucle de animación sin reiniciarlo
  const live = useRef({ templates: templates ?? [], signId, capturing: false, captured: [] as number[][] });
  live.current.templates = templates ?? [];
  live.current.signId = signId;

  const cameraActive = status === 'loading' || status === 'running';

  useEffect(() => {
    if (!cameraActive) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      try {
        const [landmarker, media] = await Promise.all([
          getHandLandmarker(),
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
        setError(e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Has denegado el permiso de la cámara.'
          : `No se pudo iniciar la cámara o el detector: ${(e as Error).message}`);
        setStatus('error');
      }
    })();

    const buffer: number[][] = [];
    let lastTime = -1;

    function loop(landmarker: HandLandmarker, video: HTMLVideoElement) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const draw = ctx ? new DrawingUtils(ctx) : null;

      const tick = () => {
        if (stopped) return;
        if (video.currentTime !== lastTime && video.videoWidth) {
          lastTime = video.currentTime;
          const res = landmarker.detectForVideo(video, performance.now());
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
          setHandVisible(!!hand);
          if (hand && side) {
            const vec = normalizeHand(hand, side);
            const l = live.current;
            if (l.capturing) {
              l.captured.push(vec);
              setCapturing(l.captured.length);
              if (l.captured.length >= CALIBRATION_SAMPLES && l.signId) {
                const samples = l.captured;
                l.capturing = false;
                l.captured = [];
                void saveTemplates(l.signId, samples).then(() => setCapturing(0));
              }
            }
            buffer.push(vec);
            if (buffer.length > SMOOTHING_FRAMES) buffer.shift();
            if (l.signId && l.templates.length) setResult(evaluate(averageVectors(buffer), l.templates, l.signId));
            else setResult(null);
          } else {
            buffer.length = 0;
            setResult(null);
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
      live.current.capturing = false;
      live.current.captured = [];
      setCapturing(0);
      setResult(null);
      setHandVisible(false);
    };
  }, [cameraActive]);

  function startCalibration() {
    live.current.captured = [];
    live.current.capturing = true;
    setCapturing(1);
  }

  if (!sign) return <p>Esta lengua aún no tiene signos estáticos para practicar.</p>;

  const targetName = (id?: string) => (id ? content.signById.get(id)?.gloss ?? id : '—');
  const score = result?.target?.score;

  return (
    <section className="practice">
      <h1>Práctica con cámara</h1>
      <p className="muted">
        Solo signos estáticos (sin movimiento). La imagen se procesa en tu dispositivo y no se guarda.
      </p>

      <label className="filters">
        <span>Signo:</span>
        <select value={signId} onChange={(e) => setParams({ signo: e.target.value })}>
          {staticSigns.map((s) => <option key={s.id} value={s.id}>{s.gloss}</option>)}
        </select>
      </label>

      <div className="practice-grid">
        <div className="card">
          <div className="camera">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            {status !== 'running' && (
              <div className="camera-overlay">
                {status === 'loading' ? (
                  <p>Cargando detector y cámara…</p>
                ) : (
                  <>
                    {status === 'error' && <p role="alert">{error}</p>}
                    <button type="button" className="button primary" onClick={() => setStatus('loading')}>
                      Activar cámara
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          {status === 'running' && (
            <div className="actions spread">
              <span className="muted">{handVisible ? 'Mano detectada' : 'Pon la mano delante de la cámara'}</span>
              <button type="button" className="button" onClick={() => setStatus('idle')}>Apagar</button>
            </div>
          )}
        </div>

        <div className="card">
          <h2>{sign.gloss}</h2>
          <SignMedia sign={sign} />
          <SignDescriptionList sign={sign} />

          <h3>Resultado</h3>
          {targetSamples === 0 ? (
            <p className="muted">
              Aún no has calibrado «{sign.gloss}». Haz el signo correctamente y pulsa «Calibrar»: se guardarán
              {' '}{CALIBRATION_SAMPLES} muestras como referencia. Calibra al menos dos signos para que la app pueda distinguirlos.
            </p>
          ) : result ? (
            <div aria-live="polite">
              <meter min={0} max={100} low={40} high={60} optimum={100} value={score ?? 0} />
              <p className={result.correct ? 'ok-text' : ''}>
                <strong>{score ?? 0}/100</strong> {result.correct ? '· ¡Bien hecho!' : ''}
              </p>
              {!result.correct && result.best && result.best.signId !== signId && (
                <p className="muted">Se parece más a «{targetName(result.best.signId)}».</p>
              )}
            </div>
          ) : (
            <p className="muted">{status === 'running' ? 'Esperando una mano…' : 'Activa la cámara.'}</p>
          )}

          <div className="actions">
            <button
              type="button"
              className="button"
              disabled={status !== 'running' || !handVisible || capturing > 0}
              onClick={startCalibration}
            >
              {capturing > 0 ? `Grabando ${capturing}/${CALIBRATION_SAMPLES}…` : 'Calibrar'}
            </button>
            {targetSamples > 0 && (
              <button type="button" className="button" onClick={() => signId && clearTemplates(signId)}>
                Borrar calibración ({targetSamples})
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

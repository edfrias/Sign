import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Debe coincidir con la versión instalada de @mediapipe/tasks-vision.
const MEDIAPIPE_VERSION = '0.10.35';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

type Mode = 'VIDEO' | 'IMAGE';

let fileset: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
const instances = new Map<Mode, Promise<HandLandmarker>>();

/**
 * Carga perezosa y única del detector (~8 MB la primera vez; luego sale de caché).
 * VIDEO para la cámara; IMAGE para analizar las fotos de referencia.
 */
export function getHandLandmarker(mode: Mode = 'VIDEO'): Promise<HandLandmarker> {
  let instance = instances.get(mode);
  if (!instance) {
    instance = (async () => {
      fileset ??= FilesetResolver.forVisionTasks(WASM_URL);
      const files = await fileset;
      const create = (delegate: 'GPU' | 'CPU') =>
        HandLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: mode,
          numHands: 1,
          minHandDetectionConfidence: mode === 'IMAGE' ? 0.3 : 0.5,
        });
      // Las fotos de referencia se analizan una sola vez: la CPU basta y no depende de WebGL.
      if (mode === 'IMAGE') return create('CPU');
      try {
        return await create('GPU');
      } catch {
        return await create('CPU');
      }
    })().catch((err) => {
      instances.delete(mode); // permitir reintentar
      fileset = null;
      throw err;
    });
    instances.set(mode, instance);
  }
  return instance;
}

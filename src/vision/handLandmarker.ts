import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Debe coincidir con la versión instalada de @mediapipe/tasks-vision.
const MEDIAPIPE_VERSION = '0.10.35';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let instance: Promise<HandLandmarker> | null = null;

/** Carga perezosa y única del detector (~8 MB la primera vez; luego sale de caché). */
export function getHandLandmarker(): Promise<HandLandmarker> {
  instance ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    const create = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    try {
      return await create('GPU');
    } catch {
      return await create('CPU');
    }
  })().catch((err) => {
    instance = null; // permitir reintentar
    throw err;
  });
  return instance;
}

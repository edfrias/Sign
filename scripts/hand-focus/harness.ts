// Corre en el navegador (lo sirve Vite para scripts/hand-focus.mjs). Detecta las manos de cada foto
// y devuelve el centro de la caja que las contiene y la ampliación para que ocupen el círculo.
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { focusFromBox, type Box } from '../../src/content/handFocus';

// Mismas URLs que src/vision/handLandmarker.ts (WASM de la versión instalada y modelo oficial)
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

async function detectHandFocus(items: { id: string; image: string; oneHand?: boolean }[]) {
  const files = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
    runningMode: 'IMAGE',
    numHands: 2, // muchos signos de vocabulario usan las dos manos: el zoom debe abarcar ambas
    minHandDetectionConfidence: 0.3,
  });

  const found: Record<string, ReturnType<typeof focusFromBox>> = {};
  const missing: string[] = [];
  for (const { id, image, oneHand } of items) {
    const res = landmarker.detect(await loadImage(image));
    let hands = res.landmarks;
    if (oneHand && hands.length > 1) {
      // La mano con más confianza
      const scores = res.handedness.map((h) => h[0]?.score ?? 0);
      hands = [hands[scores.indexOf(Math.max(...scores))]!];
    }
    const points = hands.flat();
    if (points.length === 0) {
      missing.push(id);
      continue;
    }
    const box: Box = {
      minX: Math.min(...points.map((p) => p.x)),
      maxX: Math.max(...points.map((p) => p.x)),
      minY: Math.min(...points.map((p) => p.y)),
      maxY: Math.max(...points.map((p) => p.y)),
    };
    found[id] = focusFromBox(box);
  }
  landmarker.close();
  return { found, missing };
}

(window as unknown as { detectHandFocus: typeof detectHandFocus }).detectHandFocus = detectHandFocus;

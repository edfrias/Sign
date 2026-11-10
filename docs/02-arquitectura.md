# 02 · Arquitectura

## Stack

| Capa | Tecnología |
|---|---|
| Build | Vite + TypeScript (modo estricto) |
| UI | React 18 + React Router |
| PWA | `vite-plugin-pwa` (service worker con Workbox) |
| Persistencia | IndexedDB mediante Dexie |
| Visión | `@mediapipe/tasks-vision` (Hand Landmarker) |
| Tests | Vitest |

## Vista general

```
┌─────────────── Navegador ───────────────┐
│  UI (React)                             │
│   ├─ Lecciones / Diccionario            │
│   ├─ Quiz / Repaso ── srs/ (SM-2)       │
│   └─ Práctica ────── vision/            │
│                       ├─ HandLandmarker │ ← cámara (solo en memoria)
│                       ├─ features.ts    │   21 puntos → vector normalizado
│                       └─ classifier.ts  │   comparación con plantillas
│  content/ (JSON por lengua)             │
│  db/ (Dexie → IndexedDB)                │   progreso, repaso, plantillas
└─────────────────────────────────────────┘
```

## Estructura del repositorio

```
content/
  languages.json            índice de lenguas disponibles
  lse/
    signs.json              signos de la lengua
    units.json              unidades y lecciones
  asl/ ...
public/media/<lengua>/      vídeos/imágenes propios o con licencia abierta
src/
  content/                  tipos y carga del contenido
  srs/                      algoritmo de repetición espaciada
  quiz/                     generación de preguntas
  vision/                   MediaPipe, extracción de rasgos, clasificador
  db/                       esquema Dexie y acciones
  state/                    lengua activa (contexto React)
  pages/                    pantallas
  components/               componentes reutilizables
docs/                       esta documentación
```

## Modelo de contenido

```ts
interface Sign {
  id: string;               // "lse.letra.a"
  gloss: string;            // "A"
  category: string;         // "alfabeto"
  kind: "static" | "dynamic";
  description: {
    handshape?: string;     // configuración
    orientation?: string;
    location?: string;
    movement?: string;
    nonManual?: string;     // expresión facial / corporal
  };
  media?: { video?: string; image?: string; credit?: string; license?: string };
  variant?: string;         // variante regional
  source?: string;          // de dónde sale la información
}
```

Las unidades referencian signos por `id`. Añadir una lengua = nueva carpeta + entrada en `languages.json`.

## Reconocimiento por cámara

1. **Detección**: MediaPipe devuelve 21 puntos (x, y, z) por mano en cada fotograma.
2. **Normalización** (`features.ts`):
   - Trasladar para que la muñeca sea el origen.
   - Escalar por la distancia muñeca → base del dedo corazón (independiente de la distancia a la cámara).
   - Reflejar el eje X si es la mano izquierda (independiente de la mano dominante).
   - Resultado: vector de 63 números.
3. **Plantillas** (`referenceTemplates.ts`): al abrir la práctica, MediaPipe (modo imagen, CPU)
   analiza la foto de cada signo estático y guarda en memoria su vector. Son las **referencias de
   fábrica**: la app funciona sin calibrar. La calibración del usuario añade sus propios vectores (IndexedDB).
4. **Clasificación** (`classifier.ts`): vecino más cercano contra referencias + calibración.
   Un signo es correcto si el más parecido es el objetivo **y** su distancia no supera la
   tolerancia elegida (estricta 0,25 · normal 0,35 · flexible 0,45, en longitudes de palma).
5. **Suavizado**: se promedian los últimos 8 fotogramas para evitar parpadeos.

### Manos libres (`sessions.ts`)

Mientras se signa no se puede usar teclado ni ratón, así que todo avanza solo tras un único clic:

- **Práctica** (`PracticeSession`): el signo se valida al mantenerlo correcto 1 s (tolera cortes de
  0,3 s), suena un pitido y pasa al siguiente. Si en 20 s con la mano visible no se consigue, se salta.
  El tiempo no corre mientras no hay mano a la vista.
- **Calibración guiada** (`CalibrationSession`): por cada letra, 1,5 s para colocar la mano, espera
  a que esté quieta 0,8 s (dispersión ≤ 0,08) y graba durante 1 s. Si la mano desaparece mientras
  graba, no guarda nada a medias. Sustituye la calibración anterior de esa letra.
- Pitidos distintos para acierto, salto, grabación y fin (`sound.ts`), y textos grandes legibles a 1 m.

Distancia entre las referencias de letras más parecidas (de las fotos): O–S 0,23 · E–S 0,27 ·
L–R 0,29. Por eso la tolerancia "normal" exige además que el objetivo sea el más cercano.

v2 (signos dinámicos): grabar secuencias de vectores y compararlas con *Dynamic Time Warping*.

El modelo `hand_landmarker.task` (~8 MB) y los ficheros WASM se descargan la primera vez
y el service worker los guarda en caché para uso offline.

## Repetición espaciada (SM-2)

Cada signo tiene `{ ease, interval, repetitions, due }`. Tras cada respuesta se puntúa de 0 a 5:
- < 3 → `repetitions = 0`, `interval = 1` día.
- ≥ 3 → intervalo 1, 6 y luego `interval × ease`; `ease` se ajusta según la nota (mínimo 1,3).

## Persistencia (Dexie)

| Tabla | Clave | Contenido |
|---|---|---|
| `progress` | `[lang+lessonId]` | lección completada, fecha |
| `reviews` | `signId` | estado SM-2 |
| `templates` | `++id`, índice `signId` | vectores de referencia de la cámara |

La lengua activa se guarda en `localStorage` (`sign.lang`) para no tener parpadeo al arrancar.

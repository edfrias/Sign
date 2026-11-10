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
3. **Clasificación** (`classifier.ts`): k vecinos más cercanos contra las plantillas
   guardadas del usuario. La puntuación 0–100 sale de la distancia a la plantilla más cercana
   del signo objetivo.
4. **Estabilidad**: se promedia sobre una ventana de ~10 fotogramas para evitar parpadeos.

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

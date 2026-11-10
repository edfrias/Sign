# 03 · Hoja de ruta

## Fase 0 · Base ✅
- [x] Repositorio, documentación, esqueleto Vite + React + TS + PWA.
- [x] Modelo de contenido y carga por lengua (LSE y ASL de ejemplo).

## Fase 1 · Aprender
- [x] Lista de unidades y vista de lección paso a paso.
- [x] Diccionario con búsqueda (sin tildes) y filtro por categoría.
- [x] Reproductor de vídeo con bucle y 0,5× (listo; falta contenido).
- [ ] **Contenido**: alfabeto manual LSE completo con vídeos/imágenes con licencia.
- [ ] **Verificar** las descripciones actuales (todas marcadas "Sin verificar").

## Fase 2 · Practicar
- [x] Algoritmo SM-2 con tests.
- [x] Quiz de opción múltiple que alimenta el repaso.
- [x] Repaso de los signos pendientes con contador en la portada.
- [ ] Quiz inverso (palabra → vídeo); tiene sentido cuando haya vídeos.

## Fase 3 · Cámara
- [x] Detección de manos con MediaPipe y dibujo de puntos.
- [x] Rasgos normalizados + clasificador por vecino más cercano, con tests.
- [x] Calibración: guardar y borrar plantillas propias.
- [ ] Probar con cámara real y ajustar `MAX_DISTANCE` / `PASS_SCORE` (`src/vision/classifier.ts`).

## Fase 4 · Pulido
- [ ] Exportar/importar progreso.
- [ ] Auditoría de accesibilidad (Lighthouse/axe).
- [ ] Iconos PNG 192/512 para instalación en iOS.
- [ ] Actualizar Vite a la versión mayor actual (avisos de `npm audit` en dependencias de desarrollo).

## v2 y siguientes
- Signos dinámicos (secuencias + DTW).
- Expresiones faciales (MediaPipe Face Landmarker).
- Sincronización opcional entre dispositivos.

# 01 · Análisis y requisitos

## Visión

**Sign** es una aplicación web instalable (PWA) para aprender lenguas de signos de forma
autónoma: ver cómo se hace cada signo, practicarlo con ejercicios y repetición espaciada,
y comprobar con la cámara si la forma de la mano es correcta.

Proyecto personal. Prioridades: aprender bien, iterar rápido y no depender de un servidor.

## Decisiones de partida

| Tema | Decisión | Motivo |
|---|---|---|
| Plataforma | Web PWA (móvil y escritorio) | Una sola base de código, instalable, funciona offline |
| Lenguas | Multilengua por diseño; contenido inicial en **LSE** | El usuario habla español; ASL queda preparada como segunda lengua |
| Idioma de la interfaz | Español (preparado para i18n) | |
| Backend | Ninguno en v1; todo en el navegador | Privacidad (la cámara nunca sale del dispositivo) y coste cero |
| Reconocimiento | MediaPipe Hand Landmarker en el navegador | Gratis, rápido, funciona offline una vez descargado el modelo |

## Usuarios

- **Principiante**: no sabe nada; quiere empezar por el alfabeto manual (dactilología) y vocabulario básico.
- **Repaso**: ya conoce signos y quiere no olvidarlos (repetición espaciada).
- **Autor de contenido** (el propio usuario): añade signos y vídeos propios editando ficheros JSON.

## Requisitos funcionales (v1)

### RF1 · Lenguas
- RF1.1 Elegir la lengua de signos activa (LSE, ASL…). El progreso es independiente por lengua.
- RF1.2 Añadir una lengua nueva = añadir una carpeta de contenido, sin tocar código.

### RF2 · Lecciones y diccionario
- RF2.1 Lecciones agrupadas por unidades (Alfabeto, Saludos, Familia, Números…).
- RF2.2 Cada signo tiene: glosa, descripción de cómo se hace (configuración, orientación,
  ubicación, movimiento, expresión), vídeo o imagen, y categoría.
- RF2.3 Reproducir el vídeo en bucle y a velocidad reducida (0,5×).
- RF2.4 Diccionario con búsqueda por palabra y filtro por categoría.

### RF3 · Ejercicios y repaso
- RF3.1 Quiz "¿Qué signo es?": se muestra el vídeo y se elige entre 4 palabras.
- RF3.2 Quiz inverso: se muestra la palabra y se elige entre 4 vídeos.
- RF3.3 Repetición espaciada (algoritmo SM-2) con cola diaria de repaso.
- RF3.4 Al terminar una lección, sus signos entran en la cola de repaso.

### RF4 · Práctica con cámara
- RF4.1 Activar la cámara y ver las manos detectadas superpuestas (21 puntos por mano).
- RF4.2 Para signos estáticos (letras del alfabeto manual, números) indicar si la forma
  de la mano coincide con la de referencia, con una puntuación de 0 a 100.
- RF4.3 Modo **calibración**: grabar tus propias muestras de referencia de un signo.
  Necesario porque no existen plantillas públicas fiables para todas las lenguas.
- RF4.4 Nada de vídeo se guarda ni se envía: solo se procesan coordenadas en memoria.

### RF5 · Progreso
- RF5.1 Guardar lecciones completadas, estado de repaso de cada signo y plantillas de cámara
  en el navegador (IndexedDB).
- RF5.2 Exportar e importar el progreso como fichero JSON (copia de seguridad).

## Requisitos no funcionales

- **Offline**: tras la primera visita, la app y el contenido descargado funcionan sin conexión.
- **Rendimiento**: detección de manos ≥ 20 fps en un portátil medio y ≥ 10 fps en un móvil medio.
- **Accesibilidad**: navegable con teclado, contraste AA, subtítulos/texto en cada vídeo.
  Los usuarios sordos son parte natural del público aunque sea un proyecto personal.
- **Privacidad**: sin analítica ni cuentas en v1.
- **Mantenibilidad**: TypeScript estricto, tests unitarios de la lógica (SRS, clasificador).

## Fuera de alcance en v1

- Reconocimiento de signos **dinámicos** (con movimiento) y de expresiones faciales → v2.
- Cuentas de usuario y sincronización entre dispositivos → v3.
- Traducción de frases completas: es un problema de investigación abierto, no un objetivo.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Licencias de los vídeos.** Los diccionarios de la Fundación CNSE, Spread the Sign, etc. tienen copyright | Alto | No incrustar vídeos ajenos. Usar recursos con licencia abierta (p. ej. ARASAAC, CC BY-NC-SA, citando autoría), grabar vídeos propios o enlazar a la fuente |
| El reconocimiento por cámara da falsos positivos o negativos | Medio | Limitarlo a formas estáticas, usar plantillas calibradas por el propio usuario y mostrarlo como ayuda, no como verdad |
| Variantes regionales dentro de una misma lengua | Medio | Campo `variant` en cada signo y nota visible |
| La app enseña un signo mal | Medio | Cada signo cita su fuente; revisión por una persona signante cuando sea posible |

## Criterios de aceptación de la v1

1. Se puede completar la unidad "Alfabeto manual LSE" viendo cada letra.
2. Se puede hacer un quiz de 10 preguntas y las falladas vuelven antes en el repaso.
3. Con la cámara, tras calibrar la letra "A", la app la distingue de la "B" en condiciones normales de luz.
4. Recargando la página sin conexión, el progreso sigue ahí.

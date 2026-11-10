# 04 · Fuentes de contenido (LSE)

Revisado el 2026-11-10. Las licencias pueden cambiar: vuelve a comprobarlas antes de importar material nuevo.

## Resumen

| Fuente | Qué ofrece | Licencia | Uso en Sign |
|---|---|---|---|
| [Banco de imágenes y signos LSE](https://www.fundacioncnse.org/educa/bancolse/index.php) (Fundación CNSE) | ~550 signos de vocabulario infantil/primaria en 12 temas + dactilológico A–Z (con CH, LL, Ñ, RR). Por signo: foto del signo y dibujo, descargables en PNG | **CC BY-NC-SA 3.0**, uso educativo no comercial | ✅ **Fuente principal de imágenes.** Se pueden incluir en la app citando autoría |
| [DILSE](https://fundacioncnse-dilse.org/) (Fundación CNSE) | Diccionario normativo de LSE: vídeo de cada signo | Según el espejo de abajo, CC BY-NC-SA 3.0 (la web oficial es una app JS y no se pudo leer su aviso) | ✅ Referencia de verificación y vídeos; confirmar la licencia en la web oficial antes de importar vídeos |
| [dilse.bartol.es](https://dilse.bartol.es/terminos/) | Espejo **no oficial** de DILSE: 10.929 entradas con definición, imagen y vídeo (`.mov` alojado en fundacioncnse-dilse.org). URLs estables: `/terminos/<palabra>-<id>.html` | Declara CC BY-NC-SA 3.0 (datos de Fundación CNSE) | 🔗 Para buscar y enlazar. Citar siempre a la Fundación CNSE como autora, no al espejo |
| [Spread the Sign](https://www.spreadthesign.com/es.es/alphabet/22/) (European Sign Language Centre) | Vídeo MP4 de cada letra del alfabeto LSE y diccionario multilengua (útil para ASL y otras) | © sin licencia abierta publicada | 🔗 Solo enlazar. No descargar ni incrustar |
| [Sématos](https://www.sematos.eu/es/lse) | ~6.000 signos LSE en vídeo, también LSF, LSC e ISL; tiene juegos | © Sématos. Sus condiciones prohíben descargar sistemáticamente y redistribuir vídeos | 🔗 Solo enlazar como recurso externo |

## Qué implica CC BY-NC-SA 3.0

- **BY**: cada imagen o vídeo debe citar «Fundación CNSE», con enlace a la fuente y a la licencia.
  El campo `media.credit` / `media.license` del modelo ya existe para esto.
- **NC**: la app no puede tener uso comercial (ni anuncios ni venta) mientras incluya este material.
- **SA**: el contenido derivado (`content/` y `public/media/`) debe publicarse con la misma licencia.
  El **código** de la app puede llevar otra licencia, porque es independiente del contenido.

## Material importado

| Qué | Origen | Cómo regenerarlo |
|---|---|---|
| 30 fotos del alfabeto (`public/media/lse/alfabeto/*.webp`, 640×640, ~466 KB en total) | Banco LSE, `.../dactilologico/descarga/<letra>.png` | `node scripts/import-cnse-alphabet.mjs` |

Las descripciones de texto del alfabeto se han redactado a partir de esas fotos. Donde la forma de la
mano era demasiado sutil para describirla con fiabilidad (F, K, S, T, H, Y), solo se muestra la foto.
Las letras con flecha de movimiento en la foto (CH, G, H, J, LL, Ñ, RR, V, W, X, Y, Z) están marcadas
como `dynamic` y no aparecen en la práctica con cámara.

## Atribución en la app

- Cada foto muestra al pie: autoría (enlazada a su página original), licencia (enlazada al texto
  legal de Creative Commons) y enlace a **Créditos**.
- El pie de todas las pantallas enlaza a la Fundación CNSE, a la licencia y a `/creditos`.
- La página `/creditos` recoge autoría, fuente, licencia, cambios realizados, licencia del contenido
  derivado, aviso de no afiliación, la página original de cada imagen y las fuentes solo enlazadas.
- `src/content/content.test.ts` falla si alguna imagen de terceros no tiene autoría, licencia con
  enlace (`src/content/licenses.ts`) o página original.

## Notas técnicas

- **Imágenes del dactilológico**: hay varias variantes por letra en
  `.../bancolse/dactilologico/descarga/<letra>-imagen.png`, `<letra>-dibujo.png`, `<letra>-sinlogo.png`.
  La foto del signo es la que más sirve para aprender; el dibujo sirve como icono.
- **Vídeos de DILSE**: son `.mov`. Safari y Chrome suelen reproducirlos, Firefox no siempre.
  Si se importan, conviene convertirlos a MP4 (H.264) o WebM. No enlazarlos en caliente
  (hotlinking) desde la app: consume ancho de banda de la Fundación CNSE y no funciona offline.
- **Verificación**: un signo pasa a `"verified": true` cuando se ha contrastado con DILSE o el Banco LSE.
  Indicarlo en el campo `source`.

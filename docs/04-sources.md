# 04 · Content sources (LSE)

Reviewed on 2026-11-10 (DILSE legal notice read the same day). Licences can change: check them again before importing new material.

## Summary

| Source | What it offers | Licence | Use in Sign |
|---|---|---|---|
| [Banco de imágenes y signos LSE](https://www.fundacioncnse.org/educa/bancolse/index.php) (Fundación CNSE) | ~540 signs of infant/primary-school vocabulary in 29 sections + fingerspelling A–Z (including CH, LL, Ñ, RR). Per sign: a photo of the sign and a drawing, downloadable as PNG | **CC BY-NC-SA 3.0**, educational non-commercial use | ✅ **Fully imported** (alphabet + vocabulary), with attribution |
| [DILSE](https://fundacioncnse-dilse.org/) (Fundación CNSE) | Standard LSE dictionary: a video of every sign | **Contradictory**: the footer says «Contenido original de Fundación CNSE · Licencia CC BY-NC-SA 3.0», but the [legal notice](https://fundacioncnse-dilse.org/paginas/aviso-legal.php) only allows downloads for personal, private, non-profit use and forbids distribution and transformation | 🔗 Reference and links only. **Do not import videos** until Fundación CNSE confirms in writing that the CC licence covers them |
| [dilse.bartol.es](https://dilse.bartol.es/terminos/) | **Unofficial** mirror of DILSE: 10,929 entries with definition, image and video (`.mov` hosted on fundacioncnse-dilse.org). Stable URLs: `/terminos/<word>-<id>.html` | States CC BY-NC-SA 3.0 (Fundación CNSE data) | 🔗 For searching and linking. Always credit Fundación CNSE as the author, not the mirror |
| [Spread the Sign](https://www.spreadthesign.com/es.es/alphabet/22/) (European Sign Language Centre) | MP4 video of each letter of the LSE alphabet and a multi-language dictionary (useful for ASL and others) | © with no published open licence | 🔗 Link only. Do not download or embed |
| [Sématos](https://www.sematos.eu/es/lse) | ~6,000 LSE signs on video, also LSF, LSC and ISL; includes games | © Sématos. Its terms forbid systematic downloading and redistributing videos | 🔗 Link only, as an external resource |

## What CC BY-NC-SA 3.0 implies

- **BY**: every image or video must credit "Fundación CNSE", with a link to the source and to the licence.
  The `media.credit` / `media.license` fields of the model exist for this.
- **NC**: the app cannot be used commercially (no ads, no sales) while it includes this material.
- **SA**: derived content (`content/` and `public/media/`) must be published under the same licence.
  The app's **code** can use a different licence, because it is independent of the content.

## Imported material

| What | Origin | How to regenerate it |
|---|---|---|
| 30 alphabet photos (`public/media/lse/alfabeto/*.webp`, 640×640, ~466 KB in total) | Banco LSE, `.../dactilologico/descarga/<letter>.png` | `pnpm import:alphabet` |
| 538 vocabulary signs in 11 units / 29 sections (`public/media/lse/vocabulario/*.webp`, 640×640, ~9.7 MB) and the generated `content/lse/signs.bancolse.json` + `units.bancolse.json` | Every section page of Banco LSE → each sign's page → its photo in `descarga(s)/<sign>.png` | `pnpm import:vocabulary` (`--force` to download everything again) |

The vocabulary importer:
- takes the sign names from the site's general list, which is more precise than the section pages
  ("Banco (Empresa)" / "Banco (Asiento)"), and fixes one typo of the site ("Atmoférico");
- tries each candidate photo, since some pages link to files that do not exist (`sed-imgaen.png`);
- falls back to the general list when a section links to a broken page (Levantarse);
- drops exact duplicates (same name and same photo: "Comida 2"), marks real variants
  (`"variant": "Variante 2"`, e.g. Bañador) and lets different words with an identical photo share one
  file (Alimento = Comida, Fruta = Manzana = Postre, Baño = Cuarto de baño). The quiz never offers two
  options with the same name or the same photo.

All vocabulary signs are marked `dynamic` (almost all have movement arrows) and have no text
description: the photo is the reference. They are `verified: true` because the photo comes from
Fundación CNSE. The four greetings written by hand earlier (hola, gracias, adiós, por favor) were
removed in favour of the Banco LSE ones.

The text descriptions of the alphabet were written from those photos. Where the handshape was too
subtle to describe reliably (F, K, S, T, H, Y), only the photo is shown.
The letters with a movement arrow in the photo (CH, G, H, J, LL, Ñ, RR, V, W, X, Y, Z) are marked
as `dynamic` and do not appear in camera practice.

## Attribution in the app

- Every photo shows a caption with: authorship (linked to its original page), licence (linked to the
  Creative Commons legal text) and a link to **Créditos** (Credits).
- The footer of every screen links to Fundación CNSE, to the licence and to `/creditos`.
- The `/creditos` page lists authorship, source, licence, changes made, licence of the derived
  content, a non-affiliation notice, the original page of each image, and the link-only sources.
- `src/content/content.test.ts` fails if any third-party image lacks authorship, a licence with a
  link (`src/content/licenses.ts`) or an original page.

## Technical notes

- **Fingerspelling images**: there are several variants per letter at
  `.../bancolse/dactilologico/descarga/<letter>-imagen.png`, `<letter>-dibujo.png`, `<letter>-sinlogo.png`.
  The photo of the sign is the most useful for learning; the drawing works as an icon.
- **DILSE videos**: they are `.mov`. Safari and Chrome usually play them, Firefox not always.
  If imported, convert them to MP4 (H.264) or WebM. Do not hotlink them from the app: it uses
  Fundación CNSE's bandwidth and does not work offline.
- **Verification**: a sign becomes `"verified": true` once it has been checked against DILSE or Banco LSE.
  Record this in the `source` field.

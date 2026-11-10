// Genera los iconos PNG de la PWA a partir de public/icon.svg (pnpm icons).
// - icon-192/512: el icono tal cual (esquinas redondeadas), para Android y escritorio.
// - icon-maskable-512: fondo a sangre y dibujo dentro de la zona segura (80 %), para máscaras de Android.
// - apple-touch-icon (180): cuadrado sin redondear ni transparencia; iOS aplica su propia máscara.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const svg = await readFile('public/icon.svg', 'utf8');
const glyph = svg.match(/<g[\s\S]*<\/g>/)?.[0];
const background = svg.match(/fill="(#[0-9a-f]{3,6})"/i)?.[1];
if (!glyph || !background) throw new Error('public/icon.svg no tiene el formato esperado (<rect fill> + <g>)');

/** Fondo cuadrado a sangre con el dibujo reducido a `scale` y centrado. */
const fullBleed = (scale) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${background}"/>` +
  `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${glyph}</g></svg>`,
);

const jobs = [
  ['public/icon-192.png', Buffer.from(svg), 192],
  ['public/icon-512.png', Buffer.from(svg), 512],
  ['public/icon-maskable-512.png', fullBleed(0.8), 512],
  ['public/apple-touch-icon.png', fullBleed(0.9), 180],
];
for (const [out, input, size] of jobs) {
  await sharp(input, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log('✓', out);
}

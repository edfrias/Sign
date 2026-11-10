// Descarga las fotos del alfabeto dactilológico del Banco de imágenes y signos LSE
// (Fundación CNSE, CC BY-NC-SA 3.0) y las convierte a WebP para la app.
//
// Uso: node scripts/import-cnse-alphabet.mjs [--sheet ruta.webp]
//   --sheet  genera además una hoja de contactos con todas las letras (para revisarlas)

import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const BASE = 'https://www.fundacioncnse.org/educa/bancolse/dactilologico/descarga';
const OUT_DIR = new URL('../public/media/lse/alfabeto/', import.meta.url);
const SIZE = 640;

/** [nombre en la app, nombre del fichero en el Banco LSE] — en orden alfabético LSE */
export const LETTERS = [
  ['a', 'a'], ['b', 'b'], ['c', 'c'], ['ch', 'ch'], ['d', 'd'], ['e', 'e'], ['f', 'f'],
  ['g', 'g'], ['h', 'h'], ['i', 'i'], ['j', 'j'], ['k', 'k'], ['l', 'l'], ['ll', 'll'],
  ['m', 'm'], ['n', 'n'], ['enie', 'n-fuerte'], ['o', 'o'], ['p', 'p'], ['q', 'q'],
  ['r', 'r'], ['rr', 'rr'], ['s', 's'], ['t', 't'], ['u', 'u'], ['v', 'v'], ['w', 'w'],
  ['x', 'x'], ['y', 'y'], ['z', 'z'],
];

async function download(remote) {
  const res = await fetch(`${BASE}/${remote}.png`, { headers: { 'User-Agent': 'Mozilla/5.0 (sign-app importer)' } });
  if (!res.ok) throw new Error(`${remote}.png → HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  if (!type.startsWith('image/')) throw new Error(`${remote}.png → tipo inesperado ${type}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const sheetIdx = process.argv.indexOf('--sheet');
  const sheetPath = sheetIdx > 0 ? process.argv[sheetIdx + 1] : null;

  await mkdir(OUT_DIR, { recursive: true });
  const thumbs = [];
  let total = 0;

  for (const [local, remote] of LETTERS) {
    const png = await download(remote);
    const webp = await sharp(png)
      .flatten({ background: '#ffffff' })
      .resize(SIZE, SIZE, { fit: 'cover' })
      .webp({ quality: 78 })
      .toBuffer();
    await writeFile(new URL(`${local}.webp`, OUT_DIR), webp);
    total += webp.length;
    console.log(`${local.padEnd(5)} ${(png.length / 1024).toFixed(0).padStart(5)} KB → ${(webp.length / 1024).toFixed(0).padStart(3)} KB`);
    if (sheetPath) thumbs.push({ local, buf: await sharp(webp).resize(240, 240).toBuffer() });
  }
  console.log(`Total: ${(total / 1024).toFixed(0)} KB en ${LETTERS.length} imágenes`);

  if (sheetPath) {
    const cols = 6;
    const cell = 240;
    const label = (t) => Buffer.from(
      `<svg width="${cell}" height="40"><rect width="100%" height="100%" fill="#000"/><text x="10" y="29" font-size="26" font-family="sans-serif" fill="#fff">${t}</text></svg>`,
    );
    const composites = thumbs.flatMap((t, i) => {
      const left = (i % cols) * cell;
      const top = Math.floor(i / cols) * cell;
      return [{ input: t.buf, left, top }, { input: label(t.local.toUpperCase()), left, top }];
    });
    await sharp({ create: { width: cols * cell, height: Math.ceil(thumbs.length / cols) * cell, channels: 3, background: '#fff' } })
      .composite(composites)
      .webp({ quality: 80 })
      .toFile(sheetPath);
    console.log(`Hoja de contactos: ${sheetPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

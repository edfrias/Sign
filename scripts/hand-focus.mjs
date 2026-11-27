// Calcula una vez dónde están las manos en cada foto de signo, para el zoom a la mano (HandZoom).
// Usa el Hand Landmarker de MediaPipe en Chrome/Edge sin ventana, servido por Vite, igual que la app.
//
// Uso: pnpm hand-focus                       (todas las lenguas)
//      A11Y_BROWSER=msedge pnpm hand-focus   (otro navegador: chrome | msedge)
//
// Genera content/<lengua>/hand-focus.json: { "<id del signo>": { x, y, scale } }.
// Va aparte de signs*.json porque signs.bancolse.json se regenera entero al importar el vocabulario.
// Si en una foto no se detecta ninguna mano, el signo se omite y se ve sin zoom.
// Descarga el WASM y el modelo de MediaPipe de las mismas URLs que la práctica con cámara.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const CONTENT = new URL('../content/', import.meta.url);
const BATCH = 40;

async function signsByLanguage() {
  const langs = JSON.parse(await readFile(new URL('languages.json', CONTENT), 'utf8'));
  const result = [];
  for (const { id } of langs) {
    const dir = new URL(`${id}/`, CONTENT);
    const files = (await readdir(dir)).filter((f) => /^signs(\.[a-z0-9-]+)?\.json$/.test(f));
    const items = [];
    for (const f of files) {
      for (const s of JSON.parse(await readFile(new URL(f, dir), 'utf8'))) {
        // La dactilología se hace con una mano: si se detectan dos, la segunda es un falso positivo
        if (s.media?.image) items.push({ id: s.id, image: s.media.image, oneHand: s.category === 'Alfabeto' });
      }
    }
    result.push({ lang: id, dir, items });
  }
  return result;
}

async function main() {
  const server = await createServer({ logLevel: 'error', server: { port: 5198, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch({ channel: process.env.A11Y_BROWSER ?? 'chrome' });

  try {
    const page = await browser.newPage();
    await page.goto(`${base}/scripts/hand-focus/harness.html`);
    await page.waitForFunction(() => 'detectHandFocus' in window);

    for (const { lang, dir, items } of await signsByLanguage()) {
      if (items.length === 0) {
        console.log(`${lang}: sin fotos, nada que hacer`);
        continue;
      }
      const found = {};
      const missing = [];
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        const res = await page.evaluate((b) => window.detectHandFocus(b), batch);
        Object.assign(found, res.found);
        missing.push(...res.missing);
        process.stdout.write(`\r${lang}: ${Math.min(i + BATCH, items.length)} / ${items.length}`);
      }
      const sorted = Object.fromEntries(Object.entries(found).sort(([a], [b]) => a.localeCompare(b)));
      await writeFile(new URL('hand-focus.json', dir), JSON.stringify(sorted, null, 2) + '\n');
      console.log(`\n${lang}: ${Object.keys(found).length} con mano, ${missing.length} sin detectar`);
      if (missing.length) console.log(`  sin zoom: ${missing.join(', ')}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

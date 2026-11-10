// Auditoría de accesibilidad con axe-core en un navegador real (Chrome o Edge del sistema).
// Recorre todas las pantallas en modo claro y oscuro y falla si hay infracciones WCAG 2.2 A/AA.
//
// Uso: pnpm a11y                        (todas las pantallas)
//      pnpm a11y --only creditos        (una ruta; también vale "/creditos" fuera de Git Bash)
//      A11Y_BROWSER=msedge pnpm a11y    (otro navegador: chrome | msedge)

import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { AxeBuilder } from '@axe-core/playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const REPORT_DIR = new URL('../a11y-report/', import.meta.url);

/** Pantallas y estados a revisar. `prepare` deja la página en el estado que interesa. */
const PAGES = [
  { name: 'Inicio', path: '/' },
  { name: 'Lección', path: '/leccion/alfabeto-1' },
  { name: 'Lección de vocabulario', path: '/leccion/cnse-saludos-y-cortesia-1' },
  { name: 'Lección inexistente', path: '/leccion/no-existe' },
  { name: 'Quiz (pregunta)', path: '/quiz/alfabeto-1' },
  {
    name: 'Quiz (respondido)',
    path: '/quiz/alfabeto-1',
    prepare: async (page) => {
      await page.locator('.option').first().click();
      await page.getByText('Siguiente').waitFor();
    },
  },
  { name: 'Repaso vacío', path: '/repaso' },
  { name: 'Diccionario', path: '/diccionario' },
  { name: 'Práctica con cámara', path: '/practica', ready: 'role=button[name=/^Empezar práctica/]' },
  { name: 'Créditos', path: '/creditos', prepare: (page) => page.locator('details summary').first().click() },
  { name: 'Página no encontrada', path: '/no-existe' },
];

const SCHEMES = ['light', 'dark'];

function parseArgs() {
  const i = process.argv.indexOf('--only');
  const raw = i > 0 ? process.argv[i + 1] : null;
  // Se acepta "creditos" o "/creditos". Sin barra funciona también en Git Bash,
  // que convierte los argumentos que empiezan por "/" en rutas de Windows.
  return { only: raw == null ? null : `/${raw.replace(/^\/+/, '')}` };
}

function formatViolation(v) {
  const lines = [`  ✗ [${v.impact}] ${v.id}: ${v.help}`, `    ${v.helpUrl}`];
  for (const node of v.nodes.slice(0, 5)) {
    lines.push(`    → ${node.target.join(' ')}`);
    if (node.failureSummary) lines.push(`      ${node.failureSummary.split('\n').slice(1).join(' ').trim()}`);
  }
  if (v.nodes.length > 5) lines.push(`    … y ${v.nodes.length - 5} elementos más`);
  return lines.join('\n');
}

async function main() {
  const { only } = parseArgs();
  const pages = only ? PAGES.filter((p) => p.path === only) : PAGES;
  if (pages.length === 0) throw new Error(`Ruta desconocida: ${only}`);

  const server = await createServer({ logLevel: 'error', server: { port: 5199, strictPort: false } });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await chromium.launch({ channel: process.env.A11Y_BROWSER ?? 'chrome' });
  const report = [];
  let total = 0;

  try {
    for (const scheme of SCHEMES) {
      // Un contexto nuevo por esquema: sin progreso guardado, como un visitante nuevo
      const context = await browser.newContext({ colorScheme: scheme, locale: 'es-ES', viewport: { width: 1280, height: 900 } });
      for (const p of pages) {
        const page = await context.newPage();
        await page.goto(base + p.path, { waitUntil: 'networkidle' });
        if (p.ready) await page.locator(p.ready).waitFor();
        await page.locator('main').waitFor();
        if (p.prepare) await p.prepare(page);

        const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const label = `${p.name} (${p.path}, ${scheme === 'light' ? 'claro' : 'oscuro'})`;
        total += result.violations.length;
        report.push({ page: p.name, path: p.path, scheme, violations: result.violations, incomplete: result.incomplete.length });

        if (result.violations.length === 0) console.log(`✓ ${label}`);
        else {
          console.log(`✗ ${label}: ${result.violations.length} problema(s)`);
          for (const v of result.violations) console.log(formatViolation(v));
        }
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(new URL('report.json', REPORT_DIR), JSON.stringify(report, null, 2));
  console.log(`\n${total === 0 ? '✓ Sin problemas' : `✗ ${total} problema(s)`} · informe en a11y-report/report.json`);
  process.exit(total === 0 ? 0 : 1);
}

main().catch((err) => {
  if (String(err).includes('Chromium distribution') || String(err).includes('executable')) {
    console.error('No se encontró el navegador. Instala Chrome o usa A11Y_BROWSER=msedge.');
  }
  console.error(err);
  process.exit(1);
});

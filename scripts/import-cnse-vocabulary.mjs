// Importa el vocabulario del Banco de imágenes y signos LSE (Fundación CNSE, CC BY-NC-SA 3.0):
// recorre cada sección, toma la foto de cada signo, la convierte a WebP y genera el contenido.
//
// Uso: pnpm import:vocabulary            (no vuelve a descargar las imágenes que ya existen)
//      pnpm import:vocabulary --force    (descarga todo de nuevo)
//
// Genera (no editar a mano; se sobrescriben en cada ejecución):
//   content/lse/signs.bancolse.json
//   content/lse/units.bancolse.json
//   public/media/lse/vocabulario/<página>.webp

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const BASE = 'https://www.fundacioncnse.org/educa/bancolse/';
const MEDIA_DIR = new URL('../public/media/lse/vocabulario/', import.meta.url);
const CONTENT_DIR = new URL('../content/lse/', import.meta.url);
const SIZE = 640;
const LESSON_SIZE = 8;
const CONCURRENCY = 4;
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (sign-app importer; personal educational project)' };
const CREDIT = 'Fundación CNSE · Banco de imágenes y signos LSE';
const LICENSE = 'CC BY-NC-SA 3.0';

/** Estructura del Banco LSE: [id de unidad, título, [[página de sección, título de sección], …]] */
const GROUPS = [
  ['saludos', 'Saludos y preguntas', [['saludos-y-cortesia', 'Saludos y cortesía'], ['preguntas', 'Preguntas']]],
  ['familia', 'Familia', [['familia', 'Familia']]],
  ['comida', 'Comida y bebidas', [['comidas-y-bebidas', 'Comidas y bebidas'], ['postres', 'Postres']]],
  ['ropa', 'Ropa', [['ropa', 'Ropa']]],
  ['cuerpo', 'Cuerpo', [['cuerpo-bis', 'Cuerpo'], ['sentidos', 'Sentidos']]],
  ['casa', 'Casa', [['casa-bis', 'Casa'], ['cosas-bano', 'Objetos del baño'], ['cosas-cocina', 'Objetos de cocina']]],
  ['colegio', 'Colegio', [['colegio-colegio', 'Colegio'], ['cosas-del-colegio', 'Cosas del colegio'], ['colores', 'Colores'], ['formas-y-tamanos', 'Formas y tamaños']]],
  ['ciudad', 'Ciudad', [['ciudad-ciudad', 'Ciudad'], ['transporte', 'Medios de transporte'], ['profesiones', 'Profesiones']]],
  ['calendario', 'Calendario', [['meses-del-ano', 'Meses del año'], ['dias-semana', 'Días de la semana'], ['estaciones', 'Estaciones'], ['tiempo', 'Tiempo'], ['fiesta', 'Fiestas']]],
  ['naturaleza', 'Naturaleza', [['naturaleza-bis', 'Naturaleza'], ['atmosferico', 'Tiempo atmosférico'], ['animales', 'Animales']]],
  ['palabras', 'Adjetivos, adverbios y verbos', [['adjetivos', 'Adjetivos'], ['adverbios', 'Adverbios'], ['verbos', 'Verbos']]],
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', iexcl: '¡', iquest: '¿', ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü' };
function decode(s) {
  return s
    .replace(/&([aeiouAEIOU])acute;/g, (_, v) => v.normalize('NFD') + '́')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTITIES[n] ?? m)
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Erratas del sitio original corregidas en la app. */
const TYPOS = { 'Tiempo (Atmoférico)': 'Tiempo (Atmosférico)' };
const fixTypos = (gloss) => TYPOS[gloss] ?? gloss;

async function get(path, as = 'text') {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(BASE + path, { headers: HEADERS });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return as === 'text' ? await res.text() : Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt >= 3) throw new Error(`${path}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/** Signos de una página de sección: cada uno es `<h2>Glosa</h2>` seguido del enlace a su página. */
function parseSection(html) {
  const items = [];
  // El título no puede contener otro </h2>: si no, una cabecera se "come" el menú hasta el primer signo.
  const re = /<h2>((?:(?!<\/h2>)[\s\S])*)<\/h2>\s*<a\s+href="\s*([a-z0-9-]+\.php)\s*"/gi;
  for (const m of html.matchAll(re)) items.push({ gloss: decode(m[1].replace(/<[^>]+>/g, '')), page: m[2] });
  return items;
}

/**
 * Candidatas a foto del signo: descarga(s)/<x>.png sin sufijos de otras variantes
 * (-dibujo, -logo, -sinlogo, -imagen y su errata -imgaen, que existe en el sitio).
 * Algunas páginas enlazan a ficheros inexistentes, así que se prueban por orden.
 */
function photoCandidates(html) {
  const all = [...html.matchAll(/["']([^"']*\/descargas?\/[^"']+\.png)["']/gi)].map((m) => m[1].trim());
  return [...new Set(all.filter((u) => !/-(dibujo|dibujo-web|logo|sinlogo|imagen|imgaen)\.png$/i.test(u)))];
}

/**
 * Listado general del sitio. Sirve para dos cosas:
 * - encontrar la página correcta cuando una sección enlaza a una rota (glosa → página);
 * - usar su nombre, más preciso que el de la sección: "Banco (Empresa)" / "Banco (Asiento)" (página → glosa).
 */
let listado = null;
function getListado() {
  listado ??= (async () => {
    const html = (await get('listado-de-signos.php')) ?? '';
    const byGloss = new Map();
    const byPage = new Map();
    // El texto puede llevar etiquetas: Banco <span class="mini">(Empresa)</span>
    for (const m of html.matchAll(/<a\s+href="\s*([a-z0-9-]+\.php)\s*">((?:(?!<\/a>)[\s\S])*)<\/a>/gi)) {
      const gloss = fixTypos(decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+\)/g, ')').replace(/\(\s+/g, '('));
      if (!gloss) continue;
      byGloss.set(gloss.toLowerCase(), m[1]);
      byPage.set(m[1], gloss);
    }
    return { byGloss, byPage };
  })();
  return listado;
}
async function findInListado(gloss) {
  return (await getListado()).byGloss.get(gloss.toLowerCase()) ?? null;
}

async function exists(url) {
  try {
    await access(url);
    return true;
  } catch {
    return false;
  }
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}

async function main() {
  const force = process.argv.includes('--force');
  await mkdir(MEDIA_DIR, { recursive: true });

  // 1. Secciones → lista de signos
  const entries = [];
  for (const [unitId, unitTitle, sections] of GROUPS) {
    for (const [sectionPage, sectionTitle] of sections) {
      const html = await get(`${sectionPage}.php`);
      if (!html) throw new Error(`No existe la sección ${sectionPage}.php: revisa GROUPS`);
      const items = parseSection(html);
      if (items.length === 0) throw new Error(`Sección sin signos: ${sectionPage}.php`);
      for (const it of items) entries.push({ ...it, unitId, unitTitle, sectionPage, sectionTitle });
    }
  }
  console.log(`${entries.length} signos en ${GROUPS.reduce((n, g) => n + g[2].length, 0)} secciones`);

  // 2. Página de cada signo → foto → WebP
  let downloaded = 0;
  const problems = [];
  const skip = (msg) => {
    problems.push(msg);
    return null;
  };
  const done = await pool(entries, async (entry) => {
    let e = entry;
    let html = await get(e.page);
    if (!html) {
      const fixed = await findInListado(e.gloss);
      if (!fixed || fixed === e.page) return skip(`${e.gloss}: la página ${e.page} no existe (404)`);
      e = { ...e, page: fixed };
      html = await get(fixed);
      if (!html) return skip(`${e.gloss}: ni ${entry.page} ni ${fixed} existen`);
    }
    const slug = e.page.replace(/\.php$/, '');
    const out = new URL(`${slug}.webp`, MEDIA_DIR);
    if (!force && (await exists(out))) return { ...e, slug };
    let png = null;
    for (const candidate of photoCandidates(html)) {
      png = await get(candidate, 'buffer');
      if (png) break;
    }
    if (!png) return skip(`${e.gloss}: ${e.page} no tiene una foto descargable`);
    const webp = await sharp(png).flatten({ background: '#ffffff' }).resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: 78 }).toBuffer();
    await writeFile(out, webp);
    downloaded++;
    if (downloaded % 50 === 0) console.log(`  ${downloaded} imágenes…`);
    return { ...e, slug };
  });
  const ok = done.filter(Boolean);

  // 3. Fotos idénticas en el sitio. Misma glosa + misma foto → duplicado, se descarta (Comida / Comida 2).
  //    Glosas distintas + misma foto → probablemente se signan igual (Fruta, Manzana): se mantienen,
  //    compartiendo un único fichero, y el quiz no las pone juntas como opciones.
  const { byPage } = await getListado();
  const glossOf = (e) => byPage.get(e.page) ?? fixTypos(e.gloss);
  const imageOf = new Map(); // slug → slug cuyo fichero se usa
  const firstByHash = new Map(); // hash → { slug, glosses }
  const duplicates = new Set();
  const shared = [];
  for (const e of ok) {
    if (imageOf.has(e.slug)) continue;
    const file = new URL(`${e.slug}.webp`, MEDIA_DIR);
    const hash = createHash('sha256').update(await readFile(file)).digest('hex');
    const first = firstByHash.get(hash);
    if (!first) {
      firstByHash.set(hash, { slug: e.slug, glosses: new Set([glossOf(e).toLowerCase()]) });
      imageOf.set(e.slug, e.slug);
      continue;
    }
    if (first.glosses.has(glossOf(e).toLowerCase())) duplicates.add(e.slug);
    else {
      first.glosses.add(glossOf(e).toLowerCase());
      shared.push(`${glossOf(e)} = ${first.slug}`);
    }
    imageOf.set(e.slug, first.slug);
    await unlink(file).catch(() => {});
  }

  // 4. Contenido: signos y unidades (una lección cada LESSON_SIZE signos de una sección)
  const seen = new Set();
  const signs = [];
  const variantCount = new Map(); // misma glosa en la misma sección → variantes del signo
  for (const e of ok) {
    const id = `lse.cnse.${e.slug}`;
    if (seen.has(id) || duplicates.has(e.slug)) continue; // enlazado desde dos secciones, o duplicado
    seen.add(id);
    const gloss = glossOf(e);
    const key = `${e.sectionPage}|${gloss.toLowerCase()}`;
    const n = (variantCount.get(key) ?? 0) + 1;
    variantCount.set(key, n);
    signs.push({
      id,
      gloss,
      ...(n > 1 ? { variant: `Variante ${n}` } : {}),
      category: e.sectionTitle,
      kind: 'dynamic', // la mayoría lleva movimiento; la práctica con cámara solo usa signos estáticos
      description: {},
      media: { image: `/media/lse/vocabulario/${imageOf.get(e.slug)}.webp`, credit: CREDIT, license: LICENSE },
      source: `${BASE}${e.page}`,
      links: [{ label: 'Banco LSE', url: `${BASE}${e.page}` }],
      verified: true,
    });
  }

  const units = GROUPS.map(([unitId, unitTitle, sections]) => ({
    id: `cnse-${unitId}`,
    title: unitTitle,
    description: sections.map((s) => s[1]).join(' · '),
    lessons: sections.flatMap(([sectionPage, sectionTitle]) => {
      const ids = [
        ...new Set(ok.filter((e) => e.sectionPage === sectionPage && !duplicates.has(e.slug)).map((e) => `lse.cnse.${e.slug}`)),
      ];
      const chunks = Math.ceil(ids.length / LESSON_SIZE);
      return Array.from({ length: chunks }, (_, i) => ({
        id: `cnse-${sectionPage}-${i + 1}`,
        title: chunks > 1 ? `${sectionTitle} ${i + 1}` : sectionTitle,
        signIds: ids.slice(i * LESSON_SIZE, (i + 1) * LESSON_SIZE),
      }));
    }),
  })).filter((u) => u.lessons.length > 0);

  await writeFile(new URL('signs.bancolse.json', CONTENT_DIR), JSON.stringify(signs, null, 2) + '\n');
  await writeFile(new URL('units.bancolse.json', CONTENT_DIR), JSON.stringify(units, null, 2) + '\n');

  console.log(`✓ ${signs.length} signos, ${units.reduce((n, u) => n + u.lessons.length, 0)} lecciones, ${downloaded} imágenes descargadas`);
  if (duplicates.size) console.log(`  Duplicados descartados (misma glosa y misma foto): ${[...duplicates].join(', ')}`);
  if (shared.length) console.log(`  Foto compartida (glosas distintas): ${shared.join(' · ')}`);
  if (problems.length) {
    console.log(`\n${problems.length} signos omitidos:`);
    for (const p of problems) console.log(`  - ${p}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

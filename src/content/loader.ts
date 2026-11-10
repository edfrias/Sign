import languagesJson from '../../content/languages.json';
import type { Language, LanguageContent, Sign, Unit } from './types';

// Cada lengua es una carpeta en /content con signs.json y units.json (escritos a mano) y,
// opcionalmente, ficheros generados por scripts: signs.<origen>.json y units.<origen>.json.
const signFiles = import.meta.glob<Sign[]>('../../content/*/signs*.json', { eager: true, import: 'default' });
const unitFiles = import.meta.glob<Unit[]>('../../content/*/units*.json', { eager: true, import: 'default' });

/** Ficheros de una lengua: primero el escrito a mano y luego los generados, por orden alfabético. */
function filesFor<T>(files: Record<string, T[]>, langId: string, base: 'signs' | 'units'): T[] {
  const dir = `../../content/${langId}/`;
  return Object.keys(files)
    .filter((path) => path.startsWith(dir) && new RegExp(`^${base}(\\.[a-z0-9-]+)?\\.json$`).test(path.slice(dir.length)))
    .sort((a, b) => (a.endsWith(`/${base}.json`) ? -1 : b.endsWith(`/${base}.json`) ? 1 : a.localeCompare(b)))
    .flatMap((path) => files[path] ?? []);
}

export const languages: Language[] = languagesJson;

const cache = new Map<string, LanguageContent>();

export function getContent(langId: string): LanguageContent {
  const cached = cache.get(langId);
  if (cached) return cached;

  const language = languages.find((l) => l.id === langId);
  if (!language) throw new Error(`Lengua desconocida: ${langId}`);

  const signs = filesFor(signFiles, langId, 'signs');
  const units = filesFor(unitFiles, langId, 'units');
  const signById = new Map(signs.map((s) => [s.id, s]));

  for (const unit of units) {
    for (const lesson of unit.lessons) {
      for (const id of lesson.signIds) {
        if (!signById.has(id)) console.warn(`[contenido] ${lesson.id} referencia un signo inexistente: ${id}`);
      }
    }
  }

  const content = { language, signs, units, signById };
  cache.set(langId, content);
  return content;
}

export function findLesson(content: LanguageContent, lessonId: string) {
  for (const unit of content.units) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return { unit, lesson };
  }
  return undefined;
}

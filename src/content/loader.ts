import languagesJson from '../../content/languages.json';
import type { Language, LanguageContent, Sign, Unit } from './types';

// Cada lengua es una carpeta en /content con signs.json y units.json.
const signFiles = import.meta.glob<Sign[]>('../../content/*/signs.json', { eager: true, import: 'default' });
const unitFiles = import.meta.glob<Unit[]>('../../content/*/units.json', { eager: true, import: 'default' });

export const languages: Language[] = languagesJson;

const cache = new Map<string, LanguageContent>();

export function getContent(langId: string): LanguageContent {
  const cached = cache.get(langId);
  if (cached) return cached;

  const language = languages.find((l) => l.id === langId);
  if (!language) throw new Error(`Lengua desconocida: ${langId}`);

  const signs = signFiles[`../../content/${langId}/signs.json`] ?? [];
  const units = unitFiles[`../../content/${langId}/units.json`] ?? [];
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

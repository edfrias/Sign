import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

/** Lecciones completadas en la lengua (undefined mientras se lee IndexedDB). */
export function useCompletedLessons(lang: string): Set<string> | undefined {
  return useLiveQuery(
    async () => new Set((await db.progress.where('lang').equals(lang).toArray()).map((p) => p.lessonId)),
    [lang],
  );
}

/** Signos aprendidos: los de las lecciones completadas, que ya están en la cola de repaso. */
export function useLearnedSigns(lang: string): Set<string> | undefined {
  return useLiveQuery(async () => new Set(await db.reviews.where('lang').equals(lang).primaryKeys()), [lang]);
}

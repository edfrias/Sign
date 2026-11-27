import { db } from './db';
import { newReview, review, type Quality } from '../srs/sm2';
import { mergeBackup, type BackupData } from './backup';
import { dayKey } from '../progress/activity';

/** Marca la lección como hecha y mete sus signos en la cola de repaso. */
export async function completeLesson(lang: string, lessonId: string, signIds: string[]) {
  const now = Date.now();
  await db.transaction('rw', db.progress, db.reviews, async () => {
    await db.progress.put({ lang, lessonId, completedAt: now });
    const existing = await db.reviews.bulkGet(signIds);
    const fresh = signIds.filter((_, i) => !existing[i]).map((id) => newReview(id, lang, now));
    await db.reviews.bulkAdd(fresh);
  });
}

export async function recordAnswer(lang: string, signId: string, quality: Quality) {
  const now = Date.now();
  await db.transaction('rw', db.reviews, async () => {
    const current = (await db.reviews.get(signId)) ?? newReview(signId, lang, now);
    await db.reviews.put(review(current, quality, now));
  });
}

export async function saveTemplates(signId: string, vectors: number[][]) {
  const now = Date.now();
  await db.templates.bulkAdd(vectors.map((vector) => ({ signId, vector, createdAt: now })));
}

/** Sustituye la calibración de un signo por las muestras nuevas. */
export async function replaceTemplates(signId: string, vectors: number[][]) {
  const now = Date.now();
  await db.transaction('rw', db.templates, async () => {
    await db.templates.where('signId').equals(signId).delete();
    await db.templates.bulkAdd(vectors.map((vector) => ({ signId, vector, createdAt: now })));
  });
}

export async function clearTemplates(signId?: string) {
  if (signId) await db.templates.where('signId').equals(signId).delete();
  else await db.templates.clear();
}

/** Suma tiempo de estudio al día de hoy. */
export async function addStudySeconds(seconds: number, now = Date.now()) {
  if (seconds <= 0) return;
  const day = dayKey(now);
  await db.transaction('rw', db.activity, async () => {
    const current = await db.activity.get(day);
    await db.activity.put({ day, seconds: (current?.seconds ?? 0) + seconds });
  });
}

/** Todo el progreso de este navegador, listo para guardarlo como copia. */
export async function readAllProgress(): Promise<BackupData> {
  const [progress, reviews, templates, activity] = await Promise.all([
    db.progress.toArray(),
    db.reviews.toArray(),
    db.templates.toArray(),
    db.activity.toArray(),
  ]);
  return { progress, reviews, templates, activity };
}

/** Combina una copia con lo que hay en este navegador, en una sola transacción. */
export async function importProgress(incoming: BackupData) {
  await db.transaction('rw', [db.progress, db.reviews, db.templates, db.activity], async () => {
    const merged = mergeBackup(await readAllProgress(), incoming);
    await db.progress.bulkPut(merged.progress);
    await db.reviews.bulkPut(merged.reviews);
    await db.activity.bulkPut(merged.activity ?? []);
    await db.templates.clear();
    await db.templates.bulkAdd(merged.templates.map(({ signId, vector, createdAt }) => ({ signId, vector, createdAt })));
  });
}

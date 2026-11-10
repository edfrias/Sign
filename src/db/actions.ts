import { db } from './db';
import { newReview, review, type Quality } from '../srs/sm2';

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

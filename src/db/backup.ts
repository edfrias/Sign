/**
 * Copia de seguridad del progreso: lecciones hechas, cola de repaso y calibración de la cámara.
 * Todo vive solo en este navegador (IndexedDB); la copia es un JSON que la persona guarda donde quiera.
 *
 * Importar combina en vez de sustituir, para no perder lo que ya hay en este dispositivo:
 * - lecciones: se unen; si están en los dos sitios, cuenta la fecha más antigua;
 * - repaso: por signo, gana el que se repasó por última vez;
 * - calibración: por letra, gana la grabación más reciente;
 * - tiempo de estudio: por día, el mayor (sumar contaría dos veces el mismo día).
 *
 * `activity` es opcional: las copias anteriores a la meta diaria no lo traen y siguen valiendo.
 */
import { DAY_MS, type ReviewState } from '../srs/sm2';
import type { LessonProgress, StoredTemplate } from './db';
import type { DayActivity } from '../progress/activity';

export const BACKUP_APP = 'sign';
export const BACKUP_VERSION = 1;
/** Una copia real ocupa unos KB (la calibración, unos cientos); esto solo frena ficheros equivocados. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export interface BackupData {
  progress: LessonProgress[];
  reviews: ReviewState[];
  /** Sin `id`: es la clave local autoincremental de IndexedDB */
  templates: Omit<StoredTemplate, 'id'>[];
  /** Segundos de estudio por día */
  activity?: DayActivity[];
}

export interface Backup extends BackupData {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: number;
}

export function buildBackup(data: BackupData, now = Date.now()): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now,
    progress: data.progress.map(({ lang, lessonId, completedAt }) => ({ lang, lessonId, completedAt })),
    reviews: data.reviews.map(({ signId, lang, ease, interval, repetitions, due }) => ({ signId, lang, ease, interval, repetitions, due })),
    templates: data.templates.map(({ signId, vector, createdAt }) => ({ signId, vector, createdAt })),
    activity: (data.activity ?? []).map(({ day, seconds }) => ({ day, seconds })),
  };
}

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `sign-progreso-${d}.json`;
}

export class BackupError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Lee y valida una copia. Lanza `BackupError` con un mensaje para la persona si no es válida. */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('El fichero no es una copia de Sign: no se puede leer como JSON.');
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP) {
    throw new BackupError('El fichero no es una copia de Sign.');
  }
  if (raw.version !== BACKUP_VERSION) {
    throw new BackupError('Esta copia es de otra versión de Sign. Actualiza la app y vuelve a intentarlo.');
  }
  const { progress, reviews, templates } = raw;
  const activity = raw.activity ?? [];
  if (!Array.isArray(progress) || !Array.isArray(reviews) || !Array.isArray(templates) || !Array.isArray(activity)) {
    throw new BackupError('La copia está incompleta o dañada.');
  }
  const okProgress = progress.every((p) => isObj(p) && isStr(p.lang) && isStr(p.lessonId) && isNum(p.completedAt));
  const okReviews = reviews.every(
    (r) => isObj(r) && isStr(r.signId) && isStr(r.lang) && isNum(r.ease) && isNum(r.interval) && isNum(r.repetitions) && isNum(r.due),
  );
  const okTemplates = templates.every(
    (t) => isObj(t) && isStr(t.signId) && isNum(t.createdAt) && Array.isArray(t.vector) && t.vector.length > 0 && t.vector.every(isNum),
  );
  const okActivity = activity.every((a) => isObj(a) && isStr(a.day) && /^\d{4}-\d{2}-\d{2}$/.test(a.day) && isNum(a.seconds) && a.seconds >= 0);
  if (!okProgress || !okReviews || !okTemplates || !okActivity) {
    throw new BackupError('La copia está dañada: algunos datos no tienen el formato esperado.');
  }
  return buildBackup(
    {
      progress: progress as LessonProgress[],
      reviews: reviews as ReviewState[],
      templates: templates as StoredTemplate[],
      activity: activity as DayActivity[],
    },
    isNum(raw.exportedAt) ? raw.exportedAt : 0,
  );
}

/** Cuándo se repasó por última vez (el estado guarda la fecha del próximo repaso y el intervalo). */
const lastReviewed = (r: ReviewState) => r.due - r.interval * DAY_MS;

/** Combina lo del dispositivo (`local`) con la copia (`incoming`). No modifica las entradas. */
export function mergeBackup(local: BackupData, incoming: BackupData): BackupData {
  const progress = new Map(local.progress.map((p) => [`${p.lang}\u0000${p.lessonId}`, p]));
  for (const p of incoming.progress) {
    const key = `${p.lang}\u0000${p.lessonId}`;
    const mine = progress.get(key);
    if (!mine || p.completedAt < mine.completedAt) progress.set(key, p);
  }

  const reviews = new Map(local.reviews.map((r) => [r.signId, r]));
  for (const r of incoming.reviews) {
    const mine = reviews.get(r.signId);
    if (!mine || lastReviewed(r) > lastReviewed(mine)) reviews.set(r.signId, r);
  }

  const bySign = (list: BackupData['templates']) => {
    const m = new Map<string, BackupData['templates']>();
    for (const t of list) m.set(t.signId, [...(m.get(t.signId) ?? []), t]);
    return m;
  };
  const newest = (list: BackupData['templates']) => Math.max(...list.map((t) => t.createdAt));
  const templates = bySign(local.templates);
  for (const [signId, list] of bySign(incoming.templates)) {
    const mine = templates.get(signId);
    if (!mine || newest(list) > newest(mine)) templates.set(signId, list);
  }

  const activity = new Map((local.activity ?? []).map((a) => [a.day, a]));
  for (const a of incoming.activity ?? []) {
    const mine = activity.get(a.day);
    if (!mine || a.seconds > mine.seconds) activity.set(a.day, a);
  }

  return {
    progress: [...progress.values()],
    reviews: [...reviews.values()],
    templates: [...templates.values()].flat(),
    activity: [...activity.values()],
  };
}

/** Resumen legible de una copia, para confirmar antes de importar. */
export function describeBackup(b: BackupData): string {
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const letters = new Set(b.templates.map((t) => t.signId)).size;
  return [
    n(b.progress.length, 'lección completada', 'lecciones completadas'),
    n(b.reviews.length, 'signo en repaso', 'signos en repaso'),
    n(letters, 'letra calibrada', 'letras calibradas'),
    ...(b.activity?.length ? [n(b.activity.length, 'día de estudio', 'días de estudio')] : []),
  ].join(', ');
}

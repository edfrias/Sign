/**
 * Tiempo de estudio por día, meta diaria y racha. Todo local: se guarda por día en IndexedDB
 * y nunca sale del dispositivo (salvo en la copia de seguridad que descarga la persona).
 */

/** Segundos estudiados en un día (fecha local AAAA-MM-DD). */
export interface DayActivity {
  day: string;
  seconds: number;
}

export const GOAL_OPTIONS = [5, 10, 15] as const;
export type GoalMinutes = (typeof GOAL_OPTIONS)[number];
export const DEFAULT_GOAL: GoalMinutes = 10;
export const GOAL_KEY = 'sign.goal';
export const WELCOMED_KEY = 'sign.welcomed';

/** Cada cuánto suma el reloj de estudio. */
export const TICK_MS = 15_000;
/** Sin tocar nada durante este tiempo, una pantalla de estudio deja de contar (salvo la cámara). */
export const IDLE_MS = 90_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local AAAA-MM-DD: el día termina a medianoche de quien estudia, no en UTC. */
export function dayKey(t: number | Date = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y!, m! - 1, d! + n));
}

export function isGoal(v: unknown): v is GoalMinutes {
  return GOAL_OPTIONS.includes(v as GoalMinutes);
}

/**
 * Racha: días seguidos cumpliendo la meta. Hoy cuenta si ya se ha cumplido; si aún no,
 * la racha sigue viva desde ayer hasta que acabe el día.
 */
export function streak(seconds: ReadonlyMap<string, number>, goalMinutes: number, today = dayKey()) {
  const met = (day: string) => (seconds.get(day) ?? 0) >= goalMinutes * 60;
  const todayDone = met(today);
  let day = todayDone ? today : addDays(today, -1);
  let count = 0;
  while (met(day)) {
    count++;
    day = addDays(day, -1);
  }
  return { count, todayDone };
}

/**
 * Segundos que cuentan de un tramo de `elapsedMs`: nada con la pestaña oculta, nada si hace
 * rato que no se toca la pantalla (salvo en la cámara, que es manos libres) y como mucho dos
 * tramos seguidos, para no sumar el tiempo de un portátil suspendido.
 */
export function creditedSeconds(
  elapsedMs: number,
  { visible, sinceInputMs, handsFree }: { visible: boolean; sinceInputMs: number; handsFree: boolean },
): number {
  if (!visible || elapsedMs <= 0) return 0;
  if (!handsFree && sinceInputMs > IDLE_MS) return 0;
  return Math.round(Math.min(elapsedMs, TICK_MS * 2) / 1000);
}

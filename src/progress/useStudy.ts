import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addStudySeconds } from '../db/actions';
import { DEFAULT_GOAL, GOAL_KEY, TICK_MS, WELCOMED_KEY, addDays, creditedSeconds, dayKey, isGoal, streak, type GoalMinutes } from './activity';

/**
 * Cuenta el tiempo de estudio mientras la pantalla está abierta, visible y en uso.
 * `handsFree`: en la práctica con cámara no se toca nada, así que no hace falta actividad.
 */
export function useStudyClock(active = true, handsFree = false) {
  useEffect(() => {
    if (!active) return;
    let lastInput = Date.now();
    let lastTick = Date.now();
    const onInput = () => {
      lastInput = Date.now();
    };
    const credit = () => {
      const now = Date.now();
      const seconds = creditedSeconds(now - lastTick, {
        visible: document.visibilityState === 'visible',
        sinceInputMs: now - lastInput,
        handsFree,
      });
      lastTick = now;
      void addStudySeconds(seconds, now);
    };
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const e of events) window.addEventListener(e, onInput, { passive: true });
    // Al ocultar la pestaña se cierra el tramo en curso; al volver, empieza uno nuevo
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') credit();
      else lastTick = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(credit, TICK_MS);
    return () => {
      credit();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const e of events) window.removeEventListener(e, onInput);
    };
  }, [active, handsFree]);
}

function readGoal(): GoalMinutes {
  try {
    const v = Number(localStorage.getItem(GOAL_KEY));
    return isGoal(v) ? v : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

export function saveGoal(goal: GoalMinutes) {
  try {
    localStorage.setItem(GOAL_KEY, String(goal));
  } catch {
    /* sin persistencia */
  }
}

/** Meta diaria en minutos (5, 10 o 15), guardada en este dispositivo. */
export function useGoal(): [GoalMinutes, (g: GoalMinutes) => void] {
  const [goal, setGoal] = useState(readGoal);
  return [goal, (g) => (saveGoal(g), setGoal(g))];
}

/** Minutos de hoy y racha (undefined mientras se lee IndexedDB). */
export function useDailyProgress(goal: GoalMinutes) {
  const today = dayKey();
  const rows = useLiveQuery(() => db.activity.where('day').aboveOrEqual(addDays(today, -400)).toArray(), [today]);
  if (!rows) return undefined;
  const seconds = new Map(rows.map((r) => [r.day, r.seconds]));
  const todaySeconds = seconds.get(today) ?? 0;
  return {
    minutes: Math.floor(todaySeconds / 60),
    fraction: Math.min(1, todaySeconds / (goal * 60)),
    /** Días con al menos un minuto de estudio */
    studyDays: rows.filter((r) => r.seconds >= 60).map((r) => r.day),
    ...streak(seconds, goal, today),
  };
}

/** ¿Ya se vio la bienvenida? También cuenta como vista si hay progreso de antes de que existiera. */
export function useWelcomed(): boolean | undefined {
  const stored = useRef(readWelcomed());
  const hasProgress = useLiveQuery(async () => (stored.current ? true : (await db.progress.count()) > 0), []);
  if (stored.current) return true;
  if (hasProgress === undefined) return undefined;
  if (hasProgress) markWelcomed();
  return hasProgress;
}

function readWelcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED_KEY) === '1';
  } catch {
    return true; // sin almacenamiento no se puede recordar: mejor no insistir cada vez
  }
}

export function markWelcomed() {
  try {
    localStorage.setItem(WELCOMED_KEY, '1');
  } catch {
    /* sin persistencia */
  }
}

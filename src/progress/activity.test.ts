import { describe, expect, it } from 'vitest';
import { IDLE_MS, TICK_MS, addDays, creditedSeconds, dayKey, streak } from './activity';

describe('dayKey y addDays', () => {
  it('usa la fecha local', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('cruza meses y años', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });
});

describe('streak', () => {
  const days = (entries: [string, number][]) => new Map(entries);
  const goal = 10; // minutos

  it('cuenta días seguidos con la meta cumplida, hoy incluido', () => {
    const s = streak(days([['2026-11-09', 600], ['2026-11-10', 900], ['2026-11-11', 600]]), goal, '2026-11-11');
    expect(s).toEqual({ count: 3, todayDone: true });
  });

  it('si hoy aún no se ha cumplido, la racha de ayer sigue viva', () => {
    const s = streak(days([['2026-11-09', 600], ['2026-11-10', 600], ['2026-11-11', 120]]), goal, '2026-11-11');
    expect(s).toEqual({ count: 2, todayDone: false });
  });

  it('un día sin meta la corta', () => {
    const s = streak(days([['2026-11-08', 600], ['2026-11-09', 300], ['2026-11-10', 600]]), goal, '2026-11-11');
    expect(s.count).toBe(1);
  });

  it('sin actividad, cero', () => {
    expect(streak(new Map(), goal, '2026-11-11')).toEqual({ count: 0, todayDone: false });
  });
});

describe('creditedSeconds', () => {
  const base = { visible: true, sinceInputMs: 0, handsFree: false };

  it('cuenta el tramo mientras la pantalla está visible y en uso', () => {
    expect(creditedSeconds(TICK_MS, base)).toBe(15);
  });

  it('no cuenta con la pestaña oculta', () => {
    expect(creditedSeconds(TICK_MS, { ...base, visible: false })).toBe(0);
  });

  it('deja de contar tras un rato sin tocar nada, salvo con la cámara (manos libres)', () => {
    expect(creditedSeconds(TICK_MS, { ...base, sinceInputMs: IDLE_MS + 1 })).toBe(0);
    expect(creditedSeconds(TICK_MS, { ...base, sinceInputMs: IDLE_MS + 1, handsFree: true })).toBe(15);
  });

  it('no suma el tiempo de un equipo suspendido', () => {
    expect(creditedSeconds(60 * 60 * 1000, base)).toBe(30);
  });
});

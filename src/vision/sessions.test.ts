import { describe, expect, it } from 'vitest';
import { CalibrationSession, PracticeSession, type CalibrationOptions, type PracticeOptions } from './sessions';

const FRAME = 33; // ~30 fps

const P: PracticeOptions = { holdMs: 1000, graceMs: 300, timeoutMs: 5000, feedbackMs: 500 };

/** Ejecuta fotogramas durante `ms` y devuelve los eventos ocurridos. */
function run(s: PracticeSession, from: number, ms: number, hand: boolean, correct: boolean) {
  const events: string[] = [];
  let t = from;
  for (; t < from + ms; t += FRAME) {
    const e = s.update(t, hand, correct);
    if (e) events.push(e);
  }
  return { events, t };
}

describe('PracticeSession', () => {
  it('valida sola tras mantener el signo correcto y pasa al siguiente', () => {
    const s = new PracticeSession(['a', 'b'], P);
    let r = run(s, 0, 1100, true, true);
    expect(r.events).toEqual(['success']);
    expect(s.snapshot().results.get('a')).toBe('ok');
    r = run(s, r.t, 600, true, false);
    expect(r.events).toEqual(['next']);
    expect(s.snapshot().signId).toBe('b');
  });

  it('no valida si el signo correcto no se mantiene lo suficiente', () => {
    const s = new PracticeSession(['a'], P);
    let r = run(s, 0, 600, true, true);
    r = run(s, r.t, 400, true, false); // más que el margen de gracia
    r = run(s, r.t, 600, true, true);
    expect(r.events).toEqual([]);
    expect(s.snapshot().phase).toBe('signing');
  });

  it('tolera parpadeos breves de la detección', () => {
    const s = new PracticeSession(['a'], P);
    let r = run(s, 0, 500, true, true);
    r = run(s, r.t, 150, true, false); // menos que el margen de gracia
    r = run(s, r.t, 500, true, true);
    expect(r.events).toEqual(['success']);
  });

  it('salta el signo si se agota el tiempo con la mano visible', () => {
    const s = new PracticeSession(['a', 'b'], P);
    const r = run(s, 0, 5100, true, false);
    expect(r.events).toEqual(['skipped']);
    expect(s.snapshot().results.get('a')).toBe('skipped');
  });

  it('tras un salto, deja más tiempo para comparar con la foto antes de seguir', () => {
    const s = new PracticeSession(['a', 'b'], { ...P, skipFeedbackMs: 2000 });
    let r = run(s, 0, 5100, true, false);
    expect(r.events).toEqual(['skipped']);
    r = run(s, r.t, 1000, true, false); // más que feedbackMs (500), menos que skipFeedbackMs
    expect(s.snapshot().phase).toBe('skipped');
    r = run(s, r.t, 1100, true, false);
    expect(r.events).toEqual(['next']);
  });

  it('el tiempo no corre mientras no hay mano', () => {
    const s = new PracticeSession(['a'], P);
    const r = run(s, 0, 10_000, false, false);
    expect(r.events).toEqual([]);
    expect(s.snapshot().remainingMs).toBe(P.timeoutMs);
  });

  it('termina tras el último signo', () => {
    const s = new PracticeSession(['a'], P);
    const r = run(s, 0, 1100, true, true);
    const r2 = run(s, r.t, 600, true, true);
    expect(r2.events).toEqual(['finished']);
    expect(s.snapshot().phase).toBe('finished');
  });
});

const C: CalibrationOptions = { prepareMs: 500, stableMs: 300, maxJitter: 0.05, window: 4, captureMs: 150, maxSamples: 5, feedbackMs: 200 };
const still = Array.from({ length: 63 }, (_, i) => i / 63);
const shaky = (t: number) => still.map((x, i) => x + Math.sin(t + i) * 0.5);

function runCal(s: CalibrationSession, from: number, ms: number, vec: (t: number) => number[] | null) {
  const captured: string[] = [];
  let t = from;
  for (; t < from + ms; t += FRAME) {
    const e = s.update(t, vec(t));
    if (e) captured.push(e.type === 'captured' ? `${e.signId}:${e.vectors.length}` : e.type);
  }
  return { captured, t };
}

describe('CalibrationSession', () => {
  it('graba sola cuando la mano está quieta y pasa al siguiente signo', () => {
    const s = new CalibrationSession(['a', 'b'], C);
    let r = runCal(s, 0, 600, () => still); // preparación
    expect(r.captured).toEqual([]);
    r = runCal(s, r.t, 700, () => still);
    expect(r.captured).toEqual(['a:5']);
    r = runCal(s, r.t, 250, () => null); // mensaje de "guardado"
    expect(s.snapshot().signId).toBe('b');
    expect(s.snapshot().phase).toBe('preparing'); // la nueva letra empieza con tiempo para colocar la mano
  });

  it('no graba durante la preparación ni con la mano en movimiento', () => {
    const s = new CalibrationSession(['a'], C);
    const r = runCal(s, 0, 3000, (t) => (t < 500 ? still : shaky(t)));
    expect(r.captured).toEqual([]);
    expect(s.snapshot().phase).toBe('waiting');
  });

  it('si se pierde la mano mientras graba, no guarda nada a medias', () => {
    const s = new CalibrationSession(['a'], C);
    let r = runCal(s, 0, 600, () => still);
    r = runCal(s, r.t, 500, () => still); // estable → empieza a grabar
    expect(s.snapshot().phase).toBe('capturing');
    s.update(r.t, null);
    expect(s.snapshot().phase).toBe('waiting');
    expect(s.snapshot().saved.size).toBe(0);
  });

  it('graba durante un tiempo fijo aunque el dispositivo vaya lento', () => {
    const s = new CalibrationSession(['a'], { ...C, maxSamples: 100 });
    const captured: number[] = [];
    // 5 fps: la grabación dura lo mismo, con menos muestras
    for (let t = 0; t < 3000; t += 200) {
      const e = s.update(t, still);
      if (e?.type === 'captured') captured.push(e.vectors.length);
    }
    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeGreaterThan(0);
  });

  it('termina tras el último signo', () => {
    const s = new CalibrationSession(['a'], C);
    const r = runCal(s, 0, 3000, () => still);
    expect(r.captured).toEqual(['a:5', 'finished']); // el evento de fin llega una sola vez
    expect(s.snapshot().phase).toBe('finished');
    expect([...s.snapshot().saved]).toEqual(['a']);
  });
});

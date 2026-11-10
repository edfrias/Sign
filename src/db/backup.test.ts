import { describe, expect, it } from 'vitest';
import { DAY_MS } from '../srs/sm2';
import { BackupError, buildBackup, describeBackup, mergeBackup, parseBackup, type BackupData } from './backup';

const empty: BackupData = { progress: [], reviews: [], templates: [] };
const rev = (signId: string, due: number, interval = 1) => ({ signId, lang: 'lse', ease: 2.5, interval, repetitions: 1, due });
const tpl = (signId: string, createdAt: number) => ({ signId, vector: [0, 1, 2], createdAt });

describe('copia de seguridad', () => {
  it('ida y vuelta: lo exportado se vuelve a leer igual, sin claves locales', () => {
    const data = {
      progress: [{ lang: 'lse', lessonId: 'alfabeto-1', completedAt: 5 }],
      reviews: [rev('a', 10)],
      templates: [{ id: 7, ...tpl('a', 3) }],
    };
    const back = parseBackup(JSON.stringify(buildBackup(data, 99)));
    expect(back.exportedAt).toBe(99);
    expect(back.templates[0]).toEqual(tpl('a', 3));
    expect(back.progress).toEqual(data.progress);
  });

  it('rechaza ficheros que no son copias de Sign, con un mensaje claro', () => {
    expect(() => parseBackup('no es json')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"otra"}')).toThrow('no es una copia de Sign');
    expect(() => parseBackup('{"app":"sign","version":99}')).toThrow('otra versión');
    expect(() => parseBackup('{"app":"sign","version":1,"progress":[],"reviews":[{"signId":"a"}],"templates":[]}')).toThrow('dañada');
  });

  it('al combinar no se pierde nada de este dispositivo', () => {
    const local: BackupData = { ...empty, progress: [{ lang: 'lse', lessonId: 'x', completedAt: 1 }], reviews: [rev('a', 0)] };
    const incoming: BackupData = { ...empty, progress: [{ lang: 'lse', lessonId: 'y', completedAt: 2 }], reviews: [rev('b', 0)] };
    const m = mergeBackup(local, incoming);
    expect(m.progress.map((p) => p.lessonId).sort()).toEqual(['x', 'y']);
    expect(m.reviews.map((r) => r.signId).sort()).toEqual(['a', 'b']);
  });

  it('una lección hecha en los dos sitios conserva la fecha más antigua', () => {
    const p = (completedAt: number) => ({ ...empty, progress: [{ lang: 'lse', lessonId: 'x', completedAt }] });
    expect(mergeBackup(p(5), p(2)).progress[0]!.completedAt).toBe(2);
    expect(mergeBackup(p(2), p(5)).progress[0]!.completedAt).toBe(2);
  });

  it('en repaso gana el signo repasado más recientemente', () => {
    // repasado hoy con intervalo 6 frente a repasado hace 3 días con intervalo 1
    const today = 100 * DAY_MS;
    const recent = rev('a', today + 6 * DAY_MS, 6);
    const older = rev('a', today - 2 * DAY_MS, 1);
    expect(mergeBackup({ ...empty, reviews: [older] }, { ...empty, reviews: [recent] }).reviews).toEqual([recent]);
    expect(mergeBackup({ ...empty, reviews: [recent] }, { ...empty, reviews: [older] }).reviews).toEqual([recent]);
  });

  it('la calibración se sustituye por letra entera, ganando la más reciente', () => {
    const local: BackupData = { ...empty, templates: [tpl('a', 1), tpl('a', 1), tpl('b', 9)] };
    const incoming: BackupData = { ...empty, templates: [tpl('a', 5), tpl('b', 2)] };
    const m = mergeBackup(local, incoming);
    expect(m.templates.filter((t) => t.signId === 'a')).toEqual([tpl('a', 5)]);
    expect(m.templates.filter((t) => t.signId === 'b')).toEqual([tpl('b', 9)]);
  });

  it('resume la copia para confirmarla', () => {
    expect(describeBackup({ ...empty, reviews: [rev('a', 0)], templates: [tpl('a', 1), tpl('a', 2)] })).toBe(
      '0 lecciones completadas, 1 signo en repaso, 1 letra calibrada',
    );
  });
});

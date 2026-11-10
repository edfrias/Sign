import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getContent, languages } from './loader';
import { licenseUrl } from './licenses';

const publicDir = fileURLToPath(new URL('../../public', import.meta.url));

describe.each(languages.map((l) => l.id))('contenido %s', (langId) => {
  const content = getContent(langId);

  it('los ids de signo son únicos', () => {
    expect(new Set(content.signs.map((s) => s.id)).size).toBe(content.signs.length);
  });

  it('cada lección referencia signos existentes', () => {
    for (const unit of content.units) {
      for (const lesson of unit.lessons) {
        for (const id of lesson.signIds) expect(content.signById.has(id), `${lesson.id} → ${id}`).toBe(true);
      }
    }
  });

  it('cada fichero multimedia existe en public/', () => {
    for (const s of content.signs) {
      for (const path of [s.media?.image, s.media?.video]) {
        if (path) expect(existsSync(publicDir + path), `${s.id} → ${path}`).toBe(true);
      }
    }
  });

  it('el material de terceros lleva autoría, licencia enlazada y página original', () => {
    for (const s of content.signs) {
      if (s.media) {
        expect(s.media.credit, s.id).toBeTruthy();
        expect(licenseUrl(s.media.license), `${s.id}: licencia sin enlace en licenses.ts`).toBeTruthy();
        expect(s.source, `${s.id}: falta la página original`).toMatch(/^https:\/\//);
      }
    }
  });
});

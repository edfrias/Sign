/** Enlace al texto legal de cada licencia usada en el contenido. */
export const LICENSE_URLS: Record<string, string> = {
  'CC BY-NC-SA 3.0': 'https://creativecommons.org/licenses/by-nc-sa/3.0/deed.es',
};

export function licenseUrl(license?: string): string | undefined {
  return license ? LICENSE_URLS[license] : undefined;
}

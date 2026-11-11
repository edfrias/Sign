export interface Language {
  id: string;
  name: string;
  short: string;
  region: string;
}

export interface SignDescription {
  handshape?: string;
  orientation?: string;
  location?: string;
  movement?: string;
  nonManual?: string;
}

export interface SignMediaInfo {
  /** Ruta relativa a /public, p. ej. "/media/lse/a.mp4" */
  video?: string;
  image?: string;
  credit?: string;
  license?: string;
}

export interface Sign {
  id: string;
  gloss: string;
  category: string;
  kind: 'static' | 'dynamic';
  description: SignDescription;
  media?: SignMediaInfo;
  variant?: string;
  /** URL o referencia de donde sale el signo */
  source?: string;
  /** Enlaces a diccionarios externos (se abren en otra pestaña) */
  links?: { label: string; url: string }[];
  /** false mientras no se haya contrastado con una fuente fiable o una persona signante */
  verified?: boolean;
  /** Dónde están las manos en la foto (lo calcula pnpm hand-focus; sin él, no hay zoom) */
  handFocus?: HandFocus;
}

/** Centro de las manos en la foto (fracciones 0–1) y ampliación del zoom. */
export interface HandFocus {
  x: number;
  y: number;
  scale?: number;
}

export interface Lesson {
  id: string;
  title: string;
  signIds: string[];
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface LanguageContent {
  language: Language;
  signs: Sign[];
  units: Unit[];
  signById: Map<string, Sign>;
}

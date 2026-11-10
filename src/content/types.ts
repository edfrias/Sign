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
  source?: string;
  /** false mientras no se haya contrastado con una fuente fiable o una persona signante */
  verified?: boolean;
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

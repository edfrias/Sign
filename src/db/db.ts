import Dexie, { type Table } from 'dexie';
import type { ReviewState } from '../srs/sm2';

export interface LessonProgress {
  lang: string;
  lessonId: string;
  completedAt: number;
}

export interface StoredTemplate {
  id?: number;
  signId: string;
  vector: number[];
  createdAt: number;
}

class SignDB extends Dexie {
  progress!: Table<LessonProgress, [string, string]>;
  reviews!: Table<ReviewState, string>;
  templates!: Table<StoredTemplate, number>;

  constructor() {
    super('sign');
    this.version(1).stores({
      progress: '[lang+lessonId], lang',
      reviews: 'signId, lang, due',
      templates: '++id, signId',
    });
  }
}

export const db = new SignDB();

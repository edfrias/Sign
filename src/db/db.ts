import Dexie, { type Table } from 'dexie';
import type { ReviewState } from '../srs/sm2';
import type { DayActivity } from '../progress/activity';

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
  activity!: Table<DayActivity, string>;

  constructor() {
    super('sign');
    this.version(1).stores({
      progress: '[lang+lessonId], lang',
      reviews: 'signId, lang, due',
      templates: '++id, signId',
    });
    // v2: tiempo de estudio por día (meta diaria y racha)
    this.version(2).stores({ activity: 'day' });
  }
}

export const db = new SignDB();

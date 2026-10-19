import { getPlanChapters, getReadingPlanDay } from './readingPlan';

export type LessonProgress = Readonly<{
  chapter: number;
  offset: number;
  readChapters: readonly number[];
  completed: boolean;
  acknowledged: boolean;
}>;
export type LessonsProgress = Readonly<Partial<Record<number, LessonProgress>>>;
type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<unknown> };
const empty: LessonProgress = Object.freeze({ chapter: 0, offset: 0, readChapters: [], completed: false, acknowledged: false });

export function lessonProgressFor(lessons: LessonsProgress, day: number): LessonProgress {
  return lessons[day] || empty;
}

export function hasReadLesson(lesson: LessonProgress, day: number): boolean {
  const count = getPlanChapters(day).length;
  return count > 0 && Array.from({ length: count }, (_, index) => index).every(index => lesson.readChapters.includes(index));
}

/** A tap or horizontal control drag is not a reading scroll. */
export function isVerticalReadingGesture(start: { x: number; y: number } | null, point: { x: number; y: number }): boolean {
  if (!start || ![start.x, start.y, point.x, point.y].every(Number.isFinite)) return false;
  const horizontal = Math.abs(point.x - start.x), vertical = Math.abs(point.y - start.y);
  return vertical > 4 && vertical > horizontal;
}

/** Keep input provenance through a real fling, without trusting later auto-scroll. */
export function createReadingScrollIntent(now: () => number = Date.now) {
  type Source = 'drag' | 'touch' | 'momentum' | 'wheel' | 'key';
  const active = new Set<Source>();
  let expiresAt = 0;
  const isUserInitiated = () => active.size > 0 || now() < expiresAt;
  return {
    isUserInitiated,
    clear: () => { active.clear(); expiresAt = 0; },
    begin: (source: Source) => {
      if (source === 'momentum' && !isUserInitiated()) return;
      if (source !== 'wheel' && source !== 'key') active.add(source);
      expiresAt = now() + 700;
    },
    end: (source: Source) => {
      if (!active.delete(source)) return;
      expiresAt = source === 'momentum' ? 0 : now() + 700;
    },
  };
}

/** The Scripture end must be visible; gestures wholly below it never qualify. */
export function hasReachedReadingEnd({ offset, viewportHeight, textTop, textBottom, loaded, active, userInitiated, obscuredBottom = 28 }: {
  offset: number; viewportHeight: number; textTop: number; textBottom: number; loaded: boolean; active: boolean; userInitiated: boolean; obscuredBottom?: number;
}): boolean {
  return userInitiated && active && loaded && [offset, viewportHeight, textTop, textBottom].every(Number.isFinite)
    && viewportHeight > obscuredBottom && textBottom > textTop && offset < textBottom
    && offset + viewportHeight - obscuredBottom >= textBottom;
}

function decode(raw: string | null): LessonsProgress {
  try {
    const rows: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(rows)) return {};
    const lessons: Partial<Record<number, LessonProgress>> = {};
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 6) continue;
      const [day, chapter, offset, readChapters, completed, acknowledged] = row;
      const count = typeof day === 'number' ? getPlanChapters(day).length : 0;
      if (!count || !Number.isInteger(chapter) || chapter < 0 || chapter >= count
        || !Number.isFinite(offset) || offset < 0 || !Array.isArray(readChapters)
        || readChapters.some(index => !Number.isInteger(index) || index < 0 || index >= count)
        || ![0, 1].includes(completed) || ![0, 1].includes(acknowledged) || (acknowledged && !completed)) continue;
      const read = [...new Set<number>(readChapters)].sort((a, b) => a - b);
      if (completed && read.length !== count) continue;
      lessons[day] = Object.freeze({ chapter, offset: Math.round(offset), readChapters: read, completed: !!completed, acknowledged: !!acknowledged });
    }
    return lessons;
  } catch { return {}; }
}

function encode(lessons: LessonsProgress): string {
  return JSON.stringify(Object.entries(lessons).map(([day, lesson]) => [Number(day), lesson!.chapter, lesson!.offset, lesson!.readChapters, lesson!.completed ? 1 : 0, lesson!.acknowledged ? 1 : 0]));
}

/** Compact device-only positions and completion flags; no passage text or cloud writes. */
export function createLessonProgressStore(storage: Storage, key: string) {
  let lessons: LessonsProgress = {};
  let loaded = false;
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(action: () => Promise<T>): Promise<T> {
    const result = queue.then(action);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  function update(day: number, change: (value: LessonProgress) => LessonProgress) {
    return enqueue(async () => {
      if (!loaded) throw new Error('Lesson progress has not loaded.');
      if (!getReadingPlanDay(day)) return lessons;
      const current = lessonProgressFor(lessons, day), next = change(current);
      if (next === current) return lessons;
      const changed = { ...lessons, [day]: Object.freeze(next) };
      await storage.setItem(key, encode(changed));
      lessons = changed;
      return lessons;
    });
  }
  return {
    load: () => enqueue(async () => { lessons = decode(await storage.getItem(key)); loaded = true; return lessons; }),
    remember: (day: number, chapter: number, offset: number) => update(day, current => {
      if (!Number.isInteger(chapter) || chapter < 0 || chapter >= getPlanChapters(day).length || !Number.isFinite(offset) || offset < 0) return current;
      const rounded = Math.round(offset);
      return current.chapter === chapter && current.offset === rounded ? current : { ...current, chapter, offset: rounded };
    }),
    readChapter: (day: number, chapter: number) => update(day, current => {
      if (!Number.isInteger(chapter) || chapter < 0 || chapter >= getPlanChapters(day).length || current.readChapters.includes(chapter)) return current;
      return { ...current, readChapters: [...current.readChapters, chapter].sort((a, b) => a - b) };
    }),
    complete: (day: number, listened: boolean) => update(day, current =>
      current.completed || !listened || !hasReadLesson(current, day) ? current : { ...current, completed: true }),
    acknowledge: (day: number) => update(day, current => !current.completed || current.acknowledged ? current : { ...current, acknowledged: true }),
  };
}

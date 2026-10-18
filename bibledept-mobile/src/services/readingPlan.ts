import data from '../data/bibledept-365.json';

export type PlanPassage = Readonly<{
  book: string;
  bookId: string;
  chapterStart: number;
  chapterEnd: number;
  /** Explicit chapter range, including chapter 1 for single-chapter books. */
  reference: string;
}>;

export type ReadingPlanDay = Readonly<{
  day: number;
  /** The PDF's printed reading label, with range dashes normalized to ASCII. */
  label: string;
  passages: readonly PlanPassage[];
  chapterCount: number;
  sourcePage: number;
}>;

// These are relative plan days. Calendar dates require a separately chosen start date.
export const READING_PLAN = Object.freeze({
  id: data.id,
  title: data.title,
  totalDays: data.totalDays,
  totalChapters: data.totalChapters,
  source: Object.freeze(data.source),
});

export const READING_PLAN_BY_DAY: Readonly<Partial<Record<number, ReadingPlanDay>>> = Object.freeze(
  Object.fromEntries(Object.values(data.days).map(day => [day.day, Object.freeze({
    ...day,
    passages: Object.freeze(day.passages.map(passage => Object.freeze(passage))),
  })])),
);

export const READING_PLAN_DAYS: readonly ReadingPlanDay[] = Object.freeze(
  Object.values(READING_PLAN_BY_DAY).filter((day): day is ReadingPlanDay => day !== undefined).sort((a, b) => a.day - b.day),
);

export function getReadingPlanDay(day: number): ReadingPlanDay | undefined {
  return Number.isInteger(day) && day >= 1 && day <= READING_PLAN.totalDays
    ? READING_PLAN_BY_DAY[day]
    : undefined;
}

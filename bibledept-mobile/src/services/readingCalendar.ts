import { shiftDate, validDate } from '../../shared/habits';

/** Calendar activity is dated reading history, independent of lesson numbers. */
export function readingCalendar(days: readonly string[], today: string) {
  const dates = [...new Set(days)].filter(day => validDate(day) && day <= today).sort();
  const runs = new Map<string, number>();
  let previous = '', run = 0;
  for (const day of dates) {
    run = previous === shiftDate(day, -1) ? run + 1 : 1;
    runs.set(day, run);
    previous = day;
  }
  const current = previous === today || previous === shiftDate(today, -1) ? run : 0;
  return { total: dates.length, current, runs };
}

/** Seven consecutive days reach the visual cap; long streaks stay legible. */
export function readingRunIntensity(run: number) {
  return Math.min(1, Math.max(0, (run - 1) / 6));
}

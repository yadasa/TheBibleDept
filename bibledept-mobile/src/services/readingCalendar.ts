import { dateDistance, shiftDate, validDate } from '../../shared/habits';

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

/** A three-week run reaches near-white; longer runs keep the same capped glow. */
export function readingRunIntensity(run: number) {
  return Math.pow(Math.min(1, Math.max(0, (run - 1) / 20)), .85);
}

export function readingRunColor(orange: string, run: number) {
  return liftOrange(orange,readingRunIntensity(run)*.94);
}

function liftOrange(orange:string,lift:number) {
  return orange.replace(/#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i, (_, r, g, b) =>
    `rgb(${[r,g,b].map(hex => Math.round(parseInt(hex,16) + (255 - parseInt(hex,16)) * lift)).join(',')})`);
}

/** Opaque, warm colors: add light toward white rather than fading through black. */
export function readingFillColors(orange:string,run:number) {
  const intensity=readingRunIntensity(run);
  return {rest:liftOrange(orange,.64*intensity),peak:liftOrange(orange,.06+.88*intensity)};
}

/** Full brighten/dim cycle: orange 5.2 s, near-white 3.2 s. */
export function readingGlowProfile(run: number) {
  const intensity=readingRunIntensity(run);
  return {
    cycleMs:5200-2000*intensity,
    minOpacity:.08+.32*intensity,
    maxOpacity:.2+.8*intensity,
  };
}

/** Position recent activity at the right edge rather than opening on empty old weeks. */
export function calendarRecencyOffset(latest: string, first: string, viewport: number, cellSize: number) {
  const column=Math.max(0,Math.min(25,Math.floor(dateDistance(latest,first)/7)));
  return Math.max(0,8+(column+1)*(cellSize+4)-4-viewport);
}

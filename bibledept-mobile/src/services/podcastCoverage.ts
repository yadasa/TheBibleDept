import { getReadingPlanDay } from './readingPlan';

export type PodcastCoverage = Readonly<{ duration: number; intervals: readonly (readonly [number, number])[] }>;
export type PodcastsCoverage = Partial<Record<number, PodcastCoverage>>;
const tolerance = 1;

/** The transport supplies genuine played spans, never a seek's skipped distance. */
export function addPodcastCoverage(current: PodcastCoverage | undefined, span: { from: number; to: number; duration: number }): PodcastCoverage {
  const { duration } = span;
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(span.from) || !Number.isFinite(span.to) || span.to <= span.from)
    return current || { duration: 0, intervals: [] };
  const from = Math.max(0, Math.min(duration, span.from)), to = Math.max(0, Math.min(duration, span.to));
  if (to <= from) return current || { duration, intervals: [] };
  const sorted = [...(current?.intervals || []), [from, to] as const]
    .map(([start, end]) => [Math.max(0, Math.min(duration, start)), Math.max(0, Math.min(duration, end))] as [number, number])
    .filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  const intervals: [number, number][] = [];
  for (const interval of sorted) {
    const previous = intervals[intervals.length - 1];
    if (previous && interval[0] <= previous[1] + tolerance) previous[1] = Math.max(previous[1], interval[1]);
    else intervals.push([...interval]);
  }
  return { duration, intervals };
}

export function podcastListeningProgress(coverage: PodcastCoverage | undefined): { coveredSeconds: number; requiredSeconds: number; complete: boolean } {
  const duration = coverage?.duration || 0;
  const requiredSeconds = duration > 120 ? duration - 120 : duration;
  const first = coverage?.intervals[0];
  const coveredSeconds = first && first[0] <= tolerance ? first[1] : 0;
  return { coveredSeconds, requiredSeconds, complete: requiredSeconds > 0 && coveredSeconds >= requiredSeconds - tolerance };
}

export function encodePodcastCoverage(coverage: PodcastsCoverage): string {
  // Tenths retain native status precision without a large JSON object per span.
  return JSON.stringify(Object.entries(coverage).map(([day, value]) => [Number(day), Math.round(value!.duration * 10),
    value!.intervals.map(([start, end]) => [Math.round(start * 10), Math.round(end * 10)])]));
}

export function decodePodcastCoverage(raw: string | null): PodcastsCoverage {
  try {
    const rows: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(rows)) return {};
    const result: PodcastsCoverage = {};
    for (const row of rows) {
      if (!Array.isArray(row) || row.length !== 3) continue;
      const [day, duration, intervals] = row;
      if (typeof day !== 'number' || !getReadingPlanDay(day) || !Number.isFinite(duration) || duration <= 0 || !Array.isArray(intervals)
        || intervals.some(pair => !Array.isArray(pair) || pair.length !== 2 || !Number.isFinite(pair[0]) || !Number.isFinite(pair[1]) || pair[0] < 0 || pair[1] <= pair[0] || pair[1] > duration)) continue;
      let value: PodcastCoverage = { duration: duration / 10, intervals: [] };
      for (const [from, to] of intervals) value = addPodcastCoverage(value, { from: from / 10, to: to / 10, duration: duration / 10 });
      result[day] = value;
    }
    return result;
  } catch { return {}; }
}

import { addPodcastCoverage, decodePodcastCoverage, encodePodcastCoverage, PodcastsCoverage } from './podcastCoverage';
import { getReadingPlanDay } from './readingPlan';

export type PodcastPlaybackPoint = Readonly<{
  day: number; generation: number; position: number; duration: number;
  playing: boolean; buffering: boolean; rate: number; time: number;
}>;

/** Only continuous, observed native playback can add listening coverage. */
export function podcastPlayedSpan(previous: PodcastPlaybackPoint | null, next: PodcastPlaybackPoint): { from: number; to: number; duration: number } | undefined {
  if (!getReadingPlanDay(next.day) || !previous || previous.day !== next.day || previous.generation !== next.generation || !previous.playing || previous.buffering || next.buffering
    || !Number.isFinite(next.duration) || next.duration <= 0 || !Number.isFinite(previous.position) || !Number.isFinite(next.position)
    || previous.position < 0 || next.position > next.duration || next.position <= previous.position) return;
  const elapsed = (next.time - previous.time) / 1000;
  const rate = Math.max(previous.rate, next.rate);
  // A long gap cannot prove that a lock-screen seek did not happen while JS
  // was suspended. Native status events normally arrive every 200ms, even
  // without PCM. Resume from a fresh anchor rather than award an unobserved jump.
  if (!Number.isFinite(elapsed) || elapsed <= 0 || elapsed > 2.5 || !Number.isFinite(rate) || rate <= 0 || rate > 2
    || next.position - previous.position > elapsed * rate + .75) return;
  return { from: previous.position, to: next.position, duration: next.duration };
}

type Storage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };

/** A separate instance/key per owner keeps guest and signed-in history apart. */
export function createPodcastCoverageStore(storage: Storage, key: string) {
  let coverage: PodcastsCoverage = {}, loaded = false;
  let opening: Promise<PodcastsCoverage> | undefined, saving = Promise.resolve();
  return {
    load() {
      if (!opening) opening = storage.getItem(key).then(raw => {
        coverage = decodePodcastCoverage(raw);
        loaded = true;
        return coverage;
      }).catch(error => { opening = undefined; throw error; });
      return opening;
    },
    add(day: number, span: { from: number; to: number; duration: number }) {
      if (!loaded || !getReadingPlanDay(day)) return coverage;
      coverage = { ...coverage, [day]: addPodcastCoverage(coverage[day], span) };
      return coverage;
    },
    get value() { return coverage; },
    save() {
      if (!loaded) return Promise.resolve();
      const encoded = encodePodcastCoverage(coverage);
      // Capture this snapshot before queueing; a slow earlier write cannot
      // arrive after a newer one and restore older listening intervals.
      saving = saving.catch(() => {}).then(() => storage.setItem(key, encoded));
      return saving;
    },
  };
}

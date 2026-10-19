export const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const;
export const PODCAST_SAMPLE_BINS = 96;

// Audio-session calls cross an async native boundary. Serialize them so a
// completed Pause cannot deactivate a newer Play that is still preparing.
export function createPodcastSessionQueue() {
  let tail = Promise.resolve();
  return (isCurrent: () => boolean, operation: () => Promise<void>) => {
    const job = tail.then(async () => { if (isCurrent()) await operation(); });
    tail = job.catch(() => {});
    return job;
  };
}

export function canSamplePodcast(appState: string | null, platform: string, supported: boolean, diagnosticDisabled = false): boolean {
  return !diagnosticDisabled && appState === 'active' && platform !== 'android' && supported;
}

export function needsPodcastSessionActivation(released: boolean, ready: boolean, status: {
  playing: boolean; timeControlStatus: string; isLoaded: boolean; error: string | null;
}): boolean {
  return released && ready && status.isLoaded && !status.error &&
    (status.playing || status.timeControlStatus === 'waitingToPlayAtSpecifiedRate');
}

export type PodcastPcmSample = {
  timestamp: number;
  channels: { frames: readonly number[] }[];
};

export function podcastDuration(value: number, fallback = 0): number {
  if (Number.isFinite(value) && value > 0) return value;
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

export function clampPodcastPosition(value: number, duration: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(podcastDuration(duration), Math.max(0, value));
}

export function emptyPodcastSamples(): number[] {
  return Array.from({ length: PODCAST_SAMPLE_BINS }, () => 0);
}

// Keep the louder channel's RMS. Averaging stereo PCM before measuring could
// cancel opposite phases and make audible speech appear silent.
export function podcastSampleLevel(channels: PodcastPcmSample['channels']): number | null {
  let level: number | null = null;
  for (const { frames } of channels) {
    let squares = 0, count = 0;
    for (const frame of frames) {
      if (!Number.isFinite(frame)) continue;
      const value = Math.min(1, Math.abs(frame));
      squares += value * value;
      count++;
    }
    if (count) level = Math.max(level ?? 0, Math.sqrt(squares / count));
  }
  return level;
}

export function recordPodcastSample(samples: readonly number[], sample: PodcastPcmSample, duration: number) {
  if (!Number.isFinite(sample.timestamp) || sample.timestamp < 0 ||
      !Number.isFinite(duration) || duration <= 0 || sample.timestamp > duration) return null;
  const liveLevel = podcastSampleLevel(sample.channels);
  if (liveLevel === null) return null;
  const index = Math.min(PODCAST_SAMPLE_BINS - 1, Math.floor(sample.timestamp / duration * PODCAST_SAMPLE_BINS));
  const next = samples.length === PODCAST_SAMPLE_BINS ? [...samples] : emptyPodcastSamples();
  next[index] = Math.max(Number.isFinite(next[index]) ? next[index] : 0, liveLevel);
  return { samples: next, liveLevel };
}

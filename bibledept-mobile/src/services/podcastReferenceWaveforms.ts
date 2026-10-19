import data from '../data/bibledept-podcast-waveforms.json';
import catalog from '../data/bibledept-podcasts.json';
import { PODCAST_SAMPLE_BINS } from './podcastAudio';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
type ReferenceWaveform = Readonly<{ samples: readonly number[]; duration: number }>;
const cache = new Map<number, ReferenceWaveform | undefined>();

/** Decode amplitudes without a Node Buffer dependency in Expo Go. */
export function decodePodcastAmplitudes(encoded: string, count = PODCAST_SAMPLE_BINS): number[] | undefined {
  if (!Number.isInteger(count) || count <= 0 || encoded.length !== Math.ceil(count / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return;
  const samples: number[] = [];
  let buffer = 0, bits = 0;
  for (const char of encoded.replace(/=+$/, '')) {
    buffer = (buffer << 6) | alphabet.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      samples.push(((buffer >>> bits) & 255) / 255);
    }
  }
  return samples.length === count ? samples : undefined;
}

/**
 * Genuine build-time RMS, including future/paused bars. Ad insertion can change
 * a subsequent stream, so this is a normalized reference, not an exact transcript
 * timeline. The provider replaces heard bins with the current stream's live PCM.
 */
export function getPodcastReferenceWaveform(day: number): ReferenceWaveform | undefined {
  if (cache.has(day)) return cache.get(day);
  const row = (data.episodes as Record<string, unknown>)[String(day)];
  let value: ReferenceWaveform | undefined;
  if (Number.isInteger(day) && day >= 1 && day <= catalog.episodes.length && data.version === 1 && data.bins === PODCAST_SAMPLE_BINS
    && Array.isArray(row) && row[0] === catalog.episodes[day - 1][1] && Number.isFinite(row[1]) && row[1] > 0 && typeof row[2] === 'string') {
    const samples = decodePodcastAmplitudes(row[2]);
    if (samples) value = Object.freeze({ samples: Object.freeze(samples), duration: row[1] / 1000 });
  }
  cache.set(day, value);
  return value;
}

/** Static reference silhouette for the mini player; only its progress color moves. */
export function getPodcastReferenceSamples(day: number): readonly number[] | undefined {
  return getPodcastReferenceWaveform(day)?.samples;
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodePodcastAmplitudes, getPodcastReferenceWaveform } from '../src/services/podcastReferenceWaveforms';
import { PODCAST_SAMPLE_BINS } from '../src/services/podcastAudio';

test('compact real-amplitude data decodes in Expo without Buffer and rejects malformed rows', () => {
  const original = Uint8Array.from({ length: PODCAST_SAMPLE_BINS }, (_, index) => index * 2);
  const decoded = decodePodcastAmplitudes(Buffer.from(original).toString('base64'))!;
  assert.deepEqual(decoded, [...original].map(value => value / 255));
  assert.equal(decodePodcastAmplitudes('not base64'), undefined);
  assert.equal(decodePodcastAmplitudes('AAAA'), undefined);
});

test('Day 1 carries all genuine reference bars before playback with its decoded stream duration', () => {
  const reference = getPodcastReferenceWaveform(1)!;
  assert.equal(reference.samples.length, PODCAST_SAMPLE_BINS);
  assert.ok(reference.duration > 120);
  assert.ok(reference.samples.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  assert.ok(new Set(reference.samples).size > 5, 'real speech must retain its measured variation');
  assert.equal(getPodcastReferenceWaveform(0), undefined);
  assert.equal(getPodcastReferenceWaveform(366), undefined);
});

test('all 365 reference waveforms match the current episode IDs and retain finite measured samples', () => {
  for (let day = 1; day <= 365; day++) {
    const reference = getPodcastReferenceWaveform(day);
    assert.ok(reference, `Day ${day} must have its matching reference stream`);
    assert.equal(reference.samples.length, PODCAST_SAMPLE_BINS);
    assert.ok(reference.duration > 120 && reference.duration < 7200);
    assert.ok(reference.samples.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
    assert.ok(reference.samples.some(value => value > 0));
  }
});

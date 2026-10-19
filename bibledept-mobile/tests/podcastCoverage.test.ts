import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPodcastCoverage, decodePodcastCoverage, encodePodcastCoverage, podcastListeningProgress } from '../src/services/podcastCoverage';

test('listening coverage merges adjacent real playback and excludes unplayed seek gaps', () => {
  let coverage = addPodcastCoverage(undefined, { from: 0, to: 30, duration: 600 });
  coverage = addPodcastCoverage(coverage, { from: 100, to: 590, duration: 600 });
  assert.deepEqual(podcastListeningProgress(coverage), { coveredSeconds: 30, requiredSeconds: 480, complete: false });
  coverage = addPodcastCoverage(coverage, { from: 30.4, to: 100, duration: 600 });
  assert.equal(podcastListeningProgress(coverage).complete, true);
  assert.deepEqual(coverage.intervals, [[0, 590]]);
});

test('the final two minutes are optional only for episodes longer than two minutes', () => {
  assert.equal(podcastListeningProgress(undefined).complete, false);
  assert.equal(podcastListeningProgress(addPodcastCoverage(undefined, { from: 0, to: 478, duration: 600 })).complete, false);
  assert.equal(podcastListeningProgress(addPodcastCoverage(undefined, { from: 0, to: 480, duration: 600 })).complete, true);
  assert.equal(podcastListeningProgress(addPodcastCoverage(undefined, { from: 0, to: 1, duration: 90 })).complete, false);
  assert.equal(podcastListeningProgress(addPodcastCoverage(undefined, { from: 0, to: 90, duration: 90 })).complete, true);
  assert.equal(podcastListeningProgress(addPodcastCoverage(undefined, { from: 400, to: 600, duration: 600 })).complete, false);
});

test('compact local coverage survives reopening and rejects malformed positions', () => {
  const coverage = { 1: addPodcastCoverage(undefined, { from: 0, to: 480, duration: 600 }) };
  const encoded = encodePodcastCoverage(coverage);
  assert.equal(encoded, '[[1,6000,[[0,4800]]]]');
  assert.deepEqual(decodePodcastCoverage(encoded), coverage);
  for (const value of ['oops', '{}', '[[366,600,[[0,300]]]]', '[[1,600,[[-1,300]]]]', '[[1,600,[[0,900]]]]'])
    assert.deepEqual(decodePodcastCoverage(value), {});
});

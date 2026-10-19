import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSamplePodcast, clampPodcastPosition, createPodcastSessionQueue, emptyPodcastSamples, needsPodcastSessionActivation, PLAYBACK_RATES, podcastDuration, podcastSampleLevel, recordPodcastSample } from '../src/services/podcastAudio';

test('lock-screen playback can reactivate a released session without resuming a deliberately paused player', () => {
  const paused = { playing: false, timeControlStatus: 'paused', isLoaded: true, error: null };
  assert.equal(needsPodcastSessionActivation(true, true, paused), false);
  const waiting = { ...paused, timeControlStatus: 'waitingToPlayAtSpecifiedRate' };
  assert.equal(needsPodcastSessionActivation(true, true, waiting), true);
  assert.equal(needsPodcastSessionActivation(true, true, { ...paused, playing: true }), true);
  assert.equal(needsPodcastSessionActivation(false, true, waiting), false);
  assert.equal(needsPodcastSessionActivation(true, false, waiting), false);
  assert.equal(needsPodcastSessionActivation(true, true, { ...waiting, isLoaded: false }), false);
  assert.equal(needsPodcastSessionActivation(true, true, { ...waiting, error: 'Failed' }), false);
});

test('a stale queued Pause cannot deactivate a newer Play, and native session operations stay serialized', async () => {
  const queue = createPodcastSessionQueue();
  const calls: string[] = [];
  let finishActivation!: () => void;
  const activation = new Promise<void>(resolve => { finishActivation = resolve; });
  let command = 1;
  const first = queue(() => command === 1, async () => { calls.push('activate:start'); await activation; calls.push('activate:end'); });
  await Promise.resolve();
  command = 2;
  const pause = queue(() => command === 2, async () => { calls.push('deactivate'); });
  command = 3;
  const play = queue(() => command === 3, async () => { calls.push('activate:new'); });
  assert.deepEqual(calls, ['activate:start']);
  finishActivation();
  await Promise.all([first, pause, play]);
  assert.deepEqual(calls, ['activate:start', 'activate:end', 'activate:new']);
});

test('a deliberate Pause releases the session after activation, and a failed activation does not poison retry', async () => {
  const queue = createPodcastSessionQueue();
  const calls: string[] = [];
  await assert.rejects(queue(() => true, async () => { throw new Error('Unavailable'); }), /Unavailable/);
  const active = queue(() => true, async () => { calls.push('activate'); });
  const paused = queue(() => true, async () => { calls.push('deactivate'); });
  await Promise.all([active, paused]);
  assert.deepEqual(calls, ['activate', 'deactivate']);
});

test('PCM analysis stops when the app is inactive or locked and resumes only on a supported foreground platform', () => {
  assert.equal(canSamplePodcast('active', 'ios', true), true);
  for (const state of ['inactive', 'background', 'unknown', null]) assert.equal(canSamplePodcast(state, 'ios', true), false);
  assert.equal(canSamplePodcast('active', 'android', true), false);
  assert.equal(canSamplePodcast('active', 'web', false), false);
  assert.equal(canSamplePodcast('active', 'ios', true), true);
});

test('the playback isolation override blocks sampling even on supported foreground devices while normal runs keep it enabled', () => {
  assert.equal(canSamplePodcast('active', 'ios', true, true), false);
  assert.equal(canSamplePodcast('active', 'web', true, true), false);
  assert.equal(canSamplePodcast('active', 'ios', true, false), true);
  assert.equal(canSamplePodcast('active', 'ios', true), true);
});

test('PCM level measures both stereo channels without phase cancellation and rejects invalid frames', () => {
  assert.equal(podcastSampleLevel([{ frames: [.5, -.5] }, { frames: [-.5, .5] }]), .5);
  assert.equal(podcastSampleLevel([{ frames: [NaN, Infinity, -Infinity] }]), null);
  assert.equal(podcastSampleLevel([{ frames: [0, 0] }]), 0);
  assert.equal(podcastSampleLevel([{ frames: [2, -3, NaN] }]), 1);
});

test('only the actual media timestamp gains a waveform peak; skipped and future sections stay unknown', () => {
  const empty = emptyPodcastSamples();
  const first = recordPodcastSample(empty, { timestamp: 10, channels: [{ frames: [.4, -.4] }] }, 96)!;
  assert.equal(first.samples.length, 96);
  assert.equal(first.samples[10], .4);
  assert.equal(first.liveLevel, .4);
  assert.equal(empty[10], 0);
  const quieter = recordPodcastSample(first.samples, { timestamp: 10.5, channels: [{ frames: [.1] }] }, 96)!;
  assert.equal(quieter.samples[10], .4);
  assert.equal(quieter.liveLevel, .1);
  const seeked = recordPodcastSample(quieter.samples, { timestamp: 60, channels: [{ frames: [.6] }] }, 96)!;
  assert.equal(seeked.samples[60], .6);
  assert.equal(seeked.samples[30], 0);
  assert.equal(seeked.samples[95], 0);
});

test('sampling rejects invalid clocks and duration and maps an exact endpoint to the last bin', () => {
  const samples = emptyPodcastSamples();
  for (const timestamp of [-1, NaN, Infinity, 101]) {
    assert.equal(recordPodcastSample(samples, { timestamp, channels: [{ frames: [.5] }] }, 100), null);
  }
  assert.equal(recordPodcastSample(samples, { timestamp: 0, channels: [{ frames: [.5] }] }, 0), null);
  assert.equal(recordPodcastSample(samples, { timestamp: 100, channels: [{ frames: [.5] }] }, 100)?.samples[95], .5);
});

test('duration and seek guards use finite values and speeds stay within the supported choices', () => {
  assert.equal(podcastDuration(NaN, 120), 120);
  assert.equal(podcastDuration(Infinity, -1), 0);
  assert.equal(clampPodcastPosition(-20, 120), 0);
  assert.equal(clampPodcastPosition(900, 120), 120);
  assert.equal(clampPodcastPosition(NaN, 120), 0);
  assert.deepEqual(PLAYBACK_RATES, [1, 1.25, 1.5, 2]);
});

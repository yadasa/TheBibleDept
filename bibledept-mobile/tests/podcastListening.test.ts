import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPodcastCoverageStore, podcastPlayedSpan, PodcastPlaybackPoint } from '../src/services/podcastListening';
import { podcastListeningProgress } from '../src/services/podcastCoverage';

const point = (extra: Partial<PodcastPlaybackPoint> = {}): PodcastPlaybackPoint => ({
  day: 1, generation: 1, position: 10, duration: 600, playing: true, buffering: false, rate: 1, time: 1000, ...extra,
});

test('only observed playback clock movement counts, including 2x and the last playing interval before pause', () => {
  assert.deepEqual(podcastPlayedSpan(point(), point({ position: 10.2, time: 1200 })), { from: 10, to: 10.2, duration: 600 });
  assert.deepEqual(podcastPlayedSpan(point({ rate: 2 }), point({ position: 10.4, rate: 2, time: 1200, playing: false })), { from: 10, to: 10.4, duration: 600 });
  assert.equal(podcastPlayedSpan(point({ playing: false }), point({ position: 10.2, time: 1200 })), undefined);
  assert.equal(podcastPlayedSpan(point(), point({ position: 10, time: 1200 })), undefined);
});

test('seek jumps, different episodes, buffering, unknown durations, and suspended status gaps cannot complete listening', () => {
  for (const next of [
    point({ position: 590, time: 1200 }), point({ position: 5, time: 1200 }),
    point({ position: 10.2, time: 1200, day: 2 }), point({ position: 10.2, time: 1200, generation: 2 }),
    point({ position: 10.2, time: 1200, duration: 0 }), point({ position: 10.2, time: 1200, buffering: true }),
    point({ position: 40, time: 31000 }), point({ position: NaN, time: 1200 }),
  ]) assert.equal(podcastPlayedSpan(point(), next), undefined);
  assert.equal(podcastPlayedSpan(null, point()), undefined);
});

test('listening persists locally per owner, survives reopening, and write order cannot erase newer coverage', async () => {
  const data = new Map<string, string>();
  let release: (() => void) | undefined;
  let writes = 0;
  const storage = {
    getItem: async (key: string) => data.get(key) || null,
    setItem: async (key: string, value: string) => {
      if (++writes === 1) await new Promise<void>(resolve => { release = resolve; });
      data.set(key, value);
    },
  };
  const guest = createPodcastCoverageStore(storage, 'guest'), member = createPodcastCoverageStore(storage, 'uid1');
  await guest.load(); await member.load();
  guest.add(1, { from: 0, to: 200, duration: 600 });
  const first = guest.save();
  await Promise.resolve(); await Promise.resolve();
  guest.add(1, { from: 200, to: 480, duration: 600 });
  const second = guest.save();
  release!(); await first; await second;
  assert.deepEqual(member.value, {});
  const reopened = createPodcastCoverageStore(storage, 'guest');
  await reopened.load();
  assert.equal(podcastListeningProgress(reopened.value[1]).complete, true);
  assert.equal(data.has('uid1'), false);
});

test('playing the optional introduction never awards a numbered day or stores plan listening credit',async()=>{
  assert.equal(podcastPlayedSpan(point({day:0}),point({day:0,position:10.2,time:1200})),undefined);
  let saved='';
  const store=createPodcastCoverageStore({getItem:async()=>null,setItem:async(_key,value)=>{saved=value;}},'intro-test');
  await store.load();
  store.add(0,{from:0,to:706,duration:706});
  assert.deepEqual(store.value,{});
  store.add(1,{from:0,to:480,duration:600});
  await store.save();
  assert.deepEqual(Object.keys(store.value),['1']);
  assert.equal(saved,'[[1,6000,[[0,4800]]]]');
});

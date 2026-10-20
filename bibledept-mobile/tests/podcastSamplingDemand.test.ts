import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPodcastSamplingDemand } from '../src/services/podcastSamplingDemand';

test('live PCM demand stops after the last visible player leaves, without duplicate notifications',()=>{
  const changes:boolean[]=[],demand=createPodcastSamplingDemand(value=>changes.push(value));
  const first=Symbol(),second=Symbol();
  demand.set(first,false);assert.deepEqual(changes,[]);
  demand.set(first,true);demand.set(first,true);demand.set(second,true);
  assert.deepEqual(changes,[true]);
  demand.set(first,false);assert.deepEqual(changes,[true]);
  demand.set(second,false);demand.set(second,false);
  assert.deepEqual(changes,[true,false]);
  demand.set(first,true);assert.deepEqual(changes,[true,false,true]);
});

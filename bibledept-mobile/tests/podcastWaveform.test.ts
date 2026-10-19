import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderedPodcastAmplitude } from '../src/services/podcastWaveform';

test('quiet speech still pulses when a phone-width bar contains an older louder peak',()=>{
  // 96 stored time bins have been reduced to 58 visible bars on a phone.
  assert.equal(renderedPodcastAmplitude(.9,.04,true,29,58,.5),.2);
  assert.equal(renderedPodcastAmplitude(.9,.04,true,28,58,.5),.9);
  assert.equal(renderedPodcastAmplitude(.9,.04,false,29,58,.5),.9);
});
test('silence, invalid samples, and the final visible bar remain bounded',()=>{
  assert.equal(renderedPodcastAmplitude(.8,0,true,57,58,1),.035);
  assert.equal(renderedPodcastAmplitude(.8,NaN,true,57,58,1),.035);
  assert.equal(renderedPodcastAmplitude(.8,4,true,57,58,1),1);
});

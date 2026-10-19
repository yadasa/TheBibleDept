import assert from 'node:assert/strict';
import { test } from 'node:test';
import { podcastLiveBarWeight, renderedPodcastAmplitude } from '../src/services/podcastWaveform';

test('quiet speech still pulses when a phone-width bar contains an older louder peak',()=>{
  // 96 stored time bins have been reduced to 58 visible bars on a phone.
  assert.equal(renderedPodcastAmplitude(.9,.04,true,29,58,.5),.2);
  assert.ok(renderedPodcastAmplitude(.9,.04,true,28,58,.5)<.9*.67);
  assert.equal(renderedPodcastAmplitude(.9,.04,false,29,58,.5),.9*.67);
});
test('silence, invalid samples, and the final visible bar remain bounded',()=>{
  assert.equal(renderedPodcastAmplitude(.8,0,true,57,58,1),.035);
  assert.equal(renderedPodcastAmplitude(.8,NaN,true,57,58,1),.035);
  assert.equal(renderedPodcastAmplitude(.8,4,true,57,58,1),1);
});

test('live influence is symmetric, decreases smoothly and vanishes four bars from the native clock',()=>{
  assert.equal(podcastLiveBarWeight(29,58,.5),1);
  for(let distance=1;distance<=4;distance++) {
    assert.equal(podcastLiveBarWeight(29-distance,58,.5),podcastLiveBarWeight(29+distance,58,.5));
    assert.ok(podcastLiveBarWeight(29+distance,58,.5)<podcastLiveBarWeight(28+distance,58,.5));
  }
  assert.equal(podcastLiveBarWeight(33,58,.5),0);
  assert.equal(podcastLiveBarWeight(50,58,.5),0);
});

test('unaffected and paused bars retain relative measured heights below 67%, without flat clipped peaks',()=>{
  for(const playing of [false,true]) {
    const low=renderedPodcastAmplitude(.5,1,playing,10,58,.5),high=renderedPodcastAmplitude(1,1,playing,10,58,.5);
    assert.equal(low,.335);
    assert.equal(high,.67);
    assert.equal(high,low*2);
  }
  for(let index=0;index<58;index++)assert.equal(renderedPodcastAmplitude(1,1,false,index,58,.5),.67);
});

test('nearby bars follow actual PCM, and their maximum tapers from 100% to 67%',()=>{
  let previous=1.1;
  for(let index=29;index<=33;index++) {
    const loud=renderedPodcastAmplitude(1,1,true,index,58,.5),quiet=renderedPodcastAmplitude(1,.01,true,index,58,.5);
    const cap=.67+.33*podcastLiveBarWeight(index,58,.5);
    assert.ok(loud<=cap+1e-12);
    assert.ok(loud<previous);
    if(index<33)assert.ok(quiet<loud);
    else assert.equal(quiet,loud);
    previous=loud;
  }
});

test('invalid amplitudes, positions and indices remain finite and bounded',()=>{
  for(const historical of [NaN,-2,0,.1,1,4,Infinity])for(const live of [NaN,-1,0,.5,2,Infinity])for(const progress of [-1,0,.5,1,2,NaN]) {
    const level=renderedPodcastAmplitude(historical,live,true,0,58,progress);
    assert.ok(Number.isFinite(level)&&level>=.035&&level<=1);
  }
  assert.equal(podcastLiveBarWeight(-1,58,.5),0);
  assert.equal(podcastLiveBarWeight(58,58,.5),0);
  assert.equal(podcastLiveBarWeight(0,0,.5),0);
  assert.equal(podcastLiveBarWeight(0,NaN,.5),0);
  assert.equal(podcastLiveBarWeight(0,58,NaN),0);
  assert.equal(podcastLiveBarWeight(57,58,1),1);
});

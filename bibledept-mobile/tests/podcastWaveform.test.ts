import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePodcastAmplitude, podcastAmplitudePeak, podcastLiveBarWeight, renderedPodcastAmplitude } from '../src/services/podcastWaveform';
import { getPodcastReferenceSamples } from '../src/services/podcastReferenceWaveforms';

test('quiet speech still pulses when a phone-width bar contains an older louder peak',()=>{
  // 96 stored time bins have been reduced to 58 visible bars on a phone.
  assert.ok(Math.abs(renderedPodcastAmplitude(.9,.04,true,29,58,.5,.2)-.2)<1e-12);
  assert.ok(renderedPodcastAmplitude(.9,.04,true,28,58,.5)<.9*.67);
  assert.equal(renderedPodcastAmplitude(.9,.04,false,29,58,.5),.9*.67);
});

test('the real Day 1 silhouette uses the available 67% height and preserves linear RMS ratios',()=>{
  const reference=getPodcastReferenceSamples(1)!,peak=podcastAmplitudePeak(reference);
  const normalized=reference.map(value=>normalizePodcastAmplitude(value,peak));
  const paused=normalized.map((value,index)=>renderedPodcastAmplitude(value,0,false,index,reference.length,0,peak));
  assert.equal(Math.max(...normalized),1);
  assert.equal(Math.max(...paused),.67);
  assert.ok(Math.max(...paused)-Math.min(...paused)>.2,'the real measured shape must remain visibly distinct');
  assert.equal(Math.max(...paused)/Math.min(...paused),Math.max(...reference)/Math.min(...reference));
});

test('a fixed reference scale keeps unrelated bars steady when a louder live bin arrives',()=>{
  const reference=[.03,.06,.12],peak=podcastAmplitudePeak(reference);
  const before=reference.map(value=>normalizePodcastAmplitude(value,peak));
  const heard=[.5,reference[1],reference[2]];
  const after=heard.map(value=>normalizePodcastAmplitude(value,peak));
  assert.equal(after[0],1);
  assert.equal(after[1],before[1]);
  assert.equal(after[2],before[2]);
});

test('historical and current PCM share linear units instead of mixing normalized bars with absolute square roots',()=>{
  const peak=.12,amplitude=.06;
  const historical=normalizePodcastAmplitude(amplitude,peak);
  assert.equal(historical,.5);
  assert.equal(renderedPodcastAmplitude(historical,amplitude,true,29,58,.5,peak),.5);
  assert.equal(renderedPodcastAmplitude(historical,amplitude/2,true,29,58,.5,peak),.25);
  assert.equal(renderedPodcastAmplitude(historical,peak,true,29,58,.5,peak),1);
});

test('silent or invalid reference values cannot produce infinite gain or invented amplitude',()=>{
  assert.equal(podcastAmplitudePeak([0,NaN,-1,Infinity]),1);
  assert.equal(normalizePodcastAmplitude(0,0),0);
  assert.equal(normalizePodcastAmplitude(NaN,.12),0);
  assert.equal(normalizePodcastAmplitude(-.2,.12),0);
  assert.equal(normalizePodcastAmplitude(.2,NaN),.2);
  assert.equal(normalizePodcastAmplitude(.4,.12),1);
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

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizePodcastAmplitude, podcastAmplitudePeak, podcastLiveBarWeight, previousPodcastBarHeight, renderedPodcastAmplitude } from '../src/services/podcastWaveform';
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

test('the current indicator averages the four preceding visible bars, excluding future bars',()=>{
  const levels=[.2,.4,.6,.8,1,.1,.3,.5];
  assert.equal(previousPodcastBarHeight(levels,.5,100),50);
  assert.equal(previousPodcastBarHeight(levels,.75,100),62.5);
  assert.equal(previousPodcastBarHeight(levels,1,100),47.5);
  assert.equal(previousPodcastBarHeight(levels,.01,100),20);
  assert.equal(previousPodcastBarHeight([.4],.8,100),40);
});

test('indicator height uses the actual full-player falloff profile and mini-player height caps',()=>{
  const full=Array.from({length:12},(_,index)=>renderedPodcastAmplitude(.7,.5,true,index,12,.5));
  const expected=full.slice(2,6).reduce((sum,value)=>sum+value*76,0)/4;
  assert.equal(previousPodcastBarHeight(full,.5,76),expected);
  const mini=[.2,.4,.6,.8,1];
  assert.ok(Math.abs(previousPodcastBarHeight(mini,.8,56,.33,1)-9.24)<1e-12);
  assert.ok(Math.abs(previousPodcastBarHeight(mini,.8,56,.67,1)-18.76)<1e-12);
  assert.equal(previousPodcastBarHeight([0,0,0,0],1,56,.33,1),1);
});

test('indicator averaging handles track ends and invalid inputs without oversized or missing geometry',()=>{
  assert.equal(previousPodcastBarHeight([],1,76),0);
  assert.equal(previousPodcastBarHeight([1],NaN,76),0);
  assert.equal(previousPodcastBarHeight([1],1,NaN),0);
  assert.equal(previousPodcastBarHeight([1],1,-1),0);
  assert.equal(previousPodcastBarHeight([NaN,-1,3,.5],1,100),37.5);
  assert.equal(previousPodcastBarHeight([.2,.8],-1,100),20);
  assert.equal(previousPodcastBarHeight([.2,.8],2,100),50);
});
test('silence, invalid samples, and the final visible bar remain bounded',()=>{
  assert.equal(renderedPodcastAmplitude(.8,0,true,57,58,1),.035);
  assert.equal(renderedPodcastAmplitude(.8,NaN,true,57,58,1),.035);
  assert.equal(renderedPodcastAmplitude(.8,4,true,57,58,1),1);
});

test('live influence fades over four past bars and more sharply over two future bars',()=>{
  assert.equal(podcastLiveBarWeight(29,58,.5),1);
  for(let distance=1;distance<=4;distance++) {
    assert.ok(podcastLiveBarWeight(29-distance,58,.5)<podcastLiveBarWeight(30-distance,58,.5));
  }
  assert.ok(podcastLiveBarWeight(28,58,.5)>podcastLiveBarWeight(30,58,.5));
  assert.equal(podcastLiveBarWeight(25,58,.5),0);
  assert.equal(podcastLiveBarWeight(31,58,.5),0);
  assert.ok(podcastLiveBarWeight(27,58,.5)>0);
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
  for(let index=29;index>=25;index--) {
    const loud=renderedPodcastAmplitude(1,1,true,index,58,.5),quiet=renderedPodcastAmplitude(1,.01,true,index,58,.5);
    const cap=.67+.33*podcastLiveBarWeight(index,58,.5);
    assert.ok(loud<=cap+1e-12);
    assert.ok(loud<previous);
    if(index>25)assert.ok(quiet<loud);
    else assert.equal(quiet,loud);
    previous=loud;
  }
});

test('quiet active audio stays no more than 33% below the preceding unmodulated average',()=>{
  const measured=[.2,.4,.6,.8,.1,.9,.3,.5];
  const recentAverage=previousPodcastBarHeight(measured,.5,1,.67,.035);
  assert.ok(Math.abs(recentAverage-.335)<1e-12);
  const center=renderedPodcastAmplitude(.1,0,true,4,8,.5,1,recentAverage);
  assert.ok(Math.abs(center-recentAverage*.67)<1e-12);
  assert.ok(center>0);
  const louder=renderedPodcastAmplitude(.1,.6,true,4,8,.5,1,recentAverage);
  assert.equal(louder,.6);
  assert.equal(previousPodcastBarHeight(measured,.5,1,.67,.035),recentAverage,'live response never changes the measured reference used for its floor');
});

test('neighbor floors blend away faster in the future and disappear entirely while paused',()=>{
  const average=.6;
  const at=(index:number,playing=true)=>renderedPodcastAmplitude(.01,0,playing,index,20,.5,1,average);
  assert.ok(Math.abs(at(10)-average*.67)<1e-12);
  assert.ok(at(9)>at(11));
  assert.ok(at(8)>at(12));
  assert.equal(at(6),.035);
  assert.equal(at(12),.035);
  for(let index=0;index<20;index++)assert.equal(at(index,false),.035);
  for(const value of [NaN,-1,0,1,4,Infinity]) {
    const level=renderedPodcastAmplitude(1,0,true,10,20,.5,1,value);
    assert.ok(Number.isFinite(level)&&level>=.035&&level<=1);
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

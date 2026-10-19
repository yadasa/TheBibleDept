import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planProgressAppearance } from '../src/services/planProgressAppearance';

test('the progress gradient starts whitening after 17% and reaches pure white at 95%',()=>{
  assert.equal(planProgressAppearance(0).tipColor,'rgb(240,90,0)');
  assert.equal(planProgressAppearance(17).tipColor,'rgb(240,90,0)');
  assert.notEqual(planProgressAppearance(18).tipColor,'rgb(240,90,0)');
  assert.notEqual(planProgressAppearance(94).tipColor,'rgb(255,255,255)');
  assert.equal(planProgressAppearance(95).tipColor,'rgb(255,255,255)');
  assert.equal(planProgressAppearance(100).tipColor,'rgb(255,255,255)');
});

test('glow strengthens beyond 33% and stays capped after 80%',()=>{
  assert.equal(planProgressAppearance(17).glow,0);
  assert.ok(planProgressAppearance(27).glow>0);
  assert.ok(planProgressAppearance(50).glow>planProgressAppearance(33).glow);
  assert.ok(planProgressAppearance(79).glow<1);
  assert.equal(planProgressAppearance(80).glow,1);
  assert.equal(planProgressAppearance(100).glow,1);
  assert.ok(planProgressAppearance(50).glow-planProgressAppearance(33).glow>planProgressAppearance(33).glow-planProgressAppearance(17).glow);
});

test('progress visuals are continuous, monotone and bounded for incomplete or invalid values',()=>{
  assert.equal(planProgressAppearance(-10).percent,0);
  assert.equal(planProgressAppearance(200).percent,100);
  assert.equal(planProgressAppearance(NaN).percent,0);
  let previous=0;
  for(let percent=0;percent<=100;percent+=.25){
    const next=planProgressAppearance(percent);
    assert.ok(next.glow>=previous&&next.glow<=1);previous=next.glow;
  }
  for(const boundary of [17,33,80])assert.ok(Math.abs(planProgressAppearance(boundary-.001).glow-planProgressAppearance(boundary+.001).glow)<.001);
});

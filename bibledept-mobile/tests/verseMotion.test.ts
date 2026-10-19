import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verseVisibilityOpacity as opacity} from '../src/services/verseMotion';
test('verses fade individually as their visible text enters and leaves',()=>{
  assert.equal(opacity(100,80,700),1);
  assert.equal(opacity(604,80,700),0);
  assert.equal(opacity(-80,80,700),0);
  assert.ok(opacity(580,80,700)>0&&opacity(580,80,700)<1);
  assert.ok(opacity(-60,80,700)>0&&opacity(-60,80,700)<1);
});
test('tall verses remain readable while their middle is in view',()=>{
  assert.equal(opacity(-100,1000,700),1);
  assert.equal(opacity(500,1000,700),1);
});
test('unmeasured or collapsed readers keep their text visible',()=>{
  assert.equal(opacity(Number.NaN,80,700),1);
  assert.equal(opacity(100,0,700),1);
  assert.equal(opacity(100,80,0),1);
});

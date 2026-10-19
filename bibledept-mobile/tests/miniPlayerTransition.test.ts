import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createMiniPlayerTransition } from '../src/services/miniPlayerTransition';

test('a player reopened during its exit stays mounted when the old animation completes',()=>{
  const transition=createMiniPlayerTransition();
  const entering=transition.begin(true);
  assert.equal(transition.complete(entering),'shown');
  const leaving=transition.begin(false),reopening=transition.begin(true);
  assert.equal(transition.complete(leaving),undefined);
  assert.equal(transition.complete(reopening),'shown');
  assert.equal(transition.complete(reopening),undefined);
});

test('a finished exit can remove the player once, while interrupted and unmounted callbacks are ignored',()=>{
  const transition=createMiniPlayerTransition();
  const entering=transition.begin(true),leaving=transition.begin(false);
  assert.equal(transition.complete(entering),undefined);
  assert.equal(transition.complete(leaving),'hidden');
  assert.equal(transition.complete(leaving),undefined);
  const pending=transition.begin(true);
  transition.cancel();
  assert.equal(transition.complete(pending),undefined);
});

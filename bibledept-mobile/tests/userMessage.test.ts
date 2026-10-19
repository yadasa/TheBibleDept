import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageForUser, UserFacingError } from '../src/services/userMessage';

test('unknown provider and runtime messages never become product copy',()=>{
  const fallback='We couldn’t save your changes. Please try again.';
  for(const error of [new Error('Firebase: permission-denied'),{code:'auth/internal-error',message:'SDK native module missing'},'HTTP 500',null])
    assert.equal(messageForUser(error,fallback),fallback);
});

test('deliberate app guidance remains useful while preserving the original cause',()=>{
  const cause=new Error('Native permission status is denied');
  const error=new UserFacingError('Turn on notifications in Settings to receive reminders.',cause);
  assert.equal(messageForUser(error,'Try again.'),error.message);
  assert.equal(error.cause,cause);
});

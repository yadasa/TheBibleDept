import { test } from 'node:test';
import assert from 'node:assert/strict';
import { communityErrorForUser } from '../src/services/communityError';
test('community errors display deliberate app guidance without SDK status suffixes',()=>{
  const original={code:'functions/resource-exhausted',message:'Give your last message a moment. [429]',details:{app:'bibledept-community',message:'Give your last message a moment.'}};
  const result=communityErrorForUser(original);
  assert.equal(result.message,'Give your last message a moment.');assert.equal(result.cause,original);
});
test('unmarked provider messages and oversized details never become community copy',()=>{
  for(const error of [{code:'functions/permission-denied',message:'Internal provider diagnostic'}, {details:{app:'another-app',message:'Internal provider diagnostic'}},{details:{app:'bibledept-community',message:'x'.repeat(501)}}])assert.equal(communityErrorForUser(error).message,'We couldn’t sync that change. Check your connection and try again.');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withRequestDeadline } from '../src/services/requestDeadline';
import { UserFacingError } from '../src/services/userMessage';

const guidance='We couldn’t confirm your reading time zone yet. Check your connection and try again.';

test('a stalled preparation or request releases its caller at the deadline',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  let settled=false;
  const request=withRequestDeadline(()=>new Promise<never>(()=>{}),20000,guidance);
  const rejected=assert.rejects(request,error=>{assert.ok(error instanceof UserFacingError);assert.equal(error.message,guidance);assert.match(String(error.cause),/20000 ms/);settled=true;return true;});
  context.mock.timers.tick(19999);await Promise.resolve();assert.equal(settled,false);
  context.mock.timers.tick(1);await rejected;assert.equal(settled,true);
});

test('successful requests preserve their result and remove the deadline',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const value={timeZone:'America/Chicago'};
  assert.equal(await withRequestDeadline(async()=>value,20000,guidance),value);
  context.mock.timers.tick(20000);
});

test('provider failures and synchronous preparation failures remain intact',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  const provider=new Error('provider failure'),preparation=new Error('preparation failure');
  await assert.rejects(withRequestDeadline(async()=>{throw provider;},20000,guidance),error=>error===provider);
  await assert.rejects(withRequestDeadline(()=>{throw preparation;},20000,guidance),error=>error===preparation);
  context.mock.timers.tick(20000);
});

test('late settlement cannot change a timeout or prevent a separate retry',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});
  let finish:(value:string)=>void=()=>{},fail:(error:Error)=>void=()=>{};
  const slow=withRequestDeadline(()=>new Promise<string>(resolve=>{finish=resolve;}),20000,guidance);
  const rejected=assert.rejects(slow,{message:guidance});context.mock.timers.tick(20000);await rejected;
  finish('late success');await Promise.resolve();
  assert.equal(await withRequestDeadline(async()=>'retry success',20000,guidance),'retry success');
  const lateFailure=withRequestDeadline(()=>new Promise<never>((_resolve,reject)=>{fail=reject;}),20000,guidance);
  const failed=assert.rejects(lateFailure,{message:guidance});context.mock.timers.tick(20000);await failed;
  fail(new Error('late rejection'));await Promise.resolve();
});

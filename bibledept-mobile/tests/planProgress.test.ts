import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlanProgressStore } from '../src/services/planProgress';

function memoryStorage(seed:Record<string,string>={}) {
  const values=new Map(Object.entries(seed));
  return {values,getItem:async(key:string)=>values.get(key)||null,setItem:async(key:string,value:string)=>{values.set(key,value);}};
}

test('new readers start at day one; device progress survives reopening and stays account-scoped',async()=>{
  const storage=memoryStorage();
  const guest=createPlanProgressStore(storage,'guest');
  assert.deepEqual(await guest.load(),{currentDay:1,finished:false});
  assert.deepEqual(await guest.advance(1),{currentDay:2,finished:false});
  assert.deepEqual(await createPlanProgressStore(storage,'guest').load(),{currentDay:2,finished:false});
  assert.deepEqual(await createPlanProgressStore(storage,'another-user').load(),{currentDay:1,finished:false});
  assert.equal(storage.values.get('guest'),'[2,0]');
});

test('double taps cannot skip days and failed device writes do not advance progress',async()=>{
  const storage=memoryStorage();let fail=true;
  const store=createPlanProgressStore({...storage,setItem:async(key,value)=>{if(fail)throw new Error('Storage unavailable');await storage.setItem(key,value);}},'reader');
  await store.load();await assert.rejects(store.advance(1));
  assert.equal(storage.values.size,0);
  fail=false;
  const results=await Promise.all([store.advance(1),store.advance(1)]);
  assert.deepEqual(results.map(p=>p.currentDay),[2,2]);
});

test('the final day completes the plan without creating a day 366',async()=>{
  const store=createPlanProgressStore(memoryStorage({reader:'[365,0]'}),'reader');
  await store.load();
  assert.deepEqual(await store.advance(365),{currentDay:365,finished:true});
  assert.deepEqual(await store.advance(365),{currentDay:365,finished:true});
});

test('invalid saved positions safely start at day one',async()=>{
  for(const value of ['broken','[0,0]','[366,0]','[1,1]','[1.5,0]','{}']) {
    const store=createPlanProgressStore(memoryStorage({reader:value}),'reader');
    assert.equal((await store.load()).currentDay,1);
  }
});

test('account progress merges durably and a stale tap cannot advance a newer remote day',async()=>{
  const storage=memoryStorage(),store=createPlanProgressStore(storage,'reader');await store.load();
  assert.equal((await store.merge({currentDay:34,finished:false})).currentDay,34);
  assert.equal((await store.advance(1)).currentDay,34);
  assert.equal((await store.merge({currentDay:3,finished:false})).currentDay,34);
  assert.equal((await createPlanProgressStore(storage,'reader').load()).currentDay,34);
});
test('failed account-cache writes preserve the old local day until retry',async()=>{
  const storage=memoryStorage();let fail=true;
  const store=createPlanProgressStore({...storage,setItem:async(key,value)=>{if(fail)throw Error('Unavailable');await storage.setItem(key,value);}},'reader');await store.load();
  await assert.rejects(store.merge({currentDay:34,finished:false}));assert.equal(storage.values.size,0);
  fail=false;assert.equal((await store.merge({currentDay:34,finished:false})).currentDay,34);
});

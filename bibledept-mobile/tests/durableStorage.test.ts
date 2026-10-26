import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDurableValue, updateDurableValue, writeDurableValue } from '../src/services/durableStorage';

test('a conditional clear finishes before a newer write, preserving the replacement value',async()=>{
  let stored:string|null='old',reading!:()=>void,release!:()=>void;
  const started=new Promise<void>(resolve=>{reading=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
  const storage={getItem:async()=>{reading();await gate;return stored;},setItem:async(_key:string,value:string)=>{stored=value;},removeItem:async()=>{stored=null;}};
  const clearing=updateDurableValue(storage,'conditional-key',value=>value==='old'?null:value);await started;
  const replacement=writeDurableValue(storage,'conditional-key','new');
  await Promise.resolve();assert.equal(stored,'old');
  release();await Promise.all([clearing,replacement]);assert.equal(stored,'new');
});

test('reopening waits for an earlier local save without blocking another account or circle',async()=>{
  const stored=new Map<string,string>();let writing!:()=>void,release!:()=>void,reads=0;
  const started=new Promise<void>(resolve=>{writing=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
  const storage={getItem:async(key:string)=>{reads++;return stored.get(key)||null;},setItem:async(key:string,value:string)=>{writing();await gate;stored.set(key,value);},removeItem:async(key:string)=>{stored.delete(key);}};
  const saving=writeDurableValue(storage,'busy-circle','saved draft');await started;
  const reopening=readDurableValue(storage,'busy-circle');await Promise.resolve();assert.equal(reads,0);
  assert.equal(await readDurableValue(storage,'another-circle'),null);assert.equal(reads,1);
  release();await saving;assert.equal(await reopening,'saved draft');
});

test('a storage failure releases the key so a later retry can succeed',async()=>{
  let stored:string|null=null,fail=true;
  const storage={getItem:async()=>stored,setItem:async(_key:string,value:string)=>{if(fail)throw new Error('Temporary storage failure');stored=value;},removeItem:async()=>{stored=null;}};
  await assert.rejects(writeDurableValue(storage,'retry-key','first'),/Temporary storage failure/);
  fail=false;await writeDurableValue(storage,'retry-key','second');assert.equal(await readDurableValue(storage,'retry-key'),'second');
});

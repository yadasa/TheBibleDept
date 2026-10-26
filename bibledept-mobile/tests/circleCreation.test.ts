import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circleCreationKey, decodeCircleCreation, deliverCircleCreation } from '../src/services/circleCreation';

const pending={id:'stable-creation-id',name:'Sunday readers'};
test('saved circle requests are account scoped and reject corrupt or unbounded data',()=>{
  assert.notEqual(circleCreationKey('reader-a'),circleCreationKey('reader-b'));
  assert.deepEqual(decodeCircleCreation(JSON.stringify({...pending,name:'  Sunday readers  '})),pending);
  for(const value of [null,'broken','{}',JSON.stringify({...pending,id:'bad/id'}),JSON.stringify({...pending,name:'A'.repeat(61)}),JSON.stringify({...pending,name:'bad\u0000name'})])assert.equal(decodeCircleCreation(value),null);
});
test('a lost creation acknowledgement retains the same durable request across a reload',async()=>{
  const saved=new Map<string,string>(),circles=new Map<string,string>(),key=circleCreationKey('reader');
  const storage={getItem:async(k:string)=>saved.get(k)||null,setItem:async(k:string,value:string)=>{saved.set(k,value);},removeItem:async(k:string)=>{saved.delete(k);}};
  let first=true;
  const send=async(request:typeof pending)=>{
    assert.ok(saved.has(key),'The retry identity must be saved before HTTP.');
    circles.set(request.id,request.name);
    if(first){first=false;throw new Error('Lost acknowledgement');}
    return {id:request.id};
  };
  await assert.rejects(deliverCircleCreation(storage,key,pending,send),/Lost acknowledgement/);
  const recovered=decodeCircleCreation(saved.get(key)!);assert.deepEqual(recovered,pending);
  assert.deepEqual(await deliverCircleCreation(storage,key,recovered!,send),{id:pending.id});
  assert.equal(circles.size,1);assert.equal(saved.has(key),false);
});
test('storage failure prevents creation and an invalid receipt keeps the retry identity',async()=>{
  let sent=false,saved='';
  await assert.rejects(deliverCircleCreation({getItem:async()=>null,setItem:async()=>{throw new Error('Storage unavailable');},removeItem:async()=>{}},'key',pending,async()=>{sent=true;return {id:pending.id};}),/Storage unavailable/);
  assert.equal(sent,false);
  await assert.rejects(deliverCircleCreation({getItem:async()=>saved||null,setItem:async(_key,value)=>{saved=value;},removeItem:async()=>{saved='';}},'key',pending,async()=>({id:'unexpected-circle'})),/receipt could not be confirmed/);
  assert.deepEqual(decodeCircleCreation(saved),pending);
});

test('a late creation acknowledgement cannot erase a different saved request after reopening circles',async()=>{
  const stored=new Map<string,string>(),key=circleCreationKey('reopened-reader');
  const storage={getItem:async(k:string)=>stored.get(k)||null,setItem:async(k:string,value:string)=>{stored.set(k,value);},removeItem:async(k:string)=>{stored.delete(k);}};
  let started!:()=>void,finish!:()=>void;
  const sending=new Promise<void>(resolve=>{started=resolve;}),acknowledgement=new Promise<void>(resolve=>{finish=resolve;});
  const delivery=deliverCircleCreation(storage,key,pending,async()=>{started();await acknowledgement;return {id:pending.id};});
  await sending;
  const newer={id:'another-stable-request',name:'A different circle'};stored.set(key,JSON.stringify(newer));
  finish();await delivery;
  assert.deepEqual(decodeCircleCreation(stored.get(key)||null),newer);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circleDraftKey, decodeCircleDraft, deliverCircleMessage, PendingCircleMessage } from '../src/services/circleDrafts';
test('a lost chat acknowledgement survives reopening and retries the original message ID',async()=>{
  const stored=new Map<string,string>(),posted=new Map<string,string>(),key=circleDraftKey('reader','circle');
  const storage={getItem:async(k:string)=>stored.get(k)||null,setItem:async(k:string,v:string)=>{stored.set(k,v);},removeItem:async(k:string)=>{stored.delete(k);}};
  let attempts=0;
  const send=async(draft:PendingCircleMessage)=>{posted.set(draft.id,draft.text);if(!attempts++)throw new Error('Response lost after server acceptance.');};
  await assert.rejects(deliverCircleMessage(storage,key,{id:'stable-retry-id',text:'A thought from the reading.'},send));
  const recovered=decodeCircleDraft(stored.get(key)||null);
  assert.equal(recovered.pending?.id,'stable-retry-id');
  await deliverCircleMessage(storage,key,recovered.pending!,send);
  assert.equal(posted.size,1);assert.equal(stored.has(key),false);
  assert.notEqual(circleDraftKey('another-reader','circle'),key);
});
test('a message is not sent when its retry identity cannot be saved',async()=>{
  let sent=false;
  await assert.rejects(deliverCircleMessage({getItem:async()=>null,setItem:async()=>{throw new Error('Storage unavailable');},removeItem:async()=>{}},'draft',{id:'stable-id',text:'Hello'},async()=>{sent=true;}));
  assert.equal(sent,false);
});
test('malformed local drafts cannot become outgoing requests',()=>{
  for(const raw of [null,'not JSON',JSON.stringify({text:'a'.repeat(2001)}),JSON.stringify({text:'Hello',pending:{id:'../elsewhere',text:'Hello'}})])assert.equal(decodeCircleDraft(raw).pending,null);
});

test('a late message acknowledgement cannot erase a newer draft after the conversation is reopened',async()=>{
  const stored=new Map<string,string>(),key=circleDraftKey('reader','reopened-circle');
  const storage={getItem:async(k:string)=>stored.get(k)||null,setItem:async(k:string,value:string)=>{stored.set(k,value);},removeItem:async(k:string)=>{stored.delete(k);}};
  let started!:()=>void,finish!:()=>void;
  const sending=new Promise<void>(resolve=>{started=resolve;}),acknowledgement=new Promise<void>(resolve=>{finish=resolve;});
  const delivery=deliverCircleMessage(storage,key,{id:'old-pending-id',text:'An earlier thought.'},async()=>{started();await acknowledgement;});
  await sending;
  const newer={text:'A new thought written after reopening.',pending:null};stored.set(key,JSON.stringify(newer));
  finish();await delivery;
  assert.deepEqual(decodeCircleDraft(stored.get(key)||null),newer);
});

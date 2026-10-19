import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBibleClient } from '../src/services/bible';
const passage = { reference: 'John 3:16', translation_name: 'World English Bible', verses: [{ book_id:'JHN',book_name:'John',chapter:3,verse:16,text:'A test passage.' }] };

async function flushMicrotasks() { for(let turn=0;turn<20;turn++)await Promise.resolve(); }
function simulatedClock() {
  let time=0;
  const waiting=new Set<{due:number;resolve:()=>void;reject:(error:Error)=>void;signal?:AbortSignal;abort:()=>void}>();
  return {
    now:()=>time,
    sleep:(ms:number,signal?:AbortSignal)=>new Promise<void>((resolve,reject)=>{
      const wait={due:time+ms,resolve,reject,signal,abort:()=>{waiting.delete(wait);const error=new Error('Canceled');error.name='AbortError';reject(error);}};
      if(signal?.aborted){wait.abort();return;}
      waiting.add(wait);signal?.addEventListener('abort',wait.abort,{once:true});
    }),
    advanceTo:async(next:number)=>{
      assert.ok(next>=time);time=next;
      await flushMicrotasks();
      for(const wait of [...waiting])if(wait.due<=time){waiting.delete(wait);wait.signal?.removeEventListener('abort',wait.abort);wait.resolve();}
      await flushMicrotasks();
    },
  };
}

test('encodes references and serves recent repeat passages from memory', async () => {
  let calls = 0;
  const reader = createBibleClient({ interval: 0, fetcher: async (url) => { calls++; assert.match(String(url), /John%203%3A16\?translation=web/); return new Response(JSON.stringify(passage)); } });
  const first = await reader(' John   3:16 ');
  assert.equal(first.verses[0].verse,16);
  assert.equal(await reader('john 3:16'),first);
  assert.equal(calls,1);
});
test('does not cache failed or malformed provider responses', async () => {
  let calls=0;
  const reader=createBibleClient({interval:0,fetcher:async()=>{calls++;return calls===1?new Response('{}'):new Response(JSON.stringify(passage));}});
  await assert.rejects(reader('John 3:16'),/read this passage/);
  await reader('John 3:16');assert.equal(calls,2);
});
test('rejects empty references and canceled requests before contacting the API', async () => {
  const reader=createBibleClient({fetcher:async()=>{throw new Error('unexpected network call');}});
  await assert.rejects(reader('  '),/Enter a Bible reference/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(reader('Luke 1','web',controller.signal),{name:'AbortError'});
});
test('returns an actionable rate-limit error', async () => {
  const reader=createBibleClient({interval:0,fetcher:async()=>new Response('',{status:429})});
  await assert.rejects(reader('Luke 1'),/Wait 30 seconds/);
});

test('canceled queued selections leave no artificial tail before the latest passage',async()=>{
  const clock=simulatedClock(),starts:{reference:string;time:number}[]=[];
  const reader=createBibleClient({...clock,fetcher:async(url)=>{
    starts.push({reference:decodeURIComponent(new URL(String(url)).pathname.slice(1)),time:clock.now()});
    return new Response(JSON.stringify(passage));
  }});
  await reader('Luke 1');
  const canceled=Array.from({length:4},(_,index)=>{
    const controller=new AbortController();
    const rejected=assert.rejects(reader(`Luke ${index+2}`,'web',controller.signal),{name:'AbortError'});
    return {controller,rejected};
  });
  await flushMicrotasks();
  canceled.forEach(({controller})=>controller.abort());
  await Promise.all(canceled.map(({rejected})=>rejected));
  const latest=reader('Luke 6');
  await clock.advanceTo(2099);assert.equal(starts.length,1);
  await clock.advanceTo(2100);await latest;
  assert.deepEqual(starts,[{reference:'Luke 1',time:0},{reference:'Luke 6',time:2100}]);
});

test('actual API starts remain 2100 ms apart without waiting for earlier responses',async()=>{
  const clock=simulatedClock(),starts:number[]=[],responses:((response:Response)=>void)[]=[];
  const reader=createBibleClient({...clock,fetcher:()=>{
    starts.push(clock.now());
    return new Promise<Response>(resolve=>responses.push(resolve));
  }});
  const requests=[reader('Luke 1'),reader('Luke 2'),reader('Luke 3')];
  await flushMicrotasks();assert.deepEqual(starts,[0]);
  await clock.advanceTo(2099);assert.deepEqual(starts,[0]);
  await clock.advanceTo(2100);assert.deepEqual(starts,[0,2100]);
  await clock.advanceTo(4199);assert.deepEqual(starts,[0,2100]);
  await clock.advanceTo(4200);assert.deepEqual(starts,[0,2100,4200]);
  responses.forEach(resolve=>resolve(new Response(JSON.stringify(passage))));
  await Promise.all(requests);
});

test('the memory cache still expires after five minutes and keeps at most twenty passages',async()=>{
  const clock=simulatedClock();let calls=0;
  const reader=createBibleClient({...clock,interval:0,fetcher:async()=>{calls++;return new Response(JSON.stringify(passage));}});
  await reader('Luke 1');await clock.advanceTo(299999);await reader('Luke 1');assert.equal(calls,1);
  await clock.advanceTo(300000);await reader('Luke 1');assert.equal(calls,2);
  for(let chapter=2;chapter<=21;chapter++)await reader(`Luke ${chapter}`);
  assert.equal(calls,22);
  await reader('Luke 2');assert.equal(calls,22);
  await reader('Luke 1');assert.equal(calls,23,'the oldest passage was evicted after twenty entries');
});

test('background preparation and opening the reader share one in-flight passage',async()=>{
  let calls=0,respond!:(response:Response)=>void;
  const reader=createBibleClient({interval:0,fetcher:()=>{calls++;return new Promise<Response>(resolve=>respond=resolve);}});
  const preparation=reader('Luke 1'),opening=reader(' luke   1 ');
  await flushMicrotasks();assert.equal(calls,1);assert.equal(reader.peek('Luke 1'),undefined);
  respond(new Response(JSON.stringify(passage)));
  const [a,b]=await Promise.all([preparation,opening]);assert.equal(a,b);assert.equal(reader.peek('LUKE 1'),a);
});

test('leaving Home cancels its prefetch consumer without aborting the reader consumer',async()=>{
  const home=new AbortController();let respond!:(response:Response)=>void,networkSignal:AbortSignal|undefined;
  const reader=createBibleClient({interval:0,fetcher:(_url,options)=>{networkSignal=options?.signal as AbortSignal;return new Promise<Response>(resolve=>respond=resolve);}});
  const preparation=assert.rejects(reader('Luke 1','web',home.signal),{name:'AbortError'}),opening=reader('Luke 1');
  await flushMicrotasks();home.abort();await preparation;assert.equal(networkSignal?.aborted,false);
  respond(new Response(JSON.stringify(passage)));assert.equal((await opening).reference,passage.reference);
});

test('canceling every consumer releases a shared request so the next reader can retry',async()=>{
  const consumer=new AbortController();let calls=0;
  const reader=createBibleClient({interval:0,fetcher:(_url,options)=>{
    calls++;if(calls>1)return Promise.resolve(new Response(JSON.stringify(passage)));
    return new Promise<Response>((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>{const error=new Error('Canceled');error.name='AbortError';reject(error);},{once:true}));
  }});
  const preparation=assert.rejects(reader('Luke 1','web',consumer.signal),{name:'AbortError'});
  await flushMicrotasks();consumer.abort();await preparation;
  assert.equal((await reader('Luke 1')).reference,passage.reference);assert.equal(calls,2);
});

test('cache peeks are synchronous, translation-specific and never return expired passages',async()=>{
  let time=0,calls=0;
  const reader=createBibleClient({interval:0,now:()=>time,fetcher:async()=>{calls++;return new Response(JSON.stringify(passage));}});
  await reader('Luke 1');assert.ok(reader.peek('Luke 1'));assert.equal(reader.peek('Luke 1','kjv'),undefined);
  time=300000;assert.equal(reader.peek('Luke 1'),undefined);assert.equal(calls,1);
});

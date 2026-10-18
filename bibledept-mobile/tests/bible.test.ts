import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBibleClient } from '../src/services/bible';
const passage = { reference: 'John 3:16', translation_name: 'World English Bible', verses: [{ book_id:'JHN',book_name:'John',chapter:3,verse:16,text:'A test passage.' }] };

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
  await assert.rejects(reader('John 3:16'),/unreadable/);
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

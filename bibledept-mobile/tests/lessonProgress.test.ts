import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLessonProgressStore, createReadingScrollIntent, hasReachedReadingEnd, isVerticalReadingGesture, lessonProgressFor } from '../src/services/lessonProgress';

function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: async (key: string) => values.get(key) || null, setItem: async (key: string, value: string) => { values.set(key, value); } };
}

test('last chapter and reading offset survive reopening and stay local to the owner', async () => {
  const storage = memoryStorage(), store = createLessonProgressStore(storage, 'guest');
  await store.load(); await store.remember(1, 2, 1426.8);
  const reopened = await createLessonProgressStore(storage, 'guest').load();
  assert.equal(reopened[1]?.chapter, 2); assert.equal(reopened[1]?.offset, 1427);
  assert.deepEqual(await createLessonProgressStore(storage, 'another-user').load(), {});
  assert.ok(storage.values.get('guest')!.length < 40);
});

test('automatic completion needs all lesson chapters and qualified listening, in either order', async () => {
  for (const audioFirst of [false, true]) {
    const storage=memoryStorage(),store = createLessonProgressStore(storage, 'reader'); await store.load();
    if (audioFirst) assert.equal((await store.complete(1, true))[1]?.completed, undefined);
    await store.readChapter(1, 0); await store.readChapter(1, 2);
    assert.equal(lessonProgressFor(await store.complete(1, true), 1).completed, false);
    await store.readChapter(1, 1);
    assert.equal(lessonProgressFor(await store.complete(1, false), 1).completed, false);
    const completed = await store.complete(1, true);
    assert.equal(completed[1]?.completed, true); assert.equal(completed[1]?.acknowledged, false);
    assert.equal(await store.complete(1, true), completed);
    assert.equal((await store.acknowledge(1))[1]?.acknowledged, true);
    assert.equal((await createLessonProgressStore(storage,'reader').load())[1]?.acknowledged,true,'reopening must not replay a dismissed congratulations');
  }
});

test('malformed local lesson data cannot invent a completed reading',async()=>{
  const storage=memoryStorage();
  for(const row of ['[[1,0,0,[],1,0]]','[[1,8,0,[],0,0]]','[[1,0,-4,[],0,0]]','[[366,0,0,[],0,0]]']) {
    storage.values.set('reader',row);
    assert.deepEqual(await createLessonProgressStore(storage,'reader').load(),{});
  }
});

test('failed local writes never announce completion and a retry can succeed', async () => {
  const storage = memoryStorage(); let fail = false;
  const store = createLessonProgressStore({ ...storage, setItem: async (key, value) => { if (fail) throw new Error('Full'); await storage.setItem(key, value); } }, 'reader');
  await store.load(); await store.readChapter(1, 0); await store.readChapter(1, 1); await store.readChapter(1, 2);
  fail = true; await assert.rejects(store.complete(1, true));
  fail = false; assert.equal((await store.complete(1, true))[1]?.completed, true);
});

test('reading end requires real loaded text in an active viewport', () => {
  const bounds = { offset: 700, viewportHeight: 600, textTop: 100, textBottom: 1200, loaded: true, active: true, userInitiated: true };
  assert.equal(hasReachedReadingEnd(bounds), true);
  assert.equal(hasReachedReadingEnd({...bounds,obscuredBottom:192}),false,'text behind the mini player is not yet read');
  for (const change of [{ userInitiated: false }, { loaded: false }, { active: false }, { textBottom: 0 }, { offset: 0 }, { viewportHeight: 0 }, { textBottom: NaN }])
    assert.equal(hasReachedReadingEnd({ ...bounds, ...change }), false);
});

test('a podcast jump followed by a user wheel below Scripture cannot mark the chapter read',()=>{
  const intent=createReadingScrollIntent(()=>0);
  const bounds={offset:1300,viewportHeight:600,textTop:100,textBottom:1200,loaded:true,active:true,obscuredBottom:192};
  intent.clear();
  assert.equal(hasReachedReadingEnd({...bounds,userInitiated:intent.isUserInitiated()}),false,'the programmatic player jump cannot qualify');
  intent.begin('wheel');
  assert.equal(hasReachedReadingEnd({...bounds,offset:1400,userInitiated:intent.isUserInitiated()}),false,'a genuine scroll entirely in the podcast area still cannot qualify');
  assert.equal(hasReachedReadingEnd({...bounds,offset:1200,userInitiated:true}),false,'the last text boundary at the viewport top is already out of view');
  assert.equal(hasReachedReadingEnd({...bounds,offset:1100,userInitiated:true}),true,'scrolling back until the Scripture end is visible can qualify');
});

test('fast scrolls and short chapters qualify only while the actual reading end is visible',()=>{
  const bounds={offset:1000,viewportHeight:600,textTop:100,textBottom:1200,loaded:true,active:true,userInitiated:true,obscuredBottom:192};
  assert.equal(hasReachedReadingEnd(bounds),true,'a fast scroll may land with the end of a long chapter visible');
  assert.equal(hasReachedReadingEnd({...bounds,offset:0,textBottom:280}),true,'a short loaded chapter fits inside the readable viewport');
  assert.equal(hasReachedReadingEnd({...bounds,userInitiated:false}),false,'restoring an otherwise qualifying position is still insufficient');
  assert.equal(hasReachedReadingEnd({...bounds,offset:1100,viewportHeight:200}),false,'text hidden by the playback overlay is not visible');
});

test('tapping playback controls or dragging a waveform cannot become a reading scroll',()=>{
  const start={x:100,y:300};
  assert.equal(isVerticalReadingGesture(start,{x:100,y:300}),false,'a button tap does not count');
  assert.equal(isVerticalReadingGesture(start,{x:101,y:304}),false,'small finger movement does not count');
  assert.equal(isVerticalReadingGesture(start,{x:160,y:303}),false,'horizontal scrubbing does not count');
  assert.equal(isVerticalReadingGesture(start,{x:101,y:306}),true,'a deliberate vertical gesture counts');
  assert.equal(isVerticalReadingGesture(null,{x:100,y:310}),false);
});

test('reading intent expires after wheel input but persists through a genuine native fling',()=>{
  let now=0;const intent=createReadingScrollIntent(()=>now);
  intent.end('touch');assert.equal(intent.isUserInitiated(),false,'lifting after a tap cannot qualify');
  intent.begin('wheel');assert.equal(intent.isUserInitiated(),true);
  now=701;assert.equal(intent.isUserInitiated(),false,'later browser auto-scroll cannot inherit old wheel input');
  intent.begin('drag');intent.end('drag');intent.begin('momentum');
  now=10000;assert.equal(intent.isUserInitiated(),true,'long native inertia is still a real scroll');
  intent.end('momentum');assert.equal(intent.isUserInitiated(),false);
  intent.begin('key');intent.clear();assert.equal(intent.isUserInitiated(),false,'an app jump or control press cancels reading intent');
});

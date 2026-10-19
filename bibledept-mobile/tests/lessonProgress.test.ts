import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLessonProgressStore, hasReachedReadingEnd, lessonProgressFor } from '../src/services/lessonProgress';

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

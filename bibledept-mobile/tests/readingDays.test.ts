import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingDay, readingStreak } from '../src/services/readingDays';
test('reading days use calendar dates and streaks allow today to be unfinished',()=>{
  const today=new Date(2026,9,18,12);
  assert.equal(readingDay(today),'2026-10-18');
  assert.equal(readingStreak(['2026-10-17','2026-10-16'],today),2);
  assert.equal(readingStreak(['2026-10-18','2026-10-17','2026-10-15'],today),2);
  assert.equal(readingStreak(['2026-10-16'],today),0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingCalendar, readingRunIntensity } from '../src/services/readingCalendar';

test('calendar totals unique valid reading dates and resets runs at gaps', () => {
  const result = readingCalendar(['2026-10-19','2026-10-18','2026-10-16','2026-10-15','2026-10-15','2026-10-20','invalid'], '2026-10-19');
  assert.equal(result.total, 4);
  assert.equal(result.current, 2);
  assert.deepEqual([...result.runs.values()], [1,2,1,2]);
});

test('current streak survives today before reading but expires after a missed day', () => {
  assert.equal(readingCalendar(['2026-10-17','2026-10-18'], '2026-10-19').current, 2);
  assert.equal(readingCalendar(['2026-10-16','2026-10-17'], '2026-10-19').current, 0);
  assert.equal(readingCalendar([], '2026-10-19').total, 0);
});

test('consecutive-day brightness rises gradually and caps after seven days', () => {
  assert.equal(readingRunIntensity(1), 0);
  assert.ok(readingRunIntensity(3) < readingRunIntensity(6));
  assert.equal(readingRunIntensity(7), 1);
  assert.equal(readingRunIntensity(365), 1);
});

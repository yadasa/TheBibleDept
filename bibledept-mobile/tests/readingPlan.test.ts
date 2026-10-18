import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/bibledept-365.json';
import { getReadingPlanDay, READING_PLAN, READING_PLAN_DAYS } from '../src/services/readingPlan';

test('the source plan maps every day and every Bible chapter exactly once', () => {
  assert.equal(READING_PLAN_DAYS.length, 365);
  assert.deepEqual(READING_PLAN_DAYS.map(day => day.day), Array.from({length:365}, (_, i) => i + 1));
  assert.equal(data.books.length, 66);
  const expected = new Set(data.books.flatMap(book => Array.from({length:book.chapterCount}, (_, i) => `${book.bookId}:${i + 1}`)));
  assert.equal(expected.size, 1189);
  const actual = new Set<string>();
  for (const day of READING_PLAN_DAYS) {
    let chapters = 0;
    const expectedPage = day.day <= 54 ? 1 : day.day <= 147 ? 2 : day.day <= 240 ? 3 : day.day <= 333 ? 4 : 5;
    assert.equal(day.sourcePage, expectedPage, `Source page for day ${day.day}`);
    assert.ok(day.passages.length > 0);
    for (const passage of day.passages) {
      assert.ok(Number.isInteger(passage.chapterStart) && Number.isInteger(passage.chapterEnd));
      assert.ok(passage.chapterStart >= 1 && passage.chapterEnd >= passage.chapterStart);
      for (let chapter = passage.chapterStart; chapter <= passage.chapterEnd; chapter++) {
        const key = `${passage.bookId}:${chapter}`;
        assert.ok(expected.has(key), `Unexpected chapter ${key} on day ${day.day}`);
        assert.ok(!actual.has(key), `Duplicate chapter ${key} on day ${day.day}`);
        actual.add(key);
        chapters++;
      }
    }
    assert.equal(day.chapterCount, chapters, `Chapter count for day ${day.day}`);
  }
  assert.deepEqual(actual, expected);
  assert.equal(READING_PLAN.totalChapters, 1189);
});

test('whole-book and combined readings retain the PDF meaning', () => {
  const references = (day: number) => getReadingPlanDay(day)?.passages.map(p => p.reference);
  assert.deepEqual(references(1), ['Luke 1-3']);
  assert.equal(getReadingPlanDay(42)?.label, 'Philemon');
  assert.deepEqual(references(42), ['Philemon 1']);
  assert.deepEqual(references(43), ['Titus 1-3']);
  assert.deepEqual(references(54), ['2 Peter 1-3', 'Jude 1']);
  assert.deepEqual(references(75), ['2 John 1', '3 John 1']);
  assert.deepEqual(references(81), ['Revelation 21-22']);
  assert.deepEqual(references(82), ['Genesis 1-3']);
  assert.deepEqual(references(211), ['Zephaniah 1-3']);
  assert.deepEqual(references(212), ['Habakkuk 1-3']);
  assert.deepEqual(references(243), ['Obadiah 1']);
  assert.deepEqual(references(292), ['Psalms 119']);
  assert.deepEqual(references(365), ['2 Chronicles 34-36']);
});

test('the lookup rejects invalid day numbers and protects shared data from mutation', () => {
  for (const value of [0, -1, 366, 1.5, NaN, Infinity]) assert.equal(getReadingPlanDay(value), undefined);
  const first = getReadingPlanDay(1)!;
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.passages));
  assert.ok(Object.isFrozen(first.passages[0]));
});

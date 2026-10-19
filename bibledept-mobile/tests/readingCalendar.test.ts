import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarRecencyOffset, readingCalendar, readingFillColors, readingGlowProfile, readingRunColor, readingRunIntensity } from '../src/services/readingCalendar';

test('calendar totals unique valid reading dates and resets runs at gaps', () => {
  const result = readingCalendar(['2026-10-19','2026-10-18','2026-10-16','2026-10-15','2026-10-15','2026-10-20','invalid'], '2026-10-19');
  assert.equal(result.total, 4);
  assert.equal(result.current, 2);
  assert.deepEqual([...result.runs.values()], [1,2,1,2]);
});

test('calendar opens around recent activity rather than empty older weeks', () => {
  assert.equal(calendarRecencyOffset('2026-10-19','2026-04-26',350,25),408);
  assert.equal(calendarRecencyOffset('2026-04-27','2026-04-26',350,25),0);
  assert.equal(calendarRecencyOffset('2026-10-19','2026-04-26',350,25,8,6),512);
  assert.ok(calendarRecencyOffset('2026-09-19','2026-04-26',350,25)<408);
});

test('current streak survives today before reading but expires after a missed day', () => {
  assert.equal(readingCalendar(['2026-10-17','2026-10-18'], '2026-10-19').current, 2);
  assert.equal(readingCalendar(['2026-10-16','2026-10-17'], '2026-10-19').current, 0);
  assert.equal(readingCalendar([], '2026-10-19').total, 0);
});

test('consecutive-day brightness rises gradually and caps at 21 days', () => {
  assert.equal(readingRunIntensity(1), 0);
  assert.ok(readingRunIntensity(3) < readingRunIntensity(6));
  assert.ok(readingRunIntensity(7) < readingRunIntensity(14));
  assert.ok(readingRunIntensity(20) < 1);
  assert.equal(readingRunIntensity(21), 1);
  assert.equal(readingRunIntensity(365), 1);
  assert.equal(readingRunColor('#F05A00', 1), 'rgb(240,90,0)');
  assert.equal(readingRunColor('#F05A00', 21), 'rgb(254,245,240)');
});

test('whiter squares pulse their glow and fill more visibly with a two-second speed range', () => {
  const orange=readingGlowProfile(1),middle=readingGlowProfile(11),white=readingGlowProfile(21);
  assert.equal(orange.cycleMs-white.cycleMs,2000);
  assert.ok(orange.cycleMs>middle.cycleMs&&middle.cycleMs>white.cycleMs);
  assert.ok(orange.maxOpacity<middle.maxOpacity&&middle.maxOpacity<white.maxOpacity);
  for(let run=1;run<=365;run++){
    const profile=readingGlowProfile(run);
    assert.ok(profile.minOpacity>=0&&profile.minOpacity<profile.maxOpacity&&profile.maxOpacity<=1);
  }
  assert.deepEqual(readingGlowProfile(365),white);
});

test('square pulses add opaque warm light instead of fading or darkening toward gray', () => {
  const channels=(color:string)=>color.match(/\d+/g)!.map(Number);
  for(let run=1;run<=21;run++){
    const {rest,peak}=readingFillColors('#F05A00',run),low=channels(rest),high=channels(peak);
    assert.ok(rest.startsWith('rgb(')&&peak.startsWith('rgb('));
    assert.equal(low.length,3);assert.equal(high.length,3);
    low.forEach((value,index)=>assert.ok(high[index]>=value));
    assert.ok(low[0]>=low[1]&&low[1]>=low[2]);
    assert.ok(high[0]>=high[1]&&high[1]>=high[2]);
  }
  assert.equal(readingFillColors('#F05A00',1).rest,'rgb(240,90,0)');
  assert.equal(readingFillColors('#F05A00',21).peak,'rgb(255,255,255)');
});

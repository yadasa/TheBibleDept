import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarPageDays,showPlanIntroduction} from '../src/services/planEntry';
test('unstarted Day 1 opens Intro but its continue action can enter the reading',()=>{
  assert.equal(showPlanIntroduction(1,[]),true);
  assert.equal(showPlanIntroduction(1,[],true),false);
  assert.equal(showPlanIntroduction(1,[33]),false);
  assert.equal(showPlanIntroduction(2,[]),false);
  assert.equal(showPlanIntroduction(0,[1,2]),true);
});
test('calendar includes Intro as Day 0 exactly once and still covers all 365 readings',()=>{
  const pages=Array.from({length:13},(_,index)=>calendarPageDays(index)).flat();
  assert.deepEqual(pages,Array.from({length:366},(_,index)=>index));
  assert.equal(calendarPageDays(0)[0],0);assert.equal(calendarPageDays(1)[0],31);
});

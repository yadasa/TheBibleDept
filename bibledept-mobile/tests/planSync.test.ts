import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeAccountPlan,mergeAccountPlans,sameAccountPlan} from '../src/services/planSync';
test('Day 34 normalizes to completed Days 1–33 without inventing calendar dates',()=>{
 const plan=decodeAccountPlan({currentDay:34,finished:false,completedDays:[]})!;
 assert.equal(plan.completedDays.length,33);assert.equal(plan.completedDays[32],33);
});
test('two devices merge forward and retain out-of-order lesson completion',()=>{
 const phone=decodeAccountPlan({currentDay:1,finished:false,completedDays:[90]})!;
 const desktop=decodeAccountPlan({currentDay:34,finished:false,completedDays:[60]})!;
 const merged=mergeAccountPlans(phone,desktop);
 assert.equal(merged.currentDay,34);assert.ok(merged.completedDays.includes(90));assert.ok(merged.completedDays.includes(60));
 assert.deepEqual(mergeAccountPlans(desktop,phone),merged);assert.deepEqual(mergeAccountPlans(merged,phone),merged);
});
test('invalid cloud progress is rejected rather than clearing or fabricating progress',()=>{
 for(const data of [{currentDay:0,finished:false,completedDays:[]},{currentDay:3,finished:true,completedDays:[]},{currentDay:1,finished:false,completedDays:[366]},{currentDay:1,finished:false,completedDays:['3']}])assert.equal(decodeAccountPlan(data),null);
});
test('canonical comparisons ignore array identity and finished plans retain all 365 days',()=>{
 const plan=decodeAccountPlan({currentDay:365,finished:true,completedDays:[]})!;
 assert.equal(plan.completedDays.length,365);assert.ok(sameAccountPlan(plan,{...plan,completedDays:[...plan.completedDays]}));
});

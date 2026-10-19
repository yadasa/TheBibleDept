import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planPreloadReferences } from '../src/services/prepareReading';
test('Home prepares the saved chapter first and each remaining chapter of the current day once',()=>{
  assert.deepEqual(planPreloadReferences(101,1),['Exodus 17','Exodus 16','Exodus 18']);
  assert.deepEqual(planPreloadReferences(101,999),['Exodus 16','Exodus 17','Exodus 18']);
  assert.deepEqual(planPreloadReferences(0,0),[]);
  assert.deepEqual(planPreloadReferences(366,0),[]);
});

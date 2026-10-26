import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {mergeBibleDeptRules,namespaceBounds,managedBounds}=createRequire(import.meta.url)('../scripts/merge-firestore-rules.cjs');
const canonical=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
test('shared-project merge preserves every unrelated rule byte',()=>{
  const prefix="rules_version = '2';\nservice cloud.firestore { match /databases/{database}/documents {\n match /church/{id} { allow read: if false; }\n ";
  const suffix='\n match /finance/{id} { allow write: if false; }\n}}';
  const old="match /bibledeptUsers/{uid} { // brace } ignored\n function owner() { return request.auth.uid == uid; } match /prayers/{id} { allow read: if owner(); } }";
  const merged=mergeBibleDeptRules(prefix+old+suffix,canonical),bounds=managedBounds(merged);
  assert.equal(merged.slice(0,bounds.start),prefix);assert.equal(merged.slice(bounds.end),suffix);
  for(const collection of ['annotations','settings','stats','habitDays']) assert.ok(merged.includes(`match /${collection}/`));
  assert.ok(merged.includes('allow read: if owner(uid)'));
  for(const name of ['bibledeptProfiles','bibledeptActivity','bibledeptCircles'])assert.equal(merged.split(`match /${name}/`).length,2);
  assert.ok(merged.includes('function bibledeptCommunityMember()'));
  assert.equal(mergeBibleDeptRules(merged,canonical),merged);
});
test('shared-project merge refuses partial markers and unmarked duplicate community rules',()=>{
  for(const source of ['// BEGIN BIBLEDEPT RULES\nmatch /bibledeptUsers/{uid} {}','// END BIBLEDEPT RULES\nmatch /bibledeptUsers/{uid} {}','match /bibledeptUsers/{uid} {} match /bibledeptProfiles/{uid} {}'])assert.throws(()=>mergeBibleDeptRules(source,canonical));
});
test('merge refuses ambiguous, missing or unbalanced namespaces',()=>{
  for(const source of ['match /church/{id} {}','match /bibledeptUsers/{uid} {','match /bibledeptUsers/{uid} {} match /bibledeptUsers/{uid} {}'])assert.throws(()=>mergeBibleDeptRules(source,canonical));
});

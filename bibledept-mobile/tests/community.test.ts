import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, achievedIds, achievementProgress, Circle, circleHasUnread, cleanCircleName, cleanMessage, CommunityProfile, completedPlanDays, DEFAULT_COMMUNITY, EMPTY_METRICS, validateCommunityProfile, visibleCommunityStreak } from '../shared/community';

test('6% Club requires 365 distinct completed plan days, never a selected day or a streak',()=>{
  const days=Array.from({length:365},(_,i)=>i+1);
  assert.equal(completedPlanDays({currentDay:365,finished:true}),0);
  assert.equal(completedPlanDays({completedDays:[...days.slice(0,364),364,0,366,-1,'365']}),364);
  assert.equal(completedPlanDays({completedDays:days}),365);
  assert.ok(!achievedIds({...EMPTY_METRICS,readingDays:365,longestStreak:365,planDays:364}).includes('six-percent-club'));
  assert.ok(achievedIds({...EMPTY_METRICS,planDays:365}).includes('six-percent-club'));
});
test('achievement progress stays within bounds and the catalog has unique IDs',()=>{
  assert.equal(new Set(ACHIEVEMENTS.map(a=>a.id)).size,ACHIEVEMENTS.length);
  const first=ACHIEVEMENTS[0];
  assert.equal(achievementProgress(first,{...EMPTY_METRICS,readingDays:-1}),0);
  assert.equal(achievementProgress(first,{...EMPTY_METRICS,readingDays:NaN}),0);
  assert.equal(achievementProgress(first,{...EMPTY_METRICS,readingDays:100}),1);
  assert.equal(achievedIds(EMPTY_METRICS).length,0);
});
test('profiles opt out by default and reject unsafe or oversized photo payloads',()=>{
  assert.equal(DEFAULT_COMMUNITY.joined,false);
  const profile={...DEFAULT_COMMUNITY,displayName:'  A reader  '};
  assert.equal(validateCommunityProfile(profile).displayName,'A reader');
  for(const photoData of ['https://example.com/photo.jpg','data:image/svg+xml,<svg/>','data:image/jpeg;base64,/9j/'+ 'A'.repeat(60000)])assert.throws(()=>validateCommunityProfile({...profile,photoData}));
  for(const displayName of ['', 'A'.repeat(81),'A\u0000B'])assert.throws(()=>validateCommunityProfile({...profile,displayName}));
});
test('chat messages trim whitespace, preserve paragraphs, and reject empty or oversized text',()=>{
  assert.equal(cleanMessage('  A thought.\nA question.  '),'A thought.\nA question.');
  for(const text of ['', '  ', 'A'.repeat(2001), 'a\u0000b'])assert.throws(()=>cleanMessage(text));
});
test('circle names preserve ordinary punctuation and reject empty, control, or oversized values',()=>{
  assert.equal(cleanCircleName('  Sunday readers — together  '),'Sunday readers — together');
  for(const name of [null,'  ','A'.repeat(61),'Readers\nNext','Readers\u0000'])assert.throws(()=>cleanCircleName(name));
});
test('community streaks expire in the reader’s confirmed zone and honor private stats',()=>{
  const profile:CommunityProfile={id:'reader',displayName:'Reader',photoData:null,streak:7,lastReadingDate:'2026-10-25',timeZone:'America/Chicago',badgeIds:[],planDays:null};
  assert.equal(visibleCommunityStreak(profile,Date.parse('2026-10-26T05:30:00Z')),7);
  assert.equal(visibleCommunityStreak(profile,Date.parse('2026-10-27T06:00:00Z')),0);
  assert.equal(visibleCommunityStreak({...profile,timeZone:'Pacific/Honolulu'},Date.parse('2026-10-27T06:00:00Z')),7);
  assert.equal(visibleCommunityStreak({...profile,streak:null},Date.now()),null);
  assert.equal(visibleCommunityStreak({...profile,timeZone:'invalid'},Date.now()),0);
});

test('unread circles ignore empty rooms, acknowledged messages, own sends, and hidden readers',()=>{
  const circle:Circle={id:'room',name:'Readers',code:'ABCDEF123456',createdBy:'peer',memberCount:2};
  assert.equal(circleHasUnread(circle,undefined,'me',[]),false);
  const active={...circle,lastMessageId:'new-message',lastSenderUid:'peer'};
  assert.equal(circleHasUnread(active,undefined,'me',[]),true);
  assert.equal(circleHasUnread(active,'previous-message','me',[]),true);
  assert.equal(circleHasUnread(active,'new-message','me',[]),false);
  assert.equal(circleHasUnread({...active,lastSenderUid:'me'},undefined,'me',[]),false);
  assert.equal(circleHasUnread(active,undefined,'me',['peer']),false);
});

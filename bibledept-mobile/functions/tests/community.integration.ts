import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { saveCommunityProfile, reconcileCommunity, createCircle, joinCircle, leaveCircle, sendCircleMessage, cheerMilestone, deleteCircleMessage, deleteCommunityAccount, blockCommunityReader, reportCommunityContent } from '../src/community';
import { userPath } from '../src/streaks';
import { localDate } from '../../shared/habits';

assert.ok(process.env.FIRESTORE_EMULATOR_HOST,'Community tests require the Firestore emulator.');
initializeApp({projectId:'demo-bibledept'});
const db=getFirestore(),now=Date.now();
const profile={displayName:'A reader',photoData:null,joined:true,shareStreak:true,shareBadges:true};
const uid=(label:string)=>`community-${label}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
async function cleanup(...users:string[]){for(const user of users){await deleteCommunityAccount(user);await db.recursiveDelete(userPath(user));}}

test('awards are private by default; full completion awards the Club once and public fields respect consent',async()=>{
  const user=uid('club');
  try {
    await userPath(user).collection('settings').doc('planProgress').set({currentDay:365,finished:false,completedDays:Array.from({length:364},(_,i)=>i+1)});
    await userPath(user).collection('stats').doc('streak').set({current:7,longest:7,totalReadingDays:12,lastQualifiedDate:localDate(now,'America/Chicago')});
    await userPath(user).collection('settings').doc('readingHabit').set({timeZone:'America/Chicago'});
    let result=await reconcileCommunity(user,now);
    assert.ok(!result.badgeIds.includes('six-percent-club'));
    assert.equal((await db.collection('bibledeptProfiles').doc(user).get()).exists,false);
    assert.ok((await userPath(user).collection('achievements').doc('steady-week').get()).exists);
    await userPath(user).collection('settings').doc('planProgress').update({completedDays:Array.from({length:365},(_,i)=>i+1)});
    await saveCommunityProfile(user,profile,now);
    result=await reconcileCommunity(user,now);
    assert.ok(result.badgeIds.includes('six-percent-club'));
    const published=(await db.collection('bibledeptProfiles').doc(user).get()).data()!;
    assert.equal(published.planDays,365);assert.ok(published.badgeIds.includes('six-percent-club'));assert.equal(published.streak,7);
    assert.equal(published.email,undefined);assert.equal(published.notes,undefined);
    const award=(await userPath(user).collection('achievements').doc('six-percent-club').get()).data()!;
    await reconcileCommunity(user,now+1000);
    assert.equal((await userPath(user).collection('achievements').doc('six-percent-club').get()).data()?.earnedAt.toMillis(),award.earnedAt.toMillis());
    await saveCommunityProfile(user,{...profile,shareStreak:false,shareBadges:false},now+2000);
    const hidden=(await db.collection('bibledeptProfiles').doc(user).get()).data()!;
    assert.equal(hidden.streak,null);assert.equal(hidden.timeZone,null);assert.equal(hidden.planDays,null);assert.deepEqual(hidden.badgeIds,[]);
    assert.equal((await db.collection('bibledeptActivity').where('uid','==',user).get()).size,0);
    await saveCommunityProfile(user,{...profile,joined:false},now+3000);
    assert.equal((await db.collection('bibledeptProfiles').doc(user).get()).exists,false);
    assert.ok((await userPath(user).collection('achievements').doc('six-percent-club').get()).exists);
  }finally{await cleanup(user);}
});

test('circles enforce membership, stable retries, send pacing, and ownership of deletions',async()=>{
  const owner=uid('owner'),reader=uid('reader'),outsider=uid('outsider');
  try {
    await Promise.all([saveCommunityProfile(owner,profile),saveCommunityProfile(reader,{...profile,displayName:'Another reader'}),saveCommunityProfile(outsider,profile)]);
    const group=await createCircle(owner,{name:'Reading together'});
    const data=(await db.collection('bibledeptCircles').doc(group.id).get()).data()!;
    assert.equal((await userPath(owner).collection('achievements').doc('in-good-company').get()).exists,true);
    await assert.rejects(sendCircleMessage(outsider,{circleId:group.id,messageId:'first',text:'Not a member'},now),{code:'permission-denied'});
    await joinCircle(reader,{code:data.code.match(/.{1,4}/g).join('-')});
    await joinCircle(reader,{code:data.code});
    assert.equal((await db.collection('bibledeptCircles').doc(group.id).get()).data()?.memberCount,2);
    const message={circleId:group.id,messageId:'stable-message-id',text:'What stood out today?'};
    await Promise.all(Array.from({length:4},()=>sendCircleMessage(reader,message,now)));
    assert.equal((await db.collection('bibledeptCircles').doc(group.id).collection('bibledeptMessages').get()).size,1);
    assert.equal((await db.collection('bibledeptCircles').doc(group.id).get()).data()?.lastMessageId,message.messageId);
    assert.equal((await db.collection('bibledeptCircles').doc(group.id).get()).data()?.lastSenderUid,reader);
    await assert.rejects(sendCircleMessage(reader,{...message,text:'Changed body'},now+5000),{code:'already-exists'});
    await assert.rejects(sendCircleMessage(reader,{...message,messageId:'second-message-id'},now+1000),{code:'resource-exhausted'});
    await assert.rejects(deleteCircleMessage(owner,{circleId:group.id,messageId:message.messageId}),{code:'permission-denied'});
    await sendCircleMessage(reader,{...message,messageId:'latest-message-id'},now+4000);
    await deleteCircleMessage(reader,{circleId:group.id,messageId:message.messageId});
    assert.equal((await db.collection('bibledeptCircles').doc(group.id).get()).data()?.lastMessageId,'latest-message-id');
    await deleteCircleMessage(reader,{circleId:group.id,messageId:'latest-message-id'});
    assert.equal((await db.collection('bibledeptCircles').doc(group.id).get()).data()?.lastMessageId,null);
    await leaveCircle(reader,{circleId:group.id});
    await assert.rejects(sendCircleMessage(reader,{...message,messageId:'after-leaving'},now+6000),{code:'permission-denied'});
    await assert.rejects(joinCircle(reader,{code:'not-a-code'}),{code:'invalid-argument'});
  }finally{await cleanup(owner,reader,outsider);}
});

test('simultaneous joins cannot exceed 50 readers and account memberships stop at 20',async()=>{
  const owner=uid('capacity-owner'),readers=Array.from({length:3},()=>uid('capacity-reader'));
  let groupId:string|undefined,code:string|undefined;
  try {
    await Promise.all([owner,...readers].map(user=>saveCommunityProfile(user,profile)));
    const group=await createCircle(owner,{name:'Capacity test'});groupId=group.id;
    const ref=db.collection('bibledeptCircles').doc(group.id),data=(await ref.get()).data()!;code=data.code;
    await ref.update({memberIds:[owner,...Array.from({length:48},(_,i)=>`fixture-member-${i}`)],memberCount:49});
    const results=await Promise.allSettled(readers.map(reader=>joinCircle(reader,{code})));
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    assert.ok(results.filter(result=>result.status==='rejected').every(result=>result.reason.code==='resource-exhausted'));
    const full=(await ref.get()).data()!;
    assert.equal(full.memberCount,50);assert.equal(new Set(full.memberIds).size,50);
    const memberships=await Promise.all(readers.map(reader=>userPath(reader).collection('circles').get()));
    assert.equal(memberships.reduce((count,snapshot)=>count+snapshot.size,0),1);
    const batch=db.batch();
    for(let i=0;i<19;i++)batch.set(userPath(owner).collection('circles').doc(`fixture-circle-${i}`),{name:'Capacity fixture'});
    await batch.commit();
    await assert.rejects(createCircle(owner,{name:'One too many'}),{code:'resource-exhausted'});
    assert.equal((await userPath(owner).collection('circles').get()).size,20);
    assert.equal((await db.collection('bibledeptCircles').where('createdBy','==',owner).get()).size,1);
  }finally {
    if(groupId)await db.recursiveDelete(db.collection('bibledeptCircles').doc(groupId));
    if(code)await db.collection('bibledeptCircleCodes').doc(code).delete();
    await cleanup(owner,...readers);
  }
});

test('withdrawing sharing redacts public fields even when the subsequent refresh fails',async()=>{
  const user=uid('privacy');
  try {
    await saveCommunityProfile(user,profile);
    await db.collection('bibledeptProfiles').doc(user).update({streak:30,timeZone:'America/Chicago',lastReadingDate:'2026-10-26',badgeIds:['six-percent-club'],planDays:365});
    const original=db.runTransaction;
    let calls=0;
    const stub=mock.method(db,'runTransaction',async(...args:Parameters<typeof original>)=>{
      if(++calls===2)throw new Error('Simulated refresh failure');
      return Reflect.apply(original,db,args);
    });
    try {
      await assert.rejects(saveCommunityProfile(user,{...profile,displayName:'Updated reader',shareStreak:false,shareBadges:false}),/Simulated refresh failure/);
    }finally {stub.mock.restore();}
    const published=(await db.collection('bibledeptProfiles').doc(user).get()).data()!;
    assert.equal(published.displayName,'Updated reader');
    assert.equal(published.streak,null);assert.equal(published.lastReadingDate,null);assert.equal(published.timeZone,null);
    assert.deepEqual(published.badgeIds,[]);assert.equal(published.planDays,null);
    assert.equal((await db.collection('bibledeptActivity').where('uid','==',user).get()).size,0);
  }finally {await cleanup(user);}
});

test('encouragements are unique, cannot be self-awarded, and report/hide state is private',async()=>{
  const author=uid('author'),reader=uid('encourager');
  try {
    await saveCommunityProfile(author,profile);await saveCommunityProfile(reader,profile);
    const events=await db.collection('bibledeptActivity').where('uid','==',author).get(),event=events.docs[0];assert.ok(event);
    await assert.rejects(cheerMilestone(author,{activityId:event.id}),{code:'invalid-argument'});
    await Promise.all(Array.from({length:3},()=>cheerMilestone(reader,{activityId:event.id})));
    assert.equal((await event.ref.get()).data()?.cheerCount,1);
    assert.equal((await userPath(reader).collection('encouragedReaders').get()).size,1);
    assert.ok((await userPath(reader).collection('achievements').doc('lift-another').get()).exists);
    await blockCommunityReader(reader,{uid:author});
    assert.deepEqual((await userPath(reader).collection('settings').doc('community').get()).data()?.blockedUids,[author]);
    await reportCommunityContent(reader,{activityId:event.id,reason:'Test report for local validation.'});
    assert.equal((await db.collection('bibledeptCommunityReports').where('uid','==',reader).get()).size,1);
    await saveCommunityProfile(author,{...profile,joined:false});
    await assert.rejects(cheerMilestone(reader,{activityId:event.id}),{code:'not-found'});
  }finally{await cleanup(author,reader);}
});

test('account cleanup removes published data and late triggers cannot recreate achievements',async()=>{
  const user=uid('delete');
  await saveCommunityProfile(user,profile);
  const group=await createCircle(user,{name:'Disposable circle'});
  await sendCircleMessage(user,{circleId:group.id,messageId:'delete-me',text:'Disposable local message.'},now);
  await cleanup(user);
  await reconcileCommunity(user);
  await assert.rejects(saveCommunityProfile(user,profile),{code:'unauthenticated'});
  assert.equal((await db.collection('bibledeptProfiles').doc(user).get()).exists,false);
  assert.equal((await userPath(user).collection('achievements').get()).size,0);
  assert.equal((await userPath(user).collection('stats').get()).size,0);
  assert.equal((await db.collection('bibledeptCircles').doc(group.id).get()).exists,false);
  assert.equal((await db.collection('bibledeptActivity').where('uid','==',user).get()).size,0);
});

test('account cleanup pages through authored chat history, preserves peers, and never touches other app namespaces',async()=>{
  const owner=uid('history-owner'),peer=uid('history-peer'),other=db.collection('fixtureOtherChats').doc(owner);
  let groupId:string|undefined;
  try {
    await saveCommunityProfile(owner,profile);await saveCommunityProfile(peer,profile);
    const group=await createCircle(owner,{name:'History cleanup'});groupId=group.id;
    const ref=db.collection('bibledeptCircles').doc(group.id),data=(await ref.get()).data()!;
    await joinCircle(peer,{code:data.code});
    const batch=db.batch();
    for(let i=0;i<405;i++)batch.set(ref.collection('bibledeptMessages').doc(`owned-${String(i).padStart(3,'0')}`),{uid:owner,text:'Disposable history fixture.',createdAt:Timestamp.fromMillis(now+i)});
    batch.set(ref.collection('bibledeptMessages').doc('peer-message'),{uid:peer,text:'This peer message stays.',createdAt:Timestamp.fromMillis(now-1000)});
    batch.update(ref,{lastMessageId:'owned-404',lastSenderUid:owner,lastMessageAt:Timestamp.fromMillis(now+404)});
    batch.set(other.collection('messages').doc('unrelated'),{uid:owner,text:'Another app’s message.'});
    batch.set(other.collection('bibledeptMessages').doc('unrelated'),{uid:owner,text:'A different parent namespace.'});
    await batch.commit();
    await deleteCommunityAccount(owner);
    const remaining=await ref.collection('bibledeptMessages').get();
    assert.deepEqual(remaining.docs.map(message=>message.id),['peer-message']);
    const circle=(await ref.get()).data()!;
    assert.equal(circle.lastMessageId,'peer-message');assert.equal(circle.lastSenderUid,peer);assert.equal(circle.memberCount,1);assert.equal(circle.createdBy,peer);
    assert.equal((await other.collection('messages').doc('unrelated').get()).data()?.text,'Another app’s message.');
    assert.equal((await other.collection('bibledeptMessages').doc('unrelated').get()).data()?.text,'A different parent namespace.');
  }finally {
    await cleanup(owner,peer);
    if(groupId)await db.recursiveDelete(db.collection('bibledeptCircles').doc(groupId));
    await db.recursiveDelete(other);
  }
});

import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { saveCommunityProfile, reconcileCommunity, createCircle, joinCircle, leaveCircle, renameCircle, rotateCircleInvitation, removeCircleMember, sendCircleMessage, cheerMilestone, deleteCircleMessage, deleteCommunityAccount, blockCommunityReader, reportCommunityContent } from '../src/community';
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

test('name search finds readers beyond the first 200, updates after renaming, and removes opted-out readers',async()=>{
  const user=uid('search'),prefix=uid('directory'),others=Array.from({length:201},(_,index)=>db.collection('bibledeptProfiles').doc(`${prefix}-${index}`));
  try {
    const batch=db.batch();for(const [index,ref] of others.entries())batch.set(ref,{displayName:`A local reader ${index}`,namePrefixes:['a']});await batch.commit();
    await saveCommunityProfile(user,{...profile,displayName:'Zora O’Connor'});
    const directory=await db.collection('bibledeptProfiles').orderBy('displayName').limit(200).get();
    assert.ok(!directory.docs.some(item=>item.id===user));
    const find=(name:string)=>db.collection('bibledeptProfiles').where('namePrefixes','array-contains',name).limit(40).get();
    assert.ok((await find('o’c')).docs.some(item=>item.id===user));
    await saveCommunityProfile(user,{...profile,displayName:'Zora Ellis'});
    assert.ok(!(await find('o’c')).docs.some(item=>item.id===user));
    assert.ok((await find('ell')).docs.some(item=>item.id===user));
    await saveCommunityProfile(user,{...profile,displayName:'Zora Ellis',joined:false});
    assert.ok(!(await find('ell')).docs.some(item=>item.id===user));
  }finally{await cleanup(user);const batch=db.batch();for(const ref of others)batch.delete(ref);await batch.commit();}
});

test('circles enforce membership, stable retries, send pacing, and ownership of deletions',async()=>{
  const owner=uid('owner'),reader=uid('reader'),outsider=uid('outsider');
  try {
    await Promise.all([saveCommunityProfile(owner,profile),saveCommunityProfile(reader,{...profile,displayName:'Another reader'}),saveCommunityProfile(outsider,profile)]);
    const group=await createCircle(owner,{name:'Reading together',requestId:uid('create')});
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
    await reportCommunityContent(owner,{circleId:group.id,messageId:message.messageId,reason:'Disposable chat report fixture.'});
    await sendCircleMessage(reader,{...message,messageId:'latest-message-id'},now+4000);
    await deleteCircleMessage(reader,{circleId:group.id,messageId:message.messageId});
    await reportCommunityContent(owner,{circleId:group.id,messageId:message.messageId,reason:'Disposable chat report fixture.'});
    const reports=await db.collection('bibledeptCommunityReports').where('uid','==',owner).get();
    assert.equal(reports.size,1);assert.equal(reports.docs[0].data().contentSnapshot.text,message.text);
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
    const group=await createCircle(owner,{name:'Capacity test',requestId:uid('create')});groupId=group.id;
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
    await assert.rejects(createCircle(owner,{name:'One too many',requestId:uid('create')}),{code:'resource-exhausted'});
    assert.equal((await userPath(owner).collection('circles').get()).size,20);
    assert.equal((await db.collection('bibledeptCircles').where('createdBy','==',owner).get()).size,1);
  }finally {
    if(groupId)await db.recursiveDelete(db.collection('bibledeptCircles').doc(groupId));
    if(code)await db.collection('bibledeptCircleCodes').doc(code).delete();
    await cleanup(owner,...readers);
  }
});

test('creation retries return one circle and closed circles cannot be recreated by stale requests',async()=>{
  const owner=uid('creation-owner'),outsider=uid('creation-outside'),request={name:'A steady circle',requestId:uid('creation-request')};
  try {
    await Promise.all([saveCommunityProfile(owner,profile),saveCommunityProfile(outsider,profile)]);
    const results=await Promise.all(Array.from({length:4},()=>createCircle(owner,request)));
    assert.ok(results.every(result=>result.id===request.requestId));
    assert.equal((await db.collection('bibledeptCircles').where('createdBy','==',owner).get()).size,1);
    assert.equal((await db.collection('bibledeptCircleCodes').where('circleId','==',request.requestId).get()).size,1);
    assert.equal((await userPath(owner).collection('circles').get()).size,1);
    await assert.rejects(createCircle(owner,{...request,name:'Another name'}),{code:'already-exists'});
    await assert.rejects(createCircle(outsider,request),{code:'already-exists'});
    await leaveCircle(owner,{circleId:request.requestId});
    await assert.rejects(createCircle(owner,request),{code:'failed-precondition'});
    await assert.rejects(createCircle(outsider,request),{code:'already-exists'});
    assert.equal((await db.collection('bibledeptCircles').doc(request.requestId).get()).exists,false);
  }finally {await cleanup(owner,outsider);}
});

test('deleted messages cannot be resurrected by retries or reused by another member, while unknown IDs are not reserved',async()=>{
  const owner=uid('deleted-message-owner'),peer=uid('deleted-message-peer');
  try {
    await Promise.all([owner,peer].map(user=>saveCommunityProfile(user,profile)));
    const {id}=await createCircle(owner,{name:'Deletion retry circle',requestId:uid('deleted-message-circle')}),ref=db.collection('bibledeptCircles').doc(id);
    await joinCircle(peer,{code:(await ref.get()).data()!.code});
    const message={circleId:id,messageId:'must-stay-deleted',text:'A disposable thought to remove.'};
    await sendCircleMessage(owner,message,now);await deleteCircleMessage(owner,message);
    await assert.rejects(sendCircleMessage(owner,message,now+4000),{code:'failed-precondition'});
    await assert.rejects(sendCircleMessage(peer,{...message,text:'A different member reuses an old ID.'},now+4000),{code:'failed-precondition'});
    assert.equal((await ref.collection('bibledeptMessages').doc(message.messageId).get()).exists,false);
    await deleteCircleMessage(peer,{circleId:id,messageId:'unused-id'});
    await sendCircleMessage(owner,{circleId:id,messageId:'unused-id',text:'Unknown IDs were never reserved.'},now+8000);
    assert.equal((await ref.collection('bibledeptMessages').doc('unused-id').get()).exists,true);
  }finally{await cleanup(owner,peer);}
});

test('account cleanup rechecks message ownership inside the transaction before deleting an ID that was reused',async()=>{
  const owner=uid('cleanup-race-owner'),peer=uid('cleanup-race-peer');let restore:undefined|(()=>void);
  try {
    await Promise.all([owner,peer].map(user=>saveCommunityProfile(user,profile)));
    const {id}=await createCircle(peer,{name:'Cleanup race circle',requestId:uid('cleanup-race-circle')}),ref=db.collection('bibledeptCircles').doc(id);
    await joinCircle(owner,{code:(await ref.get()).data()!.code});
    const messageId='legacy-reused-id';
    await sendCircleMessage(owner,{circleId:id,messageId,text:'The original departing reader’s thought.'},now-10000);
    await leaveCircle(owner,{circleId:id});
    const original=db.runTransaction;let interposed=false;
    const stub=mock.method(db,'runTransaction',async(...args:Parameters<typeof original>)=>{
      if(!interposed) {
        interposed=true;
        // Reproduce a legacy deletion/recreation after the cleanup query read.
        await ref.collection('bibledeptMessages').doc(messageId).delete();
        await sendCircleMessage(peer,{circleId:id,messageId,text:'The remaining reader’s new thought.'},now+4000);
      }
      return original.apply(db,args);
    });restore=()=>stub.mock.restore();
    await deleteCommunityAccount(owner);restore();restore=undefined;
    const retained=(await ref.collection('bibledeptMessages').doc(messageId).get()).data();
    assert.equal(retained?.uid,peer);assert.equal(retained?.text,'The remaining reader’s new thought.');
    assert.equal((await ref.get()).data()?.lastSenderUid,peer);assert.equal((await ref.get()).data()?.lastMessageId,messageId);
  }finally{restore?.();await cleanup(owner,peer);}
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

test('only current circle owners can rename or replace invitations, and concurrent rotation retries keep one new code',async()=>{
  const owner=uid('manage-owner'),member=uid('manage-member'),outside=uid('manage-outside');
  try {
    await Promise.all([owner,member,outside].map(user=>saveCommunityProfile(user,profile)));
    const {id}=await createCircle(owner,{name:'Original name',requestId:uid('managed-circle')}),ref=db.collection('bibledeptCircles').doc(id),oldCode=(await ref.get()).data()!.code;
    await joinCircle(member,{code:oldCode});
    for(const user of [member,outside]) {
      await assert.rejects(renameCircle(user,{circleId:id,name:'Denied name'}),{code:'permission-denied'});
      await assert.rejects(rotateCircleInvitation(user,{circleId:id,expectedCode:oldCode}),{code:'permission-denied'});
      await assert.rejects(removeCircleMember(user,{circleId:id,uid:owner,expectedCode:oldCode}),{code:'permission-denied'});
    }
    await assert.rejects(renameCircle(owner,{circleId:id,name:'\u0000'}),{code:'invalid-argument'});
    await renameCircle(owner,{circleId:id,name:'  Our reading circle  '});
    assert.equal((await ref.get()).data()?.name,'Our reading circle');
    for(const user of [owner,member])assert.equal((await userPath(user).collection('circles').doc(id).get()).data()?.name,'Our reading circle');
    const rotated=await Promise.all(Array.from({length:3},()=>rotateCircleInvitation(owner,{circleId:id,expectedCode:oldCode})));
    assert.ok(rotated.every(value=>value.code===rotated[0].code));assert.notEqual(rotated[0].code,oldCode);
    assert.equal((await db.collection('bibledeptCircleCodes').where('circleId','==',id).get()).size,1);
    assert.equal((await db.collection('bibledeptCircleCodes').doc(oldCode).get()).exists,false);
    for(const user of [owner,member])assert.equal((await userPath(user).collection('circles').doc(id).get()).data()?.code,rotated[0].code);
    await assert.rejects(joinCircle(outside,{code:oldCode}),{code:'not-found'});
    await sendCircleMessage(member,{circleId:id,messageId:'still-a-member',text:'Existing members stay in their conversation.'});
    await leaveCircle(owner,{circleId:id});
    assert.equal((await userPath(member).collection('circles').doc(id).get()).data()?.createdBy,member);
    assert.equal((await userPath(member).collection('circles').doc(id).get()).data()?.memberCount,1);
    await assert.rejects(renameCircle(owner,{circleId:id,name:'Former owner'}),{code:'permission-denied'});
    await renameCircle(member,{circleId:id,name:'A new owner can continue'});
    assert.equal((await ref.get()).data()?.name,'A new owner can continue');
  }finally{await cleanup(owner,member,outside);}
});

test('removal replaces the invitation, keeps history, deduplicates retries, and cannot remove a freshly re-invited reader with a stale request',async()=>{
  const owner=uid('remove-owner'),member=uid('remove-member'),peer=uid('remove-peer');
  try {
    await Promise.all([owner,member,peer].map(user=>saveCommunityProfile(user,profile)));
    const {id}=await createCircle(owner,{name:'A managed circle',requestId:uid('remove-circle')}),ref=db.collection('bibledeptCircles').doc(id),oldCode=(await ref.get()).data()!.code;
    await Promise.all([joinCircle(member,{code:oldCode}),joinCircle(peer,{code:oldCode})]);
    await sendCircleMessage(member,{circleId:id,messageId:'retained-history',text:'A thought remains after membership changes.'});
    await userPath(member).collection('circleReads').doc(id).set({lastReadMessageId:'retained-history'});
    await assert.rejects(removeCircleMember(owner,{circleId:id,uid:owner,expectedCode:oldCode}),{code:'invalid-argument'});
    const request={circleId:id,uid:member,expectedCode:oldCode};
    const results=await Promise.all([removeCircleMember(owner,request),removeCircleMember(owner,request)]);
    assert.equal(results[0].code,results[1].code);assert.notEqual(results[0].code,oldCode);
    const group=(await ref.get()).data()!;
    assert.equal(group.memberCount,2);assert.ok(!group.memberIds.includes(member));assert.equal(group.code,results[0].code);
    assert.equal((await userPath(member).collection('circles').doc(id).get()).exists,false);
    assert.equal((await userPath(member).collection('circleReads').doc(id).get()).exists,false);
    assert.equal((await ref.collection('bibledeptMessages').doc('retained-history').get()).exists,true);
    for(const user of [owner,peer]){const index=(await userPath(user).collection('circles').doc(id).get()).data()!;assert.equal(index.code,group.code);assert.equal(index.memberCount,2);}
    await assert.rejects(joinCircle(member,{code:oldCode}),{code:'not-found'});
    await assert.rejects(sendCircleMessage(member,{circleId:id,messageId:'removed',text:'No longer a member.'}),{code:'permission-denied'});
    await joinCircle(member,{code:group.code});
    await assert.rejects(removeCircleMember(owner,request),{code:'failed-precondition'});
    assert.ok((await ref.get()).data()?.memberIds.includes(member));
  }finally{await cleanup(owner,member,peer);}
});

test('encouragements are unique, cannot be self-awarded, and report/hide state is private',async()=>{
  const author=uid('author'),reader=uid('encourager'),peers=Array.from({length:4},()=>uid('peer'));
  try {
    await saveCommunityProfile(author,profile);await saveCommunityProfile(reader,profile);
    const events=await db.collection('bibledeptActivity').where('uid','==',author).get(),event=events.docs[0];assert.ok(event);
    await assert.rejects(cheerMilestone(author,{activityId:event.id}),{code:'invalid-argument'});
    await Promise.all(Array.from({length:3},()=>cheerMilestone(reader,{activityId:event.id})));
    assert.equal((await event.ref.get()).data()?.cheerCount,1);
    assert.equal((await userPath(reader).collection('encouragedReaders').get()).size,1);
    assert.ok((await userPath(reader).collection('achievements').doc('lift-another').get()).exists);
    await userPath(author).collection('settings').doc('planProgress').set({completedDays:[1]});
    await reconcileCommunity(author);
    const another=(await db.collection('bibledeptActivity').where('uid','==',author).get()).docs.find(item=>item.id!==event.id)!;
    await cheerMilestone(reader,{activityId:another.id});
    assert.equal((await userPath(reader).collection('stats').doc('achievements').get()).data()?.encouragements,1);
    await Promise.all(peers.map(peer=>saveCommunityProfile(peer,profile)));
    await Promise.all(peers.map(async peer=>{
      const milestone=(await db.collection('bibledeptActivity').where('uid','==',peer).get()).docs[0];
      await cheerMilestone(reader,{activityId:milestone.id});
    }));
    assert.equal((await userPath(reader).collection('stats').doc('achievements').get()).data()?.encouragements,5);
    assert.ok((await userPath(reader).collection('achievements').doc('encourager').get()).exists);
    await blockCommunityReader(reader,{uid:author});
    assert.deepEqual((await userPath(reader).collection('settings').doc('community').get()).data()?.blockedUids,[author]);
    await Promise.all(Array.from({length:3},()=>reportCommunityContent(reader,{activityId:event.id,reason:'Test report for local validation.'})));
    const reports=await db.collection('bibledeptCommunityReports').where('uid','==',reader).get();
    assert.equal(reports.size,1);assert.equal(reports.docs[0].data().contentSnapshot.uid,author);
    await reports.docs[0].ref.update({status:'resolved'});
    await reportCommunityContent(reader,{activityId:event.id,reason:'Another retry.'});
    assert.equal((await reports.docs[0].ref.get()).data()?.status,'resolved');
    await saveCommunityProfile(author,{...profile,joined:false});
    await assert.rejects(cheerMilestone(reader,{activityId:event.id}),{code:'not-found'});
  }finally{await cleanup(author,reader,...peers);}
});

test('highlights and reflections award independently, stay private, and retain earned badges after removal',async()=>{
  const user=uid('reflections'),marker='Private reflection fixture text';
  try {
    await saveCommunityProfile(user,profile);
    const notes=userPath(user).collection('annotations'),batch=db.batch();
    const common={chapterId:'LUK.1',reference:'Luke 1',translation:'web',verseStart:1,verseEnd:1,excerpt:'Private excerpt fixture',createdAt:Timestamp.fromMillis(now),updatedAt:Timestamp.fromMillis(now)};
    for(let i=0;i<20;i++)batch.set(notes.doc(`highlight-${i}`),{...common,color:'gold',comment:''});
    for(let i=0;i<10;i++)batch.set(notes.doc(`reflection-${i}`),{...common,color:'none',comment:marker});
    await batch.commit();
    const result=await reconcileCommunity(user);
    assert.equal(result.metrics.highlights,20);assert.equal(result.metrics.reflections,10);
    for(const id of ['a-word-to-keep','well-marked','make-it-personal','thoughtful-reader'])assert.ok(result.badgeIds.includes(id));
    const published=(await db.collection('bibledeptProfiles').doc(user).get()).data()!;
    const events=await db.collection('bibledeptActivity').where('uid','==',user).get();
    assert.equal(JSON.stringify([published,...events.docs.map(event=>event.data())]).includes(marker),false);
    assert.equal(JSON.stringify(published).includes('Private excerpt fixture'),false);
    const before=(await userPath(user).collection('achievements').doc('well-marked').get()).data()!.earnedAt.toMillis();
    const remove=db.batch();(await notes.get()).docs.forEach(note=>remove.delete(note.ref));await remove.commit();
    const after=await reconcileCommunity(user);
    assert.equal(after.metrics.highlights,0);assert.equal(after.metrics.reflections,0);
    assert.ok(after.badgeIds.includes('well-marked'));
    assert.equal((await userPath(user).collection('achievements').doc('well-marked').get()).data()!.earnedAt.toMillis(),before);
  }finally{await cleanup(user);}
});

test('profile identity changes only with name/photo edits and unchanged photos are not recompressed during preference saves',async()=>{
  const user=uid('profile-identity');
  try {
    const {default:sharp}=await import('sharp'),pixels=Buffer.from(Array.from({length:40*40*3},(_,index)=>(index*37)%256));
    const photoData=`data:image/jpeg;base64,${(await sharp(pixels,{raw:{width:40,height:40,channels:3}}).jpeg({quality:90}).toBuffer()).toString('base64')}`;
    await saveCommunityProfile(user,{...profile,photoData});
    const ref=db.collection('bibledeptProfiles').doc(user),original=(await ref.get()).data()!;
    assert.match(original.profileVersion,/^[a-f0-9]{32}$/);
    await saveCommunityProfile(user,{...profile,photoData:original.photoData,shareStreak:false});
    let current=(await ref.get()).data()!;
    assert.equal(current.photoData,original.photoData);assert.equal(current.profileVersion,original.profileVersion);
    await reconcileCommunity(user);assert.equal((await ref.get()).data()?.profileVersion,original.profileVersion);
    await saveCommunityProfile(user,{...profile,displayName:'A different name',photoData:original.photoData});
    current=(await ref.get()).data()!;assert.notEqual(current.profileVersion,original.profileVersion);
    await saveCommunityProfile(user,{...profile,photoData:original.photoData});
    const reverted=(await ref.get()).data()!;
    assert.notEqual(reverted.profileVersion,current.profileVersion);assert.notEqual(reverted.profileVersion,original.profileVersion);
    assert.equal(reverted.photoData,original.photoData);
  }finally{await cleanup(user);}
});

test('profile reports retain the version shown, allow fresh reviews after edits, and preserve staff decisions on lost-ack retries',async()=>{
  const author=uid('profile-report-author'),reader=uid('profile-report-reader'),outside=uid('profile-report-outside');
  try {
    const {default:sharp}=await import('sharp');
    const photoData=`data:image/jpeg;base64,${(await sharp({create:{width:16,height:16,channels:3,background:'#F77A1C'}}).jpeg().toBuffer()).toString('base64')}`;
    await saveCommunityProfile(author,{...profile,displayName:'A reported profile',photoData});
    await saveCommunityProfile(author,{...profile,displayName:'A reported profile',photoData,shareBadges:false});
    await saveCommunityProfile(reader,profile);await saveCommunityProfile(outside,{...profile,joined:false});
    assert.equal((await db.collection('bibledeptActivity').where('uid','==',author).get()).size,0);
    const published=(await db.collection('bibledeptProfiles').doc(author).get()).data()!,target={profileUid:author,profileVersion:published.profileVersion};
    await assert.rejects(reportCommunityContent(outside,{...target,reason:'Not a community member.'}),{code:'permission-denied'});
    await assert.rejects(reportCommunityContent(reader,{...target,profileVersion:'bad-version',reason:'Invalid version.'}),{code:'invalid-argument'});
    await Promise.all([0,1].map(()=>reportCommunityContent(reader,{...target,reason:'Disposable profile name/photo report.'})));
    const reports=await db.collection('bibledeptCommunityReports').where('uid','==',reader).get();assert.equal(reports.size,1);
    const report=reports.docs[0],snapshot=report.data().contentSnapshot;
    assert.equal(report.data().path,`bibledeptProfiles/${author}`);assert.equal(snapshot.uid,author);assert.equal(snapshot.displayName,published.displayName);assert.equal(snapshot.photoData,published.photoData);
    assert.equal(snapshot.profileVersion,target.profileVersion);assert.deepEqual(Object.keys(snapshot).sort(),['displayName','photoData','profileVersion','uid']);
    await report.ref.update({status:'resolved',resolution:'Local staff-review fixture.'});
    await saveCommunityProfile(author,{...profile,displayName:'A changed profile',photoData:published.photoData,shareBadges:false});
    const changed=(await db.collection('bibledeptProfiles').doc(author).get()).data()!;
    assert.notEqual(changed.profileVersion,target.profileVersion);
    await assert.rejects(reportCommunityContent(reader,{profileUid:author,profileVersion:'a'.repeat(32),reason:'An unreported stale version.'}),{code:'failed-precondition'});
    await reportCommunityContent(reader,{profileUid:author,profileVersion:changed.profileVersion,reason:'A fresh report for the changed profile.'});
    assert.equal((await db.collection('bibledeptCommunityReports').where('uid','==',reader).get()).size,2);
    await saveCommunityProfile(author,{...profile,joined:false});
    await reportCommunityContent(reader,{...target,reason:'Lost acknowledgement retry after removal.'});
    await reportCommunityContent(reader,{profileUid:author,profileVersion:changed.profileVersion,reason:'Second version retry after removal.'});
    const retained=(await report.ref.get()).data()!;
    assert.equal(retained.status,'resolved');assert.equal(retained.resolution,'Local staff-review fixture.');assert.deepEqual(retained.contentSnapshot,snapshot);
  }finally{
    const reports=await db.collection('bibledeptCommunityReports').where('uid','==',reader).get();for(const report of reports.docs)await report.ref.delete();
    await cleanup(author,reader,outside);
  }
});

test('account cleanup removes published data and late triggers cannot recreate achievements',async()=>{
  const user=uid('delete');
  await saveCommunityProfile(user,profile);
  const group=await createCircle(user,{name:'Disposable circle',requestId:uid('create')});
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
    const group=await createCircle(owner,{name:'History cleanup',requestId:uid('create')});groupId=group.id;
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

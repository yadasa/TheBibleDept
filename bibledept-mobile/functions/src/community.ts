import { FieldValue, getFirestore, QueryDocumentSnapshot, Timestamp, Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { createHash, randomBytes } from 'node:crypto';
import { ACHIEVEMENTS, achievedIds, cleanCircleName, cleanMessage, communityNamePrefixes, completedPlanDays, EMPTY_METRICS, validateCommunityProfile, validDocumentId } from '../../shared/community';
import { currentStreak, emptyStreak, localDate, validZone } from '../../shared/habits';
import { userPath } from './streaks';
import { normalizeProfilePhoto } from './profilePhoto';

const profiles=()=>getFirestore().collection('bibledeptProfiles');
const activity=()=>getFirestore().collection('bibledeptActivity');
const circles=()=>getFirestore().collection('bibledeptCircles');
const codes=()=>getFirestore().collection('bibledeptCircleCodes');
const circleRegistry=()=>getFirestore().collection('bibledeptCircleRegistry');
function profileIdentity(prior:Record<string,unknown>|undefined,displayName:string,photoData:string|null) {
  const same=prior?.displayName===displayName&&(prior?.photoData||null)===photoData;
  const profileVersion=same&&typeof prior?.profileVersion==='string'&&/^[a-f0-9]{32}$/.test(prior.profileVersion)?prior.profileVersion:randomBytes(16).toString('hex');
  return {displayName,photoData,profileVersion};
}
function invalid(message:string):never {throw new HttpsError('invalid-argument',message);}
function documentId(value:unknown):string {if(!validDocumentId(value))invalid('This item could not be found.');return value;}
function memberError():never {throw new HttpsError('permission-denied','Join the community to continue.');}
async function requireCommunity(uid:string) {
  const settings=(await userPath(uid).collection('settings').doc('community').get()).data();
  if(!settings?.joined)memberError();
  return settings;
}

/** Public projections and award records are always produced by the server. */
export async function reconcileCommunity(uid:string,now=Date.now()) {
  const root=userPath(uid);
  return getFirestore().runTransaction(async tx=>{
    const [prefs,summary,plan,habit,earned,deleted,highlights,reflections,memberships,encouraged,published]=await Promise.all([
      tx.get(root.collection('settings').doc('community')),
      tx.get(root.collection('stats').doc('streak')),
      tx.get(root.collection('settings').doc('planProgress')),
      tx.get(root.collection('settings').doc('readingHabit')),
      tx.get(root.collection('achievements')),
      tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid)),
      tx.get(root.collection('annotations').where('color','!=','none').count()),
      tx.get(root.collection('annotations').where('comment','!=','').count()),
      tx.get(root.collection('circles').count()),
      tx.get(root.collection('encouragedReaders').count()),
      tx.get(profiles().doc(uid)),
    ]);
    if(deleted.exists)return {metrics:EMPTY_METRICS,badgeIds:[]};
    const settings=prefs.data(),streak={...emptyStreak,...summary.data()};
    const metrics={...EMPTY_METRICS,readingDays:streak.totalReadingDays,longestStreak:streak.longest,planDays:completedPlanDays(plan.data()),
      highlights:highlights.data().count,reflections:reflections.data().count,circles:memberships.data().count,encouragements:encouraged.data().count};
    const existing=new Set(earned.docs.map(d=>d.id));
    const newIds=achievedIds(metrics).filter(id=>!existing.has(id));
    const badgeIds=[...existing,...newIds].filter(id=>ACHIEVEMENTS.some(a=>a.id===id));
    const stamp=Timestamp.fromMillis(now);
    tx.set(root.collection('stats').doc('achievements'),{...metrics,updatedAt:stamp});
    for(const id of newIds)tx.create(root.collection('achievements').doc(id),{earnedAt:stamp});
    if(settings?.joined) {
      const zone=habit.data()?.timeZone;
      tx.set(profiles().doc(uid),{...profileIdentity(published.data(),settings.displayName,settings.photoData||null),namePrefixes:communityNamePrefixes(settings.displayName),
        streak:settings.shareStreak&&validZone(zone)?currentStreak(streak,localDate(now,zone)):null,
        lastReadingDate:settings.shareStreak?streak.lastQualifiedDate:null,timeZone:settings.shareStreak&&validZone(zone)?zone:null,
        badgeIds:settings.shareBadges?badgeIds:[],planDays:settings.shareBadges?metrics.planDays:null,updatedAt:stamp});
      if(settings.shareBadges&&newIds.length) {
        // One celebration per refresh avoids flooding the feed during migration.
        const badgeId=newIds.includes('six-percent-club')?'six-percent-club':newIds[newIds.length-1];
        tx.create(activity().doc(),{uid,kind:'achievement',badgeId,cheerCount:0,createdAt:stamp});
      }
    } else tx.delete(profiles().doc(uid));
    return {metrics,badgeIds};
  });
}

export async function saveCommunityProfile(uid:string,input:unknown,now=Date.now()) {
  let value:ReturnType<typeof validateCommunityProfile>;
  try{value=validateCommunityProfile(input);}catch(e){invalid((e as Error).message);}
  let photoWork:Promise<string|null>|undefined;
  await getFirestore().runTransaction(async tx=>{
    const ref=userPath(uid).collection('settings').doc('community');
    const prior=await tx.get(ref);
    const events=await tx.get(activity().where('uid','==',uid));
    const deleted=await tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid));
    const published=await tx.get(profiles().doc(uid));
    if(deleted.exists)throw new HttpsError('unauthenticated','This account is no longer available.');
    // Existing thumbnails were already decoded and stripped by this server.
    // Preference edits must not repeatedly recompress the same JPEG, and a
    // transaction retry must reuse the first normalization result.
    let photoData=value.photoData;
    if(photoData!==null&&photoData!==prior.data()?.photoData) {
      try{photoData=await(photoWork??=normalizeProfilePhoto(value.photoData));}catch(e){invalid((e as Error).message);}
    }
    tx.set(ref,{...value!,photoData,blockedUids:prior.data()?.blockedUids||[],updatedAt:Timestamp.fromMillis(now)});
    // Withdrawing sharing removes previous celebrations as well as the profile.
    if(!value.joined||!value.shareBadges)for(const event of events.docs)tx.delete(event.ref);
    if(!value.joined)tx.delete(profiles().doc(uid));
    else {
      // Fence sharing in the preferences transaction. A failed metric refresh must
      // never leave previously shared fields visible after consent is withdrawn.
      const visible=published.data();
      tx.set(profiles().doc(uid),{...profileIdentity(visible,value.displayName,photoData),namePrefixes:communityNamePrefixes(value.displayName),
        streak:value.shareStreak?visible?.streak??null:null,
        lastReadingDate:value.shareStreak?visible?.lastReadingDate??null:null,
        timeZone:value.shareStreak?visible?.timeZone??null:null,
        badgeIds:value.shareBadges?visible?.badgeIds??[]:[],
        planDays:value.shareBadges?visible?.planDays??null:null,updatedAt:Timestamp.fromMillis(now)});
      if(!prior.data()?.joined)tx.create(activity().doc(),{uid,kind:'joined',badgeId:null,cheerCount:0,createdAt:Timestamp.fromMillis(now)});
    }
  });
  return reconcileCommunity(uid,now);
}

export async function createCircle(uid:string,input:unknown,now=Date.now()) {
  const value=input as {name?:unknown;requestId?:unknown};
  let name:string;try{name=cleanCircleName(value?.name);}catch(e){invalid((e as Error).message);}
  const requestId=value?.requestId;
  if(!validDocumentId(requestId))invalid('Reopen circle creation and try again.');
  const ref=circles().doc(requestId),code=randomBytes(6).toString('hex').toUpperCase(),receipt=userPath(uid).collection('circleCreations').doc(requestId),registration=circleRegistry().doc(requestId);
  await getFirestore().runTransaction(async tx=>{
    const [settings,own,deleted,prior,created,registered]=await Promise.all([tx.get(userPath(uid).collection('settings').doc('community')),tx.get(userPath(uid).collection('circles').limit(20)),tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid)),tx.get(ref),tx.get(receipt),tx.get(registration)]);
    if(deleted.exists)throw new HttpsError('unauthenticated','This account is no longer available.');
    if(!settings.data()?.joined)memberError();
    if(created.exists) {
      if(created.data()?.name!==name)throw new HttpsError('already-exists','This circle request used another name. Open the original circle or start a different one.');
      if(!prior.exists)throw new HttpsError('failed-precondition','That circle was already created and later closed. Start a new circle.');
      if(!prior.data()?.memberIds.includes(uid))throw new HttpsError('failed-precondition','That circle was already created. Use its current invitation code to rejoin.');
      if(!registered.exists)tx.create(registration,{registeredAt:Timestamp.fromMillis(now)});
      return;
    }
    if(prior.exists)throw new HttpsError('already-exists','This circle request is already in use. Start a different circle.');
    if(registered.exists)throw new HttpsError('already-exists','This circle is no longer available. Start a different circle.');
    if(own.size>=20)throw new HttpsError('resource-exhausted','You can belong to up to 20 circles.');
    const data={name,code,memberCount:1,createdBy:uid};
    tx.create(ref,{...data,memberIds:[uid],createdAt:Timestamp.fromMillis(now)});
    tx.create(codes().doc(code),{circleId:ref.id});
    tx.create(userPath(uid).collection('circles').doc(ref.id),data);
    tx.create(receipt,{circleId:ref.id,name,createdAt:Timestamp.fromMillis(now)});
    tx.create(registration,{registeredAt:Timestamp.fromMillis(now)});
  });
  await reconcileCommunity(uid,now);
  return {id:ref.id};
}

export async function joinCircle(uid:string,input:unknown,now=Date.now()) {
  const raw=(input as {code?:unknown})?.code;
  const code=typeof raw==='string'?raw.replace(/[\s-]/g,'').toUpperCase():'';
  if(!/^[A-F0-9]{12}$/.test(code))invalid('Enter the 12-character circle invitation code.');
  const result=await getFirestore().runTransaction(async tx=>{
    const [invitation,settings,own,deleted]=await Promise.all([tx.get(codes().doc(code)),tx.get(userPath(uid).collection('settings').doc('community')),tx.get(userPath(uid).collection('circles').limit(20)),tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid))]);
    if(deleted.exists)throw new HttpsError('unauthenticated','This account is no longer available.');
    if(!settings.data()?.joined)memberError();
    if(!invitation.exists)throw new HttpsError('not-found','That invitation code wasn’t found. Check it with your circle.');
    const ref=circles().doc(invitation.data()!.circleId),snapshot=await tx.get(ref),group=snapshot.data();
    if(!group)throw new HttpsError('not-found','This circle is no longer available.');
    if(group.memberIds.includes(uid))return {id:ref.id};
    if(group.memberIds.length>=50)throw new HttpsError('resource-exhausted','This circle has reached 50 members.');
    if(own.size>=20)throw new HttpsError('resource-exhausted','You can belong to up to 20 circles.');
    const count=group.memberIds.length+1;
    tx.update(ref,{memberIds:[...group.memberIds,uid],memberCount:count});
    tx.create(userPath(uid).collection('circles').doc(ref.id),{name:group.name,code,memberCount:count,createdBy:group.createdBy});
    return {id:ref.id};
  });
  await reconcileCommunity(uid,now);
  return result;
}

export async function leaveCircle(uid:string,input:unknown) {
  const id=documentId((input as {circleId?:unknown})?.circleId);
  await getFirestore().runTransaction(async tx=>{
    const ref=circles().doc(id),snapshot=await tx.get(ref),data=snapshot.data();
    tx.delete(userPath(uid).collection('circles').doc(id));
    if(!data||!data.memberIds.includes(uid))return;
    const members=(data.memberIds as string[]).filter(member=>member!==uid);
    if(members.length) {
      const createdBy=data.createdBy===uid?members[0]:data.createdBy;
      tx.update(ref,{memberIds:members,memberCount:members.length,createdBy});
      for(const member of members)tx.set(userPath(member).collection('circles').doc(id),{name:data.name,code:data.code,memberCount:members.length,createdBy},{merge:true});
    }
    else {tx.delete(ref);tx.delete(codes().doc(data.code));tx.set(circleRegistry().doc(id),{closedAt:Timestamp.now()},{merge:true});}
  });
  // Empty circles have no remaining readers; remove their message history.
  if(!(await circles().doc(id).get()).exists)await getFirestore().recursiveDelete(circles().doc(id));
  return {left:true};
}

async function requireCircleOwner(tx:Transaction,uid:string,id:string) {
  const [settings,circle,deleted]=await Promise.all([
    tx.get(userPath(uid).collection('settings').doc('community')),tx.get(circles().doc(id)),
    tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid)),
  ]);
  if(deleted.exists)throw new HttpsError('unauthenticated','This account is no longer available.');
  const group=circle.data();
  if(!settings.data()?.joined||!group?.memberIds.includes(uid)||group.createdBy!==uid)throw new HttpsError('permission-denied','Only the circle owner can manage this circle.');
  return group as {name:string;code:string;memberIds:string[];createdBy:string};
}
function invitationVersion(value:unknown):string {
  if(typeof value!=='string'||!/^[A-F0-9]{12}$/.test(value))invalid('Reopen circle details and try again.');
  return value;
}

export async function renameCircle(uid:string,input:unknown) {
  const data=input as {circleId?:unknown;name?:unknown},id=documentId(data?.circleId);
  let name:string;try{name=cleanCircleName(data.name);}catch(e){invalid((e as Error).message);}
  await getFirestore().runTransaction(async tx=>{
    const group=await requireCircleOwner(tx,uid,id);
    tx.update(circles().doc(id),{name:name!});
    for(const member of group.memberIds)tx.set(userPath(member).collection('circles').doc(id),{name:name!,code:group.code,memberCount:group.memberIds.length,createdBy:group.createdBy},{merge:true});
  });return {renamed:true};
}

export async function rotateCircleInvitation(uid:string,input:unknown) {
  const data=input as {circleId?:unknown;expectedCode?:unknown},id=documentId(data?.circleId),expected=invitationVersion(data?.expectedCode),next=randomBytes(6).toString('hex').toUpperCase();
  return getFirestore().runTransaction(async tx=>{
    const group=await requireCircleOwner(tx,uid,id);
    // A retry of an already-rotated invitation must not invalidate it again.
    if(group.code!==expected)return {code:group.code};
    if((await tx.get(codes().doc(next))).exists)throw new HttpsError('aborted','The invitation couldn’t be replaced. Please try again.');
    tx.create(codes().doc(next),{circleId:id});tx.delete(codes().doc(group.code));
    tx.update(circles().doc(id),{code:next});
    for(const member of group.memberIds)tx.set(userPath(member).collection('circles').doc(id),{name:group.name,code:next,memberCount:group.memberIds.length,createdBy:group.createdBy},{merge:true});
    return {code:next};
  });
}

export async function removeCircleMember(uid:string,input:unknown) {
  const data=input as {circleId?:unknown;uid?:unknown;expectedCode?:unknown},id=documentId(data?.circleId),target=documentId(data?.uid),expected=invitationVersion(data?.expectedCode),next=randomBytes(6).toString('hex').toUpperCase();
  if(target===uid)invalid('Use Leave circle to transfer ownership and leave.');
  return getFirestore().runTransaction(async tx=>{
    const group=await requireCircleOwner(tx,uid,id);
    if(!group.memberIds.includes(target))return {removed:true,code:group.code};
    if(group.code!==expected)throw new HttpsError('failed-precondition','This circle changed. Review the members and try again.');
    if((await tx.get(codes().doc(next))).exists)throw new HttpsError('aborted','The invitation couldn’t be replaced. Please try again.');
    const members=group.memberIds.filter(member=>member!==target);
    tx.create(codes().doc(next),{circleId:id});tx.delete(codes().doc(group.code));
    tx.update(circles().doc(id),{memberIds:members,memberCount:members.length,code:next});
    tx.delete(userPath(target).collection('circles').doc(id));tx.delete(userPath(target).collection('circleReads').doc(id));
    for(const member of members)tx.set(userPath(member).collection('circles').doc(id),{name:group.name,memberCount:members.length,code:next,createdBy:group.createdBy},{merge:true});
    return {removed:true,code:next};
  });
}

export async function sendCircleMessage(uid:string,input:unknown,now=Date.now()) {
  const data=input as {circleId?:unknown;messageId?:unknown;text?:unknown},id=documentId(data?.circleId),messageId=documentId(data?.messageId);
  let text:string;try{text=cleanMessage(data.text);}catch(e){invalid((e as Error).message);}
  return getFirestore().runTransaction(async tx=>{
    const ref=circles().doc(id),message=ref.collection('bibledeptMessages').doc(messageId);
    const [settings,group,prior,state,deleted,tombstone]=await Promise.all([tx.get(userPath(uid).collection('settings').doc('community')),tx.get(ref),tx.get(message),tx.get(userPath(uid).collection('settings').doc('communityRate')),tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid)),tx.get(ref.collection('bibledeptMessageTombstones').doc(messageId))]);
    if(deleted.exists)throw new HttpsError('unauthenticated','This account is no longer available.');
    if(!settings.data()?.joined||!group.data()?.memberIds.includes(uid))throw new HttpsError('permission-denied','You must be a circle member to send messages.');
    if(tombstone.exists)throw new HttpsError('failed-precondition','That message was deleted. Keep the text as a new draft if you want to post it again.');
    if(prior.exists) {
      if(prior.data()?.uid!==uid||prior.data()?.text!==text)throw new HttpsError('already-exists','This message ID is already in use.');
      return {id:messageId};
    }
    if(now-(state.data()?.lastMessageAt?.toMillis()||0)<3000)throw new HttpsError('resource-exhausted','Give your last message a moment to arrive, then try again.');
    tx.create(message,{uid,text:text!,createdAt:Timestamp.fromMillis(now)});
    tx.update(ref,{lastMessageId:messageId,lastSenderUid:uid,lastMessageAt:Timestamp.fromMillis(now)});
    tx.set(userPath(uid).collection('settings').doc('communityRate'),{lastMessageAt:Timestamp.fromMillis(now)},{merge:true});
    return {id:messageId};
  });
}

export async function deleteCircleMessage(uid:string,input:unknown) {
  const data=input as {circleId?:unknown;messageId?:unknown},id=documentId(data?.circleId),messageId=documentId(data?.messageId);
  await getFirestore().runTransaction(async tx=>{
    const group=circles().doc(id),ref=group.collection('bibledeptMessages').doc(messageId);
    const [message,circle,latest]=await Promise.all([tx.get(ref),tx.get(group),tx.get(group.collection('bibledeptMessages').orderBy('createdAt','desc').limit(2))]);
    if(message.exists&&message.data()?.uid!==uid)throw new HttpsError('permission-denied','You can only delete your own messages.');
    tx.delete(ref);
    if(message.exists&&circle.exists)tx.set(group.collection('bibledeptMessageTombstones').doc(messageId),{deletedAt:Timestamp.now()});
    if(circle.exists&&message.exists) {
      const remaining=latest.docs.find(item=>item.id!==messageId);
      tx.update(group,{lastMessageId:remaining?.id||null,lastSenderUid:remaining?.data().uid||null,lastMessageAt:remaining?.data().createdAt||null});
    }
  });return {deleted:true};
}

export async function cheerMilestone(uid:string,input:unknown,now=Date.now()) {
  const id=documentId((input as {activityId?:unknown})?.activityId);
  await getFirestore().runTransaction(async tx=>{
    const ref=activity().doc(id),cheer=ref.collection('cheers').doc(uid);
    const [settings,event,prior,deleted]=await Promise.all([tx.get(userPath(uid).collection('settings').doc('community')),tx.get(ref),tx.get(cheer),tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid))]);
    if(deleted.exists)throw new HttpsError('unauthenticated','This account is no longer available.');
    if(!settings.data()?.joined)memberError();
    if(!event.exists)throw new HttpsError('not-found','This milestone is no longer shared.');
    const author=event.data()!.uid;
    const publisher=await tx.get(profiles().doc(author));
    if(!publisher.exists)throw new HttpsError('not-found','This reader is no longer sharing.');
    if(author===uid)invalid('Choose another reader’s milestone to encourage.');
    if(prior.exists)return;
    tx.create(cheer,{createdAt:Timestamp.fromMillis(now)});
    tx.update(ref,{cheerCount:FieldValue.increment(1)});
    tx.set(userPath(uid).collection('encouragedReaders').doc(author),{encouragedAt:Timestamp.fromMillis(now)});
    tx.set(userPath(uid).collection('cheeredMilestones').doc(id),{createdAt:Timestamp.fromMillis(now)});
  });
  return reconcileCommunity(uid,now);
}

export async function blockCommunityReader(uid:string,input:unknown) {
  const target=documentId((input as {uid?:unknown})?.uid);
  if(target===uid)invalid('You can only hide other readers.');
  await getFirestore().runTransaction(async tx=>{
    const ref=userPath(uid).collection('settings').doc('community'),snapshot=await tx.get(ref),data=snapshot.data();
    if(!data?.joined)memberError();
    const blocked=new Set<string>(data.blockedUids||[]);
    if(blocked.size>=200&&!blocked.has(target))throw new HttpsError('resource-exhausted','You have reached the limit of hidden readers.');
    blocked.add(target);tx.update(ref,{blockedUids:[...blocked]});
  });return {blocked:true};
}

export async function unhideCommunityReaders(uid:string) {
  await requireCommunity(uid);
  await userPath(uid).collection('settings').doc('community').update({blockedUids:[]});
  return {unhidden:true};
}

export async function reportCommunityContent(uid:string,input:unknown,now=Date.now()) {
  const data=input as {profileUid?:unknown;profileVersion?:unknown;activityId?:unknown;circleId?:unknown;messageId?:unknown;reason?:unknown};
  if(!data||typeof data.reason!=='string'||!data.reason.trim()||data.reason.length>500)invalid('Tell us why you’re reporting this (up to 500 characters).');
  const reason=data.reason.trim();
  let path:string,circleId:string|undefined;
  if(data.profileUid) {
    path=`bibledeptProfiles/${documentId(data.profileUid)}`;
    if(typeof data.profileVersion!=='string'||!/^[a-f0-9]{32}$/.test(data.profileVersion))invalid('Reopen this profile before reporting its name or photo.');
  }
  else if(data.activityId)path=`bibledeptActivity/${documentId(data.activityId)}`;
  else {
    circleId=documentId(data.circleId);
    path=`bibledeptCircles/${circleId}/bibledeptMessages/${documentId(data.messageId)}`;
  }
  const id=createHash('sha256').update(`${uid}\0${path}${data.profileUid?`\0${data.profileVersion}`:''}`).digest('hex'),ref=getFirestore().collection('bibledeptCommunityReports').doc(id);
  await getFirestore().runTransaction(async tx=>{
    const [prior,settings,deleted,item,group]=await Promise.all([
      tx.get(ref),tx.get(userPath(uid).collection('settings').doc('community')),
      tx.get(getFirestore().collection('bibledeptDeletedAccounts').doc(uid)),tx.get(getFirestore().doc(path)),
      circleId?tx.get(circles().doc(circleId)):Promise.resolve(null),
    ]);
    if(deleted.exists)throw new HttpsError('unauthenticated','This account is no longer available.');
    // A lost acknowledgement remains recoverable even if content was later removed.
    if(prior.exists)return;
    if(!settings.data()?.joined)memberError();
    if(circleId&&!group?.data()?.memberIds.includes(uid))throw new HttpsError('permission-denied','You must belong to this circle.');
    if(!item.exists)throw new HttpsError('not-found','This item is no longer available.');
    const content=item.data()!;
    if(data.profileUid&&content.profileVersion!==data.profileVersion)throw new HttpsError('failed-precondition','This profile changed. Review its current name and photo, then try again.');
    const snapshot=data.profileUid?{uid:data.profileUid,profileVersion:content.profileVersion,displayName:String(content.displayName||'').slice(0,80),photoData:typeof content.photoData==='string'?content.photoData.slice(0,60000):null}:circleId?{uid:content.uid,text:String(content.text||'').slice(0,2000)}:{uid:content.uid,kind:content.kind,badgeId:content.badgeId||null};
    tx.create(ref,{uid,path,reason,contentSnapshot:snapshot,createdAt:Timestamp.fromMillis(now),status:'open'});
  });
  return {reported:true};
}

export async function deleteCommunityAccount(uid:string) {
  // Delayed Firestore triggers must not recreate records after account deletion.
  await getFirestore().collection('bibledeptDeletedAccounts').doc(uid).set({deletedAt:Timestamp.now()});
  const memberships=await userPath(uid).collection('circles').get();
  for(const membership of memberships.docs)await leaveCircle(uid,{circleId:membership.id});
  await getFirestore().recursiveDelete(profiles().doc(uid));
  const events=await activity().where('uid','==',uid).get();
  for(const event of events.docs)await getFirestore().recursiveDelete(event.ref);
  let cursor:QueryDocumentSnapshot|undefined;
  for(;;) {
    // A live-room deletion also writes one content-free tombstone. Keep both
    // writes plus the metadata update within a 500-write transaction.
    const lookup=getFirestore().collectionGroup('bibledeptMessages').where('uid','==',uid).limit(200);
    const messages=await (cursor?lookup.startAfter(cursor):lookup).get();
    if(messages.empty)break;
    cursor=messages.docs[messages.size-1];
    const groups=new Map<string,QueryDocumentSnapshot[]>();
    for(const message of messages.docs) {
      // Collection-group names and parent paths both fence this shared project.
      if(!/^bibledeptCircles\/[^/]+\/bibledeptMessages\/[^/]+$/.test(message.ref.path))continue;
      const id=message.ref.parent.parent!.id;
      groups.set(id,[...(groups.get(id)||[]),message]);
    }
    for(const [id,owned] of groups)await getFirestore().runTransaction(async tx=>{
      const group=circles().doc(id);
      const [circle,latest,current]=await Promise.all([tx.get(group),tx.get(group.collection('bibledeptMessages').orderBy('createdAt','desc').limit(owned.length+1)),tx.getAll(...owned.map(message=>message.ref))]);
      const confirmed=current.filter(message=>message.exists&&message.data()?.uid===uid),removed=new Set(confirmed.map(message=>message.id));
      for(const message of confirmed) {
        tx.delete(message.ref);
        if(circle.exists)tx.set(group.collection('bibledeptMessageTombstones').doc(message.id),{deletedAt:Timestamp.now()});
      }
      if(circle.exists) {
        const remaining=latest.docs.find(message=>!removed.has(message.id));
        tx.update(group,{lastMessageId:remaining?.id||null,lastSenderUid:remaining?.data().uid||null,lastMessageAt:remaining?.data().createdAt||null});
      }
    });
  }
}

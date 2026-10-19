import { getFirestore, Timestamp, FieldPath } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { randomUUID } from 'node:crypto';
import { addDay, chapterReference, Completion, emptyStreak, localDate, milestones, Receipt, sameCompletion, Streak, summarizeDays, validDate, validZone, validateCompletion } from '../../shared/habits';
export const userPath=(uid:string)=>getFirestore().collection('bibledeptUsers').doc(uid);

/** Setup is resumable. Completions stay blocked until all legacy pages are imported. */
export async function initializeHabit(uid:string,zone:unknown,now=Date.now()){
  if(!validZone(zone))throw new HttpsError('invalid-argument','Choose a valid IANA time zone.');
  const root=userPath(uid),settings=root.collection('settings').doc('readingHabit'),migrationId=randomUUID();
  const already=await getFirestore().runTransaction(async tx=>{
    const snapshot=await tx.get(settings),data=snapshot.data();
    if(data&&data.timeZone!==zone)throw new HttpsError('failed-precondition','Your reading time zone is already confirmed.');
    if(data?.migrationComplete)return true;
    if(data?.migrationLeaseUntil?.toMillis()>now)throw new HttpsError('aborted','Your reading history is being prepared. Retry in a few minutes if setup was interrupted.');
    tx.set(settings,{timeZone:zone,confirmedAt:data?.confirmedAt||Timestamp.fromMillis(now),qualificationVersion:1,migrationComplete:false,migrationId,migrationLeaseUntil:Timestamp.fromMillis(now+180000)},{merge:true});
    return false;
  });
  if(already)return {timeZone:zone};
  const days:string[]=[];let after:string|undefined;
  for(;;){
    let query=root.collection('readings').orderBy(FieldPath.documentId()).limit(400);
    if(after)query=query.startAfter(after);
    const page=await query.get();
    if(page.empty)break;
    const batch=getFirestore().batch();
    for(const doc of page.docs){
      const legacy=doc.data();
      if(!validDate(doc.id)||doc.id>localDate(now,zone)||!legacy.completedAt?.toMillis||typeof legacy.reference!=='string'||!['web','kjv'].includes(legacy.translation))continue;
      days.push(doc.id);
      batch.set(root.collection('habitDays').doc(doc.id),{localDate:doc.id,timeZone:zone,firstCompletedAt:legacy.completedAt,firstSessionId:null,qualificationVersion:1,provenance:'legacy_self_reported'});
    }
    await batch.commit();after=page.docs[page.docs.length-1].id;
    if(page.size<400)break;
  }
  await getFirestore().runTransaction(async tx=>{
    const current=await tx.get(settings);
    if(current.data()?.migrationComplete)return;
    if(current.data()?.migrationId!==migrationId)throw new HttpsError('aborted','Reading setup was restarted. Please retry.');
    tx.set(root.collection('stats').doc('streak'),{...summarizeDays(days),updatedAt:Timestamp.fromMillis(now),qualificationVersion:1});
    tx.update(settings,{migrationComplete:true});
  });
  return {timeZone:zone};
}

export async function recordCompletion(uid:string,input:unknown,now=Date.now()):Promise<Receipt>{
  let data:Completion;
  try{data=validateCompletion(input);}catch(error){throw new HttpsError('invalid-argument',(error as Error).message);}
  const root=userPath(uid),session=root.collection('readingSessions').doc(data.sessionId);
  return getFirestore().runTransaction(async tx=>{
    // Receipt lookup precedes date guards: an acknowledged-late retry keeps its original date.
    const prior=await tx.get(session);
    if(prior.exists){
      const saved=prior.data()!;
      if(!sameCompletion(saved.request,data))throw new HttpsError('already-exists','This completion ID has already been used for a different reading.');
      return saved.receipt as Receipt;
    }
    const [settings,summary]=await Promise.all([tx.get(root.collection('settings').doc('readingHabit')),tx.get(root.collection('stats').doc('streak'))]);
    const prefs=settings.data();
    if(!prefs?.migrationComplete||!validZone(prefs.timeZone))throw new HttpsError('failed-precondition','Confirm your reading time zone in Account → Settings first.');
    const today=localDate(now,prefs.timeZone);
    if(today!==data.expectedHabitDate)throw new HttpsError('failed-precondition','This reading day has ended. Your pending reading was not credited to another day.',{reason:'expired_day'});
    const dayRef=root.collection('habitDays').doc(today),day=await tx.get(dayRef);
    const old=(summary.data()||emptyStreak) as Streak;
    const streak=day.exists?old:addDay(old,today);
    const receipt:Receipt={sessionId:data.sessionId,creditedDate:today,awardedNewDay:!day.exists,current:streak.current,longest:streak.longest,totalReadingDays:streak.totalReadingDays,milestone:!day.exists&&milestones.includes(streak.current)?streak.current:null};
    const stamp=Timestamp.fromMillis(now);
    tx.create(session,{request:data,receipt,receivedAt:stamp,qualificationVersion:1});
    if(!day.exists){
      tx.create(dayRef,{localDate:today,timeZone:prefs.timeZone,firstCompletedAt:stamp,firstSessionId:data.sessionId,qualificationVersion:1,provenance:'chapter_completion'});
      tx.set(root.collection('stats').doc('streak'),{...streak,updatedAt:stamp,qualificationVersion:1});
      tx.set(root.collection('reminderState').doc('current'),{inactivityEpisodeId:today,comebackHandoffs:0,lastComebackHandoffAt:null,episodePaused:false,nextEvaluationAt:Timestamp.fromMillis(now+900000)},{merge:true});
    }
    tx.set(root.collection('readings').doc(today),{reference:chapterReference(data.chapterId),translation:data.translation,completedAt:stamp});
    return receipt;
  });
}

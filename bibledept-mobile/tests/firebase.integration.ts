import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth, signOut, PhoneAuthCredential, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, terminate, updateDoc } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { localDate } from '../shared/habits';

test('local Firebase email auth and private reading rules work together', async () => {
  const app = initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`test-${Date.now()}`);
  const auth = getAuth(app), db = getFirestore(app);
  connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});
  connectFirestoreEmulator(db,'127.0.0.1',18080);
  try {
    const {user} = await createUserWithEmailAndPassword(auth,`reader-${Date.now()}@bibledept.test`,'Local-test-2468!');
    const functions=getFunctions(app,'us-central1');connectFunctionsEmulator(functions,'127.0.0.1',15001);
    const today=localDate(Date.now(),'America/Chicago'),reading = doc(db,'bibledeptUsers',user.uid,'readings',today);
    await assert.rejects(setDoc(reading,{reference:'Luke 1',translation:'web',completedAt:serverTimestamp()}));
    await httpsCallable(functions,'configureReadingHabit')({timeZone:'America/Chicago'});
    await httpsCallable(functions,'completeReading')({sessionId:'12345678-1234-1234-1234-123456789012',chapterId:'LUK.1',translation:'web',source:'plan',planDay:1,expectedHabitDate:today});
    assert.equal((await getDoc(reading)).data()?.reference,'Luke 1');
    await assert.rejects(getDoc(doc(db,'bibledeptUsers','somebody-else','readings','today')),e=>(e as {code:string}).code==='permission-denied');
    await assert.rejects(setDoc(reading,{reference:'Luke 1',translation:'web',completedAt:serverTimestamp(),role:'admin'}),e=>(e as {code:string}).code==='permission-denied');
    for(const [collection,id] of [['stats','streak'],['habitDays',today],['settings','readingHabit'],['pushDevices','device'],['reminderState','current'],['notificationCampaigns','campaign']])await assert.rejects(setDoc(doc(db,'bibledeptUsers',user.uid,collection,id),{current:10000}),e=>(e as {code:string}).code==='permission-denied');
    const prayer = doc(db,'bibledeptUsers',user.uid,'prayers','test');
    await setDoc(prayer,{text:'A disposable local test prayer.',answered:false,createdAt:serverTimestamp()});
    await updateDoc(prayer,{answered:true});
    assert.equal((await getDoc(prayer)).data()?.answered,true);
    await assert.rejects(getDoc(doc(db,'bibledeptUsers','somebody-else','prayers','test')),e=>(e as {code:string}).code==='permission-denied');
    const note=doc(db,'bibledeptUsers',user.uid,'annotations','local-note');
    await setDoc(note,{chapterId:'LUK.1',reference:'Luke 1',translation:'web',verseStart:1,verseEnd:3,excerpt:'Local test excerpt.',color:'gold',comment:'A local reflection.',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    await updateDoc(note,{comment:'An updated reflection.',updatedAt:serverTimestamp()});
    assert.equal((await getDoc(note)).data()?.comment,'An updated reflection.');
    await assert.rejects(getDoc(doc(db,'bibledeptUsers','somebody-else','annotations','local-note')),e=>(e as {code:string}).code==='permission-denied');
    await assert.rejects(updateDoc(note,{verseEnd:999,updatedAt:serverTimestamp()}));
    await assert.rejects(updateDoc(note,{createdAt:new Date(0),updatedAt:serverTimestamp()}));
    await deleteDoc(note);
    await deleteDoc(prayer);
    await deleteDoc(reading);
    await deleteUser(user);
    await signOut(auth);
    await assert.rejects(httpsCallable(functions,'configureReadingHabit')({timeZone:'America/Chicago'}),e=>(e as {code:string}).code==='functions/unauthenticated');
  } finally { await terminate(db); await deleteApp(app); }
});

test('local phone verification signs the JavaScript SDK in without sending SMS',async()=>{
  const app=initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`phone-${Date.now()}`);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});
  try{
    const response=await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=demo-bibledept-api-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:'+16505550199'})});
    const {sessionInfo}=await response.json() as {sessionInfo:string};assert.ok(sessionInfo);
    const {verificationCodes}=await fetch('http://127.0.0.1:19099/emulator/v1/projects/demo-bibledept/verificationCodes').then(r=>r.json()) as {verificationCodes:{sessionInfo:string;code:string}[]};
    const code=verificationCodes.find(v=>v.sessionInfo===sessionInfo)?.code;assert.ok(code);
    const credential=PhoneAuthCredential.fromJSON({providerId:'phone',verificationId:sessionInfo,verificationCode:code});assert.ok(credential);
    const result=await signInWithCredential(auth,credential);
    assert.equal(result.user.phoneNumber,'+16505550199');
    await deleteUser(result.user);
  }finally{await deleteApp(app);}
});

test('community consent, server-owned badges, and circle membership are enforced by real client rules',async()=>{
  const suffix=Date.now(),apps=[0,1,2].map(index=>initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`community-rules-${suffix}-${index}`));
  const clients=apps.map(app=>{
    const auth=getAuth(app),db=getFirestore(app),functions=getFunctions(app,'us-central1');
    connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',18080);connectFunctionsEmulator(functions,'127.0.0.1',15001);
    return {auth,db,functions};
  });
  const call=(index:number,name:string,data:Record<string,unknown>)=>httpsCallable(clients[index].functions,name)({...data,expectedUid:clients[index].auth.currentUser!.uid});
  const denied=(error:unknown)=>(error as {code:string}).code==='permission-denied';
  try {
    for(let index=0;index<clients.length;index++)await createUserWithEmailAndPassword(clients[index].auth,`community-${suffix}-${index}@bibledept.test`,'Local-test-2468!');
    const author=clients[0].auth.currentUser!.uid,reader=clients[1].auth.currentUser!.uid;
    const profile={displayName:'Local community reader',photoData:null,joined:true,shareStreak:true,shareBadges:true};
    await call(0,'updateCommunityProfile',profile);
    await assert.rejects(getDoc(doc(clients[1].db,'bibledeptProfiles',author)),denied);
    await call(1,'updateCommunityProfile',{...profile,displayName:'Circle member'});
    assert.equal((await getDoc(doc(clients[1].db,'bibledeptProfiles',author))).data()?.displayName,profile.displayName);
    await assert.rejects(setDoc(doc(clients[0].db,'bibledeptProfiles',author),{...profile,badgeIds:['six-percent-club']}),denied);
    await assert.rejects(setDoc(doc(clients[0].db,'bibledeptUsers',author,'achievements','six-percent-club'),{earnedAt:serverTimestamp()}),denied);
    await assert.rejects(getDoc(doc(clients[1].db,'bibledeptUsers',author,'settings','community')),denied);
    const created=(await call(0,'createReadingCircle',{name:'Private local circle',requestId:crypto.randomUUID()})).data as {id:string};
    await assert.rejects(httpsCallable(clients[1].functions,'createReadingCircle')({name:'Wrong account request',requestId:crypto.randomUUID(),expectedUid:author}),error=>(error as {code:string}).code==='functions/failed-precondition');
    await assert.rejects(getDoc(doc(clients[0].db,'bibledeptUsers',author,'circleCreations',created.id)),denied);
    await assert.rejects(setDoc(doc(clients[0].db,'bibledeptUsers',author,'circleCreations','forged'),{circleId:created.id,name:'Forged receipt'}),denied);
    const circle=doc(clients[0].db,'bibledeptCircles',created.id),invite=(await getDoc(circle)).data()!;
    await assert.rejects(getDoc(doc(clients[1].db,'bibledeptCircles',created.id)),denied);
    await assert.rejects(call(1,'sendReadingCircleMessage',{circleId:created.id,messageId:'not-a-member',text:'Denied test message.'}),error=>{
      const value=error as {details?:{app?:string;message?:string}};
      return value.details?.app==='bibledept-community'&&value.details?.message==='You must be a circle member to send messages.';
    });
    await call(1,'joinReadingCircle',{code:invite.code});
    assert.equal((await getDoc(doc(clients[1].db,'bibledeptCircles',created.id))).data()?.memberCount,2);
    const messageId='client-rules-message';
    await assert.rejects(setDoc(doc(clients[0].db,'bibledeptCircles',created.id,'bibledeptMessages',messageId),{uid:author,text:'Direct write',createdAt:serverTimestamp()}),denied);
    await call(0,'sendReadingCircleMessage',{circleId:created.id,messageId,text:'A local circle message.'});
    assert.equal((await getDoc(doc(clients[1].db,'bibledeptCircles',created.id,'bibledeptMessages',messageId))).data()?.text,'A local circle message.');
    await call(2,'updateCommunityProfile',{...profile,displayName:'Outside reader'});
    await assert.rejects(getDoc(doc(clients[2].db,'bibledeptCircles',created.id,'bibledeptMessages',messageId)),denied);
    await call(1,'leaveReadingCircle',{circleId:created.id});
    await assert.rejects(getDoc(doc(clients[1].db,'bibledeptCircles',created.id,'bibledeptMessages',messageId)),denied);
    await call(1,'updateCommunityProfile',{...profile,joined:false});
    assert.equal((await getDoc(doc(clients[0].db,'bibledeptProfiles',reader))).exists(),false);
    await assert.rejects(getDoc(doc(clients[1].db,'bibledeptProfiles',author)),denied);
    await assert.rejects(getDoc(doc(clients[0].db,'bibledeptCommunityReports','anything')),denied);
  }finally{
    for(const client of clients){if(client.auth.currentUser)await deleteUser(client.auth.currentUser);await terminate(client.db);}
    await Promise.all(apps.map(app=>deleteApp(app)));
  }
});

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

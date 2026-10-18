import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth, signOut, PhoneAuthCredential, signInWithCredential } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, terminate, updateDoc } from 'firebase/firestore';

test('local Firebase email auth and private reading rules work together', async () => {
  const app = initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`test-${Date.now()}`);
  const auth = getAuth(app), db = getFirestore(app);
  connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  connectFirestoreEmulator(db,'127.0.0.1',8080);
  try {
    const {user} = await createUserWithEmailAndPassword(auth,`reader-${Date.now()}@bibledept.test`,'Local-test-2468!');
    const reading = doc(db,'bibledeptUsers',user.uid,'readings','today');
    await setDoc(reading,{reference:'Luke 1',translation:'web',completedAt:serverTimestamp()});
    assert.equal((await getDoc(reading)).data()?.reference,'Luke 1');
    await assert.rejects(getDoc(doc(db,'bibledeptUsers','somebody-else','readings','today')),e=>(e as {code:string}).code==='permission-denied');
    await assert.rejects(setDoc(reading,{reference:'Luke 1',translation:'web',completedAt:serverTimestamp(),role:'admin'}),e=>(e as {code:string}).code==='permission-denied');
    const prayer = doc(db,'bibledeptUsers',user.uid,'prayers','test');
    await setDoc(prayer,{text:'A disposable local test prayer.',answered:false,createdAt:serverTimestamp()});
    await updateDoc(prayer,{answered:true});
    assert.equal((await getDoc(prayer)).data()?.answered,true);
    await assert.rejects(getDoc(doc(db,'bibledeptUsers','somebody-else','prayers','test')),e=>(e as {code:string}).code==='permission-denied');
    await deleteDoc(prayer);
    await deleteDoc(reading);
    await deleteUser(user);
    await signOut(auth);
  } finally { await terminate(db); await deleteApp(app); }
});

test('local phone verification signs the JavaScript SDK in without sending SMS',async()=>{
  const app=initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`phone-${Date.now()}`);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  try{
    const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=demo-bibledept-api-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber:'+16505550199'})});
    const {sessionInfo}=await response.json() as {sessionInfo:string};assert.ok(sessionInfo);
    const {verificationCodes}=await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-bibledept/verificationCodes').then(r=>r.json()) as {verificationCodes:{sessionInfo:string;code:string}[]};
    const code=verificationCodes.find(v=>v.sessionInfo===sessionInfo)?.code;assert.ok(code);
    const credential=PhoneAuthCredential.fromJSON({providerId:'phone',verificationId:sessionInfo,verificationCode:code});assert.ok(credential);
    const result=await signInWithCredential(auth,credential);
    assert.equal(result.user.phoneNumber,'+16505550199');
    await deleteUser(result.user);
  }finally{await deleteApp(app);}
});

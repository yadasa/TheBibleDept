import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, terminate, updateDoc } from 'firebase/firestore';

test('local Firebase email auth and private reading rules work together', async () => {
  const app = initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`test-${Date.now()}`);
  const auth = getAuth(app), db = getFirestore(app);
  connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  connectFirestoreEmulator(db,'127.0.0.1',8080);
  try {
    const {user} = await createUserWithEmailAndPassword(auth,`reader-${Date.now()}@bibledept.test`,'Local-test-2468!');
    const reading = doc(db,'users',user.uid,'readings','today');
    await setDoc(reading,{reference:'Luke 1',translation:'web',completedAt:serverTimestamp()});
    assert.equal((await getDoc(reading)).data()?.reference,'Luke 1');
    await assert.rejects(getDoc(doc(db,'users','somebody-else','readings','today')),e=>(e as {code:string}).code==='permission-denied');
    await assert.rejects(setDoc(reading,{reference:'Luke 1',translation:'web',completedAt:serverTimestamp(),role:'admin'}),e=>(e as {code:string}).code==='permission-denied');
    const prayer = doc(db,'users',user.uid,'prayers','test');
    await setDoc(prayer,{text:'A disposable local test prayer.',answered:false,createdAt:serverTimestamp()});
    await updateDoc(prayer,{answered:true});
    assert.equal((await getDoc(prayer)).data()?.answered,true);
    await assert.rejects(getDoc(doc(db,'users','somebody-else','prayers','test')),e=>(e as {code:string}).code==='permission-denied');
    await deleteDoc(prayer);
    await deleteDoc(reading);
    await deleteUser(user);
    await signOut(auth);
  } finally { await terminate(db); await deleteApp(app); }
});

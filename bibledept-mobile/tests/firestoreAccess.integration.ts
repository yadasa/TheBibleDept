import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,collection,query,where,orderBy,getDocs,getDoc,doc,setDoc,serverTimestamp,terminate} from 'firebase/firestore';
import {listenAccountPlan,saveAccountPlan} from '../src/services/accountPlanFirestore';

test('merged shared-project rules allow only owner highlights and history, with server-owned progress',async()=>{
  const app=initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`rules-${Date.now()}`);
  const auth=getAuth(app),db=getFirestore(app);
  connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',18080);
  try {
    const {user}=await createUserWithEmailAndPassword(auth,`rules-${Date.now()}@example.test`,'Local-rules-test-2026');
    const root=['bibledeptUsers',user.uid] as const;
    await setDoc(doc(db,...root,'annotations','note'),{chapterId:'LUK.1',reference:'Luke 1',translation:'web',verseStart:37,verseEnd:37,excerpt:'For nothing spoken by God is impossible.',color:'orange',comment:'Trust what God has said.',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    assert.equal((await getDocs(query(collection(db,...root,'annotations'),where('chapterId','==','LUK.1'),where('translation','==','web')))).size,1);
    assert.equal((await getDocs(query(collection(db,...root,'annotations'),orderBy('updatedAt','desc')))).size,1);
    for(const [name,id] of [['settings','readingHabit'],['settings','notifications'],['stats','streak'],['habitDays','2026-10-19'],['readings','2026-10-19']]) {
      await getDoc(doc(db,...root,name,id));
      await assert.rejects(getDoc(doc(db,'bibledeptUsers','another-owner',name,id)),(e:{code:string})=>e.code==='permission-denied');
      await assert.rejects(setDoc(doc(db,...root,name,id),{current:10000}),(e:{code:string})=>e.code==='permission-denied');
    }
    await getDocs(query(collection(db,...root,'habitDays'),orderBy('localDate','desc')));
    await assert.rejects(getDocs(collection(db,'bibledeptUsers','another-owner','annotations')),(e:{code:string})=>e.code==='permission-denied');
    await assert.rejects(setDoc(doc(db,...root,'annotations','invalid'),{chapterId:'LUK.1',verseStart:999}));
    const peer=initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`peer-${Date.now()}`),peerAuth=getAuth(peer),peerDb=getFirestore(peer);
    connectAuthEmulator(peerAuth,'http://127.0.0.1:19099',{disableWarnings:true});connectFirestoreEmulator(peerDb,'127.0.0.1',18080);
    try {
      await signInWithEmailAndPassword(peerAuth,user.email!,'Local-rules-test-2026');
      let stop=()=>{};
      const observed=new Promise<void>((resolve,reject)=>{const deadline=setTimeout(()=>{stop();reject(new Error('Second device did not observe synced plan.'));},10000);stop=listenAccountPlan(peerDb,user.uid,value=>{if(value?.currentDay===34){clearTimeout(deadline);stop();resolve();}},reject);});
      await Promise.all([saveAccountPlan(db,user.uid,{currentDay:34,finished:false,completedDays:[]}),saveAccountPlan(peerDb,user.uid,{currentDay:1,finished:false,completedDays:[60]})]);
      await observed;
      const synced=(await getDoc(doc(peerDb,...root,'settings','planProgress'))).data()!;
      assert.equal(synced.currentDay,34);assert.equal(synced.completedDays.length,34);assert.ok(synced.completedDays.includes(33));assert.ok(synced.completedDays.includes(60));
      for(const invalid of [{...synced,completedDays:['1']},{...synced,completedDays:[366]},{...synced,currentDay:1,finished:true}])await assert.rejects(setDoc(doc(db,...root,'settings','planProgress'),{...invalid,updatedAt:serverTimestamp()}));
      await assert.rejects(saveAccountPlan(db,'another-owner',{currentDay:34,finished:false,completedDays:[]}),(e:{code:string})=>e.code==='permission-denied');
    } finally {await terminate(peerDb);await deleteApp(peer);}
    await signOut(auth);
    await assert.rejects(getDoc(doc(db,...root,'annotations','note')),(e:{code:string})=>e.code==='permission-denied');
  } finally {await terminate(db);await deleteApp(app);}
});

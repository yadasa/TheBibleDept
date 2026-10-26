import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, collection, doc, getDocFromServer, getDocs, getFirestore, limit, query, serverTimestamp, setDoc, terminate, where } from 'firebase/firestore';

const emulator=process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:18080';
assert.match(emulator,/^(127\.0\.0\.1|localhost):\d+$/,'Rules tests only use a local Firestore emulator.');
const [host,port]=emulator.split(':'),base=`http://${emulator}/v1/projects/demo-bibledept/databases/(default)/documents`;
function field(value:unknown):unknown {
  if(typeof value==='boolean')return {booleanValue:value};
  if(typeof value==='number')return {integerValue:String(value)};
  if(value===null)return {nullValue:null};
  if(Array.isArray(value))return {arrayValue:{values:value.map(field)}};
  return {stringValue:String(value)};
}
async function seed(path:string,data:Record<string,unknown>) {
  const response=await fetch(`${base}/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(data).map(([key,value])=>[key,field(value)]))})});
  assert.equal(response.status,200,await response.text());
}
const denied=(e:unknown)=>(e as {code:string}).code==='permission-denied';

test('Firestore rules isolate profiles, awards, invitations, and circle history',async()=>{
  const suffix=Date.now(),uids=['owner','reader','outside'].map(role=>`rules-${role}-${suffix}`),group=`rules-circle-${suffix}`,event=`rules-event-${suffix}`;
  const apps=uids.map(uid=>initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},uid));
  const dbs=apps.map((app,index)=>{const db=getFirestore(app);connectFirestoreEmulator(db,host,Number(port),{mockUserToken:{sub:uids[index],user_id:uids[index],firebase:{sign_in_provider:'password',identities:{}}}});return db;});
  const paths=[...uids.map(uid=>`bibledeptUsers/${uid}/settings/community`),...uids.map(uid=>`bibledeptUsers/${uid}/circleReads/${group}`),`bibledeptProfiles/${uids[0]}`,`bibledeptUsers/${uids[0]}/achievements/six-percent-club`,`bibledeptCircles/${group}`,`bibledeptCircles/${group}/bibledeptMessages/message`,`bibledeptActivity/${event}`,`bibledeptCircleCodes/ABCDEF123456`];
  try {
    for(const uid of uids)await seed(`bibledeptUsers/${uid}/settings/community`,{displayName:'Local test reader',joined:true});
    await seed(`bibledeptProfiles/${uids[0]}`,{displayName:'Local test reader',namePrefixes:['local','reader'],photoData:null});
    await seed(`bibledeptCircles/${group}`,{name:'Local test circle',memberIds:uids.slice(0,2),memberCount:2,code:'ABCDEF123456'});
    await seed(`bibledeptCircles/${group}/bibledeptMessages/message`,{uid:uids[0],text:'Only members can read this.'});
    await seed(`bibledeptActivity/${event}`,{uid:uids[0],kind:'joined'});
    await seed(`bibledeptCircleCodes/ABCDEF123456`,{circleId:group});
    assert.equal((await getDocFromServer(doc(dbs[1],'bibledeptProfiles',uids[0]))).data()?.displayName,'Local test reader');
    assert.ok((await getDocs(query(collection(dbs[1],'bibledeptProfiles'),where('namePrefixes','array-contains','reader'),limit(40)))).docs.some(item=>item.id===uids[0]));
    assert.equal((await getDocFromServer(doc(dbs[1],'bibledeptCircles',group,'bibledeptMessages','message'))).data()?.text,'Only members can read this.');
    assert.equal((await getDocs(query(collection(dbs[1],'bibledeptCircles',group,'bibledeptMessages'),limit(50)))).size,1);
    assert.equal((await getDocs(query(collection(dbs[1],'bibledeptCircles'),where('memberIds','array-contains',uids[1]),limit(20)))).size,1);
    const readState=(index:number)=>doc(dbs[index],'bibledeptUsers',uids[index],'circleReads',group);
    const marker={lastReadMessageId:'message',updatedAt:serverTimestamp()};
    await setDoc(readState(1),marker);
    assert.equal((await getDocFromServer(readState(1))).data()?.lastReadMessageId,'message');
    await assert.rejects(getDocFromServer(doc(dbs[0],'bibledeptUsers',uids[1],'circleReads',group)),denied);
    await assert.rejects(setDoc(readState(2),marker),denied);
    await assert.rejects(setDoc(readState(1),{...marker,memberIds:[uids[1]]}),denied);
    await assert.rejects(setDoc(readState(1),{...marker,lastReadMessageId:'invalid/id'}),denied);
    await assert.rejects(setDoc(readState(1),{...marker,updatedAt:new Date(0)}),denied);
    await assert.rejects(getDocFromServer(doc(dbs[2],'bibledeptCircles',group)),denied);
    await assert.rejects(getDocs(query(collection(dbs[2],'bibledeptCircles',group,'bibledeptMessages'),limit(50))),denied);
    await assert.rejects(getDocFromServer(doc(dbs[1],'bibledeptUsers',uids[0],'settings','community')),denied);
    await assert.rejects(getDocFromServer(doc(dbs[1],'bibledeptUsers',uids[0],'achievements','six-percent-club')),denied);
    await assert.rejects(setDoc(doc(dbs[0],'bibledeptUsers',uids[0],'achievements','six-percent-club'),{earnedAt:new Date()}),denied);
    await assert.rejects(setDoc(doc(dbs[0],'bibledeptProfiles',uids[0]),{displayName:'Forged projection',badgeIds:['six-percent-club']}),denied);
    await assert.rejects(setDoc(doc(dbs[1],'bibledeptCircles',group,'bibledeptMessages','forged'),{uid:uids[0],text:'Forged message'}),denied);
    await assert.rejects(setDoc(doc(dbs[1],'bibledeptUsers',uids[1],'circles','forged'),{name:'Forged membership'}),denied);
    await assert.rejects(getDocFromServer(doc(dbs[0],'bibledeptCircleCodes','ABCDEF123456')),denied);
    await assert.rejects(getDocFromServer(doc(dbs[0],'bibledeptCommunityReports','anything')),denied);
    await seed(`bibledeptCircles/${group}`,{name:'Local test circle',memberIds:[uids[0]],memberCount:1,code:'ABCDEF123456'});
    await assert.rejects(getDocFromServer(doc(dbs[1],'bibledeptCircles',group,'bibledeptMessages','message')),denied);
    await assert.rejects(setDoc(readState(1),marker),denied);
    await seed(`bibledeptUsers/${uids[1]}/settings/community`,{displayName:'Local test reader',joined:false});
    await assert.rejects(getDocFromServer(doc(dbs[1],'bibledeptProfiles',uids[0])),denied);
    await assert.rejects(getDocs(query(collection(dbs[1],'bibledeptProfiles'),where('namePrefixes','array-contains','reader'),limit(40))),denied);
    await assert.rejects(getDocFromServer(doc(dbs[1],'bibledeptActivity',event)),denied);
  }finally{
    for(const path of paths)await fetch(`${base}/${path}`,{method:'DELETE',headers:{Authorization:'Bearer owner'}});
    await Promise.all(dbs.map(db=>terminate(db)));await Promise.all(apps.map(app=>deleteApp(app)));
  }
});

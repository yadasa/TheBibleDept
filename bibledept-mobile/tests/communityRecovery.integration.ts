import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, deleteUser, getAuth } from 'firebase/auth';
import { collection, connectFirestoreEmulator, doc, getDocFromServer, getDocs, getFirestore, terminate } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { circleCreationKey, decodeCircleCreation, deliverCircleCreation, PendingCircleCreation } from '../src/services/circleCreation';
import { circleDraftKey, decodeCircleDraft, deliverCircleMessage, PendingCircleMessage } from '../src/services/circleDrafts';

test('durable circle and message retries recover from offline requests and lost real callable acknowledgements', {timeout:180000}, async()=>{
  let offline=false,dropOperation='',dropped=0;
  const unavailable={error:{status:'UNAVAILABLE',message:'Disposable local recovery test interruption.'}};
  // All traffic remains in the demo emulator. Drop only the acknowledgement,
  // after a successful commit, to reproduce a mobile connection disappearing.
  const proxy=createServer(async(request,response)=>{
    const path=request.url||'',operation=path.split('/').pop();
    if(request.method!=='POST'||!/^\/demo-bibledept\/us-central1\/[A-Za-z]+$/.test(path)){response.writeHead(404);response.end();return;}
    const chunks:Buffer[]=[];let size=0;
    for await(const chunk of request){size+=chunk.length;if(size>128000){response.writeHead(413);response.end();return;}chunks.push(chunk);}
    response.setHeader('Content-Type','application/json');
    if(offline){response.writeHead(503);response.end(JSON.stringify(unavailable));return;}
    try {
      const headers:Record<string,string>={'Content-Type':'application/json'};
      if(typeof request.headers.authorization==='string')headers.Authorization=request.headers.authorization;
      const upstream=await fetch(`http://127.0.0.1:15001${path}`,{method:'POST',headers,body:Buffer.concat(chunks).toString('utf8')});
      const body=await upstream.text();
      if(upstream.ok&&operation===dropOperation){dropOperation='';dropped++;response.writeHead(503);response.end(JSON.stringify(unavailable));return;}
      response.writeHead(upstream.status);response.end(body);
    }catch{response.writeHead(503);response.end(JSON.stringify(unavailable));}
  });
  await new Promise<void>(resolve=>proxy.listen(0,'127.0.0.1',resolve));
  const app=initializeApp({apiKey:'demo-bibledept-api-key',projectId:'demo-bibledept'},`community-recovery-${Date.now()}`);
  const auth=getAuth(app),db=getFirestore(app),functions=getFunctions(app,'us-central1');
  connectAuthEmulator(auth,'http://127.0.0.1:19099',{disableWarnings:true});
  connectFirestoreEmulator(db,'127.0.0.1',18080);
  connectFunctionsEmulator(functions,'127.0.0.1',(proxy.address() as AddressInfo).port);
  const saved=new Map<string,string>(),storage={setItem:async(key:string,value:string)=>{saved.set(key,value);},removeItem:async(key:string)=>{saved.delete(key);}};
  try {
    const {user}=await createUserWithEmailAndPassword(auth,`recovery-${Date.now()}@bibledept.test`,'Local-test-2468!');
    const call=async<T,>(name:string,data:Record<string,unknown>)=>(await httpsCallable<unknown,T>(functions,name)({...data,expectedUid:user.uid})).data;
    await call('updateCommunityProfile',{displayName:'Local recovery reader',photoData:null,joined:true,shareStreak:true,shareBadges:true});
    const request:PendingCircleCreation={id:crypto.randomUUID(),name:'Disposable recovery circle'},key=circleCreationKey(user.uid);
    const create=(value:typeof request)=>call<{id:string}>('createReadingCircle',{requestId:value.id,name:value.name});
    offline=true;
    await assert.rejects(deliverCircleCreation(storage,key,request,create));
    assert.equal((await getDocFromServer(doc(db,'bibledeptUsers',user.uid,'circles',request.id))).exists(),false);
    assert.deepEqual(decodeCircleCreation(saved.get(key)!),request);
    offline=false;dropOperation='createReadingCircle';
    await assert.rejects(deliverCircleCreation(storage,key,decodeCircleCreation(saved.get(key)!)!,create));
    assert.equal((await getDocFromServer(doc(db,'bibledeptCircles',request.id))).data()?.memberCount,1);
    const recovered=decodeCircleCreation(saved.get(key)!)!;
    assert.deepEqual(await deliverCircleCreation(storage,key,recovered,create),{id:request.id});
    assert.equal(saved.has(key),false);
    assert.equal((await getDocs(collection(db,'bibledeptUsers',user.uid,'circles'))).size,1);
    const message:PendingCircleMessage={id:crypto.randomUUID(),text:'A disposable thought with one stable identity.'},draftKey=circleDraftKey(user.uid,request.id);
    const send=(value:typeof message)=>call('sendReadingCircleMessage',{circleId:request.id,messageId:value.id,text:value.text});
    dropOperation='sendReadingCircleMessage';
    await assert.rejects(deliverCircleMessage(storage,draftKey,message,send));
    const pending=decodeCircleDraft(saved.get(draftKey)!).pending;assert.deepEqual(pending,message);
    await deliverCircleMessage(storage,draftKey,pending!,send);
    const messages=await getDocs(collection(db,'bibledeptCircles',request.id,'bibledeptMessages'));
    assert.equal(messages.size,1);assert.equal(messages.docs[0].id,message.id);assert.equal(messages.docs[0].data().text,message.text);
    assert.equal(saved.has(draftKey),false);assert.equal(dropped,2);
  }finally{
    offline=false;dropOperation='';
    try {
      if(auth.currentUser)await deleteUser(auth.currentUser);
      await terminate(db);await deleteApp(app);
    }finally{proxy.closeAllConnections();await new Promise<void>((resolve,reject)=>proxy.close(error=>error?reject(error):resolve()));}
  }
});

import { createHash, randomUUID } from 'node:crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { defaultPreferences, NotificationPreferences, validatePreferences } from '../../shared/reminders';
import { userPath } from './streaks';
export function installationId(value:unknown):string{if(typeof value!=='string'||!/^[A-Za-z0-9_-]{20,80}$/.test(value))throw new HttpsError('invalid-argument','Invalid installation.');return value;}
export const bindingId=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function registerDevice(uid:string,input:any,now=Date.now()){
  const id=installationId(input?.installationId),token=input?.expoPushToken;
  if(typeof token!=='string'||token.length>300||! /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)||!['ios','android'].includes(input.platform)||input.permissionStatus!=='granted')throw new HttpsError('invalid-argument','Allow notifications on a supported device first.');
  const binding=getFirestore().collection('bibledeptPushBindings').doc(bindingId(token)),root=userPath(uid),device=root.collection('pushDevices').doc(id);
  return getFirestore().runTransaction(async tx=>{
    const [bound,old]=await Promise.all([tx.get(binding),tx.get(device)]);
    const previous=bound.data(),oldData=old.data();
    const oldBindingRef=oldData?.expoPushToken&&oldData.expoPushToken!==token?getFirestore().collection('bibledeptPushBindings').doc(bindingId(oldData.expoPushToken)):null;
    const oldBinding=oldBindingRef?await tx.get(oldBindingRef):null;
    const accountScope=previous?.uid===uid&&previous?.installationId===id&&oldData?.accountScope?oldData.accountScope:randomUUID();
    if(previous&&(previous.uid!==uid||previous.installationId!==id))tx.set(userPath(previous.uid).collection('pushDevices').doc(previous.installationId),{enabled:false,updatedAt:Timestamp.fromMillis(now)},{merge:true});
    if(oldBindingRef&&oldBinding?.data()?.uid===uid&&oldBinding.data()?.installationId===id)tx.delete(oldBindingRef);
    tx.set(binding,{uid,installationId:id,updatedAt:Timestamp.fromMillis(now)});
    tx.set(device,{expoPushToken:token,platform:input.platform,permissionStatus:'granted',enabled:true,accountScope,lastSeenAt:now,updatedAt:Timestamp.fromMillis(now)});
    return {installationId:id,accountScope};
  });
}
export async function savePreferences(uid:string,input:unknown,now=Date.now()){
  let value:Omit<NotificationPreferences,'preferenceRevision'>;
  try{value=validatePreferences(input);}catch(e){throw new HttpsError('invalid-argument',(e as Error).message);}
  const root=userPath(uid),prefs=root.collection('settings').doc('notifications'),state=root.collection('reminderState').doc('current');
  return getFirestore().runTransaction(async tx=>{
    const [old,habit,device]=await Promise.all([tx.get(prefs),tx.get(root.collection('settings').doc('readingHabit')),value.preferredInstallationId?tx.get(root.collection('pushDevices').doc(value.preferredInstallationId)):Promise.resolve(null)]);
    if(value.enabled&&(!habit.data()?.migrationComplete||!device?.data()?.enabled||device.data()?.permissionStatus!=='granted'))throw new HttpsError('failed-precondition','Confirm your reading time zone and allow notifications on this device first.');
    const data={...value,preferenceRevision:(old.data()?.preferenceRevision||0)+1,consentedAt:old.data()?.consentedAt||Timestamp.fromMillis(now),updatedAt:Timestamp.fromMillis(now)};
    tx.set(prefs,data);
    tx.set(state,{enabled:value.enabled,nextEvaluationAt:Timestamp.fromMillis(now+900000),...(!old.data()?.enabled&&value.enabled?{episodePaused:false,comebackHandoffs:0}:{} )},{merge:true});
    return data;
  });
}
export async function unregisterDevice(uid:string,value:unknown,now=Date.now()){
  const id=installationId(value),root=userPath(uid),device=root.collection('pushDevices').doc(id),prefs=root.collection('settings').doc('notifications');
  await getFirestore().runTransaction(async tx=>{
    const [d,p]=await Promise.all([tx.get(device),tx.get(prefs)]),token=d.data()?.expoPushToken;
    const binding=token?getFirestore().collection('bibledeptPushBindings').doc(bindingId(token)):null;
    const bound=binding?await tx.get(binding):null;
    tx.set(device,{enabled:false,updatedAt:Timestamp.fromMillis(now)},{merge:true});
    if(binding&&bound?.data()?.uid===uid&&bound.data()?.installationId===id)tx.delete(binding);
    if(p.data()?.preferredInstallationId===id){tx.set(prefs,{enabled:false,preferenceRevision:(p.data()?.preferenceRevision||0)+1},{merge:true});tx.set(root.collection('reminderState').doc('current'),{enabled:false},{merge:true});}
  });
}
export async function recordForeground(uid:string,id:unknown,now=Date.now()){
  installationId(id);
  const state=userPath(uid).collection('reminderState').doc('current');
  await getFirestore().runTransaction(async tx=>{const old=await tx.get(state);if(now-(old.data()?.lastForegroundAt||0)<60000)return;tx.set(state,{lastForegroundAt:now},{merge:true});});
}
export async function recordOpen(uid:string,input:any,now=Date.now()){
  if(typeof input?.notificationId!=='string'||!/^[a-zA-Z0-9_-]{20,100}$/.test(input.notificationId))throw new HttpsError('invalid-argument','Invalid reminder.');
  installationId(input.accountScope);
  const campaign=userPath(uid).collection('notificationCampaigns').doc(input.notificationId);
  await getFirestore().runTransaction(async tx=>{const snapshot=await tx.get(campaign);if(snapshot.data()?.accountScope===input.accountScope)tx.update(campaign,{openedAt:Timestamp.fromMillis(now)});});
}

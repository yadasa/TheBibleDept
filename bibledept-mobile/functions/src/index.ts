import { initializeApp } from 'firebase-admin/app';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeHabit, recordCompletion } from './streaks';
import { registerDevice, savePreferences, unregisterDevice, recordForeground, recordOpen } from './notifications';
import { dispatchDueReminders, collectReceipts } from './reminderWorker';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { auth } from 'firebase-functions/v1';
import { userPath } from './streaks';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp();
setGlobalOptions({region:'us-central1',maxInstances:10});
export function authenticatedUid(request:CallableRequest){
  if(!request.auth)throw new HttpsError('unauthenticated','Sign in to continue.');
  if(!['password','phone'].includes(request.auth.token.firebase?.sign_in_provider))throw new HttpsError('permission-denied','Use email or phone sign-in.');
  return request.auth.uid;
}
export const configureReadingHabit=onCall({timeoutSeconds:120},request=>initializeHabit(authenticatedUid(request),request.data?.timeZone));
export const completeReading=onCall(request=>recordCompletion(authenticatedUid(request),request.data));
export const registerPushDevice=onCall(request=>registerDevice(authenticatedUid(request),request.data));
export const updateNotificationPreferences=onCall(request=>savePreferences(authenticatedUid(request),request.data));
export const unregisterPushDevice=onCall(request=>unregisterDevice(authenticatedUid(request),request.data?.installationId));
export const readingForeground=onCall(request=>recordForeground(authenticatedUid(request),request.data?.installationId));
export const readingReminderOpened=onCall(request=>recordOpen(authenticatedUid(request),request.data));
const expoAccessToken=defineSecret('EXPO_PUSH_ACCESS_TOKEN');
export const dispatchReadingReminders=onSchedule({schedule:'every 15 minutes',timeZone:'UTC',secrets:[expoAccessToken],timeoutSeconds:540,maxInstances:1},async()=>{
  logger.info('Reading reminder evaluation',await dispatchDueReminders(process.env.HABIT_PUSH_ENABLED==='true'?expoAccessToken.value():undefined));
});
export const collectReadingReminderReceipts=onSchedule({schedule:'every 15 minutes',timeZone:'UTC',secrets:[expoAccessToken],timeoutSeconds:120,maxInstances:1},async()=>{if(process.env.HABIT_PUSH_ENABLED==='true')await collectReceipts(expoAccessToken.value());});
export const deleteReadingAccount=auth.user().onDelete(async user=>{
  for(;;){const bindings=await getFirestore().collection('bibledeptPushBindings').where('uid','==',user.uid).limit(400).get();if(bindings.empty)break;const batch=getFirestore().batch();bindings.docs.forEach(doc=>batch.delete(doc.ref));await batch.commit();}
  await getFirestore().recursiveDelete(userPath(user.uid));
});

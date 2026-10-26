import { initializeApp } from "firebase-admin/app";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeHabit, recordCompletion } from "./streaks";
import {
  registerDevice,
  savePreferences,
  unregisterDevice,
  recordForeground,
  recordOpen,
} from "./notifications";
import { dispatchDueReminders, collectReceipts } from "./reminderWorker";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { runWith } from "firebase-functions/v1";
import { userPath } from "./streaks";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentWritten, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { reconcileCommunity, saveCommunityProfile, createCircle, joinCircle, leaveCircle, renameCircle, rotateCircleInvitation, removeCircleMember, sendCircleMessage, deleteCircleMessage, cheerMilestone, blockCommunityReader, unhideCommunityReaders, reportCommunityContent, deleteCommunityAccount } from './community';
initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });
export function authenticatedUid(request: CallableRequest) {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  if (
    !["password", "phone"].includes(
      request.auth.token.firebase?.sign_in_provider,
    )
  )
    throw new HttpsError("permission-denied", "Use email or phone sign-in.");
  return request.auth.uid;
}
export const configureReadingHabit = onCall(
  { timeoutSeconds: 120 },
  (request) =>
    initializeHabit(authenticatedUid(request), request.data?.timeZone),
);
export const completeReading = onCall((request) =>
  recordCompletion(authenticatedUid(request), request.data),
);
export const registerPushDevice = onCall((request) =>
  registerDevice(authenticatedUid(request), request.data),
);
export const updateNotificationPreferences = onCall((request) =>
  savePreferences(authenticatedUid(request), request.data),
);
export const unregisterPushDevice = onCall((request) =>
  unregisterDevice(authenticatedUid(request), request.data?.installationId),
);
export const readingForeground = onCall((request) =>
  recordForeground(authenticatedUid(request), request.data?.installationId),
);
export const readingReminderOpened = onCall((request) =>
  recordOpen(authenticatedUid(request), request.data),
);
function communityCall<T>(handler:(uid:string,data:unknown)=>Promise<T>) {
  return onCall(async request=>{
    try{
      const uid=authenticatedUid(request);
      if(request.data?.expectedUid!==uid)throw new HttpsError('failed-precondition','Your account changed. Reopen this screen and try again.');
      return await handler(uid,request.data);
    }
    catch(error){
      // Only deliberate app guidance crosses into product copy; SDK diagnostics stay out.
      if(error instanceof HttpsError)throw new HttpsError(error.code,error.message,{app:'bibledept-community',message:error.message});
      throw error;
    }
  });
}
export const updateCommunityProfile=communityCall(saveCommunityProfile);
export const refreshAchievements=communityCall(uid=>reconcileCommunity(uid));
export const createReadingCircle=communityCall(createCircle);
export const joinReadingCircle=communityCall(joinCircle);
export const leaveReadingCircle=communityCall(leaveCircle);
export const renameReadingCircle=communityCall(renameCircle);
export const replaceReadingCircleInvitation=communityCall(rotateCircleInvitation);
export const removeReadingCircleMember=communityCall(removeCircleMember);
export const sendReadingCircleMessage=communityCall(sendCircleMessage);
export const deleteReadingCircleMessage=communityCall(deleteCircleMessage);
export const encourageCommunityMilestone=communityCall(cheerMilestone);
export const hideCommunityReader=communityCall(blockCommunityReader);
export const unhideReadingCommunityReaders=communityCall(uid=>unhideCommunityReaders(uid));
export const reportReadingCommunityContent=communityCall(reportCommunityContent);
export const refreshReadingAwards=onDocumentWritten('bibledeptUsers/{uid}/stats/streak',event=>reconcileCommunity(event.params.uid).then(()=>{}));
export const refreshJourneyAwards=onDocumentWritten('bibledeptUsers/{uid}/settings/planProgress',event=>reconcileCommunity(event.params.uid).then(()=>{}));
export const refreshReflectionAwards=onDocumentWritten('bibledeptUsers/{uid}/annotations/{id}',event=>reconcileCommunity(event.params.uid).then(()=>{}));
export const cleanCommunityCelebration=onDocumentDeleted('bibledeptActivity/{id}',event=>getFirestore().recursiveDelete(getFirestore().collection('bibledeptActivity').doc(event.params.id)));
const expoAccessToken = defineSecret("EXPO_PUSH_ACCESS_TOKEN");
export const dispatchReadingReminders = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "UTC",
    secrets: [expoAccessToken],
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    logger.info(
      "Reading reminder evaluation",
      await dispatchDueReminders(
        process.env.HABIT_PUSH_ENABLED === "true"
          ? expoAccessToken.value()
          : undefined,
      ),
    );
  },
);
export const collectReadingReminderReceipts = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "UTC",
    secrets: [expoAccessToken],
    timeoutSeconds: 120,
    maxInstances: 1,
  },
  async () => {
    if (process.env.HABIT_PUSH_ENABLED === "true")
      await collectReceipts(expoAccessToken.value());
  },
);
export const deleteReadingAccount = runWith({failurePolicy:true,timeoutSeconds:540,memory:'512MB'}).auth.user().onDelete(async (user) => {
  await deleteCommunityAccount(user.uid);
  for (;;) {
    const bindings = await getFirestore()
      .collection("bibledeptPushBindings")
      .where("uid", "==", user.uid)
      .limit(400)
      .get();
    if (bindings.empty) break;
    const batch = getFirestore().batch();
    bindings.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await getFirestore().recursiveDelete(userPath(user.uid));
});

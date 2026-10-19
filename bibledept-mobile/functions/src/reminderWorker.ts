import { createHash } from "node:crypto";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  defaultPreferences,
  NotificationPreferences,
  reminderCandidate,
  reminderWindow,
  ReminderState,
} from "../../shared/reminders";
import { emptyStreak, Streak, validZone } from "../../shared/habits";
import { bindingId, unregisterDevice } from "./notifications";
import { userPath } from "./streaks";

/** A durable dispatch marker consumes the budget before HTTP; ambiguous attempts are never replayed. */
export async function reserveReminder(
  uid: string,
  now: number,
  sendEnabled: boolean,
) {
  const root = userPath(uid),
    stateRef = root.collection("reminderState").doc("current");
  return getFirestore().runTransaction(async (tx) => {
    const [p, h, s, r] = await Promise.all([
      tx.get(root.collection("settings").doc("notifications")),
      tx.get(root.collection("settings").doc("readingHabit")),
      tx.get(root.collection("stats").doc("streak")),
      tx.get(stateRef),
    ]);
    const prefs = {
        ...defaultPreferences,
        ...p.data(),
      } as NotificationPreferences,
      habit = h.data(),
      streak = (s.data() || emptyStreak) as Streak,
      state = (r.data() as ReminderState) || {};
    const kind =
      habit?.migrationComplete && validZone(habit.timeZone)
        ? reminderCandidate(now, habit.timeZone, prefs, streak, state)
        : null;
    let result: null | {
      notificationId: string;
      token: string;
      accountScope: string;
      ttl: number;
      kind: "streak" | "comeback";
    } = null;
    if (kind && prefs.preferredInstallationId) {
      const device = await tx.get(
          root.collection("pushDevices").doc(prefs.preferredInstallationId),
        ),
        d = device.data();
      const binding = d?.expoPushToken
        ? await tx.get(
            getFirestore()
              .collection("bibledeptPushBindings")
              .doc(bindingId(d.expoPushToken)),
          )
        : null;
      const window = reminderWindow(now, habit!.timeZone, prefs)!;
      const notificationId = createHash("sha256")
        .update(`${kind}:${window.today}:${streak.lastQualifiedDate}`)
        .digest("hex");
      const campaign = root
          .collection("notificationCampaigns")
          .doc(notificationId),
        old = await tx.get(campaign);
      if (
        sendEnabled &&
        !old.exists &&
        d?.enabled &&
        d.permissionStatus === "granted" &&
        binding?.data()?.uid === uid &&
        binding.data()?.installationId === prefs.preferredInstallationId
      ) {
        const comebackCount =
          state.inactivityEpisodeId === streak.lastQualifiedDate
            ? state.comebackHandoffs || 0
            : 0;
        tx.create(campaign, {
          kind,
          targetHabitDate: window.today,
          episodeId: streak.lastQualifiedDate,
          installationId: prefs.preferredInstallationId,
          preferenceRevision: prefs.preferenceRevision,
          state: "dispatch_started",
          notificationId,
          accountScope: d.accountScope,
          attemptCount: 1,
          dispatchStartedAt: Timestamp.fromMillis(now),
          expiresAt: Timestamp.fromMillis(now + window.ttl * 1000),
          deleteAfter: Timestamp.fromMillis(now + 30 * 86400000),
        });
        tx.set(
          stateRef,
          {
            lastDispatchAttemptAt: now,
            lastDispatchLocalDate: window.today,
            recentAttempts: [
              ...(state.recentAttempts || []).filter(
                (n) => now - n < 7 * 86400000,
              ),
              now,
            ],
            ...(kind === "comeback"
              ? {
                  inactivityEpisodeId: streak.lastQualifiedDate,
                  comebackHandoffs: comebackCount + 1,
                  lastComebackHandoffAt: now,
                  episodePaused: comebackCount + 1 >= 2,
                }
              : {}),
          },
          { merge: true },
        );
        result = {
          notificationId,
          token: d.expoPushToken,
          accountScope: d.accountScope,
          ttl: window.ttl,
          kind,
        };
      }
    }
    tx.set(
      stateRef,
      { nextEvaluationAt: Timestamp.fromMillis(now + 900000) },
      { merge: true },
    );
    return result;
  });
}
export async function dispatchDueReminders(
  accessToken: string | undefined,
  now = Date.now(),
) {
  const db = getFirestore(),
    allow = (process.env.HABIT_PUSH_ALLOWLIST || "")
      .split(",")
      .map((s) => s.trim()),
    enabled = process.env.HABIT_PUSH_ENABLED === "true";
  let evaluated = 0,
    attempted = 0;
  // Process bounded pages. Advancing the due timestamp prevents starvation on the next tick.
  for (let page = 0; page < 5; page++) {
    const due = await db
      .collectionGroup("reminderState")
      .where("enabled", "==", true)
      .where("nextEvaluationAt", "<=", Timestamp.fromMillis(now))
      .orderBy("nextEvaluationAt")
      .limit(100)
      .get();
    if (due.empty) break;
    for (const state of due.docs) {
      const uid = state.ref.parent.parent?.id;
      if (!uid || state.id !== "current") continue;
      const sendEnabled =
        enabled && (allow.includes("*") || allow.includes(uid));
      const reserved = await reserveReminder(uid, Date.now(), sendEnabled);
      evaluated++;
      if (!reserved) continue;
      attempted++;
      const campaign = userPath(uid)
        .collection("notificationCampaigns")
        .doc(reserved.notificationId);
      // Recheck consent, reading, and account/device revocation after the reservation.
      const [pref, summary, device, activity] = await Promise.all([
        userPath(uid).collection("settings").doc("notifications").get(),
        userPath(uid).collection("stats").doc("streak").get(),
        userPath(uid)
          .collection("pushDevices")
          .doc((await campaign.get()).data()!.installationId)
          .get(),
        state.ref.get(),
      ]);
      const current = await campaign.get(),
        data = current.data()!;
      if (
        !pref.data()?.enabled ||
        pref.data()?.preferenceRevision !== data.preferenceRevision ||
        summary.data()?.lastQualifiedDate === data.targetHabitDate ||
        !device.data()?.enabled ||
        Date.now() - (activity.data()?.lastForegroundAt || 0) < 1800000 ||
        Date.now() >= data.expiresAt.toMillis()
      ) {
        await campaign.update({ state: "cancelled" });
        continue;
      }
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            to: reserved.token,
            title: "The Bible Dept.",
            body:
              reserved.kind === "streak"
                ? "There’s still room for a little reading today. Your place is waiting."
                : "A little reading, whenever you’re ready. Pick up where you left off.",
            data: {
              version: 1,
              kind: "resume-reading",
              notificationId: reserved.notificationId,
              accountScope: reserved.accountScope,
            },
            ttl: Math.min(
              reserved.ttl,
              Math.max(
                1,
                Math.floor((data.expiresAt.toMillis() - Date.now()) / 1000),
              ),
            ),
            channelId: "reading-reminders",
            priority: "normal",
            sound: null,
          }),
        });
        if (!response.ok) {
          await campaign.update({
            state:
              response.status >= 500 ? "delivery_unknown" : "provider_rejected",
            providerStatus: response.status,
          });
          continue;
        }
        const payload = (await response.json()) as any,
          ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;
        if (ticket?.status === "ok" && typeof ticket.id === "string")
          await campaign.update({
            state: "provider_accepted",
            expoTicketId: ticket.id,
            receiptStatus: "pending",
            receiptCheckAt: Timestamp.fromMillis(Date.now() + 900000),
          });
        else if (ticket?.status === "error") {
          await campaign.update({
            state: "provider_rejected",
            receiptStatus: ticket.details?.error || "rejected",
          });
          if (ticket.details?.error === "DeviceNotRegistered")
            await unregisterDevice(uid, data.installationId);
        } else await campaign.update({ state: "delivery_unknown" });
      } catch {
        await campaign.update({ state: "delivery_unknown" });
      }
    }
    if (due.size < 100) break;
  }
  return { evaluated, attempted, liveEnabled: enabled };
}
export async function collectReceipts(
  accessToken: string | undefined,
  now = Date.now(),
) {
  const docs = await getFirestore()
    .collectionGroup("notificationCampaigns")
    .where("state", "==", "provider_accepted")
    .where("receiptCheckAt", "<=", Timestamp.fromMillis(now))
    .limit(100)
    .get();
  if (docs.empty) return;
  const ids = docs.docs
    .map((d) => d.data().expoTicketId)
    .filter((id) => typeof id === "string");
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ ids }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return;
  const { data } = (await response.json()) as any;
  for (const doc of docs.docs) {
    const campaign = doc.data(),
      receipt = data?.[campaign.expoTicketId];
    if (!receipt) {
      const tooOld = now - campaign.dispatchStartedAt.toMillis() > 86400000;
      await doc.ref.update({
        receiptStatus: tooOld ? "unavailable" : "pending",
        receiptCheckAt: tooOld
          ? Timestamp.fromMillis(now + 365 * 86400000)
          : Timestamp.fromMillis(now + 900000),
      });
      continue;
    }
    await doc.ref.update({
      receiptStatus:
        receipt.status === "ok"
          ? "accepted_by_push_provider"
          : receipt.details?.error || "error",
      receiptCheckAt: Timestamp.fromMillis(now + 365 * 86400000),
    });
    const uid = doc.ref.parent.parent?.id;
    if (uid && receipt.details?.error === "DeviceNotRegistered")
      await unregisterDevice(uid, campaign.installationId);
  }
}

# Gentle reading notification plan

Status: **Planned, not implemented.** Updated October 18, 2026. This follows the [reading streak plan](READING_STREAKS_PLAN.md). It specifies future product behavior and backend work; it does not register devices, request permissions, schedule production jobs, or send any notifications.

## Purpose and tone

Offer a small invitation when a reader might appreciate help returning. A reminder should make Scripture easier to approach and leave the person in control. Completion, streak preservation, and the reader's spiritual life are never obligations created by a notification.

Use two separately enabled categories: **Keep my rhythm** for an unfinished day in an active streak, and **Welcome me back** after a longer reading gap. Avoid escalating urgency, guilt, competitive comparisons, threats of lost progress, paid recovery, and repeated late-night prompts. An ignored message is a reason to send less.

## Existing app and prerequisites

The active client is Expo SDK 57 and currently has no `expo-notifications` dependency or remote-push registration flow. Its [configuration](../bibledept-mobile/app.config.ts) and [manifest](../bibledept-mobile/app.json) identify BibleDept; the retained church application's notification source does not mean this client can already receive push.

Implement and verify the authoritative daily ledger and summary in the [streak plan](READING_STREAKS_PLAN.md) first. The local plan-day position is not a signal that a chapter was read. Podcast playback and opening the app also do not satisfy the reading goal.

## Consent and reader controls

After a successful reading, offer a dismissible explanation: “Would a gentle reminder help you make room to read?” Also make this available in Account. Explain both categories before requesting operating-system permission. Do not show the system prompt at first launch or repeatedly after a decline.

- Master reminders are off until the reader opts in. Category selections require an explicit save; merely showing a screen is not consent.
- Enable **Keep my rhythm** only when selected. **Welcome me back** is a separate choice, initially off.
- Offer preferred local time, quiet hours, pause for a week, and turn off. Default suggested time is **7:30 PM in the confirmed habit timezone**; default quiet hours are **9 PM through 9 AM**.
- Show the timezone and which device is selected for reminders. Keep it tied to the same account timezone that defines the reading day.
- Reject a preferred time inside quiet hours with a useful explanation. Do not move a missed reminder into another day or send a catch-up burst.
- Respect both app preferences and known OS authorization. Permission denial does not restrict reading, streak credit, or account access. Offer an OS Settings link when the reader chooses to revisit permission.

Store consent time, preference revision, and category selections. A setting change invalidates pending work using the old revision. No remote permission prompt or notification is part of this planning change.

## Eligibility and cadence

All intervals below are proposed product defaults. Evaluate calendar-day gaps in the account's confirmed habit timezone. Evaluate rolling caps in UTC elapsed time. These are different calculations.

| Reminder | Eligibility at send time | Timing and end condition |
| --- | --- | --- |
| Keep my rhythm | Reader opted into this category; at least one day in the active run; last qualified date is yesterday; today has no daily credit. | One candidate at the selected time, default 7:30 PM. Cancel if they read, snooze, disable, lose eligibility, enter quiet hours, or the candidate expires. |
| Welcome back | Reader opted into this category; they have a previous reading date; no qualifying reading for 3 calendar days. | One invitation at their preferred allowed time on gap day 3. |
| One later invitation | The same inactivity episode continues and the first comeback invitation was handed to the provider; reader still opted in. | At most one more on gap day 10, with at least 7 elapsed days since the first provider handoff. After that, pause this category until they complete a reading or explicitly re-enable it. |

Readers with no previous completed chapter are not a dormant-reader segment. Do not send a streak-loss or comeback campaign to them. If a scheduler outage misses an episode's candidate day, expire it rather than sending the whole sequence late. The day-10 invitation is skipped if there was no first handoff or its seven-day cooldown has not elapsed; the same episode remains capped and never produces a catch-up burst.

### Shared limits and suppression

Use one account-wide budget for both categories: **at most one dispatch attempt per local date, at least 24 elapsed hours between attempts, and at most three attempts in any rolling seven-day window**. Count uncertain provider handoffs conservatively against the budget. Definite cancellations before a handoff can release a reservation. Retries of one candidate cannot consume another message slot or create another campaign.

Suppress when any of the following holds:

- The reader completed today, is currently active in the app, or was active within the previous 30 minutes. Record a lightweight authenticated foreground heartbeat while the app is visible; do not infer activity from a background refresh.
- App reminders or the category are off, consent is missing, the selected device is unavailable, or known OS permission is denied.
- A pause is active, quiet hours apply, a shared limit is reached, the inactivity episode is exhausted, or the candidate has expired.
- Habit migration is incomplete, the summary is missing/inconsistent, timezone is unconfirmed, or account deletion is pending. Unknown data should suppress a nudge.

If recent activity suppresses a candidate, expire it rather than retrying every few minutes within the window. Resume normal consideration on a future eligible date. Completion immediately closes an inactivity episode and cancels future candidates for it.

## Copy and destinations

Use short, general lock-screen content by default. A notification from this app can itself disclose an interest in Bible reading, so make the lock-screen behavior clear when asking for permission. Do not include prayer text, journal content, names of group members, exact passages, or detailed reading history.

| Context | Suggested title | Suggested body |
| --- | --- | --- |
| Active streak, unfinished day | A little room for today | One chapter is here whenever you're ready. |
| First comeback invitation | Your place is still here | Pick up with one chapter, at your own pace. |
| Later comeback invitation | A fresh start can be small | You're welcome to begin again whenever you're ready. |

These are original templates, not quotations or attributed teaching. Keep wording useful even if a completion races with delivery. Avoid messages such as “You still haven't read,” countdowns, or claims that silence indicates spiritual failure. Do not add sound by default, time-sensitive interruption levels, critical alerts, or attempts to bypass Focus/Do Not Disturb.

Tapping a reminder opens the reader's **current device-saved plan position**, after auth and local plan state finish loading. Do not embed a guessed plan-day number in the push: the backend does not currently own plan position. Opening the notification does not complete reading or extend a streak.

The current [link parser](../bibledept-mobile/src/services/links.ts) supports explicit passages and a few app destinations; it has no resume-reading notification contract. Add a separate allowlisted notification intent such as `{ version: 1, kind: "resume-reading", notificationId, accountScope }`. Resolve it through app navigation and `PlanProvider.returnToCurrent()`. Do not accept arbitrary URLs, passage text, or account IDs as navigation instructions. Verify account scope on cold start, warm start, and after account changes; mismatches open neutral Today without exposing another person's reading state.

## Proposed delivery architecture

Use `expo-notifications` on the client, Expo Push Service as the delivery gateway, and a dedicated Firebase scheduled worker for eligibility. Expo routes to APNs for iOS and FCM for Android. A provider receipt is not proof that a person saw or opened the message.

Add SDK-compatible packages with Expo's installer when implementation starts; do not blindly copy the version number from the latest documentation into this SDK 57 app. Configure the notifications plugin, application/project identifiers, platform credentials, and a signed development build. Store server credentials in deployment secrets, not Firestore documents or the client bundle. Prefer the maintained Expo server SDK or a small explicit sender with known retry semantics.

Plan a real signed-build device test on iOS and Android; Expo Go is not the release validation target. Verify alert authorization, token registration/refresh, foreground presentation, background receipt, killed-app launch, sign-out, and denial/revocation. Web push is outside the initial native rollout.

## Proposed Firestore records

Keep private state under the same BibleDept namespace. These paths are additional to the streak plan:

```text
bibledeptUsers/{uid}/settings/notifications
  enabled: false
  keepMyRhythm: false
  welcomeMeBack: false
  preferredLocalTime: "19:30"
  quietHours: { start: "21:00", end: "09:00" }
  pausedUntil: Timestamp | null
  preferredInstallationId: string | null
  consentedAt: Timestamp | null
  preferenceRevision: number
  updatedAt: Timestamp

bibledeptUsers/{uid}/pushDevices/{installationId}
  expoPushToken: string
  platform: "ios" | "android"
  permissionStatus: string
  enabled: boolean
  accountScope: string
  lastSeenAt: Timestamp
  updatedAt: Timestamp

bibledeptUsers/{uid}/reminderState/current
  enabled: boolean
  nextEvaluationAt: Timestamp
  lastForegroundAt: Timestamp | null
  lastDispatchAttemptAt: Timestamp | null
  lastDispatchLocalDate: string | null
  recentDispatchAttempts: bounded list of timestamps
  inactivityEpisodeId: string | null
  comebackHandoffs: number
  lastComebackHandoffAt: Timestamp | null
  episodePaused: boolean

bibledeptUsers/{uid}/notificationCampaigns/{campaignId}
  kind: "keep_rhythm" | "welcome_back"
  targetHabitDate: string
  episodeId: string | null
  installationId: string
  preferenceRevision: number
  notBefore: Timestamp
  expiresAt: Timestamp
  state: "planned" | "claimed" | "dispatch_started" |
         "provider_accepted" | "provider_rejected" |
         "delivery_unknown" | "cancelled" | "expired"
  leaseUntil: Timestamp | null
  notificationId: string
  attemptCount: number
  expoTicketId: string | null
  receiptStatus: string | null
  openedAt: Timestamp | null
```

Use backend-generated times and bounded histories; do not let arrays grow for years. A collection-group query over `reminderState`, indexed by enabled status and `nextEvaluationAt`, finds due accounts without scanning everyone every run. Paginate and bound each worker's work. Keep the underlying eligibility facts in the streak ledger and preferences; queued state is a dispatch aid, not the authority.

Derive deterministic campaign IDs from account-local date and category for a streak reminder, and from inactivity episode plus stage for comeback invitations. The shared budget must serialize across categories and devices, not just deduplicate identical campaign IDs.

## Registration and account safety

Proposed authenticated backend operations: `updateReminderPreferences`, `registerPushDevice`, `unregisterPushDevice`, `recordAppForeground`, and `recordNotificationOpen`. Validate fields and bound token lengths, dates, and heartbeat frequency. Resolve UID from authentication. The client does not choose a campaign or directly change eligibility, send counters, or delivery state.

Version one sends to **one preferred installation per account**. Choose it explicitly in Account or use the latest registered device with disclosed behavior; never broadcast the same nudge to every device by default. Store a server-owned unique token binding so one live Expo token cannot remain attached to two accounts after a switch. If a token is rebound, disable its previous binding. Do not fail over to a second device after an ambiguous handoff.

On sign-out, unregister that binding while authenticated when possible and clear its local account scope. If sign-out occurs offline, clear local personalization immediately and queue unregistration; generic already-queued notifications can still arrive. Scope-check their actions before showing account-specific state. A new sign-in re-registers with the new owner and invalidates the previous association. Periodically refresh known permission state and token registration; stop using tokens reported as `DeviceNotRegistered`.

Owners can read their preferences and suitable device status. Raw tokens, dispatch counters, and campaign internals should be available only where needed, with backend-owned writes. Use explicit Firestore rules and server validation; the root profile allowlist remains unchanged. Remove tokens and pending work on account deletion. Do not log raw tokens, prayer text, or passage contents.

## Scheduling and dispatch algorithm

1. Run a UTC-based scheduler every 15 minutes. For each due account, derive its current local date/time in the confirmed habit timezone. Do not put every user on a server-local 7:30 PM cron.
2. Read consent, preference revision, selected device, foreground activity, streak summary, and today's ledger. Determine at most one eligible category. Keep-my-rhythm and comeback states are normally mutually exclusive; all attempts still share one budget.
3. Give a candidate a maximum 60-minute send window beginning at the preferred time, shortened by quiet-hour start and the end of that local date. Missed windows expire. The time picker should use 15-minute increments to align with the initial worker cadence.
4. In a Firestore transaction, claim the deterministic campaign and reserve the shared budget. A concurrent worker must observe the claim or existing terminal result. A short lease can recover preparation work before dispatch starts.
5. Immediately before handoff, recheck completion, foreground activity, consent/revision, pause, quiet hours, device binding, and expiry. Cancel if anything changed. Transition to `dispatch_started` durably before the external send.
6. Send a generic template with the allowlisted intent and deterministic notification ID. Limit provider TTL to the smaller of **15 minutes** and the remaining candidate lifetime. Expire stale risk messages rather than delivering them next morning.
7. Record a returned Expo ticket, inspect receipts later, and disable definitively invalid registrations. Update episode handoff counts only for known provider acceptance. Treat unknown outcomes as consumed shared-budget slots and do not add another comeback stage because of an unknown first outcome.
8. Compute `nextEvaluationAt` from the next relevant allowed slot or eligibility date. Completion, consent changes, pause, unregistration, and deletion invalidate pending candidates immediately and recompute or disable evaluation.

Do not perform the provider call inside a Firestore transaction. Scheduled invocations can repeat or overlap, and database transactions can retry. Firestore and Expo do not share an atomic commit.

### Retries and delivery limits

A durable `dispatch_started` marker gives the application a conservative attempt boundary. If a worker crashes before it can tell whether Expo accepted a send, mark the outcome unknown and do not automatically replay it. This can miss a reminder after a crash; avoiding repeated nudges is the preferred tradeoff. Recover an expired preparation lease only when the marker shows that dispatch never started.

Retry a send only for a **definite provider rejection before acceptance**, such as an explicit rate-limit rejection, with bounded exponential backoff inside the candidate window. Recheck every suppression condition before retry. Inspect the sender library's automatic retry behavior so an ambiguous timeout is not silently resent. Receipt polling retries are separate and must not resend the message.

Expo and platform delivery remain best effort and can duplicate or delay a message independently of application deduplication. Deduplicate received/open actions by notification ID and suppress obsolete foreground presentation. A final eligibility check cannot recall a notification already handed off just before someone reads or opts out. Short TTL and gentle, time-independent wording limit that race; do not promise exact-once delivery or perfect cancellation.

## Operations and measurement

Add an immediate backend kill switch and a small rollout allowlist. Initially record would-send/cancel decisions without calling a provider, then test on staff-owned opted-in accounts. Expand only after device and suppression checks pass.

Measure eligible, suppressed-by-reason, attempted, provider accepted/rejected/unknown, opened, and subsequent confirmed reading separately. Acceptance is not an impression; an open is not a completed chapter; a return after a message is not proof of causation. Watch opt-outs, complaints, duplicate attempts, stale messages, and reading return together. Do not optimize for notification opens alone.

Use a proposed 30-day retention period for campaign diagnostics and remove stale disabled registrations on a documented schedule. Account deletion overrides retention. Keep permanent reading history separate from short-lived delivery logs. Review infrastructure quotas and billing requirements during deployment planning; no cost or delivery-rate guarantee is assumed here.

## Implementation sequence

1. **Streak dependency:** complete and pilot the daily ledger and shared completion service.
2. **Preferences and contracts:** implement opt-in UI, quiet hours, pause, category consent, timezone display, account scope, and allowlisted resume intent.
3. **Native transport:** install matching Expo packages, configure credentials/builds, register one preferred installation, and verify permission/token lifecycle.
4. **Backend eligibility:** add validated operations, rules, indexes, deterministic campaigns, shared budget, leases, due-account query, and kill switch. Start in dry-run mode.
5. **Sending and receipts:** add bounded handoff behavior, short TTL, unknown-outcome handling, invalid-token cleanup, and receipt processing.
6. **Device pilot:** verify app lifecycle, duplicate suppression, account changes, quiet hours, pause/opt-out, and navigation on actual signed builds.
7. **Small release:** review return, opt-out, stale-message, and complaint patterns before expanding. Keep reminders optional and reversible.

## Acceptance scenarios

- No permission or saved category consent means no token registration for sending and no campaign handoff.
- A qualifying completion on either device cancels an unsent same-day reminder; an unknown summary suppresses it.
- A reader active in the previous 30 minutes receives no candidate, and suppression does not cause a retry storm.
- Two concurrent workers, repeat scheduled invocations, two categories, and several devices respect the same date/24-hour/seven-day budget.
- A midnight crossing, DST transition, timezone mismatch, quiet-hour boundary, and scheduler outage do not create late catch-up messages.
- Gap-day 3 and 10 invitations obey the cooldown and stop after two unanswered handoffs; reading resets the episode. No prior reading means no comeback campaign.
- Repeated consent changes, pausing, OS denial, token rotation, offline sign-out, account switch, invalid token, and account deletion are handled.
- A definite rejection can retry within policy; an ambiguous timeout or crash after the attempt marker cannot fan out or replay a nudge.
- A push can open a cold or warm app to the correct device-saved plan position without awarding reading credit. An account-scope mismatch opens neutral Today.
- Foreground duplicate events, repeated taps, receipt polling retries, reduced motion, and screen-reader controls behave predictably.
- Lock-screen copy contains no prayer text or detailed reading history; provider acceptance is never reported as a confirmed impression.
- This documentation alone leaves production reminders off.

## Technical references

[Expo push overview](https://docs.expo.dev/push-notifications/overview/) explains the gateway approach. [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) covers client capabilities and setup; select the compatible SDK documentation/version during implementation. [Sending through Expo](https://docs.expo.dev/push-notifications/sending-notifications/) documents tickets, receipts, token errors, and delivery limits. [Firebase scheduled functions](https://firebase.google.com/docs/functions/schedule-functions) covers scheduled backend execution, and [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) covers claim/budget atomicity.

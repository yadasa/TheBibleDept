# Reading habits, reminders, and private notes

The active implementation lives in `bibledept-mobile`. This guide describes the shipped source, its local verification, and the configuration needed for a live release. The earlier [streak plan](READING_STREAKS_PLAN.md) and [reminder plan](READING_REMINDERS_PLAN.md) remain the design rationale.

## Data and behavior

All records stay under `bibledeptUsers/{uid}`. The server derives the owner from Firebase Authentication; email/password and phone accounts are supported. No client can write streak totals, daily credits, delivery campaigns, device tokens, or notification preferences directly.

| Path | Writer and purpose |
| --- | --- |
| `settings/readingHabit` | Callable: confirmed IANA zone and resumable legacy migration. |
| `readingSessions/{sessionId}` | Callable: immutable request and original receipt for retry deduplication. |
| `habitDays/{YYYY-MM-DD}` | Callable: one credit per reading date in the confirmed zone. |
| `stats/streak` | Callable: current run, longest run, total reading days, last qualified date. |
| `readings/{YYYY-MM-DD}` | Callable: latest completed chapter for that day; legacy history remains readable. |
| `settings/notifications` | Callable: opt-ins, preferred time, quiet hours, pause, preferred device, revision. |
| `pushDevices/{installationId}` | Callable: Expo token, permission, enabled state, opaque account scope. |
| `reminderState/current` | Backend: due timestamp, foreground suppression, frequency budget, inactivity episode. |
| `notificationCampaigns/{id}` | Backend: durable dispatch marker, provider result, receipt, open event. |
| `annotations/{id}` | Owner client: chapter, translation, verse range, excerpt, highlight and comment. Both Bible and Notes subscribe to these same documents. |
| `prayers/{id}` | Owner client: private prayer journal. |

`bibledeptPushBindings/{sha256(token)}` is server-only and keeps one token bound to one account/installation. Changing accounts disables its previous binding. Signing out attempts unregistering before clearing authentication; offline unregistering is best effort. Messages are generic and an opaque scope prevents another account from opening a stale reminder into a reading route.

Operational `lastForegroundAt`, attempt/cooldown values, and `pausedUntil` use epoch milliseconds. Query, audit, completion, and TTL fields use Firestore Timestamps. Campaign TTL is 30 days. Authentication deletion removes this namespace and token bindings; it does not touch other applications' collections. Pending client entries remain scoped to the original UID.

## Completion and recovery

After confirming a time zone in Account → Settings, the reader's **I've finished this chapter** action credits a whole chapter from either the plan or Search. A verse selection, opening the app, listening to audio, and changing the device's plan position do not award a day. The completion is an explicit reader affirmation, not proof of attention or a timer.

The client persists a random completion ID and its expected reading date before contacting the callable. A retry returns the original receipt even after midnight. A first submission after its expected date has ended is rejected with `expired_day`; the reader can retry or dismiss it, and it is never silently credited to today. Only one pending completion is kept per account on that device. The server validates the canonical chapter, translation, and plan membership. Time comes from the server, not a client timestamp.

Legacy history imports all valid dated entries in pages of 400, rather than the former 366-entry display window. Imported days are marked `legacy_self_reported`; they do not assert that the old app verified chapter completion. Setup holds a three-minute migration lease and blocks new completions until it finishes. An interrupted setup can be retried after the lease expires. The confirmed zone cannot be changed in this release.

## Notification policy and implementation decisions

Reminders require a separate explicit permission action and an enabled preference. Welcome-back invitations default off. The default reading reminder time is 19:30, outside 21:00–09:00 quiet hours. Reminder times use 15-minute steps in the confirmed reading zone. A scheduler evaluates bounded pages every 15 minutes UTC. A missed one-hour local window is skipped.

The worker sends at most one attempt per local date, waits at least 24 hours between attempts, and allows at most three in a rolling seven days. Reading today, recent foreground activity, a pause, denied permission, a missing account summary, quiet hours, or a disabled device suppresses sending. One preferred installation receives the message. Welcome-back episodes allow invitations on day 3 and day 10, with the second requiring a first handoff and seven days between handoffs; after two attempts the episode pauses until reading or an explicit re-enable.

Compared with the original plan, the worker combines claim and reservation into a single transaction that writes `dispatch_started` and consumes the account budget before HTTP. There is no separate planned/leased queue. Before handing off it rechecks preference revision, account/device state, foreground activity, reading completion, and expiration. Provider calls stay outside Firestore transactions. A transport timeout or ambiguous response is recorded as `delivery_unknown` and never replayed. This release also skips retrying definite rejections: fewer reminders are preferable to accidental pressure. Overlapping schedulers cannot reserve the same campaign twice. A tiny race between the final check and an external provider remains unavoidable.

Expo ticket acceptance means provider acceptance, not device display. Receipt polling detects invalid devices and disables them; opens are separate from reading completion. Delivery cannot be guaranteed. Campaign diagnostics expire after 30 days; idempotency receipts and reading history remain until account deletion.

## Local checks

From `bibledept-mobile`:

```sh
npm ci
npm --prefix functions ci
npm run typecheck
npm test
npm --prefix functions run build
npx firebase emulators:exec --config firebase.test.json --project demo-bibledept --only auth,firestore,functions "npm run test:firebase && npm --prefix functions run test:integration"
```

The isolated test configuration uses auth 19099, Firestore 18080, and Functions 15001, so it can coexist with the usual local suite. The integration tests refuse to use a real Firestore database. Emulator tests never send SMS or push messages. For a preview on those ports, set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true`, host `127.0.0.1`, and the three `EXPO_PUBLIC_FIREBASE_*_EMULATOR_PORT` variables to the corresponding ports before starting Expo.

## Live Firebase release

The checked-in default project remains **demo-bibledept**. Do not deploy these rules wholesale over a different application's rules. The retained legacy backend references other project aliases and is not the active deployment source.

1. Configure the intended Firebase project's public Web App values in ignored `.env.local`, with emulator mode false. Match the native files to this same project. Enable email/password and Phone in Authentication, configure authorized web domains and SMS regions, and configure billing/quota as required by Firebase.
2. Review and merge this namespace's rules into any existing live rules, preserving unrelated collections. Confirm the two collection-group indexes and the campaign `deleteAfter` TTL policy.
3. Create an Expo push access token, enable access-token security for that Expo project, and save it with `firebase functions:secrets:set EXPO_PUSH_ACCESS_TOKEN --project YOUR_PROJECT_ID`. Keep secrets out of the repo and public Expo variables.
4. Copy `functions/.env.example` to the ignored project environment file. Keep `HABIT_PUSH_ENABLED=false` initially. Set `HABIT_PUSH_ALLOWLIST` to the UID of a consented test account for the first signed-device test.
5. Build, then deploy only the active codebase, its reviewed rules, and indexes with an explicit project ID. For a dedicated project, the selection is `firebase deploy --only functions:bibledept-mobile,firestore:rules,firestore:indexes --project YOUR_PROJECT_ID`. An existing shared project requires its merged rules file first. Deploying does not enable push delivery by itself.
6. Verify completion and account privacy against the configured project, then test native SMS and push on physical iPhone and Android devices. Only after that pilot set the push flag true for the allowlist. Expand to `*` deliberately after acceptance. Setting the flag false disables further scheduler dispatches on the next deployed configuration.

The callable endpoints use authenticated owner validation and server-side input checks. Firebase App Check enforcement is not configured in this client; add and verify App Check for the intended native/web builds before a broad production rollout. Add operational monitoring for function errors and receipt failures. No production deployment or real SMS/push delivery is implied by the local test results.

## Signed native builds and SMS

The SDK 57 client includes the matching Expo Notifications, Device, Image and Crypto packages. Expo Go can test email and fictional emulator phone authentication; remote push and live native phone authentication need a signed build.

- Set `BIBLEDEPT_NATIVE_PHONE=1`. Provide `BIBLEDEPT_FIREBASE_IOS_CONFIG` (GoogleService-Info.plist) and/or `BIBLEDEPT_FIREBASE_ANDROID_CONFIG` (google-services.json) for the platform you build. These files are ignored. The app checks that native and JavaScript project IDs match.
- Configure the iOS app's APNs key, push capability, URL scheme/reCAPTCHA fallback, and bundle ID in Firebase. Follow the [existing iPhone setup](IPHONE_NATIVE_SETUP.md). For Android register the package and SHA-1/SHA-256 signing fingerprints, and configure the app-verification/reCAPTCHA requirements in Firebase.
- Set `EXPO_PUBLIC_EAS_PROJECT_ID` to the actual Expo project UUID and configure APNs/FCM v1 push credentials for that project. Follow [Expo's notification setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
- On web, Firebase's visible reCAPTCHA verifier supports phone sign-in on authorized hosted domains. The verifier is cleared after each attempt and on unmount. Firebase does not permit live phone authentication from localhost; local preview uses the demo emulator instead. Codes expire server-side; resend has a 60-second UI cooldown in addition to Firebase's rate limits.
- Phone and email may represent separate Firebase accounts. The current UI states this before SMS sign-in. Account linking is not implemented in this release.

See [Firebase phone authentication](https://firebase.google.com/docs/auth/web/phone-auth), [React Native Firebase phone authentication](https://rnfirebase.io/auth/phone-auth), [Expo SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), and [Expo delivery semantics](https://docs.expo.dev/push-notifications/sending-notifications/) for platform requirements.

# Required sign-in: rollout draft

**Status: proposed, not activated.** The current app continues to allow reading and listening without an account. This plan describes a future change in access; it does not change pricing or add payments.

## Intended experience

After a short welcome, a signed-out reader creates an account or signs in before entering the main app. Email is the dependable default. The phone option appears only where its real verification flow is available, with email always reachable. Existing signed-in readers go straight to their saved place after session restoration.

Use the existing account form's matching **Sign in** and **Create an account** buttons. Do not reintroduce the removed logo or a guest/free-access footer. Say what the account saves in ordinary terms: “Save your notes, prayers, and reading history.” Do not claim that local plan position or listening progress syncs between phones.

## Existing behavior to preserve

| Area | Current implementation | Gate implication |
| --- | --- | --- |
| Session restoration | `AuthProvider` publishes readiness separately from the user. | Wait for readiness; do not briefly show the signed-out form or private pages while restoring. |
| Email | Registration, password sign-in, password reset, and native persistence are present. | Reuse the existing flow and friendly error mapping. |
| Phone | Web verification and isolated practice flows exist; live native verification is not ready in the current client. | Keep unavailable phone entry hidden or clearly unavailable, with email offered. Never leave a new reader at a dead end. |
| Local plan/listening | Guest and account records are separate; account records remain local. | Preserve both owners. No silent merge, reset, or upload. |
| Private records | Notes, prayers, chapter history, and streak records already require the account. | Retain owner checks and server rules; a UI gate does not replace them. |
| Links | Validated website/app links open supported app destinations. | Retain the intended destination through sign-in, then resolve it once. |
| Sign-out | Notification-device detachment is attempted before sign-out; offline sign-out remains possible. | Clear private views promptly and return to the entry flow. Do not lose another owner's local records. |

Source entry points: [App](../../bibledept-mobile/App.tsx), [AuthProvider](../../bibledept-mobile/src/services/AuthProvider.tsx), [AccountScreen](../../bibledept-mobile/src/screens/AccountScreen.tsx), [link parsing](../../bibledept-mobile/src/services/links.ts), [PlanProvider](../../bibledept-mobile/src/services/PlanProvider.tsx), and [listening ownership](../../bibledept-mobile/src/state/usePodcastListening.ts).

## Session states

Use an explicit state model rather than treating every missing user as signed out.

| State | Visible behavior |
| --- | --- |
| Restoring session | A quiet app loading screen. No private content or actionable gate yet. |
| Signed out | Welcome/account entry; password recovery and available sign-in options remain accessible. |
| Signing in | Keep the form and progress feedback visible; prevent duplicate submissions. |
| Signed in | Mount the authenticated app for that owner, then resolve a validated pending destination. |
| Temporary connection failure | Keep a restored session usable for already local content; explain that online passages and account changes need a connection. Never silently sign the reader out for an ordinary network error. |
| Session actually invalidated | Stop new private actions, conceal private views, and request sign-in again. Preserve local progress under its previous owner. |
| Sign-out | Stop owner-bound listeners/player bookkeeping, detach the notification binding as supported, conceal private content, then show account entry. |

Define the audio policy explicitly when implementing the gate: pause an active episode on an intentional sign-out, preserve that owner's local listening record, and do not credit a different owner for the old session.

## Keep the reader's destination

Store only a parsed, validated navigation intent while signed out. Do not store arbitrary URLs, credentials, reset tokens, or note text in the gate's state. A second valid link may replace the previous pending destination; invalid links leave it unchanged.

After sign-in and owner-scoped progress hydration, open the destination once. A Scripture link retains its reference and supported translation; a reminder resume intent retains its intended plan day. If onboarding is also due, retain the destination through onboarding and show an appropriate “Continue reading” finish action. A normal cold launch returns to the account's saved current day instead of replaying an old intent.

## Existing guest progress

The first gate rollout may encounter people who have already read or listened as guests. Keep their local records intact. The default is **Keep account progress**; changing accounts must never copy the previous person's progress automatically.

Offer a separate, explicit “Bring this phone's reading progress” choice only after showing a short preview of the source and destination. For a new account with no local plan history, the reader may adopt the guest's current day and matching lesson/listening records locally. If the account already has progress, preserve it and offer a separate reviewed import flow later rather than guessing which completion flags should win.

Implementation must be versioned, owner-bound, idempotent, and restartable after interruption. Copy the full corresponding lesson/listening data, not just a completed-day count, and only mark the adoption finished after durable saves succeed. Keep the guest source until the reader confirms the result. This proposal does not add cloud synchronization.

## Release prerequisites

- Email creation, sign-in, recovery, email confirmation, and session restoration pass in the isolated environment and the signed iPhone build.
- A genuine account-deletion and associated-data process is implemented and tested before a public mandatory-account rollout. The current UI has no pretend deletion button; do not ship one that merely signs out.
- Recovery guidance explains that email and phone currently create separate accounts. Do not imply they are linked or interchangeable until an actual linking/recovery flow exists.
- Privacy/account information accurately distinguishes private cloud records from local plan/listening data.
- Website link association, installed-app routing, notification resume behavior, and unsupported-phone fallback are verified on a physical iPhone.
- Onboarding can be skipped or resumed without hiding password recovery, consent information, or sign-out.

## Small implementation parts

1. Add and test pure session/gate routing with a named `requiredSignIn` release flag, default **false**. This flag does not bypass existing private-data rules.
2. Add the signed-out entry shell and recovery navigation using the real account screen. Keep all existing signed-in behavior working while the flag is off.
3. Add pending-link/resume handling and owner-switch cleanup; test sign-out while audio and subscriptions are active.
4. Add the separately reviewed guest-progress adoption flow, including interruption recovery.
5. Add onboarding integration, then validate physical-device sign-in and recovery before enabling any rollout.

Each part should be reviewed, checked, and pushed separately. Production authentication settings and migration operations are separate release actions, not incidental code changes.

## Acceptance and rollback

Test new accounts, returning accounts, wrong passwords, resend limits, password recovery, unavailable SMS, slow session restoration, offline restored sessions, revoked sessions, and sign-out. Test links received before launch, during sign-in, and during onboarding; each should resolve once. Test guest adoption, two different accounts on one phone, interrupted saves, and reinstallation without claiming local-only data survives removal.

Use emulator fixtures for account and datastore tests. Real SMS, email delivery, push, and native authentication require a separate explicitly configured device validation; successful browser tests do not prove those paths.

For rollback, turn the gate flag off and retain the current optional-account access model. Do not delete users, weaken private-data rules, erase local owner records, or reset onboarding checkpoints. The rollback must work even if a reader is partway through sign-in or onboarding.

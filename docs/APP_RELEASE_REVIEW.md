# App implementation review — October 18, 2026

The active source is committed in stages to `main`: default dark theme/settings/SMS, the habit/reminder backend, then Home/navigation/Notes and the visual revisions. This review distinguishes verified implementation from a live native release.

## Automated verification

| Check | Result |
| --- | --- |
| Expo client TypeScript | Passed. |
| Unit tests | 24 passed: Bible requests, links, plan mapping and persistence, streak dates/DST, reminder policy, annotation ranges, and theme contrast. |
| Firebase client integration | 2 passed: email/phone emulator auth, callable completion, owner-only data, protected server records, annotation creation/editing, timestamp/range validation and unauthenticated denial. |
| Backend integration | 5 passed: simultaneous retries of one ID, cross-account token reassignment/stale unregister, concurrent distinct completions, immutable retry receipts after midnight, expired first submission, 450-day migration, and reminder reservation deduplication/dry-run behavior. |
| Active Functions TypeScript build | Passed. |
| Expo web, iOS and Android JavaScript exports | Passed. These do not build or sign the native applications. |
| Git whitespace check | Passed. |

The test Firebase configuration uses a demo project and isolated ports. No real phone number, SMS send, Expo push send, APNs/FCM delivery, or production datastore was used.

## Browser review and revisions

Reviewed the actual app on localhost at desktop width and 390 × 844 / 320 × 740 phone sizes. The five tab targets remained at least 52 × 60 CSS pixels at 320 px width, with no horizontal document overflow.

Local-demo screenshots: [dark Home with floating navigation and transparent logo](app-preview/home-dark.jpg), [light Settings](app-preview/settings-light.jpg).

- Verified fictional SMS request/code entry and sign-in against the Auth emulator, with a 60-second resend cooldown. Real web reCAPTCHA and native app verification remain configuration/device checks.
- Verified signed-out users cannot see Settings; signed-in users can switch themes, and the saved choice survives reopening. Initial session restoration now shows a loading state so an early navigation tap cannot be lost when the account hydrates.
- Verified time-zone setup, a chapter completion increasing the Home streak, preservation of plan position, and clearing private content on sign-out.
- Created a Luke 1:1–3 highlight/comment, observed it automatically in Notes, edited it there, and reopened its original passage in Search. The same Firestore record supplied both views. Notes previews were revised to keep padding outside clamped text, avoiding a clipped extra line.
- Added explicit web ARIA selection/check states and hid inactive pages from accessibility traversal. Reduced-motion paths are implemented; native OS testing remains part of release validation.
- Corrected the nav after visual feedback: both page movement and indicator now use one 430 ms Animated.Value. The nav is an absolute overlay above the full-height page, with real backdrop blur and no opaque parent backing. Android receives an explicit BlurTargetView ref and blur method. A browser sample observed the incoming page still 21 px from its settled position while the nav indicator remained stretched, then both settled to their final geometry.
- Corrected the logo framing: the original AVIF was already transparent. Removed the added white wrapper and preserved its native 580:229 ratio, eliminating both padding and letterboxing without redrawing the brand asset.
- Increased grain visibility and replaced the regular fleck placement with a deterministic random pattern. It stays static and behind the content.
- Tightened reminder expiry to subtract the seconds already elapsed in the current minute, preventing a ticket TTL from extending beyond the local sending window or quiet-hours boundary. The boundary case is covered in the reminder policy tests.
- Browser console review reported no warnings or errors during the reviewed flows.

## Remaining live-release requirements

The repo still defaults to `demo-bibledept`; this work did not choose or deploy a production Firebase project. [Setup instructions](HABIT_FEATURES_SETUP.md) cover reviewed/merged rules, indexes/TTL, enabling Auth providers and SMS regions, Expo/APNs/FCM credentials, the push secret and allowlist, and the disabled-by-default dispatch flag.

Build and install signed iPhone and Android applications, then validate SMS app verification, notification permission/revocation, foreground/background/cold-start routing, token refresh, native blur, accessibility/text scaling, and real receipt handling. Universal-link association deployment and App Check configuration also remain release work. Notes synchronization requires a connection; durable offline annotation drafts are outside this release.

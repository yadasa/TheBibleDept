# App implementation review — October 18, 2026

The active source is committed in stages to `main`: default dark theme/settings/SMS, the habit/reminder backend, then Home/navigation/Notes and the visual revisions. This review distinguishes verified implementation from a live native release.

## Current implementation and optimization checkpoint

The navigation now has the restored frosted Church shell, isolated paint layers and an orange selected pill that does not apply a second moving backdrop blur. The page track settles explicitly at the selected index; measured widths, vertical-only offset restoration and web `overflow: clip` constrain horizontal layout. Browser checks passed at 390 and 704 px widths. The earlier native snapshot/exposure effects are removed; true native lateral motion blur is **not implemented**.

Native blur no longer sits beneath a masked ancestor. Web retains alpha scroll fades with an aligned inner backdrop. Five orange circles have separate measured SVG viewports and local definitions, positioned near each page's upper right. The full-height background extends beneath navigation and safe areas. Cached 120-point grain tiles replace 3,000 web pattern rectangles, and the redundant header grain is removed. All six density/theme PNGs and repeated 3×3 arrangements matched the original SVG's decoded pixels using the same rasterizer.

The completed optimization checkpoint passed TypeScript, all 65 unit tests, dependency compatibility, and web/iOS JavaScript exports. Stable waveform components retained their SVG nodes during browser playback. These are the results before the separate neighboring-bar falloff revision. [REQUEST_AUDIT.md](REQUEST_AUDIT.md) records final counts, measurements, the latest waveform behavior and remaining requests; it is the current verification ledger.

Physical iPhone glass-seam and touch-appearance checks remain pending. Locked/background audio is unresolved: Expo Go stopped playback with PCM sampling enabled and disabled, and the user explicitly deferred further work on it. Foreground playback across pages works in browser checks. No native FPS, memory or installed-binary-size improvement is claimed.

## Historical automated verification

The following table records the earlier implementation checkpoint, before the current audio, glass and optimization revisions. Its test counts and exports are preserved as historical results.

| Check | Result |
| --- | --- |
| Expo client TypeScript | Passed. |
| Unit tests | 27 passed: Bible requests, links, plan mapping and persistence, streak dates/DST, reminder policy, annotation ranges, theme contrast, intermediate-page journeys, interrupted swipe positions, and distance-based timing. |
| Firebase client integration | 2 passed: email/phone emulator auth, callable completion, owner-only data, protected server records, annotation creation/editing, timestamp/range validation and unauthenticated denial. |
| Backend integration | 5 passed: simultaneous retries of one ID, cross-account token reassignment/stale unregister, concurrent distinct completions, immutable retry receipts after midnight, expired first submission, 450-day migration, and reminder reservation deduplication/dry-run behavior. |
| Active Functions TypeScript build | Passed. |
| Expo web, iOS and Android JavaScript exports | Passed. These do not build or sign the native applications. |
| Git whitespace check | Passed. |

The test Firebase configuration uses a demo project and isolated ports. No real phone number, SMS send, Expo push send, APNs/FCM delivery, or production datastore was used.

## Historical browser review and revisions

Reviewed the actual app on localhost at desktop width and 390 × 844 / 320 × 740 phone sizes. The five tab targets remained at least 52 × 60 CSS pixels at 320 px width, with no horizontal document overflow.

Local-demo screenshots: [dark Home with floating navigation and transparent logo](app-preview/home-dark.jpg), [light Settings](app-preview/settings-light.jpg).

- Verified fictional SMS request/code entry and sign-in against the Auth emulator, with a 60-second resend cooldown. Real web reCAPTCHA and native app verification remain configuration/device checks.
- Verified signed-out users cannot see Settings; signed-in users can switch themes, and the saved choice survives reopening. Initial session restoration now shows a loading state so an early navigation tap cannot be lost when the account hydrates.
- Verified time-zone setup, a chapter completion increasing the Home streak, preservation of plan position, and clearing private content on sign-out.
- Created a Luke 1:1–3 highlight/comment, observed it automatically in Notes, edited it there, and reopened its original passage in Search. The same Firestore record supplied both views. Notes previews were revised to keep padding outside clamped text, avoiding a clipped extra line.
- Added explicit web ARIA selection/check states and hid inactive pages from accessibility traversal. Reduced-motion paths are implemented; native OS testing remains part of release validation.
- Corrected the nav after visual feedback: page movement, background, motion blur and indicator now use one animation clock (430 ms adjacent, up to 700 ms for long jumps). The nav is an absolute overlay above the full-height page, with real backdrop blur and no opaque parent backing. Android receives an explicit BlurTargetView ref and blur method. A browser sample observed the incoming page still 21 px from its settled position while the nav indicator remained stretched, then both settled to their final geometry.
- Corrected the logo framing: the original AVIF was already transparent. Removed the added white wrapper and preserved its native 580:229 ratio, eliminating both padding and letterboxing without redrawing the brand asset.
- Increased grain visibility and replaced the regular fleck placement with a deterministic random pattern. It travels horizontally with the page while remaining visible beneath the transparent scroll fades.
- Tightened reminder expiry to subtract the seconds already elapsed in the current minute, preventing a ticket TTL from extending beyond the local sending window or quiet-hours boundary. The boundary case is covered in the reminder policy tests.
- Browser console review reported no warnings or errors during the reviewed flows.

## Historical follow-up visual review

- Rebuilt page transitions as one ordered track. At 390 px width, a Notes → Account sample showed Bible at x = 99 px while Account was still offscreen at x = 489 px. Content and grain had the same −1071.23 px transform. Motion blur was 2.47 px during travel and 0 px on arrival.
- Verified the original 128 px logo begins about 16.7 px below the web viewport top. Removed the alignment override that had pinned it to the top.
- Replaced opaque scroll-edge gradient overlays with alpha masks. The background persists where foreground content reaches zero alpha, and the header divider is removed.
- Replaced flat button/card fills with shared frosted blur, reflected lighting and borderless shadows. Checked the plan card and action labels in both Dark and Light, including the darker orange glass needed for white labels in Light.
- Checked local phone sign-in and signed-in appearance controls after the button changes. Inactive web pages use `inert` in addition to ARIA hiding so their retained inputs cannot receive keyboard focus.
- Re-ran client TypeScript, all 27 unit tests and web/iOS/Android JavaScript exports after the changes. Backend behavior was unchanged; the prior Firebase/backend integration results above remain the baseline.
- At 320 px width, the document had no horizontal overflow and nav targets measured about 53 × 60 px. A clean reload of the finished app reported no console warnings or errors.

## Historical navigation repair — October 18, 2026

The motion-blur measurements above remain as the earlier review baseline. The current implementation removes velocity-based exposure and native screen capture. Pages and grain now move directly on the continuous track, while synchronous transition setup and stable animated coordinates prevent rapid taps from restoring obsolete endpoints. The liquid pill remains, and labels stay readable while it moves. The transparent nav background and warm frosted materials are unchanged. Native transition performance still requires device review; snapshot capture is no longer part of that check.

## Remaining live-release requirements

Validate the configured Firebase environment and deployment state using the [setup instructions](HABIT_FEATURES_SETUP.md): reviewed/merged rules, indexes/TTL, Auth providers and SMS regions, Expo/APNs/FCM credentials, the push secret and allowlist, and the disabled-by-default dispatch flag. Earlier emulator results above do not verify those live services.

Build and install signed iPhone and Android applications, then validate SMS app verification, notification permission/revocation, foreground/background/cold-start routing, token refresh, native blur, accessibility/text scaling, and real receipt handling. Universal-link association deployment and App Check configuration also remain release work. Notes synchronization requires a connection; durable offline annotation drafts are outside this release.


### Historical deployment note

At the original review checkpoint, the repository defaulted to `demo-bibledept` and that checkpoint did not select or deploy a production Firebase project. This describes that earlier review, not the current environment's target.

### Historical audio session and SVG repair — October 18, 2026

This records the repair and test status at that point. The sampling-disabled comparison mentioned below was subsequently performed and also failed; the user then deferred locked-audio work. The current native-mask and grain implementations are described above and in [REQUEST_AUDIT.md](REQUEST_AUDIT.md).

The first phone lock test stopped audio. The global player now retains its audio
session while buffering, removes its redundant pre-replace pause, and serializes
explicit activation/release. Backgrounding disables PCM visualization work without
pausing the transport; foreground return restores sampling. Lock-screen controls
register after playback begins. The repeat iPhone lock test still stopped audio;
the issue remains open. A fresh Expo Go run with PCM sampling disabled is the
next controlled comparison. See the diagnostic instructions in PODCASTS.md.

Numeric SVG gradient stops replace leading-decimal strings that the native SVG
parser rejected and logged repeatedly. This repairs the material's stop positions
and removes that warning source. The current repair passes TypeScript and 44 unit
tests; the preceding navigation/audio revision passed iOS JavaScript export.
Browser checks cover rapid navigation reversals, exact
pill/page alignment, continued audio across pages, and no snapshot layers.

The subsequent glass repair replaces stacked reflections with one continuous
sheen, preserving actual backdrop blur. iPhone confirmation of the reported
vertical opacity seam remains pending.

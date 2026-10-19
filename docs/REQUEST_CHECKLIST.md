# User request checklist

Updated October 19, 2026. This checklist covers the requested app changes and the
latest review batch. It records source completion separately from device tests,
release configuration, and future plans. A successful JavaScript export is not a
signed native build or evidence that a feature worked on an iPhone.

**Status:** **Complete** = present in the reviewed source or completed document;
**Verify** = further device or release evidence needed; **In progress** = current
work not yet signed off; **Blocked** = a required external resource is missing;
**Deferred** = the user asked to leave it for later; **Draft complete** = the
requested plan exists, but its proposed behavior is not activated.

## Repository, branding, and local testing

| Request | Status | Result / evidence |
| --- | --- | --- |
| Replace CarryBible branding with BibleDept / The Bible Department and use `thebibledept.com` | Complete in active app | Active client branding and supported website links use the supplied name/domain. Legacy `@carrybible/*` package identifiers and historical issue links remain as technical references; this is not a claim that every literal occurrence was removed from the archived project. |
| Publish to `yadasa/TheBibleDept`, clear the old repository/history, and call its first commit `initial commit` | Complete | Current history begins with `2f6ff83 initial commit`; the project was then imported in separate parts. |
| Push each completed part separately | Complete; continuing | Reviewed changes have separate incremental commits/pushes. This remains the working rule for unfinished parts. |
| Add a README explaining the app's purpose, features, and relationship to the website | Complete | [Root README](../README.md) documents the active features, original-source boundaries, launch plans, and current limits, with a banner and feature mockups. |
| Run locally on Windows and preview on the same-Wi-Fi iPhone | Complete | Expo client and [local setup](LOCAL_TESTING.md) are present. The user previously confirmed the app opened and looked good on the iPhone. Latest visual changes still need another device review. |
| Keep the current app available in the browser preview | Complete | Port 8081 is the main preview for the active `bibledept-mobile` checkout. Temporary isolated QA previews are separate. |
| Use the Firebase SDK and the existing church project rather than invent a new production project | Complete in source; deployment Verify | Firebase SDK/account integration is present. Earlier project/rules authorization does not establish that every later backend feature is deployed; current live deployment remains a separate release check. See [backend setup](HABIT_FEATURES_SETUP.md). |
| Make the app free; remove giving and payments | Complete in active app | No giving, checkout, subscriptions, or payment SDKs in the active Expo client. Legacy migration references are retained separately. |

## Reading, progress, and Scripture selection

| Request | Status | Result / evidence |
| --- | --- | --- |
| Map every day of the supplied 365-day PDF to its passages | Complete | [Bundled reading map](../bibledept-mobile/src/data/bibledept-365.json) and [mapping notes](READING_PLAN.md) cover all 365 days. |
| Keep the mapping compact and inside the app, not in the cloud | Complete | Reading and episode indexes are bundled locally; no cloud passage-day mapping was added. |
| Start a new reader/demo on Day 1, mark the current day, and continue to the next | Complete | Device/owner-scoped plan position defaults to Day 1; current, browsing, completed, continuation, and finished states are implemented. |
| Browse any day through a styled calendar or simple day selector | Complete | Numbered day picker, current-day shortcut, completion markers, paged groups, and direct 1–365 number entry. Browsing does not advance the saved current day. |
| Stream Scripture from a free API and document its request/response format | Complete | WEB/KJV chapters use bible-api.com on demand with a bounded cache, cancellation, throttling, and retry guidance. [API format and limits](BIBLE_API.md). |
| Provide bounded Book, Chapter, Verse, and Translation dropdowns | Complete | Search uses valid book/chapter choices and actual loaded verse numbers/ranges; translation selection is shared. Long choice lists are virtualized, with selected/expanded states and a dropdown chevron. |
| Make NIV the default and remember the chosen translation | Blocked for NIV | The user confirmed no licensed API access exists. WEB/KJV and remembered selection work; NIV is neither labeled as available nor silently substituted. [NIV access/integration checklist](NIV_SETUP.md) is complete. |
| Remember the chapter and scroll position | Complete | Local per-owner chapter/offset restoration; automatic restores and mini-player jumps do not count as reading. |
| Complete a lesson after all its reading and teaching, with the last two audio minutes optional | Complete | Real scrolling must reach each loaded chapter's text end. Observed contiguous listening must cover the required duration; seeks and unobserved gaps over 2.5 seconds are excluded. Completion persists locally. |
| Celebrate completion and show completed days consistently | Complete | Durable, day-specific congratulations acknowledgement; Home and picker counts include out-of-order completions. Manual plan continuation remains a separate action. |
| Add the official introductory episode without a fake reading day | Complete | Official **Day 000** is optional from Day 1 and the plan picker, has no chapters, and earns no 365-day reading/listening credit. Normal entry shows its heading; a mini-player return targets its player. New readers still start on Day 1. |
| Leave offline Bible reading/downloads until later | Deferred | No bulk Bible download was added. Online passages still require a connection. |

## Podcast sources, controls, and waveforms

| Request | Status | Result / evidence |
| --- | --- | --- |
| Find official podcast links and match a teaching to each day's plan | Complete | All 365 daily episodes plus the optional introduction use official RedCircle metadata. Episode, Apple Podcasts, and Spotify links are present. Six publisher/printed-plan range differences remain visible. [Source and mapping details](PODCASTS.md). |
| Explain where audio streams from | Complete | Official RedCircle RSS MP3 enclosures; metadata and reference amplitudes are bundled locally, while audio streams on demand. No audio cloud mapping or runtime whole-file waveform download. |
| Use React Native Waveforms, orange bars, and actual podcast amplitudes in Expo Go | Complete in source; native appearance Verify | `PlayerWaveform` renders 96 genuine measured RMS bins per episode, with supported foreground live PCM updates. iOS zero sample timestamps use its actual playback clock. Android retains reference bars without requesting microphone access for live analysis. |
| Keep real bars visible when paused and before unheard sections play | Complete | Compact measured waveforms exist for all 365 episodes and the introduction. Dynamic ads can make a later stream differ from the reference; heard PCM takes priority. No fabricated waveform values. |
| Fix the flat-looking full waveform while preserving measured differences | Complete | A fixed linear scale from each episode's reference peak makes relative amplitude visible without rescaling unrelated bars when the live level changes. |
| Add 1.25×, 1.5×, and 2× listening speeds | Complete | 1×/1.25×/1.5×/2× with pitch correction. Gauge/current-rate button opens choices and closes after four idle seconds, a selection, or a second tap. |
| Show a bright gradient fading backward from the listening position | Complete | The later requested trail is 4.5 bar pitches long and clipped to bar fills, with no broad glow outside the bars. Actual media time controls its position. |
| Match and ease the white anchor height to the recent bars; add a regular-height guide | Complete | Thick 2.5 px cue averages the previous four displayed bars and eases over 180 ms. A separate thin translucent guide retains regular height. Full cue is centered; mini cue is bottom-aligned. |
| Let the active bar affect its neighbors, with a lower cap away from the cursor | Complete | Real live level blends through four past pitches and a sharper two future pitches. Uninfluenced/full paused bars cap at 67%; the center may reach 100%. A recent measured-profile floor is 33% below the prior average, without recursive feedback. |
| Desaturate and lower opacity for future full-player bars | Complete | Full-player future bars are gray at 67% of their previous opacity. Complementary clips prevent tint leakage into played orange. |
| Put a static waveform behind mini-player text with 33%/67% height behavior | Complete | Bottom-aligned reference silhouette remains visible; maximum height eases from 33% at rest to 67% during dragging, with a blurred/sharp crossfade. Live RMS does not reshape the mini silhouette. |
| Keep the entire mini waveform saturated, including future portions | Complete | The later mini-only request supersedes its earlier future-gray styling. Entire mini silhouette uses the shared orange; future opacity remains quieter. Main-player future gray remains. |
| Ease every waveform touch interaction and seek only when released | Complete | Press, preview, release, neighboring heights, anchor, mini expansion, and blur/sharpness transitions ease without remounting bars. Horizontal dragging does not capture ordinary vertical reading scroll. |
| Keep the player across pages and return directly to the right episode | Complete | Global player, persistent play/pause/close, drag seek, and mini-player shortcut to the correct daily or introductory player anchor. Browsing alone does not replace audio. No autoplay/resume after restart is claimed. |
| Fade and blur the mini-player on entry and exit | Complete in source; native appearance Verify | Retained exit content, fade plus real web/native blur, interruption-safe reopening, and immediate/no-blur reduced-motion mode. Physical iPhone blur needs review. |
| Compact fifteen-second controls and frost the Daily teaching card | Complete | Compact circular skip targets and round play/pause; frosted background with no outline, and speed choices remain outside the clipping layer. |
| Keep playing when the iPhone locks/backgrounds | Deferred, unresolved | Physical Expo Go tests stopped playback with sampling both on and off. The user explicitly deferred this issue. Background flags/lock metadata and exports do not count as a working lock test. |

## Design, navigation, and copy

| Request | Status | Result / evidence |
| --- | --- | --- |
| Redesign in parts using the repository style guide and Bible Dept website | Complete in source; latest device review Verify | Shared semantic themes, typography, spacing, glass controls, reader pages, and five-tab layout follow the [style guide](style-guide/README.md). Work was checked and pushed in separate parts. |
| Use one orange consistent with the waveform | Complete | Shared `#F05A00` pigment and derived opacity/brightness tones throughout both themes. Distinct annotation colors and readable text remain intentional. |
| Make the navbar transparent, retain the Church glass design and animated pill | Complete | Floating frosted shell and selected orange pill have no opaque page backing; Notes · Prayer · Home · Bible · Account. Isolated paint layers prevent ghosted labels. |
| Invert icon fragments exactly where the moving pill overlaps | Complete | Spatially clipped inverted icon row stays aligned through pill movement; only five accessible destinations. No delayed color settlement timer. |
| Fix interrupted transitions, nav lag, and horizontal layout | Complete in source; physical latency Verify | Exact page-width settlement, interrupted-journey handling, memoized page/nav boundaries and idle preparation reduce work on a tab tap. Browser reversals and 320/390/704 px geometry checks passed. Native tap latency was not measured. |
| Add actual subtle lateral motion blur instead of oscillating Gaussian intensity | Not implemented | Earlier exposure/snapshot effects were removed after regressions. Current continuous page transitions do **not** implement native directional motion blur. This request is still outstanding. |
| Place five larger orange circles higher/right and extend the background below navigation | Complete | One separately measured circular gradient per page; full-height background and cached grain extend through safe areas/navigation. |
| Fix glass seams, invisible/cropped icons, and add subtle material edges | Complete in source; iPhone appearance Verify | Numeric SVG stops, continuous sheen, isolated paint layers, foreground icons, unclipped controls, and restrained edge highlights. Native page blur has no masked ancestor. |
| Remove the TBD logo from sign-in before screenshots; keep the header responsive | Complete | Removed the sign-in body's logo and replaced the signed-out Account header image with a text wordmark. Other pages retain the logo. At 320 px the slogan wraps below it; at 390 px both fit with clearance. |
| Compact the Home introduction | Complete | Short heading and one direct sentence lead into the current reading, rather than a large landing-page introduction. |
| Fix Reading plan/Search tabs and remove their divider | Complete | Equal-width rounded targets with full labels and one selected state; search selection/drafts survive mode changes. |
| Remove default UI underlines | Complete in reviewed source | Episode/platform links, time choices, and chapter selection use the intended material/selection state rather than default underlines. This does not alter Scripture. |
| Rewrite generic/technical copy using Bible Dept, ARMA, and the AI-writing article as references | Complete | Plain task-specific instructions and friendly errors; no raw provider/build/storage explanation. The article supplied editing criteria, not an authorship detector. [Copy rationale and sources](APP_DESIGN_IMPLEMENTATION.md#time-settings-and-product-copy). |
| Remove provider and internet footers | Complete | Removed the requested visible RedCircle/streaming and public-domain/Internet-required footers from product screens. Required future licensed-text notices remain a separate obligation. |
| Show settings time in AM/PM | Complete | Reminder and quiet-hour hour/minute/AM–PM pickers; internal scheduling format remains unchanged. |
| Apply consistent styling and eased transitions to the new pages | Complete in source; device review Verify | Account/profile/progress/preference pages use shared glass/type controls and short eased route feedback with reduced-motion support. This is separate from the unimplemented directional-blur request. |

## Accounts, notes, and personal features

| Request | Status | Result / evidence |
| --- | --- | --- |
| Use only email or phone sign-in | Complete in source; live SMS Verify | Email registration/sign-in/reset/session persistence; phone flow and fictional emulator tests. Real native SMS needs a signed/configured build; public web SMS needs an authorized domain/reCAPTCHA. No social-login flow in the active client. |
| Match Create account styling to Sign in; remove account logo and guest/free-access footer | Complete | Both account actions use the same primary styling. Removed the requested logo/footer; account form remains discoverable without changing present guest access. |
| Make Account and its subpages useful and functional | Complete in source; live/device verification Verify | Account home; editable profile name; email confirmation/check and password reset; current plan/completion stats, saved reading history, notes/prayer shortcuts; preferences and real destination actions. No fake account-deletion button. |
| Finish appearance, reading, and reminder preference pages | Complete in source; live delivery Verify | Theme choice; translation/text-size preview; reading time zone; reminder time, quiet hours, pause and opt-ins. Actual SMS/push delivery and native permission behavior remain release checks. |
| Restore verse highlighting/comments and automatic Notes updates | Complete | Both readers provide range selection, highlight/note actions, edit, color, copy, delete, and Notes reopening of the source range. One owner-private annotation document backs both views. Isolated demo-account save/edit/reload/sign-out checks passed. |
| Show an annotation action from a single verse tap | Complete | Single tap reveals a nearby note shortcut while retaining existing saved-note editing, range selection, and long-press alternatives. Native text-selection coexistence still needs iPhone review. |
| Keep private prayers, reading days/streaks, and reminders working through the redesign | Complete in source; release Verify | Existing owner rules/providers and server-owned reading-day ledger retained. Signed-in plan position and completed lessons now sync; chapter offsets/listening remain local and lesson completion is distinct from account streak credit. |
| Keep website links that open the app | Complete in source; public activation Verify | Validated route parser, custom scheme, associated-domain configuration and association-file generator. Public website association/fallback deployment and signed-iPhone validation are not yet established. [App links](APP_LINKS.md). |
| Draft a future mandatory-auth launch flow | Draft complete | [Sign-in gate plan](launch/AUTH_GATE_PLAN.md) covers entry, recovery, links, ownership and rollback. No gate was activated; reading/listening currently remain available without sign-in. |
| Draft first-time onboarding | Draft complete | [Onboarding plan](launch/ONBOARDING_PLAN.md) covers Day 1, real preferences, optional verified intro, resume/replay, accessibility and contextual reminder permission. No onboarding flow or first-launch permission prompt was added. |

## Quality review, documentation, and remaining checks

| Request | Status | Result / evidence |
| --- | --- | --- |
| Audit the full request list before calling the work finished | Complete | This checklist and [REQUEST_AUDIT.md](REQUEST_AUDIT.md) record completed work and explicitly retain the real exceptions. |
| Optimize speed, loading, rendering, glitches, and unnecessary bulk | Complete; native profiling Verify | Stable waveform renderers, cached grain, canceled-request queue repair, virtualized dropdowns, memoized pages and idle preparation. Time-zone setup has a bounded wait, and below-passage scrolling cannot earn reading credit. Native FPS/memory were not measured. |
| Check each part and perform a final bug/visual/performance review | Complete for available environment | 101 unit tests, TypeScript and fresh web/iOS/Android exports passed. Browser checks covered responsive layouts, reversals, saves, theme/preferences, Notes, intro playback, seeking, and speed choices. Physical release checks remain separate. |
| Add realistic 3D iPhone mockups using actual app screenshots throughout the README | Complete | Six real screenshots appear in three reviewed rendered compositions. [Images, raw captures and prompts](images/README.md). |
| Add a dark/orange README banner | Complete | Reviewed three-phone banner at the top of the refreshed README; two more feature compositions appear in the body. WebP images total 603,250 bytes and do not enter the app bundle. |
| Verify the latest native visual and interaction changes | Verify | Physical iPhone checks remain for glass/blur appearance, touch feedback, large text/VoiceOver, verse selection, new subpage transitions, and navigation latency. The user is asleep, so no device confirmation is implied. |
| Validate live release services | Verify | Signed native SMS, email delivery, push permissions/credentials/dispatch, public app links, intended-project deployment, and App Check need their documented release setup/tests. Historical emulator suites are not a fresh production verification. |

## What is still open

### October 19 product-video revisions

| Request | Status | Result / evidence |
| --- | --- | --- |
| Fill the currently signed-in account with video examples | Complete | Added 12 notes and 10 prayers (7 active / 3 answered). The latest owner request sets 99 dated reading-history examples with realistic gaps and an 11-day current run, plus completed lessons 1–99 with Day 100 next. One earlier 21-day run is included for visual testing; every other earlier run is at most seven days. Server reads verified the totals and run constraints. Only seed-owned history was revised; profile and authoritative streak statistics were preserved. Private content and cleanup manifests remain outside Git. |
| Fix highlights and reading-history loading errors | Complete | Repaired the missing live owner-only namespace branches, tested the merged church rules and verified both errors disappeared in the active preview. [Deployment record](FIRESTORE_RULES_DEPLOYMENT.md). |
| Put the supplied podcast cover in the Daily teaching card's top-right corner | Complete | Bundled a 192 px JPEG from the supplied artwork; rounded corners, no runtime CDN dependency. |
| Enlarge the cover icon by 33% | Complete | Raised its display size from 44 px to 58⅔ px, retaining its square proportions. |
| Replace the mobile hard scroll edge above navigation with a fade | Complete in source; physical appearance Verify | A 140 px native alpha transition composites the matching grain/glow backdrop. Only that backdrop is masked; live glass and interactive content retain their native layers. Expo Go SDK 57 includes the mask module. TypeScript, 103 unit tests and an iOS export passed; a physical iPhone appearance check is still required. |
| Route first-time Day 1 readers to Introduction and show calendar Day 0 as Intro | Complete | Initial Day 1 opens Intro when no lesson is complete; its continue action opens Day 1 without a redirect loop. Intro remains accessible from the calendar. Browser flow verified. |
| Mark Days 1–33 complete and make progress available on mobile | Complete | Day 34 is next. Current day/completions sync through owner-only Firestore transactions; independent server read and two-client emulator test verified the saved result. Phone must use the same account and updated bundle. |
| Center audio transport independently of speed controls | Complete | Speed controls sit outside the centered transport; narrow layouts move speed controls to a separate row. Browser center measurements matched. |
| Fade individual verses while scrolling | Complete | Viewport fades animate text separately from edge gradients, preserving visible selection/note controls and reduced-motion support. Browser opacity values and unit cases verified. |
| Show orange contribution squares, total days, gaps and brighter consecutive runs | Complete | Replaced the rejected flame artwork. Calendar displays 99 total dated readings and a separate 11-day current run. It has 26 scrollable weekly columns, compact responsive squares and opens at the latest reading. Gaps reset brightness; 21 consecutive days reach near-white. Filled squares have no outline. Stronger gold halos are clipped to 1.5 px beyond each square, within the 4 px gaps. Pulse visibility and speed follow color intensity: a full cycle takes 5.2 seconds at plain orange and 3.2 seconds at near-white. At most 21 shared UI-thread groups animate halo opacity, pause away from Home/in the background, and respect reduced motion. Time-zone setup copy removed. |
| Make navigation slightly shorter | Complete | Shell reduced from 76 to 70 px; both normal and inverted icon rows share the same 56 px item height. |
| Move the resume hint below the Read Day button without growing its card | Complete | Hint uses the existing button-to-progress gap. Browser measurement stayed at 342 px before and after at a 390 px viewport. Removed the divider above Track your reading. |

Latest source validation: TypeScript and **119 unit tests passed**. Final calendar
iOS export and account-sync merged-rules integration passed. Browser checks do not replace physical
iPhone verification of the latest glow, glass or touch behavior.

## Earlier remaining items

- **NIV as the default:** licensed access is missing; the user confirmed there is no API access yet.
- **Native lateral page motion blur:** the live-screen integration is unfinished. Available graphics filters do not by themselves provide a verified replacement for the interactive page track. [Technical findings](REQUEST_AUDIT.md#honest-remaining-boundaries).
- **Device/release verification:** current iPhone appearance, touch, accessibility and latency; signed phone auth, live delivery, public app-link association and intended-project deployment need the checks above. Browser/export results do not replace them.
- **Explicitly deferred:** offline Bible downloads and locked/background podcast playback.

The **mandatory-auth and onboarding requests were for drafts**; their documents
are complete without activating those proposed flows. The latest source/UI,
account pages, optimization pass, screenshots, mockups and README work are complete
for the available local/browser environment. This report does not claim there is
nothing left to do.

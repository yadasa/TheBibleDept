# App design and annotation implementation

## Experience

The active Expo client now opens in dark mode. Signed-in readers can select Dark or Light under Account → Settings; preferences are saved per account on that device. Guests use dark mode and cannot access Settings. Every screen, dialog, field, reader control, icon and status bar uses reactive semantic theme colors. Reading text size remains an independent preference.

The background has visible random vector grain and broad, subtle warm/cool lighting. The background travels with the page track during tab changes. The header and signed-out account screen use the actual textured TBD artwork from the public website's navbar, bundled locally as AVIF. [Asset provenance](../bibledept-mobile/assets/README.md) identifies the original source. The source image's alpha transparency and 580:229 aspect ratio are preserved, with no added backing or side padding. The header respects the safe area and adds 16 px of vertical clearance; the logo no longer overrides vertical centering.

Home shows **Today’s reading**, the date, a current-reading card with device plan progress, account streak and seven-day history, notes/prayer shortcuts, and the latest private note. It does not invent completed days, quotes, or activity to fill empty states. Plan continuation stays local; the chapter completion action writes the cloud reading day.

## Navigation source and motion

The user requested the navigation from `yadasa/church`. The reference was the local main checkout at commit [`e7b01d364f19965342d8ee69beb964e6a6a62a29`](https://github.com/yadasa/church/commit/e7b01d364f19965342d8ee69beb964e6a6a62a29), specifically [`LiquidBottomNav.tsx`](https://github.com/yadasa/church/blob/e7b01d364f19965342d8ee69beb964e6a6a62a29/apps/web/src/site/components/LiquidBottomNav.tsx) and its CSS. No Church repository files were changed.

The app ports five evenly spaced destinations and the selected indicator's motion to React Native Animated. The navigation's outer background is now transparent; only the selected destination keeps the orange glass pill. Ordering is **Notes · Prayer · Home · Bible · Account**. Adjacent transitions retain the reference's 430 ms duration; each extra page crossed adds 90 ms, up to 700 ms. The indicator keeps `.22,.82,.18,1` easing, offsets `0/.24/.72/1`, stretch `min(abs(delta) × .42 + 14, 76)`, and trailing compression `min(stretch × .48, 34)`. It is recolored with Bible Dept semantic colors. Width changes settle safely; a newer destination interrupts the previous transition without committing its obsolete route.

The page position, background, and navigation indicator share one animation clock. Horizontal motion exposure is derived from the track's actual velocity. All pages lie on a single horizontal track in nav order, so Notes → Account travels through Prayer, Home and Bible. Pages on a journey mount before it starts; a new selection resumes from the current fractional position rather than snapping to the previously requested destination. Resize and reduced-motion paths settle immediately, with no residual exposure.

The transparent navbar floats over the full-height page, with scrolling content visible between its controls. Only the selected pill applies glass material. The header divider and decorative glass outlines are removed. True alpha masks fade page elements to zero opacity at the top (26 px) and bottom (140 px); no black gradient is painted over them. The grain remains visible beneath the transparent content edges. Bottom scroll clearance lets the final controls move fully above the fade and nav.

`Glass.tsx` supplies frosted buttons, compact controls, reflection shortcuts, the reading-plan card and navigation material. Web surfaces use a 22 px backdrop blur with 170% saturation; native surfaces use Expo Blur with an explicit Android target. Broad reflections, subtle transmitted background lighting and soft shadows give the material depth without a decorative border. Orange glass keeps primary actions and the selected nav destination distinct; secondary controls retain theme text colors. Focus uses a soft glow. Native Android 31+ uses Dimezis blur; older Android versions retain the translucent material fallback and require device review.

CSS alpha masks create a backdrop root. The page therefore keeps a matching grain/light backdrop within that root for the cards to actually blur, plus an aligned backdrop underneath that stays visible where content reaches zero alpha. Both move with the exact same page transform. This avoids turning frosted surfaces into flat opacity fills. Android buttons sample a separate background target, avoiding recursive sampling of their own blur layers.

Page motion uses a short horizontal exposure rather than an animated Gaussian blur intensity. `motionExposure.ts` derives direction and distance from measured page velocity, capped at 3 React Native points, and rejects stale/invalid frame intervals. Web composites five weighted, horizontally offset copies of `SourceGraphic` through an SVG filter with no vertical offset or Gaussian blur. Native captures the outgoing viewport once with `react-native-view-shot` and composites translated exposures over the live page track; it does not mount duplicate screens or players. Snapshots and exposure offsets clear after arrival, interruption, resize, or reduced-motion handling. The header and nav remain sharp. Physical-device capture performance, native material appearance, and mask composition remain release checks.

Visited screens retain their scroll positions, drafts, passage selections, and plan views. Hidden screens are removed from accessibility traversal. Reduced-motion preferences skip the transition and motion blur. The website's one-time expanding intro is not part of the requested tab-switch animation and is not ported.

## Highlights and comments

In either Bible view, signed-in readers choose **Highlight or add a note**, tap a first and last verse in one chapter, then **Add highlight or note**. One verse is also valid. Gold, orange and sage highlights are available, as well as note-only entries. Saving creates one private `annotations` document with its chapter ID, translation, range, short source excerpt, color, and comment. The Bible and Notes subscribe to that same document; the internal `comment` field supplies the user-facing note in both views.

Notes supports editing, changing color, confirmed deletion, opening the original verse range in Search, and searching loaded notes. Fifty recent notes load first, with **Load more** for older notes. Per-passage highlight listeners are separate, so older highlights still appear even when the Notes list has not paged back to them. Overlapping annotations are retained; the passage view presents the first matching highlight for a verse, while all saved comments remain available in Notes. Highlights are scoped to their selected translation.

Firestore rules constrain owner access, allowed fields, ranges, comment length, and timestamps, and preserve creation time on edits. A pending write shows **Syncing** in Notes; a server failure remains visible in the editor. Notes synchronization needs a connection; durable offline annotation drafts are not implemented. Authentication changes remount the private providers and retained screens, preventing another account from inheriting notes, journal drafts, pending completion UI, or notification intents.

See [backend setup and live-release requirements](HABIT_FEATURES_SETUP.md). Local browser checks do not verify APNs, FCM, native SMS app verification, or an App Store/Play Store build.

## Podcast player

`PodcastProvider` sits above the page and theme providers, so an episode keeps playing while readers navigate, change theme, or browse other plan days. The mini player shows the active episode, progress, and speed, with play/pause, close, and a return-to-episode shortcut. Selecting Play for another day switches the source. No episode auto-resumes after an app restart.

The audio streams from the official RedCircle RSS enclosure. `PlayerWaveform` from `react-native-waveforms` 0.1.3 renders real Expo Audio PCM measurements: 96 timestamp-aligned RMS peak bins, plus the latest level on the current bar. Unheard sections remain at a low baseline and fill as listening supplies samples. Orange progress gains a contrasting gradient at its edge that fades backward over roughly 1.5 bar pitches. The media clock controls progress at 1×, 1.25×, 1.5×, and 2×; pitch correction preserves the voice. No second whole-audio download, cloud mapping, or waveform upload is involved.

Background audio is enabled in the Expo plugin/session, resolved iOS configuration includes `UIBackgroundModes: ["audio"]`, and the engine registers episode metadata and seek controls for the lock screen. Actual iPhone PCM sampling, background/locked playback, and system controls remain device checks. Force quitting iOS stops audio. Android visualization is disabled because Expo's sampling API requires microphone permission there; listening itself requests no microphone permission. [Podcast details](PODCASTS.md) document data, behavior, and remaining validation.

## Time settings and product copy

Reminder time and quiet hours use hour/minute/AM–PM pickers. Stored schedule values keep the existing 24-hour format, so notification policy and backend payloads are unchanged. The picker exposes its selected state and modal heading to assistive technology.

The copy pass used [The Bible Dept.](https://www.thebibledept.com/), its [Start Here page](https://www.thebibledept.com/start-here), and [ARMA](https://www.armacourses.com/) as references for accessible Bible teaching and clear next steps. Their course sales, urgency, and promised outcomes are not app feature claims. [Tom’s Guide’s five signs article](https://www.tomsguide.com/ai/how-to-spot-ai-writing-5-telltale-signs-to-look-for) supplied editing checks for generic filler, canned openings, press-release language, and uniform enthusiasm. Those are style criteria, not proof of AI authorship.

Product headings now name the task: **Today’s reading**, **Track your reading**, **Write a prayer**, **No notes yet**, and **Finished this chapter?** Notes, prayers, saved chapters, reading streaks, and local plan position use consistent names. Instructions and errors explain the next action, and local storage stays distinct from account synchronization. Scripture, episode titles, and the host's teaching were not rewritten.

## Current verification

The audio/UI revision passes TypeScript, 39 unit tests, and an iOS JavaScript export. The tests include AM/PM conversion, velocity/direction exposure bounds, PCM stereo/RMS handling, real timestamp bins, and finite seek/duration guards. Native configuration introspection confirms audio background mode without microphone permission. These checks do not produce a signed native build or verify physical-device behavior.

The earlier Firebase client/backend integration results and earlier web/Android export results remain historical verification recorded in [the release review](APP_RELEASE_REVIEW.md); those suites were not rerun for this revision.

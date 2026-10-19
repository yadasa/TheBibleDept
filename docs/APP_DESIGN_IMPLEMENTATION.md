# App design and annotation implementation

## Experience

The active Expo client now opens in dark mode. Signed-in readers can select Dark or Light under Account → Settings; preferences are saved per account on that device. Guests use dark mode and cannot access Settings. Every screen, dialog, field, reader control, icon and status bar uses reactive semantic theme colors. Reading text size remains an independent preference.

The background has visible random vector grain and broad, subtle warm/cool lighting. The background travels with the page track during tab changes. The header and signed-out account screen use the actual textured TBD artwork from the public website's navbar, bundled locally as AVIF. [Asset provenance](../bibledept-mobile/assets/README.md) identifies the original source. The source image's alpha transparency and 580:229 aspect ratio are preserved, with no added backing or side padding. The header respects the safe area and adds 16 px of vertical clearance; the logo no longer overrides vertical centering.

Home uses an editorial heading, date, a clear next-reading card with honest device plan progress, account streak and seven-day history, reflection shortcuts, and the latest private comment. It does not invent completed days, quotes, or activity to fill empty states. Plan continuation stays local; the chapter completion action writes the cloud reading day.

## Navigation source and motion

The user requested the navigation from `yadasa/church`. The reference was the local main checkout at commit [`e7b01d364f19965342d8ee69beb964e6a6a62a29`](https://github.com/yadasa/church/commit/e7b01d364f19965342d8ee69beb964e6a6a62a29), specifically [`LiquidBottomNav.tsx`](https://github.com/yadasa/church/blob/e7b01d364f19965342d8ee69beb964e6a6a62a29/apps/web/src/site/components/LiquidBottomNav.tsx) and its CSS. No Church repository files were changed.

The app ports the rounded frosted shell, five evenly spaced destinations, and the indicator motion to React Native Animated. Ordering is **Notes · Prayer · Home · Bible · Account**. Adjacent transitions retain the reference's 430 ms duration; each extra page crossed adds 90 ms, up to 700 ms. The indicator keeps `.22,.82,.18,1` easing, offsets `0/.24/.72/1`, stretch `min(abs(delta) × .42 + 14, 76)`, and trailing compression `min(stretch × .48, 34)`. It is recolored with Bible Dept semantic colors. Width changes settle safely; a newer destination interrupts the previous transition without committing its obsolete route.

The page position, background, motion blur and navigation indicator share one animation clock. All pages lie on a single horizontal track in nav order, so Notes → Account travels through Prayer, Home and Bible. Pages on a journey mount before it starts; a new selection resumes from the current fractional position rather than snapping to the previously requested destination. Resize and reduced-motion paths settle immediately, with no residual blur.

The navbar floats over the full-height page, with scrolling content visible behind its blurred material. The header divider and decorative glass outlines are removed. True alpha masks fade page elements to zero opacity at the top (26 px) and bottom (140 px); no black gradient is painted over them. The grain remains visible beneath the transparent content edges. Bottom scroll clearance lets the final controls move fully above the fade and nav.

`Glass.tsx` supplies frosted buttons, compact controls, reflection shortcuts, the reading-plan card and navigation material. Web surfaces use a 22 px backdrop blur with 170% saturation; native surfaces use Expo Blur with an explicit Android target. Broad reflections, subtle transmitted background lighting and soft shadows give the material depth without a decorative border. Orange glass keeps primary actions and the selected nav destination distinct; secondary controls retain theme text colors. Focus uses a soft glow. Native Android 31+ uses Dimezis blur; older Android versions retain the translucent material fallback and require device review.

CSS alpha masks create a backdrop root. The page therefore keeps a matching grain/light backdrop within that root for the cards to actually blur, plus an aligned backdrop underneath that stays visible where content reaches zero alpha. Both move with the exact same page transform. This avoids turning frosted surfaces into flat opacity fills. Android buttons sample a separate background target, avoiding recursive sampling of their own blur layers.

Page motion blur rises during travel and clears with the shared clock: web uses a small animated blur filter, while native uses a non-interactive Expo blur layer over a separate content target. The header and nav remain sharp. This uses portable frosted blur rather than the Church website's desktop WebGL refraction. Physical-device performance, native material appearance and masked blur composition remain release checks.

Visited screens retain their scroll positions, drafts, passage selections, and plan views. Hidden screens are removed from accessibility traversal. Reduced-motion preferences skip the transition and motion blur. The website's one-time expanding intro is not part of the requested tab-switch animation and is not ported.

## Highlights and comments

In either Bible view, signed-in readers choose **Highlight or comment**, tap a first and last verse in one chapter, then **Annotate selected verses**. One verse is also valid. Gold, orange and sage highlights are available, as well as comment-only notes. Saving creates one private `annotations` document with its chapter ID, translation, range, short source excerpt, color, and comment. The Bible and Notes subscribe to that same document; there is no duplicate comment copy to drift out of sync.

Notes supports editing, changing color, confirmed deletion, opening the original verse range in Search, and searching loaded notes. Fifty recent notes load first, with **Load more** for older notes. Per-passage highlight listeners are separate, so older highlights still appear even when the Notes list has not paged back to them. Overlapping annotations are retained; the passage view presents the first matching highlight for a verse, while all saved comments remain available in Notes. Highlights are scoped to their selected translation.

Firestore rules constrain owner access, allowed fields, ranges, comment length, and timestamps, and preserve creation time on edits. A pending write shows **Syncing** in Notes; a server failure remains visible in the editor. Notes synchronization needs a connection; durable offline annotation drafts are not implemented. Authentication changes remount the private providers and retained screens, preventing another account from inheriting notes, journal drafts, pending completion UI, or notification intents.

See [backend setup and live-release requirements](HABIT_FEATURES_SETUP.md). Local browser checks do not verify APNs, FCM, native SMS app verification, or an App Store/Play Store build.

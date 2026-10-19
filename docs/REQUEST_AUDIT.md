# Request audit and optimization review

Reviewed October 18, 2026. This audit distinguishes implemented code, browser checks,
physical-device feedback, and release work. It does not treat a successful bundle
as proof that a native feature worked on an iPhone.

## Requested behavior

| Request | Current result |
| --- | --- |
| Replace CarryBible branding and use the supplied domain | Active app uses BibleDept / The Bible Dept. and `thebibledept.com`. Historical repository setup is preserved. |
| Publish to `yadasa/TheBibleDept`, with separate incremental pushes | Each completed part in this revision has its own commit and push. |
| Free app, Firebase SDK, email/phone sign-in, app links | Existing Firebase implementation and native link configuration are preserved. There is no giving or checkout in the active app. Live native SMS and public universal links still require their documented native/deployment setup. |
| Stream Scripture and postpone offline Bible downloads | WEB/KJV chapters stream through bible-api.com; the bounded memory cache remains. No offline Bible download was added. |
| Map every PDF reading day locally and start new readers at Day 1 | The complete compact 365-day map remains bundled. Calendar, current day, selected day and continuation are implemented. |
| Match the daily podcast to the day's reading | All 365 days have official RedCircle episode metadata and publisher/platform links, bundled locally. Audio streams on demand. |
| Website/style-guide branding, natural copy and AM/PM settings | Existing copy and 12-hour controls are preserved. Both semantic themes remain supported. |
| Keep the latest app visible in the preview | The active app runs on port 8081. The preview is refreshed against this checkout. |
| Restore the Church bottom navigation | Full frosted shell restored from the local Church component/playground, with the orange selected pill and existing stretch motion. Paint layers are isolated to avoid ghosted labels. |
| Invert nav icon fragments where the moving pill overlaps | An accessibility-hidden duplicate icon row sits inside the pill's existing rounded clip at an inverse offset. Its icon positions remain aligned with the normal row during travel and press feedback. There is no settlement timer for color changes, and only five destinations are exposed to accessibility. |
| Correct horizontal layout and interrupted navigation | Explicit page widths, vertical-only scroll restoration, non-scrollable web clipping and exact final track positions are implemented. Browser checks passed at 390 and 704 px. |
| Remove the hard glass opacity seam | Invalid native SVG values and clipped gradient edges were repaired. Native blur no longer sits under a masked ancestor. The latest physical iPhone result still needs confirmation. |
| Five orange circles, larger, higher and shifted right | Each page owns a separate measured SVG viewport, local gradient definition and circular radius. They travel on the page track. The background extends beneath navigation and safe areas. |
| Real orange podcast waveforms, including visible paused bars | Every episode has 96 genuine build-time RMS values; active playback supplies live PCM. Reference data totals 66,394 bytes. No audio is bundled or uploaded. |
| Progress gradient and 1.25× / 1.5× / 2× speeds | Native media clock controls progress and pitch-corrected speeds. The later trail revision extends the accent to 4.5 bar pitches and paints it only through the bars. The broad rectangular overlay was removed. |
| Persistent player across pages | Global provider and mini controls remain active while pages change. Browser playback/navigation checks pass. |
| Waveform behind mini-player text | Static, bottom-aligned silhouette; maximum bar height is 33% at rest and 67% while dragging. Only played color advances. Blur/sharpness and expansion ease on the UI thread. |
| Drag the waveform and return directly to its full player | Drag seeks on release without changing pages. Tapping the mini-player opens the correct day and measured podcast section, retained through late layout changes. |
| Remember the reader's place | Day/chapter/scroll position persists locally per guest/account. Restores and podcast jumps do not count as reading. |
| Complete a lesson after reading and listening, excluding the final two minutes | All chapters must reach their loaded text end through real scrolling, and genuine listened intervals must cover the teaching. Seeking past audio is excluded. Completion and modal acknowledgement persist locally. |
| Congratulate the completed day | One day-specific congratulations modal appears after durable completion. Calendar and Home counts include automatic and out-of-order completions. |
| Ease every waveform touch interaction | Press brightness, seek preview, release, mini-player expansion and blurred/sharp crossfade use eased UI-thread transitions. |
| Neighboring-bar influence, 67% uninfluenced cap and thicker white indicator | Actual live amplitude eases with a four-pitch past falloff and a sharper two-pitch future falloff. The maximum rises from 67% toward 100% at the current bar. Its minimum is 67% of the preceding measured bars' average, interpreted as 33% below that average. The floor tapers with neighboring influence and does not feed back through its own modulation. Both indicators remain 2.5 px. |
| Visible amplitude differences without a flat-looking plot | The full waveform now uses a fixed linear scale from the episode's reference peak. Day 1's paused plot spans about 29–51 px of a 76 px area instead of 14–18 px. Later loud samples cannot change unrelated bars' scale. |
| Anchor height follows the recent bars | Both white indicators average the four preceding displayed bars, with an eased 180 ms height change. The full anchor remains centered; the mini anchor remains bottom-aligned. Preview measurement matched 35.0075 px for both the anchor and its four-bar average. |
| One orange throughout the active app | `#F05A00`, the full waveform's existing orange, is the shared pigment for both themes, actions, glass, highlights, circles and both players. Brightness/transparency variants derive from that pigment. Small text retains readable theme ink; logos and distinct gold/sage highlights retain their source colors. |
| Muted future audio and a fixed anchor guide | Future bars use neutral luminance gray and 67% of their previous opacity. Complementary clips keep gray or blurred future bars out of played orange. A separate 1 px translucent guide keeps a regular height behind the averaged anchor; the mini guide follows its drag expansion, never live RMS. |
| Collapse playback speeds into an icon | A gauge/current-rate button opens the choices, closes after four seconds without interaction, and closes on selection or a second tap. Timers clean up on day change and unmount. Browser checks passed for all three dismissal paths. |
| Cleaner fifteen-second skips and no teaching outline | Compact 44-point circular-arrow targets flank a round play/pause control. The Daily teaching card has no border. Foreground SVG icons now render above the glass pigment. |
| Fix Reading plan / Search layout and remove the line | Equal-width rounded targets have 48-point height and no bottom borders. At 320 px both are 134 px wide, with full labels and one selected tab. Search drafts survive switching views. |
| Remove technical product copy | Visible provider/build/storage explanations and raw runtime errors have been replaced with reader-facing instructions. Deliberate validation stays useful; underlying causes remain in development diagnostics. Internet, sign-in and privacy guidance remain. |
| Reintegrate highlighting, comments and automatic Notes updates | Both readers expose Highlight & note, a guest account entry, signed-in verse hold and range selection, inline save/copy actions, and tap-to-edit saved highlights. Highlights/comments still use the existing private annotation document and live Notes subscription. |
| True subtle lateral page motion blur | The earlier snapshot/exposure implementation was removed after regressions. Clean continuous page transitions are present; a native directional blur is not currently implemented. |
| Continue audio while locked/backgrounded | **Unresolved and explicitly deferred by the user.** Actual Expo Go tests stop with sampling enabled and disabled. Force-quitting iOS also stops playback. No further audio-session/build changes were made after the deferral. |

## Optimization completed before the waveform falloff change

| Check | Before | After |
| --- | --- | --- |
| Full-player SVG nodes retained during the same 1.2-second playback observation | 3 of 121 rectangles | 122 of 122 rectangles |
| Mini-player SVG nodes retained during playback | 4 of 130 rectangles | 257 of 257 rectangles |
| Runtime grain pattern rectangles, web | 3,000 | 0; two cached tiled layers |
| Latest Bible request after four canceled queued selections, deterministic clock | 10,500 ms under the previous reservation algorithm | 2,100 ms; actual starts retain their 2,100 ms spacing |
| Unused native dependencies | Masked-view and browser-auth packages | Both removed, including the unused config plugin |

The extra stable mini-player rectangles support a blurred/sharp crossfade without
recreating their native objects during playback. The six density/theme grain PNGs
total 120,916 bytes; every tile and a repeated 3×3 arrangement matched the original
SVG's decoded pixels using the same rasterizer. The duplicate header grain was
removed. Neither the background nor its grain runs a continuous animation.

Matched iOS exports with source maps measured 4,181,596 bytes before the final
rendering work and 4,193,640 bytes afterward, a 12,044-byte increase for the new
UI-thread feedback. This is a deliberate rendering tradeoff, not a bundle-size
reduction claim. Source maps stay in ignored review exports. The app does not ship
downloaded podcast audio, rasterization tools, or FFmpeg.

This pass preserved Firebase, phone-auth infrastructure, Scripture, notes,
prayers, highlights, reminders, local reading data and official podcast sources.
It did not run a broad dependency upgrade or delete legacy projects that remain
part of this repository. Native FPS, memory and installed binary size were not
measured; browser node retention is not an iPhone frame-rate benchmark.

## Verification and remaining work

Optimization checkpoint: all 65 unit tests, TypeScript, dependency compatibility,
web export and iOS export passed. Real browser checks covered playback across
pages, paused waveforms, full/mini dragging, keyboard seeking, the podcast anchor,
rapid navigation reversals, five local circles, full-height background and no
horizontal document overflow at 390 × 844 and 704 × 884.

Remaining device/release checks: physical glass seam and touch appearance,
screen-lock audio when resumed later, signed native SMS/push/link validation and
native transition performance. Listening coverage deliberately does not award
unobserved status gaps longer than 2.5 seconds, because a remote seek during a
suspended JS interval cannot be distinguished from listening.

At the first falloff checkpoint, all **69 unit tests**, TypeScript, and fresh
web/iOS exports passed. Browser playback showed changing live bar geometry,
visible measured bars on pause, a 2.5 px cursor and a 1.5-pitch backward accent.
The document remained 390 px wide at the phone-size viewport. The final matched
iOS bytecode export was 4,194,936 bytes: 13,340 bytes (0.32%) above the earlier
baseline, including the added eased neighboring response. This is JavaScript
bytecode size, not the size of an installed iPhone app.

The preceding follow-up verification passed **77 unit tests**, TypeScript, and web, iOS
and Android exports after the clipped trail, averaged anchors, spatial nav mask
and shared orange palette. The mask's normal and inverted icon rows aligned in
the browser during travel, with a 21 px rounded clip and exactly five accessible
tab targets. Actual paused anchor height equaled its four preceding displayed
bars' 35.0075 px mean. The longer trail was 22.5 px at a 5 px bar pitch, and its
gradient belonged to bar fills with no broad overlay rectangle.
The final 390 px playback observation retained all 127 waveform rectangles while
15 heights changed, confirming that live response did not recreate the plot.
Playback continued through Home and back to the measured podcast anchor. The
final preview had no captured warnings/errors and no document overflow at either
390 px or the restored 704 px preview width.

That matched iOS bytecode was 4,199,820 bytes, 18,224 bytes (0.44%) above the
original export baseline. The new spatial mask intentionally retains a second
visual icon row. These additions preserve the earlier rendering and loading
optimizations; no signed-device performance result is implied. Each completed
fix was committed and pushed separately.

### Latest controls, copy and annotation verification

All **87 unit tests**, TypeScript, and fresh web/iOS/Android exports passed.
Browser checks confirmed the compact controls, four-second speed dismissal,
selection/retap dismissal, borderless teaching card, neutral future bars and
the reader switcher at 320 and 390 px without horizontal overflow. At 320 px the
Reading plan label's client/scroll widths both measured 92 px, without truncation.

An isolated preview used only `demo-bibledept` Auth/Firestore with matching local
rules. A disposable account saved an orange Luke 1:1–3 highlight and comment from
the plan. The comment appeared in Notes automatically; editing it in Notes was
reflected in the reopened Search passage. The saved note survived reload, and
sign-out hid the private record. No real church account or production record was
used. The temporary preview server was stopped; port 8081 remains the main preview.
The broader backend integration suites were not rerun for these UI changes.

The latest matched iOS bytecode is 4,214,368 bytes, 32,772 bytes (0.78%) above the
original export baseline. Native long-press/text-copy coexistence and the latest
material appearance still need physical iPhone review. The visible selection
toolbar provides an alternative to holding a verse. Locked audio remains deferred.

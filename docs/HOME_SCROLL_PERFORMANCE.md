# Home scrolling performance audit — October 19, 2026

The contribution-square animations were already removed before this pass. The remaining code still contained repeated scroll, graphics, audio and context work. Eleven changes below were committed and pushed separately. These are confirmed work reductions; their individual effect on physical iPhone frame timing has not been measured.

## Fixed or reduced

| Source | When it could interfere | Change | Commit |
| --- | --- | --- | --- |
| Reader-style scroll work on Home | Every scroll frame: Reanimated offset writes and repeated UI-to-JS events | Home and other non-reader pages use an ordinary native ScrollView, 96 ms position bookkeeping and exact drag/fling-end flushes. Bible keeps its frame-synchronous verse fades. No subscriber notification is sent when none exists. Empty anchor requests no longer schedule frames. | b8adfca |
| Two blurred shadows per filled square | Graphics/compositing while the calendar moves; 99 filled dates meant 198 shadow declarations | Replaced shadow drawing with shared pre-rendered dark/light halo images. The six density variants total 16,176 bytes. Colors, steady halo intensity and 21-day brightness remain. Pillow is tooling only. | 397f766 |
| Full-viewport native fade mask | Offscreen compositing even though the visible fade is only 140 px tall | The native mask is now a clipped bottom strip, with the original backdrop sampling coordinates preserved. At a 760 px viewport, mask bounds shrink from 760 to 140 px high; this is a geometry reduction, not an FPS measurement. | c2d8416 |
| Blur hidden beneath orange pigment | Extra visual-effect sampling under a 96–98% opaque button gradient | Removed that redundant blur. Translucent card/navigation glass remains. | e7a626a |
| Live audio PCM while the full waveform is offscreen | During playback: native sample arrays, bridge traffic and JS amplitude analysis | Sampling demand now comes from the visible full player. Home's mini-player uses the stored measured waveform and does not request PCM. Paused or hidden full players do not install the sampling listener. Transport and listening-credit tracking are separate and continue. | 949bf37 |
| Five page wrappers subscribed to frequent playback updates | Audio status updates every 200 ms and PCM publication up to every 100 ms | Wrappers now subscribe only to a stable episode-presence boolean for their bottom padding. | f2b8d0d |
| Plan context recreated on listening checkpoints | Every five seconds during playback, even when no plan data changed | Stabilized plan actions and memoized the published plan context. Actual progress changes still update consumers. | c6ab726 |
| Date polling invalidating Home and habit consumers | Every thirty seconds while the date was unchanged | The clock now publishes only a changed calendar date. Zone changes and foreground return still refresh it. Home memoizes its date formatting and no longer subscribes to unused auth state. | 1faa292 |
| Optional page preparation forced into busy startup | A one-second idle timeout could force mounting work despite a busy frame | Removed the forced timeout and require at least 8 ms of reported idle budget. Current-day reader preparation remains available. | 857a7a5 |
| Nested horizontal calendar gesture ambiguity | Diagonal drags starting on the grid | Explicit horizontal directional locking and disabled vertical bounce on the calendar, alongside the existing vertical parent lock. This is gesture handling, not an FPS claim. | dac0405 |
| Development JavaScript overhead | While testing in Expo Go or the browser | Added `npm run start:performance`; restarted port 8082 with `--no-dev --minify`. Both the iOS manifest and loaded web script verify `dev=false` and `minify=true`. Reload existing clients to receive it. Expo Go remains the native host. | 365bace |

## Remaining possible costs

These are the other performance-relevant areas found in this app. They are not proven causes of the reported jitter.

| Source | Scope / assessment |
| --- | --- |
| Translucent frosted glass and rounded clipping | UIKit visual-effect/compositing work remains on the Home card, navigation and translucent controls. The browser retained four Home glass layers after removing the primary button's blur. This appearance was explicitly requested; native GPU profiling is needed before reducing it further. |
| Mini-player SVG Gaussian blur, clips and indicator motion | Only present when an episode is open. Its filtered waveform can redraw as progress changes. Live PCM is now off on Home, but this visual cost remains. The requested frost/scrubbing behavior is preserved. |
| Shared backgrounds and retained pages | Page tracks retain views, grain and per-page SVG glow backgrounds; native fading also needs a matching backdrop. This can cost memory and composition despite memoization. Offscreen full-waveform updates are already suspended. No heap/GPU-memory capture was available. |
| Static calendar view count | There are 182 date cells plus halo/image views for filled dates. They do not animate or subscribe to scrolling, and the halo texture is shared. Layout/hierarchy cost remains; a single-canvas replacement would require preserving per-date accessibility. |
| JS-driven navigation clock | The navbar's stretched mask geometry still shares a JS-driven clock with page motion. This can affect tab journeys under JS load; it is not continuously active during settled vertical Home scrolling. Its tested masking/interruption behavior was preserved. |
| Firebase snapshots, local storage and data parsing | Network responses, note edits, listening saves and initial account hydration can trigger short JS/layout bursts. They are event-driven, not frame-driven. Earlier server logs contained Firestore connectivity warnings; current browser checks had no errors. Connectivity alone is not evidence of a continuous scroll-rendering problem. |
| Initial image/font decode and preparation | Cold loading can briefly compete with rendering. Artwork/grain/halo assets are bundled; repeated halo images share sources, and optional page mounting now waits for idle time. This does not explain persistent jitter once everything is loaded by itself. |
| Expo Go host and device conditions | The optimized JS bundle removes development JS overhead, but Expo Go's native host, device refresh rate, thermal state, Low Power Mode and OS load were not measured. A signed release profile is the remaining way to attribute native frame drops conclusively. |

## Verification

- TypeScript and **129 unit tests passed**, including visible-player sampling-demand ownership and existing reading/listening safeguards.
- Fresh web, iOS and Android JavaScript exports passed for the rendering/audio changes. The subsequent directional-lock props are typechecked and included in the running optimized preview.
- Browser: 99 halo images, **zero runtime shadow descendants inside those halos**, zero square animation, and zero blur layers inside Read Day; four other Home glass layers remain.
- Home scroll position was **337.5 px before and after a Bible/Home round trip**.
- Audio continued on Home: the mini-player advanced from **0:11 to 2:11** while the full player was offscreen. Playback was then paused and dismissed after testing.
- The optimized browser loaded `platform=web&dev=false&hot=false&minify=true`. The iOS launch manifest independently confirmed production mode and minification.
- The account retained Day 101 next, 100 completed lessons, 99 dated readings and an 11-day streak. No progress seed/reset was performed.

Exports, screenshots and browser interaction checks do not measure physical iPhone scroll FPS or verify the native fade/glass appearance. No percentage speedup or guaranteed frame rate is claimed. Locked/background audio remains explicitly deferred.

## Local performance preview

`http://10.0.0.35:8082/` and `exp://10.0.0.35:8082` now use the optimized mode. Reload the already-open Expo Go project after this server change. See [local testing](LOCAL_TESTING.md#optimized-local-performance-preview) for the performance/development commands.

# October 19 performance pass

This checkpoint follows the reports of delayed navigation, expensive contribution-square effects, Home scroll jitter, and whole-screen work when changing chapters.

## Changes

- Calendar animation is created only for visible rows and horizontal weeks. Leaving Home removes its animated squares. Days one through three use ordinary static views, without animation hooks.
- One UI-thread clock drives longer runs at no more than 30 ambient updates/second. Every date retains its independent stable phase and intensity-dependent period. Fill and halo share one cosine calculation. Native halo contents can be raster-cached separately from the changing fill.
- During vertical or horizontal scrolling the clock freezes. Visibility reconciliation waits for 120 ms of quiet, avoiding worklet mounting/unmounting throughout a fling. The effect resumes after 160 ms of quiet. Native scrolling is not limited to the calendar's update rate.
- Verse fades follow the UI-thread scroll offset directly, using their continuous smoothstep visibility curve. They no longer restart a 140 ms timing animation on every JavaScript scroll notification. Bookkeeping runs at most once per 48 ms, with final drag/momentum flushes. Delayed JS offsets cannot overwrite newer UI offsets.
- Home prepares the selected current-day reader and its player before Read Day is pressed. It warms the saved chapter first, followed by the rest of that day, and pauses prefetching when the app is inactive. Preparation earns no reading/listening credit and never starts playback.
- Concurrent prefetch/reader requests for the same reference and translation share one network operation. Individual consumers can cancel independently. The existing 2.1-second provider start spacing, deadlines, bounded 20-passage cache and five-minute expiry remain intact. Cached chapters are available synchronously to avoid a loading flash.
- Chapter state, network results, errors, reading-position restoration and chapter navigation live inside `PlanReading`. A chapter selection does not update its parent daily-screen state. The day heading, completion section, calendar picker and podcast player remain outside that boundary. An uncached selection reserves the previous reading area's height while it loads.
- The full player freezes its presentation when it is below the viewport or on another page. The global transport continues independently; the mini-player keeps working. The full waveform resumes when visible. Memoized Scripture/player content avoids unrelated parent work.

## Evidence

| Check | Observed result |
| --- | --- |
| Current account's activity data | 99 dated readings, 11-day current run; preserved |
| Fully displayed current calendar at 390 × 844 | 42 animated visible squares, 26 static visible squares; all visible days below four had zero animated fill views |
| Bible selected | Zero Home animated square views |
| Home preparation | Hidden Bible scene already contained Exodus 16 and mounted transport controls before Read Day 101 was pressed |
| Chapter change | Exodus 16 → 17 changed the reading region; Day 101 header/progress/player remained present |
| Full player culling | `daily-podcast-idle` while reading Scripture, then `daily-podcast-live` when scrolled to the player |
| Automated checks | TypeScript and 135 unit tests passed, including request sharing/cancellation, preload order, visibility culling and the four-day threshold |
| Production JS exports | Fresh iOS, Android and web exports passed after the final source changes |
| Export sizes | iOS bytecode 5,255,079 bytes; Android 5,266,018 bytes; web JavaScript 2,966,669 bytes |

These are structural, browser and build checks. Native frame timing, memory and physical touch/scroll feel were not measured. The user's jitter report motivated the second round of scroll-time freezes and player culling; successful exports do not establish that every iPhone frame is smooth. Previous byte-size checkpoints used earlier source states and are not a controlled before/after size benchmark for this pass.

Documentation media, capture frames, Remotion, browser-rendering tools and export directories are excluded from the app bundle. The new documentation GIF is 429,496 bytes; it does not add a playback or rendering dependency to the app.

All implementation parts were committed and pushed separately. Background/locked audio remains explicitly deferred, and NIV still requires licensed access.

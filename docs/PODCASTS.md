# Daily podcast episodes

The Bible Dept's [official Listen page](https://www.thebibledept.com/listen) links
to [Apple Podcasts](https://podcasts.apple.com/us/podcast/the-bible-dept/id1785301806)
and [Spotify](https://open.spotify.com/show/7fbgOgSXnWxwnwp57k32FM).
Apple's public catalog identifies the publisher's RSS feed:

`https://feeds.redcircle.com/64849f8b-c8f4-4999-8ce6-d9d3450e0cf1`

Checked on 2026-10-18: the feed contains 372 items, including exactly one explicitly
numbered episode for each plan day 1-365. Trailers and announcements are excluded.
The mapping uses the episode's **day number and reading title**, not publication
date, RSS position, or an inferred Spotify/Apple episode identifier.

## Bundled metadata

`bibledept-mobile/src/data/bibledept-podcasts.json` contains 365 daily tuples plus a separate introductory tuple:
`[publisherEpisodeIdWithoutHyphens, streamIdWithoutHyphens, durationSeconds]`.
The file is 28,373 bytes. Shared URL prefixes and normal reading labels are derived
in `src/services/podcasts.ts`; six reading-label differences are stored explicitly.
Neither the feed's descriptions/artwork nor MP3 files are bundled or stored in Firebase.

## Optional introduction

The official full episode **START HERE! Introducing The Bible Dept, Day 000** is available from Day 1 and the day picker. It is separate from the 365-day reading map, has no assigned chapters and cannot earn lesson listening/reading credit. The feed lists 706 seconds; the measured stream response was 842.4 seconds, illustrating dynamic ad differences. The loaded media duration wins during playback.

- Episode GUID: `61b3e9e0-ceea-415c-b7ff-67ca617ca0e9`
- MP3: `https://audio3.redcircle.com/episodes/84aa09a5-8cf5-455d-b5ef-1967c6cd3da3/stream.mp3`
- Published December 27, 2024. This full introduction is used instead of the separate 71-second trailer.

Opening the introduction normally shows its heading. Returning through the mini-player targets its player. The default/current plan still begins at Day 1.

The stream URL comes directly from the publisher's RSS enclosure. The episode-page
URL uses the RSS GUID. Day 1's episode page and MP3 endpoint both returned HTTP 200;
the stream advertises byte ranges and CORS support. Audio may vary in duration when
the publisher updates an episode or inserts ads; the player uses the loaded duration.

## Reading-label differences

These six day numbers correspond to the official episodes, but their stated ranges
differ from the supplied printed plan. The reader keeps the PDF's plan unchanged
and displays a note containing both ranges in the corresponding podcast card.

| Day | Printed plan | Official episode title's reading |
| ---: | --- | --- |
| 131 | Deuteronomy 19-21 | Deuteronomy 19-22 |
| 166 | 1 Kings 9-11 | 1 Kings 9-10 |
| 167 | 1 Kings 12-14 | 1 Kings 11-14 |
| 237 | Ezekiel 40-46 | Ezekiel 40-44 |
| 238 | Ezekiel 47-48 | Ezekiel 45-48 |
| 320 | Job 25-28 | Job 24-28 |

## Playback

The **Daily teaching** card appears below the day's Scripture and chapter controls.
It offers play/pause, 15-second rewind/forward, waveform seeking, elapsed/duration
labels, 1×/1.25×/1.5×/2× speeds with pitch correction, an exact episode-page link,
and Apple/Spotify follow links. The follow links open the show, rather than a
specific episode.

Playback speeds open from a gauge/current-rate button. The choices close after
four seconds without interaction, when a rate is selected, or when the button is
tapped again. Compact fifteen-second arrow targets flank the round play/pause
button. The teaching card has no outline; provider attribution stays in these
implementation notes rather than product copy.

`src/state/PodcastProvider.tsx` owns one global `expo-audio` player above the page
and theme providers. It starts without a source and attaches an MP3 only when the
reader presses Play. Switching chapters, browsing other days, changing tabs, or
changing theme keeps that episode playing. Another day's card shows which episode
is active; pressing its Play button switches the stream. The mini player offers
play/pause, close, and a shortcut back to the playing episode. Close stops and
releases its source. Restarting the app does not restore an episode or autoplay.

The MP3 streams directly from the publisher's RSS enclosure:

```text
https://audio3.redcircle.com/episodes/<stream-uuid>/stream.mp3
```

Playback uses `downloadFirst: false` and a 15-second preferred forward buffer. It
does not create offline audio files or fetch a second copy of the whole MP3 for
waveform analysis. Startup has a 20-second timeout with retry; seeks and playback
positions use finite values clamped to the current duration. A retry keeps the
last known position where possible. Normal network buffering still occurs.

## Audio-driven waveform

[`react-native-waveforms`](https://github.com/arbeetrate/react-native-waveforms)
0.1.3 supplies `PlayerWaveform`, with custom SVG renderers in
`src/components/PodcastWaveform.tsx` and `MiniPodcastWaveform.tsx`. The native media
clock controls progress at every playback speed. The library's independent 1×
timer is disabled; UI-thread animation eases the controlled progress clip and
touch feedback. Stable renderer functions and memoized bar components retain SVG
nodes across updates.

### Complete reference silhouettes

`src/data/bibledept-podcast-waveforms.json` bundles 96 genuine RMS measurements for
each of the 365 episodes and the separate introduction. Its 66,573 bytes include compact 8-bit amplitudes, matching
stream IDs and decoded durations. A development script streamed and decoded the
actual public MP3s through FFmpeg, measured equal time bins and retained only those
small values. The app does not run FFmpeg, download a second MP3 for analysis,
bundle podcast audio or upload waveform data to Firebase.

Every day's complete shape is visible before Play and while paused. These are
reference-stream measurements: RedCircle can insert different ads or change an
episode on a later request. The stored decoded duration records the analyzed
variant; its normalized silhouette is not an exact time map for every subsequent
ad variant. The player always uses its currently loaded duration for playback and
seeking.

### Live PCM and spatial response

Expo Audio's `useAudioSampleListener` supplies real decoded PCM during foreground
playback. The engine measures each channel's RMS, keeps the louder channel and
records its peak in the corresponding one of 96 time bins. Opposite stereo phases
are not averaged into silence. Heard bins from the active stream replace reference
values, including actual silence; reference values remain available elsewhere.

The installed SDK 57 iOS [PCM tap](https://github.com/expo/expo/blob/sdk-57/packages/expo-audio/ios/AudioTapProcessor.m)
reports zero sample timestamps. For those iOS packets, the provider uses the native
player's current time. Valid nonzero timestamps retain stale-packet checks. This
keeps sampling aligned after seeks and speed changes without synthesizing samples.
PCM publication is limited to roughly ten updates per second. The tap and pending
UI publication stop when the app becomes inactive/backgrounded and resume in the
foreground; the complete reference silhouette remains visible throughout.

The large player applies its live response after visual downsampling, so an older
peak cannot mask quiet speech. Both historical and live RMS use one fixed linear
scale derived from the episode's complete reference peak, making the measured
shape visible without changing unrelated bar heights as louder PCM arrives.
Uninfluenced and paused bars preserve their relative
measured heights at a maximum of 67% of the waveform area. While playing, the actual
current PCM level also influences neighboring bars with a smoothstep falloff
that reaches zero four bar pitches behind playback and two pitches ahead. Its
minimum height is 67% of the preceding four unmodulated measured/rest bars'
average, representing a maximum 33% dip below that average; neighboring minima
blend away with the same falloff. This reference never feeds back through the
live response. The permitted height rises toward 100% at the current native
playback bar. Changed heights ease over 150 ms on the UI
thread; previewing a seek moves the indicator but does not move the live-audio
response until the transport actually seeks.

Played bars in both waveforms use the shared `#F05A00` orange, with brightness
variants derived from that pigment. Full-player future bars are completely desaturated and
use 67% of their previous opacity. The later mini-only request keeps that entire
silhouette saturated orange, with quieter future opacity. Complementary
clips keep future bars on their own side of the cursor, so their gray or blurred
layers cannot tint played bars. A bright gradient at the listening edge fades backward
over approximately 4.5 bar pitches, painted inside the bars rather than as an
outside rectangular glow. The 2.5-pixel light indicator takes the average height
of the preceding four displayed bars and eases height changes over 180 ms. It
stays vertically centered in the large player. A thin translucent guide behind
it spans the regular waveform height independently of audio amplitude. Tap and horizontal drag seek on
release; vertical scrolling remains available. Seeking, press feedback and release
ease rather than remounting the waveform.

### Mini player and platform behavior

The mini player uses only the static reference measurements behind its episode
label. Its full silhouette remains bottom-aligned during playback and pause; only
the played color advances. Maximum bar height eases from 33% at rest to 67% while
dragging. Stable blurred/sharp layers crossfade to reveal the waveform during a
drag and soften it again on release. Its current-position indicator is also
2.5 pixels wide and averages the preceding four displayed bars, keeping its
bottom edge aligned with the bars while its height eases over 180 ms. Dragging
commits a seek on release; tapping opens the correct day's full player. The Mini
guide follows only its regular 33%/67% drag height, never the current RMS level.

The mini-player retains its last content through a 220 ms exit and enters over
260 ms. Web applies a Gaussian blur filter; native uses a transient animated
BlurView over a dedicated card target. A generation guard prevents an old exit
callback from removing a reopened player. Reduced motion skips blur and movement.
The full teaching card has its own frosted background; its controls remain outside
the clipping layer so the speed menu is visible.

iPhone sampling uses playback audio and requests no microphone access. Web uses
an anonymous-CORS audio source and a browser analyser. Android live PCM sampling
is deliberately disabled because Expo Audio requires `RECORD_AUDIO` for it;
Android still displays the complete reference waveform and supports playback,
speed controls and seeking without a microphone prompt. A platform without live
analysis keeps its reference shape instead of claiming visualization is unavailable.

## Listening coverage and lesson completion

Listening progress is separate from the visual waveform. Native status events
record genuine played time intervals using the loaded duration and playback rate.
Explicit seeks, source changes, buffering and implausible clock jumps break
continuity; skipping to the end does not count as listening to the skipped portion.
Unobserved status gaps longer than 2.5 seconds receive no credit, because a remote
seek during suspended JavaScript cannot be distinguished from actual listening.

An episode longer than two minutes qualifies when covered intervals form a
continuous prefix from its beginning through `loadedDuration - 120 seconds`.
Small native-update gaps use a one-second merge tolerance. Short clips require
their full length; an unknown duration never qualifies. Coverage is stored locally
per guest/account, in compact intervals, and flushed about every five seconds and
on pause, backgrounding, completion or close. It is not inferred from the progress
cursor, the reference waveform or cloud records.

Automatic day completion additionally requires all assigned chapters to reach
the end of their loaded Scripture through actual scrolling. Completion and its
day-specific congratulations acknowledgement persist locally. A separate memoized
listening context keeps frequent PCM updates from rerendering reading screens.

## Background playback and device checks

The audio session enables silent-mode playback, background playback, and
`doNotMix` interruption behavior. The Expo Audio plugin enables background
playback while disabling microphone permission and background recording. Resolved
iOS native configuration was inspected and contains `UIBackgroundModes: ["audio"]`.
The engine registers lock-screen metadata with the episode/day title, Dr. Manny
Arango, and The Bible Dept., plus seek controls, and clears them when dismissed.

The dependencies are compatible with Expo Go SDK 57 and the iOS JavaScript bundle
exports successfully. These checks do not establish working screen-lock audio on
a physical iPhone. Force quitting iOS stops playback, and the engine does not
auto-resume after a restart.

## Deferred lock-screen issue

Physical iPhone Expo Go tests stopped playback when the screen locked, both with
live PCM sampling enabled and in a controlled run where no sampling tap was ever
installed. **The problem remains unresolved and the user explicitly deferred it.**
No further audio-session or build work is part of the completed UI revisions.

The existing engine removes a redundant pre-replace pause and sets
`keepAudioSessionActive` on the global player:
SDK 57's delayed pause deactivation can otherwise run while a replacement stream
is buffering. Explicit Pause, Close, errors, and completion release the session;
serialized native calls prevent an old pause from deactivating a newer play.
Lock-screen metadata registers after actual playback starts. Native playback
requests can reactivate a deliberately released session, and development-only
lifecycle diagnostics log state changes without account data or stream URLs.

These changes follow the installed SDK's [session implementation](https://github.com/expo/expo/blob/sdk-57/packages/expo-audio/ios/AudioModule.swift).
[Expo Go's SDK 57 host](https://github.com/expo/expo/blob/sdk-57/apps/expo-go/ios/Exponent/Supporting/Info.plist)
already declares audio background mode; no blanket Expo Go restriction is assumed.
Neither the native configuration nor successful browser playback proves the
deferred iPhone issue is fixed. A development-only
`EXPO_PUBLIC_PODCAST_DISABLE_SAMPLING=1` switch remains available for reproducible
comparison; it disables live analysis, not the bundled reference silhouette.
Normal runs leave it off, and production builds ignore it. Lifecycle diagnostics
include UTC time and native playback state without account data or media URLs.

## Refresh and verify

From `bibledept-mobile`:

```sh
python scripts/update-podcast-map.py
npm run typecheck
npm test
```

The refresh script fails on missing/duplicate days, unexpected media hosts, or new
reading mismatches that have not been reviewed. It never downloads audio files.
For an offline check against an already saved RSS file:

```sh
python scripts/update-podcast-map.py --feed-file path/to/feed.xml --check
```

The metadata is intentionally local and stable. A normal app launch does not download
or parse the multi-megabyte RSS feed, and no extra cloud service is needed.

To regenerate reference waveforms, run from the repository root with Python 3.12
and FFmpeg on PATH:

```sh
python scripts/build-podcast-waveforms.py --workers 3
```

The script bounds concurrent public-stream decoding, skips matching completed
entries and saves only amplitudes/source IDs/durations. `--start`/`--end` limit
the day range; `--refresh` intentionally rebuilds existing references. Decoding
occurs during development, never in a normal app launch.

See [the request audit](REQUEST_AUDIT.md#verification-and-remaining-work) for final
test totals, export results, browser checks and remaining device work. Scoped
audio tests cover real PCM/stereo handling, the iOS zero-timestamp fallback,
reference integrity for every day, spatial falloff and height bounds, seek guards,
owner-scoped persistence and genuine listened intervals. Earlier Firebase/backend
integration results remain their recorded baseline; this audio/UI revision does
not claim to have rerun those backend checks.

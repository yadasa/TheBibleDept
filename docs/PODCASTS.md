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

`bibledept-mobile/src/data/bibledept-podcasts.json` contains 365 tuples:
`[publisherEpisodeIdWithoutHyphens, streamIdWithoutHyphens, durationSeconds]`.
The file is 28,218 bytes. Shared URL prefixes and normal reading labels are derived
in `src/services/podcasts.ts`; six reading-label differences are stored explicitly.
Neither the feed's descriptions/artwork nor MP3 files are bundled or stored in Firebase.

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
0.1.3 supplies `PlayerWaveform`, with a custom SVG bar renderer in
`src/components/PodcastWaveform.tsx`. The stream's playback clock controls progress;
the library's independent 1× animation is disabled so seeking and faster speeds
stay aligned.

Expo Audio's `useAudioSampleListener` provides decoded PCM during playback. The
engine measures each channel's RMS, keeps the louder channel, and stores the peak
in one of 96 bins based on the sample's actual media timestamp. It does not average
opposite stereo phases into silence. The current displayed bar follows the latest measured
level after downsampling, so older peaks cannot mask quiet speech; UI sample updates are limited to roughly 10 per second. The level resets
on pause/end while historical peaks remain for the active episode.

Unheard or skipped sections have no invented peaks. They render a low baseline,
with the caption **The waveform fills in as you listen.** A perceptual square-root
scale makes quieter speech visible. Listened bars are orange, with a contrasting
gradient at the current progress edge fading backward over approximately 1.5 bar
pitches. Samples remain in memory; no waveform data is uploaded to Firebase.

iPhone sampling uses the playback audio and requests no microphone access. Web
sampling uses an anonymous-CORS audio source and a browser analyser. Android
sampling is deliberately disabled because Expo Audio requires `RECORD_AUDIO`
permission for it; the player reports that visualization is unavailable there
without asking for microphone permission. Android playback controls remain
available. An unsupported visualizer does not prevent listening.

## Background playback and device checks

The audio session enables silent-mode playback, background playback, and
`doNotMix` interruption behavior. The Expo Audio plugin enables background
playback while disabling microphone permission and background recording. Resolved
iOS native configuration was inspected and contains `UIBackgroundModes: ["audio"]`.
The engine registers lock-screen metadata with the episode/day title, Dr. Manny
Arango, and The Bible Dept., plus seek controls, and clears them when dismissed.

The dependencies are compatible with Expo Go SDK 57 and the iOS JavaScript bundle
exports successfully. These are configuration/bundle checks, not physical-device
confirmation. Actual iPhone PCM sampling, locked-screen controls, and background
playback still need device validation. A signed native app must retain the
background capability. Force quitting the app on iOS stops playback; the engine
does not auto-resume after a restart.

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

Current audio/UI verification on 2026-10-18: TypeScript, all 39 unit tests, and the
iOS JavaScript export passed. The audio tests cover real PCM levels and stereo
phase handling, timestamp-based bins and unheard gaps, invalid clocks, endpoint
binning, finite duration/seek guards, and speed choices. Native configuration
introspection confirmed the iOS audio background mode without a microphone
permission declaration.

Current browser review confirmed real PCM peaks from Day 1, persistent playback
across Home/Notes/Account and day browsing, 1.5×/2× playback, waveform tap and
keyboard seeking, replay from the end, and the bright progress marker at phone
width. AM/PM controls were checked in an isolated local account, including midnight;
both display themes were reviewed. No browser console errors were observed.

The earlier player review confirmed Day 1's actual stream, play/pause, skipping,
seeking, and Day 131's reading-range note. Its old page-local stop behavior has
been replaced by the global provider above. Earlier Firebase/backend integration
results remain the recorded baseline; they were not rerun for this audio/UI
revision. Physical iPhone checks remain outstanding.

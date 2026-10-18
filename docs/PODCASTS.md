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

The Listen & Understand card appears below the day's Scripture and chapter controls.
It offers in-app play/pause, 15-second rewind/forward, seeking, elapsed/duration
labels, an exact episode-page link, and clearly labeled Apple/Spotify follow links.
The follow links open the show; they are not presented as episode-specific links.

`expo-audio` is supported by Expo Go on iPhone. The player starts with no source;
the MP3 is attached only when the user presses Play. It streams on demand, does not
autoplay, and does not download files for offline use. Switching chapters keeps the
same episode; changing days or leaving the plan releases the player and stops it.
This iteration uses foreground playback. It does not request recording/microphone
permissions or promise playback while the device is locked.

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

Verification on 2026-10-18: TypeScript and all 18 unit tests passed. Browser testing
played and paused Day 1's actual stream, skipped 15 seconds, sought through the bar,
kept playback while changing chapters, and stopped/reset playback when changing to
Day 131. The Day 131 reading-range note was displayed. The iOS JavaScript bundle
also exported successfully; physical iPhone playback remains a device check.

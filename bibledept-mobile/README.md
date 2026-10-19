# BibleDept for Expo

This is the active Expo client for iPhone, Android, and web. The original native app remains in `../bibledept-app` while its features are adapted incrementally.

## Start

```sh
npm ci
npm --prefix functions ci
npx expo login --browser
npm start
```

Install the current Expo Go on the iPhone, sign in with the same Expo account as the CLI, connect the phone and computer to the same local network, and scan the terminal QR code with the Camera app. This project targets Expo SDK 57. `npm run web` opens the same React Native UI in a browser for local verification.

The client defaults to dark mode with cached grain, five separate circular orange gradients and the website's transparent navbar logo. The Church navigation has a full frosted shell behind its selected orange pill, with isolated paint layers to prevent ghosted labels. Borderless buttons and the plan card retain backdrop blur. A continuous page track shares the nav stretch/compress clock: 430 ms for adjacent tabs, up to 700 ms for a four-position jump. Transitions continue from the visible position when interrupted and settle at an exact page width. Reduced motion settles immediately. Web scroll edges fade; native content stays unmasked so backdrop blur can render correctly. Native directional motion blur is not implemented. Tab order is Notes · Prayer · Home · Bible · Account. Signed-in users can choose Light or Dark in Account → Settings.

WEB/KJV reading, the 365-day plan, official daily podcasts, Firebase email/phone accounts, server-owned streaks, private prayer journals, verse highlights and comments synced into Notes, and optional reminder infrastructure are implemented. The chapter completion action saves a reading day; advancing the plan changes the device's saved place. Giving and payment SDKs are not included.

## Podcast player

One `expo-audio` player lives above the page and theme providers. An episode continues when you change tabs, browse another day, or change theme. The mini player offers play/pause, close, and a shortcut back to the active episode. Playing another day's episode replaces the stream. Closing the player stops it; restarting the app does not restore or autoplay an episode.

Audio streams directly from the official RedCircle feed's MP3 endpoints. The compact day/episode index is bundled in the app. There is no cloud mapping, offline audio download, or extra whole-file fetch to generate a waveform.

`react-native-waveforms` 0.1.3 renders `PlayerWaveform`. All 365 episodes have 96 build-time RMS samples, so paused and unheard sections retain a genuine measured silhouette. Live Expo Audio PCM updates heard bins and influences the current bar and nearby bars with a smooth falloff. Unaffected full-player bars scale to a maximum of 67%; the current bar can reach 100%. The mini-player retains its static, bottom-aligned silhouette, blurred at 33% height and sharp at 67% during a drag. The shared orange is `#F05A00`. A bright trail fades backward over 4.5 bar pitches inside the bars; the 2.5 px white indicator averages the preceding four displayed bar heights and eases over 180 ms. The stream clock controls seeking/progress, including at 1×, 1.25×, 1.5×, and 2× with pitch correction. Touch feedback and bar heights ease on the UI thread.

The dependencies match Expo Go SDK 57. Background playback is configured, including `UIBackgroundModes: ["audio"]`, but physical iPhone tests still stop audio on lock with PCM sampling both enabled and disabled. The user has deferred this issue. Force quitting iOS stops playback. Android live sampling is disabled to avoid a microphone permission request; its bundled reference waveform remains visible. See [podcast details](../docs/PODCASTS.md).

## Settings and copy

Reminder and quiet-hour times use AM/PM pickers; internal schedule values remain in 24-hour form. App copy now uses specific reading, teaching, note, and prayer instructions instead of repeated motivational slogans. [Design implementation](../docs/APP_DESIGN_IMPLEMENTATION.md) records the tone references and review criteria.

## Verification

See the [request audit and optimization review](../docs/REQUEST_AUDIT.md) for final test/export results, browser checks, measured rendering improvements and remaining work. Previous Firebase/backend integration results are documented in the [release review](../docs/APP_RELEASE_REVIEW.md); those suites were not rerun for this UI revision. Native export and configuration checks do not replace signed-device validation.

Configure Firebase using ignored `.env.local`; see [local setup](../docs/LOCAL_TESTING.md), [habit/backend setup](../docs/HABIT_FEATURES_SETUP.md), [design implementation](../docs/APP_DESIGN_IMPLEMENTATION.md), and [release verification](../docs/APP_RELEASE_REVIEW.md). `npm run emulators` includes the active Functions codebase; `npm run test:emulators` uses an isolated disposable suite.

Live native phone verification requires [a signed development build](../docs/IPHONE_NATIVE_SETUP.md); web SMS uses Firebase reCAPTCHA on an authorized hosted domain. Reserved fictional numbers work through local emulators in Expo Go. Push requires a physical device, native credentials, and deployment, and live dispatch is off by default. [Universal links](../docs/APP_LINKS.md) require a signed build and a website association file. Offline Bible downloads and durable offline note drafts are not implemented.

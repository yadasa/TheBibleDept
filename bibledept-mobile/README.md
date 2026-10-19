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

The client defaults to dark mode with visible grain and the website's transparent navbar logo. The floating navigation has a transparent background and one selected glass pill, adapted from the Church repo. Borderless frosted buttons and the plan card retain backdrop blur. A continuous page track and moving grain share the nav stretch/compress clock: 430 ms for adjacent tabs, up to 700 ms for a four-position jump. Transitions begin synchronously and continue from the current animated position when interrupted, so rapid taps cannot leave a previous destination onscreen. Labels remain readable while the pill travels. Page transitions use no snapshot or motion-blur overlay; reduced motion settles immediately. Scroll edges fade content while preserving the background. Tab order is Notes · Prayer · Home · Bible · Account. Signed-in users can choose Light or Dark in Account → Settings.

WEB/KJV reading, the 365-day plan, official daily podcasts, Firebase email/phone accounts, server-owned streaks, private prayer journals, verse highlights and comments synced into Notes, and optional reminder infrastructure are implemented. The chapter completion action saves a reading day; advancing the plan changes the device's saved place. Giving and payment SDKs are not included.

## Podcast player

One `expo-audio` player lives above the page and theme providers. An episode continues when you change tabs, browse another day, or change theme. The mini player offers play/pause, close, and a shortcut back to the active episode. Playing another day's episode replaces the stream. Closing the player stops it; restarting the app does not restore or autoplay an episode.

Audio streams directly from the official RedCircle feed's MP3 endpoints. The compact day/episode index is bundled in the app. There is no cloud mapping, offline audio download, or extra whole-file fetch to generate a waveform.

`react-native-waveforms` 0.1.3 renders `PlayerWaveform` using actual playback PCM from Expo Audio. Ninety-six timeline bins retain measured RMS peaks; the current bar responds to the latest sample. Unheard sections show a low baseline and fill as you listen. Orange progress has a contrasting accent fading backward over roughly 1.5 bar pitches. The stream clock controls seeking/progress, including at 1×, 1.25×, 1.5×, and 2× with pitch correction.

The dependencies match Expo Go SDK 57, and the iOS JavaScript bundle exports successfully. iPhone PCM sampling, lock-screen controls, and background playback still require physical-device testing. Background playback is enabled in the audio plugin and session; resolved iOS configuration includes `UIBackgroundModes: ["audio"]`. Force quitting iOS stops playback. Android sampling is intentionally disabled because the SDK requires microphone permission for it; Android listening does not request that permission. See [podcast details](../docs/PODCASTS.md).

## Settings and copy

Reminder and quiet-hour times use AM/PM pickers; internal schedule values remain in 24-hour form. App copy now uses specific reading, teaching, note, and prayer instructions instead of repeated motivational slogans. [Design implementation](../docs/APP_DESIGN_IMPLEMENTATION.md) records the tone references and review criteria.

## Verification

The current audio/UI revision passes TypeScript and 44 unit tests; the preceding navigation/audio repair passed iOS JavaScript export. The physical Expo Go lock test still stops playback. A development-only comparison can completely disable PCM sampling; see [podcast diagnostics](../docs/PODCASTS.md). Previous Firebase/backend integration results are documented in the [release review](../docs/APP_RELEASE_REVIEW.md); those suites were not rerun for this revision. Native export and configuration checks do not replace signed-device validation.

Configure Firebase using ignored `.env.local`; see [local setup](../docs/LOCAL_TESTING.md), [habit/backend setup](../docs/HABIT_FEATURES_SETUP.md), [design implementation](../docs/APP_DESIGN_IMPLEMENTATION.md), and [release verification](../docs/APP_RELEASE_REVIEW.md). `npm run emulators` includes the active Functions codebase; `npm run test:emulators` uses an isolated disposable suite.

Live native phone verification requires [a signed development build](../docs/IPHONE_NATIVE_SETUP.md); web SMS uses Firebase reCAPTCHA on an authorized hosted domain. Reserved fictional numbers work through local emulators in Expo Go. Push requires a physical device, native credentials, and deployment, and live dispatch is off by default. [Universal links](../docs/APP_LINKS.md) require a signed build and a website association file. Offline Bible downloads and durable offline note drafts are not implemented.

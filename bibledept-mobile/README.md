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

The client defaults to dark mode with visible grain, the website's transparent navbar logo, and floating frosted navigation adapted from the Church repo. Borderless frosted buttons and the plan card use real backdrop blur. A continuous page track and moving grain share the nav stretch/compress clock: 430 ms for adjacent tabs, up to 700 ms for a four-position jump. Intermediate pages pass through the viewport, motion blur clears on arrival, and scroll edges fade content to zero opacity while preserving the background. Tab order is Notes · Prayer · Home · Bible · Account. Signed-in users can choose Light or Dark in Account → Settings.

WEB/KJV reading, the 365-day plan, official daily podcasts, Firebase email/phone accounts, server-owned streaks, private prayer journals, verse highlights and comments synced into Notes, and optional reminder infrastructure are implemented. The chapter completion action saves a reading day; advancing the plan changes the device's saved place. Giving and payment SDKs are not included.

Configure Firebase using ignored `.env.local`; see [local setup](../docs/LOCAL_TESTING.md), [habit/backend setup](../docs/HABIT_FEATURES_SETUP.md), [design implementation](../docs/APP_DESIGN_IMPLEMENTATION.md), and [release verification](../docs/APP_RELEASE_REVIEW.md). `npm run emulators` includes the active Functions codebase; `npm run test:emulators` uses an isolated disposable suite.

Live native phone verification requires [a signed development build](../docs/IPHONE_NATIVE_SETUP.md); web SMS uses Firebase reCAPTCHA on an authorized hosted domain. Reserved fictional numbers work through local emulators in Expo Go. Push requires a physical device, native credentials, and deployment, and live dispatch is off by default. [Universal links](../docs/APP_LINKS.md) require a signed build and a website association file. Offline Bible downloads and durable offline note drafts are not implemented.

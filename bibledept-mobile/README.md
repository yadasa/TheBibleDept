# BibleDept for Expo

This is the active iPhone migration client. The original native app remains in `../bibledept-app` while its features are adapted incrementally.

## Start

```sh
npm ci
npx expo login --browser
npm start
```

Install the current Expo Go on the iPhone, sign in with the same Expo account as the CLI, connect the phone and computer to the same local network, and scan the terminal QR code with the Camera app. This project targets Expo SDK 57. `npm run web` opens the same React Native UI in a browser for local verification.

The client shares the original app's BibleDept color palette. Giving and payment SDKs are not included. Online Bible reading (WEB/KJV), Firebase email accounts, reading streaks, and private prayer journals are implemented. Configure Firebase using the ignored `.env.local` file; see [the full setup guide](../docs/LOCAL_TESTING.md).

Live phone verification requires [a signed development build](../docs/IPHONE_NATIVE_SETUP.md). Reserved fictional numbers work through local emulators in Expo Go. [Universal links](../docs/APP_LINKS.md) require a signed build and a website association file; they cannot be fully verified inside Expo Go. Offline Bible downloads and the older app's remaining features are not yet ported.

# BibleDept for Expo

This is the active iPhone migration client. The original native app remains in `../bibledept-app` while its features are adapted incrementally.

## Start

```sh
npm ci
npm start
```

Install Expo Go on the iPhone, connect the phone and computer to the same local network, and scan the terminal QR code with the Camera app. This project targets Expo SDK 57. `npm run web` opens the same React Native UI in a browser for local verification.

The client shares the original app's BibleDept color palette. Giving and payment SDKs are not included. Firebase authentication, online Bible reading, and account features are being added as separate migration steps.

Universal links require a signed development build and a website association file; they cannot be fully verified inside Expo Go.

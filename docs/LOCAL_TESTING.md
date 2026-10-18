# Local iPhone testing

Use `bibledept-mobile`, the active Expo client. The older `bibledept-app` is retained
for migration and does not run inside Expo Go.

## Install and configure

Use Node.js 22 and install the current Expo Go from the iPhone App Store.

```powershell
cd D:\Users\itsst\Downloads\TheBibleDept\TheBibleDept\bibledept-mobile
npm ci
Copy-Item .env.example .env.local
```

Do not overwrite an existing `.env.local`; the configured development computer
already has its selected Firebase project there. It is intentionally ignored by Git.
Firebase Web App configuration is client configuration; never put service-account
keys or admin credentials into `EXPO_PUBLIC_*` variables.

For a live project, set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false` and fill the six
Firebase Web App fields from Firebase Console → Project settings → General.
The project's email/password provider must be enabled. A shared church project
must merge the `/bibledeptUsers` block into its existing rules; **do not replace the
church's complete rules with this client's standalone emulator rules**.

## Start the preview

```powershell
npx expo login --browser
npm start
```

Sign into **the same Expo account** on the CLI and in Expo Go. On the configured
computer the CLI account is `keithazodeh`. Expo Go requires this even for local LAN
development. If Windows cannot launch the login browser, use:

```powershell
$env:BROWSER='none'
npx expo login --browser
```

Open the printed official Expo login link and finish sign-in. Keep the terminal
running, put the iPhone and computer on the same Wi-Fi/LAN, and scan the QR with
iPhone Camera. `npm start` explicitly selects Expo Go even though the optional
development-build tooling is installed.

## If the phone times out

1. Disconnect a VPN on both devices if it routes local traffic away from the LAN.
2. Update Expo Go, sign into the same account, and allow its iOS Local Network permission.
3. Try the development server's `http://PC_LAN_IP:8081` address in Safari. It should
   show the web preview when started with `npm start -- --web`. If Safari also times
   out, check Wi-Fi client isolation and Windows Firewall's Node.js inbound access
   on the private network. Do not expose the development server on your router.
4. If the PC's address changes, update or remove the ignored
   `REACT_NATIVE_PACKAGER_HOSTNAME` / emulator-host overrides, restart Expo, and scan
   the new QR. Restart Expo after changing Firebase environment values too.

## Optional emulator mode

For disposable local accounts, set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true`.
Install Java 21, then run `npm run emulators` in a separate terminal before Expo.
The demo project is `demo-bibledept`; no production Firebase resources are used.
The emulator UI is at `http://127.0.0.1:4000`. Set
`EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to the PC's LAN address for iPhone access.
Emulator state exports to ignored `.firebase/data` on graceful exit; import an
existing export with `npm run emulators -- --import=.firebase/data`.

Reserved fictional phone numbers `+16505550100`–`+16505550199` work in emulator mode
without real SMS. The test code appears in the app. **Live SMS cannot run in Expo Go**;
use [the signed iPhone build setup](IPHONE_NATIVE_SETUP.md) for it.

## Checks

```powershell
npm run typecheck
npm test
npm run test:firebase  # requires the local emulators
npx expo export --platform ios --output-dir .expo/verify-ios
```

Emulator tests always target loopback and the demo project, even when the app's
`.env.local` selects a live project. Do not test real phone numbers through them.
See [app links](APP_LINKS.md) and [the Bible API](BIBLE_API.md) for supported formats.

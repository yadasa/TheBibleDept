# iPhone native features

The Expo client uses Firebase's JavaScript SDK for its account session, Firestore data, email login, and verification-code sign-in. The live phone challenge uses React Native Firebase in a signed development build; it is not initialized in Expo Go. Local phone testing uses only the demo Auth emulator and fictional numbers.

## Configure a real Firebase project

1. Copy the project's Web App configuration into `bibledept-mobile/.env.local` using the `EXPO_PUBLIC_FIREBASE_*` names in `.env.example`.
2. Set `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false`.
3. Enable Email/Password and Phone providers in Firebase Authentication. Use Firebase's configured test phone numbers while validating the build. Live SMS is subject to Firebase's billing and region policies; this setup does not enable billing or send messages by itself.
4. Register an iOS app with bundle identifier `com.bibledept.app`. Save its `GoogleService-Info.plist` locally and set `BIBLEDEPT_FIREBASE_IOS_CONFIG` to that path.
5. Set `BIBLEDEPT_NATIVE_PHONE=1`. The Expo config adds the native Firebase app/auth plugins and static iOS frameworks only for that build. Native and Web App configurations must belong to the same Firebase project.
6. Complete Firebase's iOS phone-auth setup, including APNs and the reCAPTCHA return scheme. Build/install a development client using Xcode on a Mac or an explicitly configured EAS Build workflow, then run `npm run start:development-build`.

No native build has been submitted, and no Apple or Firebase account settings have been changed automatically. Real iPhone SMS verification still needs device testing with the configured project.

Sources: [Firebase JavaScript SDK environments](https://firebase.google.com/docs/web/environments-js-sdk), [React Native Firebase phone setup](https://rnfirebase.io/auth/phone-auth), [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

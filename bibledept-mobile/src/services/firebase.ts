import Constants from 'expo-constants';
import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { createAuthSession } from './authSession';

export const usingEmulators = __DEV__ && process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
// Emulator mode always uses the demo project, even when live config is present.
const projectId = usingEmulators ? 'demo-bibledept' : process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '';
const config = {
  apiKey: usingEmulators ? 'demo-bibledept-api-key' : process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: usingEmulators ? 'demo-bibledept.firebaseapp.com' : process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : ''),
  projectId,
  storageBucket: usingEmulators ? undefined : process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: usingEmulators ? undefined : process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
  appId: usingEmulators ? '1:1234567890:web:local' : process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};
export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);
export const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || Constants.expoConfig?.hostUri?.split(':')[0] || '127.0.0.1';
let client: { auth: ReturnType<typeof getAuth>; db: ReturnType<typeof getFirestore> } | undefined;

export function getFirebase() {
  if (client) return client;
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Copy .env.example to .env.local and select local emulators or enter your Firebase Web App configuration.');
  const existing = getApps().find(app => app.name === 'bibledept-mobile');
  const app = existing || initializeApp(config, 'bibledept-mobile');
  const auth = existing ? getAuth(app) : createAuthSession(app);
  const db = getFirestore(app);
  if (usingEmulators && !existing) {
    const host = emulatorHost;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
  }
  client = { auth, db };
  return client;
}

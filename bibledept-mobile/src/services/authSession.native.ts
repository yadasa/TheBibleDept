import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

// Metro selects Firebase's React Native entry; its public type entry omits this export.
type NativeAuth = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
};

export const createAuthSession = (app: FirebaseApp) => FirebaseAuth.initializeAuth(app, {
  persistence: (FirebaseAuth as NativeAuth).getReactNativePersistence(AsyncStorage),
});

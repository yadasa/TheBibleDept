import { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
export const createAuthSession = (app: FirebaseApp) => getAuth(app);

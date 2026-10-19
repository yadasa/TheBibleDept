import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getFirebase } from './firebase';

export function clearPhoneVerifier(){}

export async function requestNativePhoneCode(phoneNumber:string):Promise<string> {
  if(Constants.executionEnvironment===ExecutionEnvironment.StoreClient) {
    throw new Error('Live SMS verification needs a signed development build. Expo Go supports email and local emulator phone tests.');
  }
  if(Constants.expoConfig?.extra?.nativePhoneAuth!==true) {
    throw new Error('Native phone verification is not enabled in this build. Use email or the web app.');
  }
  // These native modules must never be initialized in Expo Go.
  const nativeApp = require('@react-native-firebase/app') as typeof import('@react-native-firebase/app');
  const nativeAuth = require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
  if(nativeApp.getApp().options.projectId!==getFirebase().auth.app.options.projectId) {
    throw new Error('The native and JavaScript Firebase configurations must use the same project.');
  }
  const result=await nativeAuth.verifyPhoneNumber(nativeAuth.getAuth(),phoneNumber);
  if(!result.verificationId)throw new Error('Phone verification did not start. Please retry.');
  return result.verificationId;
}

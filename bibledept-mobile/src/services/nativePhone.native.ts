import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getFirebase } from './firebase';
import { UserFacingError } from './userMessage';

export function clearPhoneVerifier(){}

export async function requestNativePhoneCode(phoneNumber:string):Promise<{verificationId:string;automaticCode?:string}> {
  if(Constants.executionEnvironment===ExecutionEnvironment.StoreClient) {
    throw new UserFacingError('Phone sign-in isn’t available here. Use email instead.',new Error('Live SMS verification needs a signed development build. Expo Go supports email and local emulator phone tests.'));
  }
  if(Constants.expoConfig?.extra?.nativePhoneAuth!==true) {
    throw new UserFacingError('Phone sign-in isn’t available here. Use email instead.',new Error('Native phone verification is not enabled in this build.'));
  }
  // These native modules must never be initialized in Expo Go.
  const nativeApp = require('@react-native-firebase/app') as typeof import('@react-native-firebase/app');
  const nativeAuth = require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
  if(nativeApp.getApp().options.projectId!==getFirebase().auth.app.options.projectId) {
    throw new UserFacingError('We couldn’t start phone sign-in. Please use email for now.',new Error('The native and JavaScript Firebase configurations must use the same project.'));
  }
  const result=await nativeAuth.verifyPhoneNumber(nativeAuth.getAuth(),phoneNumber);
  if(!result.verificationId)throw new UserFacingError('We couldn’t send a verification code. Please try again.');
  return {verificationId:result.verificationId,...(result.code?{automaticCode:result.code}:{})};
}

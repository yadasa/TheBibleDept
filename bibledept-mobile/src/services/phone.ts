import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { authEmulatorPort, emulatorHost, getFirebase, usingEmulators } from './firebase';
import { requestNativePhoneCode } from './nativePhone';
import { UserFacingError } from './userMessage';

export type PhoneChallenge = {verificationId:string;testCode?:string};
export async function requestPhoneCode(phoneNumber:string):Promise<PhoneChallenge> {
  if(!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) throw new UserFacingError('Include your country code, for example +1 650 555 0123.');
  if(!usingEmulators){
    const result=await requestNativePhoneCode(phoneNumber);
    if(result.automaticCode)await confirmPhoneCode(result.verificationId,result.automaticCode);
    return {verificationId:result.verificationId};
  }
  // This adapter is deliberately restricted to the local demo project and fictional numbers.
  if(!__DEV__||getFirebase().auth.app.options.projectId!=='demo-bibledept'||!/^\+165055501\d{2}$/.test(phoneNumber)) {
    throw new UserFacingError('Use a practice number from +16505550100 to +16505550199. No text message will be sent.');
  }
  const base=`http://${emulatorHost}:${authEmulatorPort}`;
  const response=await fetch(`${base}/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=demo-bibledept-api-key`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber}),
  });
  const result=await response.json();
  if(!response.ok||typeof result.sessionInfo!=='string')throw new UserFacingError('We couldn’t get a practice code. Please try again.',new Error('Could not start local phone verification. Check the Firebase emulator.'));
  const codes=await fetch(`${base}/emulator/v1/projects/demo-bibledept/verificationCodes`).then(r=>r.json());
  const testCode=codes.verificationCodes?.find((entry:{sessionInfo:string})=>entry.sessionInfo===result.sessionInfo)?.code;
  return {verificationId:result.sessionInfo,testCode};
}
export async function confirmPhoneCode(verificationId:string,code:string){
  if(!/^\d{6}$/.test(code))throw new UserFacingError('Enter the 6-digit verification code.');
  const credential=PhoneAuthProvider.credential(verificationId,code);
  return signInWithCredential(getFirebase().auth,credential);
}

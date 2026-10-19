import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { emulatorHost, getFirebase, usingEmulators } from './firebase';
import { requestNativePhoneCode } from './nativePhone';

export type PhoneChallenge = {verificationId:string;testCode?:string};
export async function requestPhoneCode(phoneNumber:string):Promise<PhoneChallenge> {
  if(!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) throw new Error('Use an international phone number, such as +16505550123.');
  if(!usingEmulators)return {verificationId:await requestNativePhoneCode(phoneNumber)};
  // This adapter is deliberately restricted to the local demo project and fictional numbers.
  if(!__DEV__||getFirebase().auth.app.options.projectId!=='demo-bibledept'||!/^\+165055501\d{2}$/.test(phoneNumber)) {
    throw new Error('Local testing uses fictional +16505550100 through +16505550199 numbers only.');
  }
  const base=`http://${emulatorHost}:9099`;
  const response=await fetch(`${base}/identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=demo-bibledept-api-key`,{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phoneNumber}),
  });
  const result=await response.json();
  if(!response.ok||typeof result.sessionInfo!=='string')throw new Error('Could not start local phone verification. Check the Firebase emulator.');
  const codes=await fetch(`${base}/emulator/v1/projects/demo-bibledept/verificationCodes`).then(r=>r.json());
  const testCode=codes.verificationCodes?.find((entry:{sessionInfo:string})=>entry.sessionInfo===result.sessionInfo)?.code;
  return {verificationId:result.sessionInfo,testCode};
}
export async function confirmPhoneCode(verificationId:string,code:string){
  if(!/^\d{6}$/.test(code))throw new Error('Enter the 6-digit verification code.');
  const credential=PhoneAuthProvider.credential(verificationId,code);
  return signInWithCredential(getFirebase().auth,credential);
}

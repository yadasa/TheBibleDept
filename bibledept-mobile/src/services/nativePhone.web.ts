import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getFirebase } from './firebase';

let verifier:RecaptchaVerifier|undefined;
export function clearPhoneVerifier(){verifier?.clear();verifier=undefined;}
export async function requestNativePhoneCode(phoneNumber:string):Promise<{verificationId:string;automaticCode?:string}>{
  clearPhoneVerifier();
  const container=document.getElementById('phone-recaptcha');
  if(!container)throw new Error('Open phone sign-in again to start verification.');
  const current=new RecaptchaVerifier(getFirebase().auth,container,{size:'normal',theme:'dark'});
  verifier=current;
  try{return {verificationId:(await signInWithPhoneNumber(getFirebase().auth,phoneNumber,current)).verificationId};}
  finally{if(verifier===current)clearPhoneVerifier();}
}

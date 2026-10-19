import { UserFacingError } from './userMessage';

export async function requestNativePhoneCode(_phoneNumber:string):Promise<{verificationId:string;automaticCode?:string}> {
  throw new UserFacingError('Phone sign-in isn’t available here. Use email instead.',new Error('Live phone verification needs the configured signed native build or the hosted web app.'));
}
export function clearPhoneVerifier(){}

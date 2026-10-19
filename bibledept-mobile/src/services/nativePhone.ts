export async function requestNativePhoneCode(_phoneNumber:string):Promise<{verificationId:string;automaticCode?:string}> {
  throw new Error('Live phone verification needs the configured signed native build or the hosted web app.');
}
export function clearPhoneVerifier(){}

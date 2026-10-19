export async function requestNativePhoneCode(_phoneNumber:string):Promise<string> {
  throw new Error('Live phone verification is available in the configured iPhone development build. Use email on the web.');
}
export function clearPhoneVerifier(){}

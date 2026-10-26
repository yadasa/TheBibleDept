import { UserFacingError } from './userMessage';
export function communityErrorForUser(error:unknown) {
  const details=(error as {details?:{app?:unknown;message?:unknown}}|null)?.details;
  if(details?.app==='bibledept-community'&&typeof details.message==='string'&&details.message.length>0&&details.message.length<=500&&!/[\x00-\x1f\x7f]/.test(details.message))return new UserFacingError(details.message,error);
  return new UserFacingError('We couldn’t sync that change. Check your connection and try again.',error);
}

import { cleanCircleName, validDocumentId } from '../../shared/community';
export type PendingCircleCreation={id:string;name:string};
type CreationStorage={setItem:(key:string,value:string)=>Promise<unknown>;removeItem:(key:string)=>Promise<unknown>};
export function circleCreationKey(owner:string){return `bibledept.circleCreation:${encodeURIComponent(owner)}`;}
export function decodeCircleCreation(raw:string|null):PendingCircleCreation|null {
  try {
    const value=JSON.parse(raw||'null');
    if(!value||!validDocumentId(value.id))return null;
    return {id:value.id,name:cleanCircleName(value.name)};
  }catch{return null;}
}
export async function deliverCircleCreation(storage:CreationStorage,key:string,request:PendingCircleCreation,send:(request:PendingCircleCreation)=>Promise<{id:string}>) {
  if(!key||!validDocumentId(request.id))throw new Error('Invalid circle request.');
  const pending={...request,name:cleanCircleName(request.name)};
  await storage.setItem(key,JSON.stringify(pending));
  const result=await send(pending);
  if(result.id!==pending.id)throw new Error('The circle receipt could not be confirmed.');
  await storage.removeItem(key);
  return result;
}

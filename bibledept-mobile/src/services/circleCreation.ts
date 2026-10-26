import { cleanCircleName, validDocumentId } from '../../shared/community';
import { DurableStorage, updateDurableValue, writeDurableValue } from './durableStorage';
export type PendingCircleCreation={id:string;name:string};
export function circleCreationKey(owner:string){return `bibledept.circleCreation:${encodeURIComponent(owner)}`;}
export function decodeCircleCreation(raw:string|null):PendingCircleCreation|null {
  try {
    const value=JSON.parse(raw||'null');
    if(!value||!validDocumentId(value.id))return null;
    return {id:value.id,name:cleanCircleName(value.name)};
  }catch{return null;}
}
export function clearCircleCreation(storage:DurableStorage,key:string,request:PendingCircleCreation) {
  return updateDurableValue(storage,key,raw=>{const current=decodeCircleCreation(raw);return current?.id===request.id&&current.name===request.name?null:raw;});
}
export async function deliverCircleCreation(storage:DurableStorage,key:string,request:PendingCircleCreation,send:(request:PendingCircleCreation)=>Promise<{id:string}>) {
  if(!key||!validDocumentId(request.id))throw new Error('Invalid circle request.');
  const pending={...request,name:cleanCircleName(request.name)};
  await writeDurableValue(storage,key,JSON.stringify(pending));
  const result=await send(pending);
  if(result.id!==pending.id)throw new Error('The circle receipt could not be confirmed.');
  await clearCircleCreation(storage,key,pending);
  return result;
}

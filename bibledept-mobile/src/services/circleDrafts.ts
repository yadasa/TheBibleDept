import { cleanMessage, validDocumentId } from '../../shared/community';
import { DurableStorage, updateDurableValue, writeDurableValue } from './durableStorage';
export type PendingCircleMessage={id:string;text:string};
export type CircleDraft={text:string;pending:PendingCircleMessage|null};
export function circleDraftKey(owner:string,circleId:string){return `bibledept.circleDraft:${encodeURIComponent(owner)}:${encodeURIComponent(circleId)}`;}
export function decodeCircleDraft(raw:string|null):CircleDraft {
  const empty={text:'',pending:null};
  try {
    const value=JSON.parse(raw||'null');
    if(!value||typeof value.text!=='string'||value.text.length>2000)return empty;
    const pending=value.pending;
    return {text:value.text,pending:pending&&validDocumentId(pending.id)&&typeof pending.text==='string'&&pending.text.trim()&&pending.text.length<=2000?{id:pending.id,text:pending.text}:null};
  }catch{return empty;}
}
export function persistCircleDraft(storage:DurableStorage,key:string,value:CircleDraft) {
  return writeDurableValue(storage,key,value.text||value.pending?JSON.stringify(value):null);
}
/** Save the retry identity before HTTP. Keep it until both the server and local cleanup succeed. */
export async function deliverCircleMessage(storage:DurableStorage,key:string,draft:PendingCircleMessage,send:(draft:PendingCircleMessage)=>Promise<unknown>) {
  if(!key||!validDocumentId(draft.id)||!draft.text.trim()||draft.text.length>2000)throw new Error('Invalid pending circle message.');
  const pending={id:draft.id,text:cleanMessage(draft.text)};
  await persistCircleDraft(storage,key,{text:pending.text,pending});
  await send(pending);
  await updateDurableValue(storage,key,raw=>{
    const current=decodeCircleDraft(raw);
    return current.pending?.id===pending.id&&current.pending.text===pending.text&&current.text.trim()===pending.text?null:raw;
  });
}

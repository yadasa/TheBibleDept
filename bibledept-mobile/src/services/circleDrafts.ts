import { validDocumentId } from '../../shared/community';
export type PendingCircleMessage={id:string;text:string};
export type CircleDraft={text:string;pending:PendingCircleMessage|null};
type DraftStorage={setItem:(key:string,value:string)=>Promise<unknown>;removeItem:(key:string)=>Promise<unknown>};
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
/** Save the retry identity before HTTP. Keep it until both the server and local cleanup succeed. */
export async function deliverCircleMessage(storage:DraftStorage,key:string,draft:PendingCircleMessage,send:(draft:PendingCircleMessage)=>Promise<unknown>) {
  if(!key||!validDocumentId(draft.id)||!draft.text.trim()||draft.text.length>2000)throw new Error('Invalid pending circle message.');
  await storage.setItem(key,JSON.stringify({text:draft.text,pending:draft}));
  await send(draft);
  await storage.removeItem(key);
}

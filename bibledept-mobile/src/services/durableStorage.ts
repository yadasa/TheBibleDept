export type DurableStorage={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<unknown>;removeItem:(key:string)=>Promise<unknown>};

// One native app runtime can reopen a screen while an older request is still
// finishing. Serialize local operations per key, never across network calls.
const tails=new Map<string,Promise<void>>();
function queued<T>(key:string,work:()=>Promise<T>):Promise<T> {
  const result=(tails.get(key)||Promise.resolve()).then(work),tail=result.then(()=>{},()=>{});
  tails.set(key,tail);
  void tail.then(()=>{if(tails.get(key)===tail)tails.delete(key);});
  return result;
}
export function readDurableValue(storage:DurableStorage,key:string) {return queued(key,()=>storage.getItem(key));}
export function writeDurableValue(storage:DurableStorage,key:string,value:string|null) {return queued(key,()=>value===null?storage.removeItem(key):storage.setItem(key,value));}
export function updateDurableValue(storage:DurableStorage,key:string,change:(current:string|null)=>string|null) {
  return queued(key,async()=>{
    const current=await storage.getItem(key),next=change(current);
    if(next===current)return;
    if(next===null)await storage.removeItem(key);else await storage.setItem(key,next);
  });
}

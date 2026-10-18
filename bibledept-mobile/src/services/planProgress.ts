import { READING_PLAN } from './readingPlan';

export type PlanProgress = Readonly<{currentDay:number;finished:boolean}>;
type Storage = {getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<unknown>};
const initial:PlanProgress = Object.freeze({currentDay:1,finished:false});

function decode(value:string|null):PlanProgress {
  try {
    const data:unknown=JSON.parse(value||'null');
    if(Array.isArray(data)&&Number.isInteger(data[0])&&data[0]>=1&&data[0]<=READING_PLAN.totalDays
      &&[0,1].includes(data[1])&&(!data[1]||data[0]===READING_PLAN.totalDays)) {
      return Object.freeze({currentDay:data[0],finished:data[1]===1});
    }
  } catch { /* Invalid local state starts at day one. */ }
  return initial;
}

/** Device-only progress. No Firebase requests or plan data are written by this store. */
export function createPlanProgressStore(storage:Storage,key:string) {
  let progress=initial;
  let loaded=false;
  let queue:Promise<unknown>=Promise.resolve();
  function enqueue<T>(action:()=>Promise<T>):Promise<T> {
    const result=queue.then(action);
    queue=result.then(()=>undefined,()=>undefined);
    return result;
  }
  return {
    load:()=>enqueue(async()=>{
      const value=decode(await storage.getItem(key));
      progress=value;loaded=true;
      return value;
    }),
    advance:(expectedDay:number)=>enqueue(async()=>{
      if(!loaded)throw new Error('Local progress has not loaded.');
      // Repeated taps on the same day's button cannot skip days.
      if(progress.finished||progress.currentDay!==expectedDay)return progress;
      const next:PlanProgress=Object.freeze({currentDay:Math.min(progress.currentDay+1,READING_PLAN.totalDays),finished:progress.currentDay===READING_PLAN.totalDays});
      await storage.setItem(key,JSON.stringify([next.currentDay,next.finished?1:0]));
      progress=next;
      return next;
    }),
  };
}

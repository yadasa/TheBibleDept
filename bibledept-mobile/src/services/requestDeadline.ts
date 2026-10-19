import { UserFacingError } from './userMessage';

/** Bounds preparation as well as transport. A timed-out server write may still finish. */
export function withRequestDeadline<T>(operation:()=>Promise<T>,timeoutMs:number,message:string):Promise<T> {
  return new Promise<T>((resolve,reject)=>{
    let settled=false;
    const finish=(complete:()=>void)=>{if(settled)return;settled=true;clearTimeout(timer);complete();};
    const timer=setTimeout(()=>finish(()=>reject(new UserFacingError(message,new Error(`Request deadline exceeded after ${timeoutMs} ms`)))),timeoutMs);
    try {Promise.resolve(operation()).then(value=>finish(()=>resolve(value)),error=>finish(()=>reject(error)));}
    catch(error){finish(()=>reject(error));}
  });
}

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { fetchPassage, Translation } from './bible';
import { planPreloadReferences } from './prepareReading';

/** Public Scripture cache only: preparing a day never records reading credit. */
export function usePrepareReading(enabled:boolean,day:number,chapter:number,translation:Translation) {
  useEffect(()=>{
    if(!enabled)return;
    let controller:AbortController|undefined;
    const start=()=>{
      controller?.abort();const request=new AbortController();controller=request;
      void (async()=>{
        for(const reference of planPreloadReferences(day,chapter)){
          if(request.signal.aborted)return;
          await fetchPassage(reference,translation,request.signal);
        }
      })().catch(()=>{}); // Opening the reader owns any user-facing retry/error.
    };
    if(AppState.currentState===null||AppState.currentState==='active')start();
    const listener=AppState.addEventListener('change',state=>{if(state==='active')start();else controller?.abort();});
    return()=>{controller?.abort();listener.remove();};
  },[enabled,day,chapter,translation]);
}

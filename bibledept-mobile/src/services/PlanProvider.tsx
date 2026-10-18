import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';
import { createPlanProgressStore, PlanProgress } from './planProgress';
import { getReadingPlanDay } from './readingPlan';

type PlanContext = PlanProgress & {
  selectedDay:number;ready:boolean;busy:boolean;error:string;
  selectDay:(day:number)=>void;returnToCurrent:()=>void;advance:()=>Promise<void>;retry:()=>void;
};
const Context=createContext<PlanContext|null>(null);

export function PlanProvider({children}:{children:ReactNode}) {
  const {user,ready}=useAuth();
  const owner=ready?(user?.uid||'guest'):'opening';
  return <DevicePlanProvider key={owner} owner={owner} enabled={ready}>{children}</DevicePlanProvider>;
}

function DevicePlanProvider({children,owner,enabled}:{children:ReactNode;owner:string;enabled:boolean}) {
  const store=useMemo(()=>createPlanProgressStore(AsyncStorage,`bibledept.plan.v1:${owner}`),[owner]);
  const [progress,setProgress]=useState<PlanProgress>({currentDay:1,finished:false});
  const [selectedDay,setSelectedDay]=useState(1),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    let active=true;setReady(false);setError('');
    store.load().then(value=>{if(active){setProgress(value);setSelectedDay(value.currentDay);setReady(true);}})
      .catch(()=>{if(active){setError('Your saved plan position could not be opened. Retry to continue.');setReady(true);}});
    return()=>{active=false;};
  },[store,enabled,attempt]);
  async function advance() {
    if(!ready||busy||selectedDay!==progress.currentDay)return;
    setBusy(true);setError('');
    try {const value=await store.advance(progress.currentDay);setProgress(value);setSelectedDay(value.currentDay);}
    catch {setError('Your next day could not be saved on this device. Please retry.');}
    finally {setBusy(false);}
  }
  return <Context.Provider value={{...progress,selectedDay,ready,busy,error,
    selectDay:day=>{if(getReadingPlanDay(day))setSelectedDay(day);},returnToCurrent:()=>setSelectedDay(progress.currentDay),
    advance,retry:()=>setAttempt(value=>value+1)}}>{children}</Context.Provider>;
}

export function usePlan() {
  const value=useContext(Context);
  if(!value)throw new Error('usePlan must be used inside PlanProvider.');
  return value;
}

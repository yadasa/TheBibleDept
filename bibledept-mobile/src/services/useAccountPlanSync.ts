import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getFirebase } from './firebase';
import { listenAccountPlan, saveAccountPlan } from './accountPlanFirestore';
import { AccountPlanProgress, decodeAccountPlan, sameAccountPlan } from './planSync';
import type { PlanProgress } from './planProgress';

const pendingMessage='Your progress is saved here. Connect to sync it to your other devices.';
export function useAccountPlanSync(owner:string|undefined,ready:boolean,progress:PlanProgress,completedDays:number[],applyRemote:(value:AccountPlanProgress)=>Promise<void>) {
  const latest=useRef<AccountPlanProgress>(decodeAccountPlan({...progress,completedDays})!);
  latest.current=decodeAccountPlan({...progress,completedDays})!;
  const wake=useRef<(()=>void)|null>(null),[remoteDays,setRemoteDays]=useState<number[]>([]),[syncError,setSyncError]=useState('');
  const signature=completedDays.join(',');
  useEffect(()=>{
    if(!owner||!ready)return;
    let active=true,confirmed=false,saving=false,lastSent:AccountPlanProgress|null=null,retry:ReturnType<typeof setTimeout>|null=null,attempt=0;
    const client=getFirebase();
    const clearRetry=()=>{if(retry)clearTimeout(retry);retry=null;};
    const accept=async(value:AccountPlanProgress)=>{
      if(!active)return;
      setRemoteDays(previous=>{const merged=Array.from(new Set([...previous,...value.completedDays])).sort((a,b)=>a-b);return previous.length===merged.length&&previous.every((day,index)=>day===merged[index])?previous:merged;});
      await applyRemote(value);
    };
    const upload=()=>{
      if(!active||!confirmed||saving||sameAccountPlan(lastSent,latest.current))return;
      if(client.auth.currentUser?.uid!==owner)return;
      clearRetry();saving=true;const desired=latest.current;
      void saveAccountPlan(client.db,owner,desired).then(async saved=>{
        if(!active)return;await accept(saved);if(!active)return;
        lastSent=desired;attempt=0;setSyncError('');
      }).catch(()=>{
        if(!active)return;setSyncError(pendingMessage);
        retry=setTimeout(()=>{retry=null;upload();},Math.min(30000,5000*2**Math.min(attempt++,3)));
      }).finally(()=>{saving=false;if(active&&!retry&&!sameAccountPlan(lastSent,latest.current))upload();});
    };
    wake.current=upload;
    const stop=listenAccountPlan(client.db,owner,(value,serverConfirmed)=>{
      if(!active)return;confirmed=serverConfirmed;
      if(value)void accept(value).then(()=>{if(active)upload();}).catch(()=>{if(active)setSyncError(pendingMessage);});
      else upload();
    },()=>{if(active)setSyncError(pendingMessage);});
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')upload();});
    return()=>{active=false;clearRetry();wake.current=null;stop();subscription.remove();};
  },[owner,ready,applyRemote]);
  useEffect(()=>{wake.current?.();},[progress.currentDay,progress.finished,signature]);
  return {completedDays:remoteDays,syncError};
}

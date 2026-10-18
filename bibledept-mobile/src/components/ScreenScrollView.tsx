import { ComponentProps, createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { usePlan } from '../services/PlanProvider';

const Context=createContext(()=>{});
export const useScreenScroll=()=>useContext(Context);
export function ScreenScrollView({active=true,resetOnPlanDayChange=false,...props}:ComponentProps<typeof ScrollView>&{active?:boolean;resetOnPlanDayChange?:boolean}) {
  const ref=useRef<ScrollView>(null),{selectedDay}=usePlan();
  const offset=useRef({x:0,y:0}),activeRef=useRef(active),restorePending=useRef(true);
  if(activeRef.current!==active){activeRef.current=active;if(active)restorePending.current=true;}
  const top=useCallback(()=>{
    offset.current={x:0,y:0};
    if(activeRef.current){ref.current?.scrollTo({y:0,animated:false});restorePending.current=false;}
    else restorePending.current=true;
  },[]);
  const restore=useCallback(()=>{
    if(!activeRef.current||!restorePending.current)return;
    ref.current?.scrollTo({...offset.current,animated:false});
    restorePending.current=false;
  },[]);
  useEffect(()=>{
    if(!active)return;
    const frame=requestAnimationFrame(restore);
    return()=>cancelAnimationFrame(frame);
  },[active,restore]);
  useEffect(()=>{if(resetOnPlanDayChange)top();},[selectedDay,resetOnPlanDayChange,top]);
  return <Context.Provider value={top}><ScrollView {...props} ref={ref} scrollEventThrottle={props.scrollEventThrottle??16} onScroll={event=>{
    // display:none can emit a zero offset. Keep the last real position until
    // the visible panel has laid out and its saved offset is restored.
    if(activeRef.current&&!restorePending.current)offset.current={...event.nativeEvent.contentOffset};
    props.onScroll?.(event);
  }} onLayout={event=>{props.onLayout?.(event);if(activeRef.current&&restorePending.current)requestAnimationFrame(restore);}}/></Context.Provider>;
}

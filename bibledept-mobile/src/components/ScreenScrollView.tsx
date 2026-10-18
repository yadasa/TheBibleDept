import { ComponentProps, createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import { usePlan } from '../services/PlanProvider';

const Context=createContext(()=>{});
export const useScreenScroll=()=>useContext(Context);
export function ScreenScrollView(props:ComponentProps<typeof ScrollView>) {
  const ref=useRef<ScrollView>(null),{selectedDay}=usePlan();
  const top=useCallback(()=>ref.current?.scrollTo({y:0,animated:false}),[]);
  useEffect(top,[selectedDay,top]);
  return <Context.Provider value={top}><ScrollView {...props} ref={ref}/></Context.Provider>;
}

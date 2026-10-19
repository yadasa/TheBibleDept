import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './services/AuthProvider';
import { colors, Colors, ThemeMode } from './themeColors';
export type { Colors, ThemeMode } from './themeColors';
export { BRAND_COLORS as brand } from '../../bibledept-app/src/config/color/palette';

const Context = createContext({mode:'dark' as ThemeMode, colors:colors.dark as Colors, setMode:(_mode:ThemeMode)=>{}, error:''});
export function ThemeProvider({children}:{children:ReactNode}) {
  const {user}=useAuth();
  return <ThemeSession key={user?.uid||'guest'} owner={user?.uid}>{children}</ThemeSession>;
}
function ThemeSession({owner,children}:{owner?:string;children:ReactNode}) {
  const [mode,setMode]=useState<ThemeMode>('dark'),[error,setError]=useState('');
  const changed=useRef(false),queue=useRef(Promise.resolve());
  const storageKey=`bibledept.theme.${owner}`;
  useEffect(()=>{
    let active=true;
    if(owner)AsyncStorage.getItem(storageKey).then(value=>{if(active&&!changed.current&&(value==='dark'||value==='light'))setMode(value);}).catch(()=>{});
    return()=>{active=false;};
  },[storageKey,owner]);
  function choose(value:ThemeMode){
    if(!owner)return;
    changed.current=true;setMode(value);setError('');
    queue.current=queue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(storageKey,value)).catch(()=>setError('Theme changed, but could not be saved on this device.'));
  }
  return <Context.Provider value={{mode,colors:colors[mode],setMode:choose,error}}>{children}</Context.Provider>;
}
export const useTheme=()=>useContext(Context);
export function useThemedStyles<T>(factory:(c:Colors)=>T){
  const {colors:c}=useTheme();
  const s=useMemo(()=>factory(c),[c,factory]);
  return {c,s};
}
export const spacing = {4:4,8:8,12:12,16:16,20:20,24:24,32:32,48:48,64:64} as const;
export const radius=4;
export const control={minHeight:48,iconSize:44} as const;
export const typography={
  title:{fontSize:32,lineHeight:38,fontWeight:'800',letterSpacing:-1},
  section:{fontSize:22,lineHeight:28,fontWeight:'700',letterSpacing:-.5},
  body:{fontSize:16,lineHeight:25},meta:{fontSize:13,lineHeight:20},
  label:{fontSize:14,lineHeight:20,fontWeight:'600'},button:{fontSize:16,lineHeight:22,fontWeight:'700'},
} as const;

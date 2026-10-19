import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { getFirebase } from './firebase';
import { USER_COLLECTION } from './dataPaths';

type Reading = { day: string; reference: string; translation: string };
const Context = createContext<{ readings: Reading[]; error: string }>({readings:[],error:''});
export function ReadingProvider({children}:{children:ReactNode}) {
  const {user}=useAuth();
  const [owner,setOwner]=useState<string>(),[readings,setReadings]=useState<Reading[]>([]),[error,setError]=useState('');
  useEffect(()=>{
    setReadings([]);setOwner(user?.uid);setError('');
    if(!user)return;
    return onSnapshot(query(collection(getFirebase().db,USER_COLLECTION,user.uid,'readings'),orderBy('completedAt','desc'),limit(366)),snapshot=>{
      setReadings(snapshot.docs.map(d=>({day:d.id,reference:String(d.data().reference),translation:String(d.data().translation)})));
    },()=>setError('We couldn’t open your reading history. Check your internet connection and try again.'));
  },[user?.uid]);
  const visible=owner===user?.uid?readings:[];
  return <Context.Provider value={{readings:visible,error}}>{children}</Context.Provider>;
}
export const useReadings = () => useContext(Context);

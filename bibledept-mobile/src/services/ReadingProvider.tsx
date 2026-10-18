import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { getFirebase } from './firebase';
import { Passage } from './bible';
import { readingDay, readingStreak } from './readingDays';

type Reading = { day: string; reference: string; translation: string };
const Context = createContext<{ readings: Reading[]; streak: number; error: string; complete: (passage: Passage) => Promise<void> }>({readings:[],streak:0,error:'',complete:async()=>{throw new Error('Sign in to save progress.');}});
export function ReadingProvider({children}:{children:ReactNode}) {
  const {user}=useAuth();
  const [owner,setOwner]=useState<string>(),[readings,setReadings]=useState<Reading[]>([]),[error,setError]=useState('');
  useEffect(()=>{
    setReadings([]);setOwner(user?.uid);setError('');
    if(!user)return;
    return onSnapshot(query(collection(getFirebase().db,'users',user.uid,'readings'),orderBy('completedAt','desc'),limit(366)),snapshot=>{
      setReadings(snapshot.docs.map(d=>({day:d.id,reference:String(d.data().reference),translation:String(d.data().translation)})));
    },()=>setError('Your reading progress could not be loaded. Check the Firebase connection.'));
  },[user?.uid]);
  async function complete(passage:Passage){
    if(!user)throw new Error('Sign in to save progress.');
    await setDoc(doc(getFirebase().db,'users',user.uid,'readings',readingDay()),{reference:passage.reference,translation:passage.translation_id,completedAt:serverTimestamp()});
  }
  const visible=owner===user?.uid?readings:[];
  return <Context.Provider value={{readings:visible,streak:readingStreak(visible.map(r=>r.day)),error,complete}}>{children}</Context.Provider>;
}
export const useReadings = () => useContext(Context);

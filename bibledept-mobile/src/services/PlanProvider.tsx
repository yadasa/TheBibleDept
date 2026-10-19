import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { createPlanProgressStore, PlanProgress } from './planProgress';
import { getReadingPlanDay } from './readingPlan';
import { createLessonProgressStore, hasReadLesson, lessonProgressFor, LessonsProgress } from './lessonProgress';
import { usePodcastListening } from '../state/PodcastProvider';
import { LessonCompleteModal } from '../components/LessonCompleteModal';

type PlanContext = PlanProgress & {
  selectedDay:number;ready:boolean;busy:boolean;error:string;
  selectDay:(day:number)=>void;returnToCurrent:()=>void;advance:()=>Promise<void>;retry:()=>void;
  lessons:LessonsProgress;completedDays:number[];lessonError:string;
  rememberPosition:(day:number,chapter:number,offset:number)=>void;
  getReadingPosition:(day:number)=>{chapter:number;offset:number};
  markChapterRead:(day:number,chapter:number)=>Promise<boolean>;
};
const Context=createContext<PlanContext|null>(null);

export function PlanProvider({children}:{children:ReactNode}) {
  const {user,ready}=useAuth();
  const owner=ready?(user?.uid||'guest'):'opening';
  return <DevicePlanProvider key={owner} owner={owner} enabled={ready}>{children}</DevicePlanProvider>;
}

function DevicePlanProvider({children,owner,enabled}:{children:ReactNode;owner:string;enabled:boolean}) {
  const store=useMemo(()=>createPlanProgressStore(AsyncStorage,`bibledept.plan.v1:${owner}`),[owner]);
  const lessonStore=useMemo(()=>createLessonProgressStore(AsyncStorage,`bibledept.lessons.v1:${owner}`),[owner]);
  const audio=usePodcastListening();
  const [progress,setProgress]=useState<PlanProgress>({currentDay:1,finished:false});
  const [selectedDay,setSelectedDay]=useState(1),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const [lessons,setLessons]=useState<LessonsProgress>({}),[lessonError,setLessonError]=useState('');
  const [acknowledging,setAcknowledging]=useState(false);
  const alive=useRef(true),completing=useRef(new Set<number>());
  const readingPositions=useRef<Partial<Record<number,{chapter:number;offset:number}>>>({}),lessonsRef=useRef(lessons);
  lessonsRef.current=lessons;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    if(!enabled)return;
    let active=true;setReady(false);setError('');
    setLessonError('');completing.current.clear();
    Promise.all([store.load(),lessonStore.load()]).then(([value,savedLessons])=>{if(active){readingPositions.current={};setProgress(value);setLessons(savedLessons);setSelectedDay(value.currentDay);setReady(true);}})
      .catch(()=>{if(active){setError('Your saved plan position could not be opened. Retry to continue.');setReady(true);}});
    return()=>{active=false;};
  },[store,lessonStore,enabled,attempt]);
  const rememberPosition=useCallback((day:number,chapter:number,offset:number)=>{
    readingPositions.current[day]={chapter,offset};
    // Position writes do not rerender every retained page while a reader scrolls.
    void lessonStore.remember(day,chapter,offset)
      .catch(()=>{if(alive.current)setLessonError('Your reading place could not be saved on this device.');});
  },[lessonStore]);
  const getReadingPosition=useCallback((day:number)=>{
    const saved=readingPositions.current[day]||lessonProgressFor(lessonsRef.current,day);
    return {chapter:saved.chapter,offset:saved.offset};
  },[]);
  const markChapterRead=useCallback((day:number,chapter:number)=>{
    return lessonStore.readChapter(day,chapter).then(value=>{if(alive.current)setLessons(value);return true;})
      .catch(()=>{if(alive.current)setLessonError('Your reading progress could not be saved on this device.');return false;});
  },[lessonStore]);
  useEffect(()=>{
    if(!ready||!audio.listeningReady||audio.listeningOwner!==owner)return;
    for(const day of audio.listenedDays) {
      const lesson=lessons[day];
      if(!lesson||lesson.completed||!hasReadLesson(lesson,day)||completing.current.has(day))continue;
      completing.current.add(day);
      void lessonStore.complete(day,true).then(value=>{if(alive.current){setLessons(value);setLessonError('');}})
        .catch(()=>{if(alive.current)setLessonError('Day completion could not be saved. Retry your saved progress.');})
        .finally(()=>completing.current.delete(day));
    }
  },[ready,audio.listeningReady,audio.listeningOwner,audio.listenedDays,owner,lessons,lessonStore]);
  const completedDays=useMemo(()=>Array.from(new Set([
    ...Array.from({length:progress.finished?365:progress.currentDay-1},(_,index)=>index+1),
    ...Object.entries(lessons).filter(([,lesson])=>lesson?.completed).map(([day])=>Number(day)),
  ])).sort((a,b)=>a-b),[progress,lessons]);
  const completionDay=Object.entries(lessons).filter(([,lesson])=>lesson?.completed&&!lesson.acknowledged).map(([day])=>Number(day)).sort((a,b)=>a-b)[0];
  function acknowledge() {
    if(!completionDay||acknowledging)return;
    setAcknowledging(true);setLessonError('');
    void lessonStore.acknowledge(completionDay).then(value=>{if(alive.current)setLessons(value);})
      .catch(()=>{if(alive.current)setLessonError('This completion could not be saved. Please try again.');})
      .finally(()=>{if(alive.current)setAcknowledging(false);});
  }
  async function advance() {
    if(!ready||busy||selectedDay!==progress.currentDay)return;
    setBusy(true);setError('');
    try {const value=await store.advance(progress.currentDay);setProgress(value);setSelectedDay(value.currentDay);}
    catch {setError('Your next day could not be saved on this device. Please retry.');}
    finally {setBusy(false);}
  }
  return <Context.Provider value={{...progress,selectedDay,ready,busy,error,lessons,completedDays,lessonError,rememberPosition,getReadingPosition,markChapterRead,
    selectDay:day=>{if(getReadingPlanDay(day))setSelectedDay(day);},returnToCurrent:()=>setSelectedDay(progress.currentDay),
    advance,retry:()=>setAttempt(value=>value+1)}}>{children}<LessonCompleteModal day={completionDay} busy={acknowledging} error={lessonError} onClose={acknowledge}/></Context.Provider>;
}

export function usePlan() {
  const value=useContext(Context);
  if(!value)throw new Error('usePlan must be used inside PlanProvider.');
  return value;
}

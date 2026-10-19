import { GlassPressable } from "../components/Glass";
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Notice } from '../components/ui';
import { Icon } from '../components/Icon';
import { DayPicker } from '../components/DayPicker';
import { ReaderControls } from '../components/ReaderControls';
import { PassageView } from '../components/PassageView';
import { useScreenScroll, useScreenScrollControls } from '../components/ScreenScrollView';
import { usePlan } from '../services/PlanProvider';
import { fetchPassage, Passage, Translation } from '../services/bible';
import { getPlanChapters, getReadingPlanDay } from '../services/readingPlan';
import { useThemedStyles, Colors, typography as t } from '../theme';
import { PodcastCard } from '../components/PodcastCard';
import { ReadingCompletion } from '../components/ReadingCompletion';
import { hasReachedReadingEnd, lessonProgressFor } from '../services/lessonProgress';
import { usePodcastListening } from '../state/PodcastProvider';

export function PlanScreen({active=true,onAccount,podcastRequestRevision=0}:{active?:boolean;onAccount:()=>void;podcastRequestRevision?:number}) {
  const {c,s}=useThemedStyles(styles);
  const scrollTop=useScreenScroll();
  const plan=usePlan(),day=getReadingPlanDay(plan.selectedDay)!;
  const controls=useScreenScrollControls(),audio=usePodcastListening(),savedLesson=lessonProgressFor(plan.lessons,day.day),savedPosition=plan.getReadingPosition(day.day);
  const [picker,setPicker]=useState(false),[translation,setTranslation]=useState<Translation>('web');
  const [result,setResult]=useState<{key:string;passage?:Passage;error?:string}>({key:''});
  const [retry,setRetry]=useState(0);
  const [chapterSelection,setChapterSelection]=useState({day:0,index:0});
  const chapters=getPlanChapters(day.day);
  const chapterIndex=chapterSelection.day===day.day?chapterSelection.index:savedPosition.chapter;
  const chapter=chapters[chapterIndex];
  const textRef=useRef<View>(null),podcastRef=useRef<View>(null);
  const restoredKey=useRef(''),textBounds=useRef<{key:string;top:number;bottom:number}|null>(null);
  const podcastRevisionSeen=useRef(0),readReported=useRef(new Set<string>());
  function selectChapter(index:number){setChapterSelection({day:day.day,index});scrollTop();}
  const key=`${day.day}:${chapterIndex}:${translation}:${retry}`;
  const currentKey=useRef(key);currentKey.current=key;
  useEffect(()=>{
    if(!plan.ready)return;
    const controller=new AbortController();
    fetchPassage(chapter.reference,translation,controller.signal).then(passage=>{
      if(!controller.signal.aborted)setResult({key,passage});
    }).catch(error=>{if(!controller.signal.aborted)setResult({key,error:error instanceof Error?error.message:'Could not open this reading.'});});
    return()=>controller.abort();
  },[key,plan.ready]);
  const reading=result.key===key?result:undefined;
  const current=plan.selectedDay===plan.currentDay,done=plan.completedDays.includes(day.day);
  const loaded=!!reading?.passage?.verses.length;
  const listened=audio.listenedDays?.includes(day.day)??false;
  useEffect(()=>{
    if(!podcastRequestRevision||podcastRevisionSeen.current===podcastRequestRevision)return;
    podcastRevisionSeen.current=podcastRequestRevision;
    // Opening the mini player must not replace the saved reading position or
    // count the programmatic jump past the Scripture as reading it.
    restoredKey.current=key;
    controls.scrollToAnchor('podcast');
  },[podcastRequestRevision,controls,key]);
  const measureReading=useCallback(()=>{
    if(!active||!loaded)return;
    const measuringKey=key;
    controls.measureContent(textRef.current,bounds=>{
      if(currentKey.current!==measuringKey)return;
      textBounds.current={key:measuringKey,...bounds};
      if(restoredKey.current!==measuringKey) {
        restoredKey.current=measuringKey;
        const offset=savedPosition.chapter===chapterIndex?savedPosition.offset:0;
        controls.scrollTo({y:offset,animated:false});
        plan.rememberPosition(day.day,chapterIndex,offset);
      }
    });
  },[active,loaded,key,controls,savedPosition.chapter,savedPosition.offset,chapterIndex,plan.rememberPosition,day.day]);
  useEffect(()=>{
    if(!active||!loaded)return;
    const frame=requestAnimationFrame(measureReading);
    return()=>cancelAnimationFrame(frame);
  },[active,loaded,measureReading]);
  useEffect(()=>{
    if(!active||!loaded||!plan.ready)return;
    let latestOffset:number|null=null,timer:ReturnType<typeof setTimeout>|null=null;
    function flush() {
      if(timer)clearTimeout(timer);timer=null;
      if(latestOffset!==null){plan.rememberPosition(day.day,chapterIndex,latestOffset);latestOffset=null;}
    }
    const unsubscribe=controls.subscribe(metrics=>{
      const bounds=textBounds.current;
      if(metrics.restoring||!metrics.active||!metrics.userInitiated||!bounds||bounds.key!==key||restoredKey.current!==key)return;
      if(metrics.offsetY<bounds.bottom&&metrics.offsetY+metrics.viewportHeight>bounds.top) {
        latestOffset=metrics.offsetY;
        if(timer)clearTimeout(timer);
        timer=setTimeout(flush,600);
      }
      const readKey=`${day.day}:${chapterIndex}`;
      if(!readReported.current.has(readKey)&&hasReachedReadingEnd({offset:metrics.offsetY,viewportHeight:metrics.viewportHeight,textTop:bounds.top,textBottom:bounds.bottom,loaded,active,userInitiated:metrics.userInitiated,obscuredBottom:192})) {
        readReported.current.add(readKey);
        void plan.markChapterRead(day.day,chapterIndex).then(saved=>{if(!saved)readReported.current.delete(readKey);});
      }
    });
    const appState=AppState.addEventListener('change',state=>{if(state!=='active')flush();});
    return()=>{unsubscribe();appState.remove();flush();};
  },[active,loaded,plan.ready,key,controls,day.day,chapterIndex,plan.rememberPosition,plan.markChapterRead]);
  const registerPodcast=useCallback(()=>{
    if(active&&plan.ready&&reading)controls.registerAnchor('podcast',podcastRef.current);
  },[active,plan.ready,reading,controls]);
  useEffect(()=>{
    if(!active||!plan.ready||!reading)return controls.registerAnchor('podcast',null);
    return controls.registerAnchor('podcast',podcastRef.current);
  },[active,plan.ready,reading,day.day,controls]);
  return <View>
    <View style={s.planHeader}>
      <View style={s.headingRow}><Text accessibilityRole="header" style={s.day}>Day {day.day}<Text style={s.total}> / 365</Text></Text><GlassPressable accessibilityRole="button" accessibilityLabel="Choose a plan day" disabled={plan.busy} onPress={()=>setPicker(true)} style={({pressed})=>[s.choose,pressed&&s.pressed]}><Icon name="calendar" size={18}/><Text style={s.chooseText}>Days</Text></GlassPressable></View>
      <Text style={s.label}>{day.label}</Text>
      <View style={s.statusRow}><Icon name={done?'checkCircle':current?'book':'search'} size={16} color={done?c.success:c.action}/><Text style={s.status}>{done?'Day complete':current?'Your current day':`Browsing · your saved day is ${plan.currentDay}`}</Text></View>
      {!current&&<ActionButton title={`Return to day ${plan.currentDay}`} variant="ghost" onPress={plan.returnToCurrent}/>}
    </View>
    <ReaderControls translation={translation} onTranslation={setTranslation}/>
    <Text style={s.caption}>Chapter {chapterIndex+1} of {chapters.length}</Text>
    <View style={s.chapters}>{chapters.map((item,index)=><GlassPressable key={item.reference} accessibilityRole="button" accessibilityLabel={`Read ${item.reference}${savedLesson.readChapters.includes(index)?', reading complete':''}`} accessibilityState={{selected:index===chapterIndex}} onPress={()=>selectChapter(index)} style={({pressed})=>[s.chip,index===chapterIndex&&s.activeChip,pressed&&s.pressed]}><View style={s.chapterLabel}><Text style={[s.chipText,index===chapterIndex&&s.activeText]}>{item.reference}</Text>{savedLesson.readChapters.includes(index)&&<Icon name="check" size={14} color={c.success}/>}</View>{index===chapterIndex&&<View style={s.selectionMark}/>}</GlassPressable>)}</View>
    {!reading?.passage&&!reading?.error&&<View style={s.loading}><ActivityIndicator color={c.action}/><Notice text={`Opening ${chapter.reference}…`}/></View>}
    {reading?.error&&<View style={s.error}><Text style={s.errorTitle}>We couldn’t load this chapter</Text><Notice text={reading.error} error/><ActionButton title="Try again" icon="refresh" onPress={()=>setRetry(value=>value+1)} secondary/></View>}
    {reading?.passage&&<><View ref={textRef} collapsable={false} onLayout={measureReading}><PassageView key={`${reading.passage.reference}:${translation}`} passage={reading.passage}/></View><ReadingCompletion passage={reading.passage} source="plan" planDay={day.day} onAccount={onAccount}/></>}
    {reading?.passage&&<View style={s.chapterNavigation}>
      {chapterIndex>0&&<ActionButton title={`Previous: ${chapters[chapterIndex-1].reference}`} icon="chevronLeft" onPress={()=>selectChapter(chapterIndex-1)} secondary/>}
      {chapterIndex<chapters.length-1&&<ActionButton title={`Next: ${chapters[chapterIndex+1].reference}`} icon="chevronRight" onPress={()=>selectChapter(chapterIndex+1)} secondary/>}
    </View>}
    <View style={s.completion}>
      <Text accessibilityRole="header" style={s.completionTitle}>{plan.finished?'Plan complete':done?`Day ${day.day} complete`:current?`Day ${day.day} progress`:'Reading another day'}</Text>
      <Text style={s.meta}>{done?'Your reading is saved. Continue whenever you’re ready.':`${savedLesson.readChapters.length} of ${chapters.length} chapters read · Teaching ${listened?'complete':'in progress'}`}</Text>
      {!done&&<Text style={s.local}>Read to the end of each chapter and listen to the teaching to complete this day automatically. The final two minutes of audio are optional.</Text>}
      {!plan.ready?<Notice text="Loading your saved day…"/>:!current?<ActionButton title={`Return to day ${plan.currentDay}`} onPress={plan.returnToCurrent} secondary/>
        :plan.finished?<Notice text="All 365 days are marked complete. You can open any day to read it again." success/>
        :<ActionButton title={plan.currentDay===365?'Complete the plan':done?`Continue to day ${plan.currentDay+1}`:`Mark day ${plan.currentDay} complete & continue`} icon="check" onPress={()=>void plan.advance()} loading={plan.busy} disabled={!!plan.error}/>}
      {!!plan.error&&<View><Notice text={plan.error} error/><ActionButton title="Reload saved progress" onPress={plan.retry} secondary/></View>}
      <Text style={s.local}>Your place in the plan is saved on this device.</Text>
      {!!plan.lessonError&&<Notice text={plan.lessonError} error/>}
    </View>
    <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('https://bible-api.com/')} style={s.creditLink}><Text style={s.credit}>Public-domain Scripture via bible-api.com. Internet required.</Text></Pressable>
    <View ref={podcastRef} collapsable={false} onLayout={registerPodcast}>{active&&<PodcastCard day={day.day}/>}</View>
    <DayPicker visible={picker} selectedDay={day.day} currentDay={plan.currentDay} finished={plan.finished} completedDays={plan.completedDays} onSelect={plan.selectDay} onClose={()=>setPicker(false)}/>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  planHeader:{paddingTop:4},headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'},day:{fontSize:28,lineHeight:36,fontWeight:'800',letterSpacing:-.7,color:c.ink},total:{fontSize:16,fontWeight:'400',color:c.muted,letterSpacing:0},label:{fontSize:18,lineHeight:27,fontWeight:'500',color:c.ink,marginTop:8},choose:{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,borderRadius:4,borderWidth:1,borderColor:c.controlBorder,backgroundColor:c.surface},chooseText:{...t.label,color:c.ink},statusRow:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12},status:{...t.meta,color:c.muted,flex:1},
  caption:{...t.meta,color:c.muted,marginBottom:10},chapters:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24},chip:{minHeight:44,paddingHorizontal:14,paddingVertical:11,borderRadius:4,borderWidth:1,borderColor:c.controlBorder,backgroundColor:c.surface,justifyContent:'center'},chapterLabel:{flexDirection:'row',alignItems:'center',gap:6},activeChip:{backgroundColor:c.ink,borderColor:c.ink},chipText:{...t.label,color:c.ink},activeText:{color:c.action,fontWeight:'700'},selectionMark:{height:2,backgroundColor:c.orange,marginTop:4},loading:{alignItems:'center',paddingVertical:48},error:{paddingVertical:24},errorTitle:{...t.section,color:c.ink},chapterNavigation:{marginBottom:24},completion:{borderTopWidth:1,borderColor:c.border,paddingTop:24,marginTop:16},completionTitle:{...t.section,color:c.ink},meta:{...t.body,color:c.muted,marginTop:8,marginBottom:12},local:{...t.meta,color:c.muted,marginTop:12},creditLink:{minHeight:44,justifyContent:'center',paddingVertical:12},credit:{...t.meta,color:c.muted,textDecorationLine:'underline'},pressed:{opacity:.65},
});

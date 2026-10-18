import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Notice } from '../components/ui';
import { Icon } from '../components/Icon';
import { DayPicker } from '../components/DayPicker';
import { ReaderControls } from '../components/ReaderControls';
import { PassageView } from '../components/PassageView';
import { useScreenScroll } from '../components/ScreenScrollView';
import { usePlan } from '../services/PlanProvider';
import { fetchPassage, Passage, Translation } from '../services/bible';
import { getPlanChapters, getReadingPlanDay } from '../services/readingPlan';
import { theme as c, typography as t } from '../theme';
import { PodcastCard } from '../components/PodcastCard';

export function PlanScreen() {
  const scrollTop=useScreenScroll();
  const plan=usePlan(),day=getReadingPlanDay(plan.selectedDay)!;
  const [picker,setPicker]=useState(false),[translation,setTranslation]=useState<Translation>('web');
  const [result,setResult]=useState<{key:string;passage?:Passage;error?:string}>({key:''});
  const [retry,setRetry]=useState(0);
  const [chapterSelection,setChapterSelection]=useState({day:day.day,index:0});
  const chapters=getPlanChapters(day.day);
  const chapterIndex=chapterSelection.day===day.day?chapterSelection.index:0;
  const chapter=chapters[chapterIndex];
  function selectChapter(index:number){setChapterSelection({day:day.day,index});scrollTop();}
  const key=`${day.day}:${chapterIndex}:${translation}:${retry}`;
  useEffect(()=>{
    if(!plan.ready)return;
    const controller=new AbortController();
    fetchPassage(chapter.reference,translation,controller.signal).then(passage=>{
      if(!controller.signal.aborted)setResult({key,passage});
    }).catch(error=>{if(!controller.signal.aborted)setResult({key,error:error instanceof Error?error.message:'Could not open this reading.'});});
    return()=>controller.abort();
  },[key,plan.ready]);
  const reading=result.key===key?result:undefined;
  const current=plan.selectedDay===plan.currentDay,done=plan.selectedDay<plan.currentDay||plan.finished;
  return <View>
    <View style={s.planHeader}>
      <View style={s.headingRow}><Text accessibilityRole="header" style={s.day}>Day {day.day}<Text style={s.total}> / 365</Text></Text><Pressable accessibilityRole="button" accessibilityLabel="Choose a plan day" disabled={plan.busy} onPress={()=>setPicker(true)} style={({pressed})=>[s.choose,pressed&&s.pressed]}><Icon name="calendar" size={18}/><Text style={s.chooseText}>Days</Text></Pressable></View>
      <Text style={s.label}>{day.label}</Text>
      <View style={s.statusRow}><Icon name={done?'checkCircle':current?'book':'search'} size={16} color={done?c.success:c.action}/><Text style={s.status}>{done?'Completed reading':current?'Your current day':`Exploring · your place is day ${plan.currentDay}`}</Text></View>
      {!current&&<ActionButton title={`Return to day ${plan.currentDay}`} variant="ghost" onPress={plan.returnToCurrent}/>}
    </View>
    <ReaderControls translation={translation} onTranslation={setTranslation}/>
    <Text style={s.caption}>Chapter {chapterIndex+1} of {chapters.length}</Text>
    <View style={s.chapters}>{chapters.map((item,index)=><Pressable key={item.reference} accessibilityRole="button" accessibilityLabel={`Read ${item.reference}`} accessibilityState={{selected:index===chapterIndex}} onPress={()=>selectChapter(index)} style={({pressed})=>[s.chip,index===chapterIndex&&s.activeChip,pressed&&s.pressed]}><Text style={[s.chipText,index===chapterIndex&&s.activeText]}>{item.reference}</Text>{index===chapterIndex&&<View style={s.selectionMark}/>}</Pressable>)}</View>
    {!reading?.passage&&!reading?.error&&<View style={s.loading}><ActivityIndicator color={c.action}/><Notice text={`Opening ${chapter.reference}…`}/></View>}
    {reading?.error&&<View style={s.error}><Text style={s.errorTitle}>This chapter couldn't load</Text><Notice text={reading.error} error/><ActionButton title="Retry this reading" icon="refresh" onPress={()=>setRetry(value=>value+1)} secondary/></View>}
    {reading?.passage&&<PassageView passage={reading.passage}/>}
    {reading?.passage&&<View style={s.chapterNavigation}>
      {chapterIndex>0&&<ActionButton title={`Previous: ${chapters[chapterIndex-1].reference}`} icon="chevronLeft" onPress={()=>selectChapter(chapterIndex-1)} secondary/>}
      {chapterIndex<chapters.length-1&&<ActionButton title={`Next: ${chapters[chapterIndex+1].reference}`} icon="chevronRight" onPress={()=>selectChapter(chapterIndex+1)} secondary/>}
    </View>}
    <View style={s.completion}>
      <Text accessibilityRole="header" style={s.completionTitle}>{plan.finished?'The whole plan, complete':current?'Finished this day’s reading?':'Keep your place'}</Text>
      <Text style={s.meta}>{current&&!plan.finished?'Read all the chapters at your pace, then continue when you’re ready.':'You can return to any day without changing your saved place.'}</Text>
      {!plan.ready?<Notice text="Opening your saved spot…"/>:!current?<ActionButton title={`Return to current day ${plan.currentDay}`} onPress={plan.returnToCurrent} secondary/>
        :plan.finished?<Notice text="You made it through all 365 days. Revisit any passage whenever you like." success/>
        :<ActionButton title={plan.currentDay===365?'Complete the plan':`Complete day ${plan.currentDay} & continue`} icon="check" onPress={()=>void plan.advance()} loading={plan.busy} disabled={!!plan.error}/>}
      {!!plan.error&&<View><Notice text={plan.error} error/><ActionButton title="Retry saved progress" onPress={plan.retry} secondary/></View>}
      <Text style={s.local}>Your place saves on this device.</Text>
    </View>
    <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('https://bible-api.com/')} style={s.creditLink}><Text style={s.credit}>Public-domain Scripture via bible-api.com. Internet required.</Text></Pressable>
    <PodcastCard day={day.day}/>
    <DayPicker visible={picker} selectedDay={day.day} currentDay={plan.currentDay} finished={plan.finished} onSelect={plan.selectDay} onClose={()=>setPicker(false)}/>
  </View>;
}
const s=StyleSheet.create({
  planHeader:{paddingTop:4},headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'},day:{fontSize:28,lineHeight:36,fontWeight:'800',letterSpacing:-.7,color:c.ink},total:{fontSize:16,fontWeight:'400',color:c.muted,letterSpacing:0},label:{fontSize:18,lineHeight:27,fontWeight:'500',color:c.ink,marginTop:8},choose:{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,borderRadius:4,borderWidth:1,borderColor:c.controlBorder,backgroundColor:c.surface},chooseText:{...t.label,color:c.ink},statusRow:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12},status:{...t.meta,color:c.muted,flex:1},
  caption:{...t.meta,color:c.muted,marginBottom:10},chapters:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:24},chip:{minHeight:44,paddingHorizontal:14,paddingVertical:11,borderRadius:4,borderWidth:1,borderColor:c.controlBorder,backgroundColor:c.surface,justifyContent:'center'},activeChip:{backgroundColor:c.ink,borderColor:c.ink},chipText:{...t.label,color:c.ink},activeText:{color:c.surface,fontWeight:'700'},selectionMark:{height:2,backgroundColor:c.orange,marginTop:4},loading:{alignItems:'center',paddingVertical:48},error:{paddingVertical:24},errorTitle:{...t.section,color:c.ink},chapterNavigation:{marginBottom:24},completion:{borderTopWidth:1,borderColor:c.border,paddingTop:24,marginTop:16},completionTitle:{...t.section,color:c.ink},meta:{...t.body,color:c.muted,marginTop:8,marginBottom:12},local:{...t.meta,color:c.muted,marginTop:12},creditLink:{minHeight:44,justifyContent:'center',paddingVertical:12},credit:{...t.meta,color:c.muted,textDecorationLine:'underline'},pressed:{opacity:.65},
});

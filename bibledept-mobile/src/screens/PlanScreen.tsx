import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Notice } from '../components/ui';
import { DayPicker } from '../components/DayPicker';
import { usePlan } from '../services/PlanProvider';
import { fetchPassage, Passage, Translation } from '../services/bible';
import { getPlanChapters, getReadingPlanDay } from '../services/readingPlan';
import { theme as c } from '../theme';
import { PodcastCard } from '../components/PodcastCard';

export function PlanScreen() {
  const plan=usePlan(),day=getReadingPlanDay(plan.selectedDay)!;
  const [picker,setPicker]=useState(false),[translation,setTranslation]=useState<Translation>('web');
  const [result,setResult]=useState<{key:string;passages?:Passage[];error?:string}>({key:''});
  const [retry,setRetry]=useState(0);
  const [chapterSelection,setChapterSelection]=useState({day:day.day,index:0});
  const chapters=getPlanChapters(day.day);
  const chapterIndex=chapterSelection.day===day.day?chapterSelection.index:0;
  const chapter=chapters[chapterIndex];
  const key=`${day.day}:${chapterIndex}:${translation}:${retry}`;
  useEffect(()=>{
    if(!plan.ready)return;
    const controller=new AbortController();
    fetchPassage(chapter.reference,translation,controller.signal).then(passage=>{
      if(!controller.signal.aborted)setResult({key,passages:[passage]});
    }).catch(error=>{if(!controller.signal.aborted)setResult({key,error:error instanceof Error?error.message:'Could not open this reading.'});});
    return()=>controller.abort();
  },[key,plan.ready]);
  const reading=result.key===key?result:undefined,completed=plan.finished?365:plan.currentDay-1;
  return <View>
    <View style={s.planCard}>
      <View style={s.headingRow}><Text style={s.kicker}>THE 365-DAY PLAN</Text><Text style={s.badge}>{plan.selectedDay===plan.currentDay?(plan.finished?'COMPLETE':'YOUR CURRENT DAY'):'EXPLORING'}</Text></View>
      <Text style={s.day}>Day {day.day}<Text style={s.total}> / 365</Text></Text>
      <Text style={s.label}>{day.label}</Text>
      <View style={s.track}><View style={[s.fill,{width:`${100*completed/365}%`}]}/></View>
      <View style={s.detailRow}><Text style={s.detail}>{completed} {completed===1?'day':'days'} complete</Text><Pressable accessibilityRole="button" disabled={plan.busy} onPress={()=>setPicker(true)} style={s.choose}><Text style={s.chooseText}>Choose day  ▦</Text></Pressable></View>
      {!plan.ready?<Notice text="Opening your saved spot…"/>:plan.selectedDay!==plan.currentDay?<ActionButton title={`Return to current day ${plan.currentDay}`} onPress={plan.returnToCurrent} secondary/>
        :plan.finished?<Notice text="You made it through all 365 days. Come back to any passage whenever you like."/>
        :<ActionButton title={plan.currentDay===365?'Complete the plan':`Continue to day ${plan.currentDay+1} →`} onPress={()=>void plan.advance()} loading={plan.busy} disabled={!!plan.error}/>}
      {!!plan.error&&<View><Notice text={plan.error} error/><ActionButton title="Retry saved progress" onPress={plan.retry} secondary/></View>}
      <Text style={s.local}>Your spot saves on this device. Browsing keeps your place.</Text>
    </View>
    <View style={s.options}>{(['web','kjv'] as const).map(t=><Pressable key={t} accessibilityRole="radio" accessibilityState={{checked:translation===t}} accessibilityLabel={t==='web'?'World English Bible':'King James Version'} onPress={()=>setTranslation(t)} style={[s.option,translation===t&&s.optionSelected]}><Text style={[s.optionText,translation===t&&s.optionTextSelected]}>{t==='web'?'World English Bible':'King James Version'}</Text></Pressable>)}</View>
    <Text style={chapterStyles.caption}>DAY {day.day} · CHAPTER {chapterIndex+1} OF {chapters.length}</Text>
    <View style={chapterStyles.chips}>{chapters.map((item,index)=><Pressable key={item.reference} accessibilityRole="button" accessibilityLabel={`Read ${item.reference}`} accessibilityState={{selected:index===chapterIndex}} onPress={()=>setChapterSelection({day:day.day,index})} style={[chapterStyles.chip,index===chapterIndex&&chapterStyles.active]}><Text style={[chapterStyles.text,index===chapterIndex&&chapterStyles.activeText]}>{item.reference}</Text></Pressable>)}</View>
    {!reading?.passages&&!reading?.error&&<View style={s.loading}><ActivityIndicator color={c.action}/><Notice text={`Opening day ${day.day}…`}/></View>}
    {reading?.error&&<View><Notice text={reading.error} error/><ActionButton title="Retry this reading" onPress={()=>setRetry(value=>value+1)} secondary/></View>}
    {reading?.passages?.map((passage,index)=><View key={`${day.day}:${index}`} style={s.paper}>
      <Text style={s.reference}>{passage.reference}</Text><Text style={s.translation}>{passage.translation_name}</Text>
      {passage.verses.map((verse,i)=><View key={`${verse.book_id}:${verse.chapter}:${verse.verse}`}>
        {(i===0||passage.verses[i-1].chapter!==verse.chapter)&&<Text style={s.chapter}>CHAPTER {verse.chapter}</Text>}
        <Text style={s.verse}><Text style={s.number}>{verse.verse}  </Text>{verse.text.trim()}</Text>
      </View>)}
    </View>)}
    {reading?.passages&&chapterIndex<chapters.length-1&&<ActionButton title={`Next chapter: ${chapters[chapterIndex+1].reference} →`} onPress={()=>setChapterSelection({day:day.day,index:chapterIndex+1})} secondary/>}
    <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('https://bible-api.com/')}><Text style={s.credit}>Public-domain Scripture via bible-api.com · Internet required</Text></Pressable>
    <PodcastCard day={day.day}/>
    <DayPicker visible={picker} selectedDay={day.day} currentDay={plan.currentDay} finished={plan.finished} onSelect={plan.selectDay} onClose={()=>setPicker(false)}/>
  </View>;
}
const chapterStyles=StyleSheet.create({caption:{fontSize:10,fontWeight:'800',letterSpacing:1,color:c.muted,marginTop:16,marginBottom:12},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{minHeight:44,paddingHorizontal:13,paddingVertical:12,borderRadius:4,borderWidth:1,borderColor:c.border,backgroundColor:c.surface},active:{backgroundColor:c.ink,borderColor:c.ink},text:{fontSize:12,fontWeight:'700',color:c.ink},activeText:{color:c.background}});
const s=StyleSheet.create({planCard:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:8,padding:20,marginBottom:22},headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5},kicker:{fontSize:9,letterSpacing:1,fontWeight:'900',color:c.action},badge:{fontSize:8,fontWeight:'900',letterSpacing:.5,color:c.ink,backgroundColor:c.tint,paddingHorizontal:7,paddingVertical:6,borderRadius:3},day:{fontSize:38,fontWeight:'900',letterSpacing:-1.5,color:c.ink,marginTop:15},total:{fontSize:17,color:c.muted,fontWeight:'600',letterSpacing:-.3},label:{fontSize:19,fontWeight:'700',color:c.ink,marginTop:4},track:{height:5,backgroundColor:c.tint,borderRadius:3,marginTop:22,overflow:'hidden'},fill:{height:5,backgroundColor:c.orange},detailRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},detail:{fontSize:11,color:c.muted},choose:{minHeight:44,justifyContent:'center'},chooseText:{fontSize:12,fontWeight:'800',color:c.action},local:{fontSize:10,lineHeight:16,color:c.muted,marginTop:12},options:{flexDirection:'row',gap:8,marginBottom:10},option:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',padding:8,borderWidth:1,borderColor:c.border,borderRadius:4,backgroundColor:c.surface},optionSelected:{backgroundColor:c.tint,borderColor:c.action},optionText:{fontSize:11,fontWeight:'700',color:c.muted,textAlign:'center'},optionTextSelected:{color:c.action},loading:{alignItems:'center',padding:30},paper:{padding:20,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:5,marginTop:16},reference:{fontSize:27,fontWeight:'900',letterSpacing:-1,color:c.ink},translation:{fontSize:10,fontWeight:'800',letterSpacing:1,color:c.action,marginTop:7,marginBottom:8},chapter:{fontSize:11,fontWeight:'900',letterSpacing:1.5,color:c.action,marginTop:24,marginBottom:14},verse:{fontSize:18,lineHeight:31,color:c.ink,marginBottom:12},number:{fontSize:11,fontWeight:'800',color:c.action},credit:{fontSize:10,lineHeight:17,color:c.muted,marginTop:20}});

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useHabit } from '../../services/HabitProvider';
import { usePlan } from '../../services/PlanProvider';
import { useReadings } from '../../services/ReadingProvider';
import { getReadingPlanDay } from '../../services/readingPlan';
import type { Translation } from '../../services/bible';
import { Colors, typography as t, useThemedStyles } from '../../theme';
import { ActionButton, Notice } from '../ui';
import { DayPicker } from '../DayPicker';
import { AccountLink, AccountMetric, AccountPage } from './AccountPage';

export function ReadingProgressPage({onBack,onOpenPlan,onReadPassage,onReadingSettings}:{onBack:()=>void;onOpenPlan?:(day:number)=>void;onReadPassage?:(reference:string,translation:Translation)=>void;onReadingSettings:()=>void}) {
  const plan=usePlan(),habit=useHabit(),history=useReadings(),{c,s}=useThemedStyles(styles),[picker,setPicker]=useState(false),[visibleCount,setVisibleCount]=useState(20);
  const day=getReadingPlanDay(plan.currentDay)!;
  return <AccountPage title="Reading progress" intro="Your next reading, completed days, and saved chapters." onBack={onBack}>
    <Text style={s.label}>THE 365-DAY PLAN</Text>{plan.ready?<><Text style={s.day}>Day {day.day}</Text><Text style={s.reference}>{day.label}</Text>
    <View style={s.metrics}><AccountMetric value={plan.completedDays.length} label="days completed"/><AccountMetric value={Math.round(plan.completedDays.length/365*100)} label="percent complete"/></View>
    <ActionButton title={plan.finished?'Read the plan again':'Continue reading'} icon="book" disabled={!plan.ready||!onOpenPlan} onPress={()=>onOpenPlan?.(day.day)}/>
    <ActionButton title="Choose a plan day" icon="calendar" secondary onPress={()=>setPicker(true)}/></>:<View style={s.loading}><ActivityIndicator color={c.orange}/><Text style={s.body}>Loading your plan…</Text></View>}
    {!!plan.error&&<Notice text={plan.error} error/>}
    <View style={s.section}><Text accessibilityRole="header" style={s.heading}>Reading streaks</Text>
      {habit.loading?<View style={s.loading}><ActivityIndicator color={c.orange}/><Text style={s.body}>Loading your reading days…</Text></View>:habit.ready?<View style={s.metrics}><AccountMetric value={habit.current} label="current streak"/><AccountMetric value={habit.streak.longest} label="longest streak"/><AccountMetric value={habit.streak.totalReadingDays} label="reading days"/></View>:<><Notice text="Finish a whole chapter to count a reading day. Choose your reading time zone to get started."/><ActionButton title="Set up reading streaks" secondary onPress={onReadingSettings}/></>}
      {!!habit.error&&<Notice text={habit.error} error/>}
    </View>
    <View style={s.section}><Text accessibilityRole="header" style={s.heading}>Reading history</Text>
      <Text style={s.historyNote}>The last chapter you saved on each reading day.</Text>
      {!history.readings.length&&!history.error&&<Notice text="Chapters you mark as read will appear here."/>}
      {history.readings.slice(0,visibleCount).map((reading,index)=><AccountLink key={`${reading.day}:${reading.reference}:${index}`} icon="book" title={reading.reference}
        detail={`${reading.translation==='kjv'?'KJV':'WEB'} · ${/^\d{4}-\d{2}-\d{2}$/.test(reading.day)?new Date(`${reading.day}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):reading.day}`} onPress={onReadPassage?()=>onReadPassage(reading.reference,reading.translation==='kjv'?'kjv':'web'):undefined}/>)}
      {history.readings.length>visibleCount&&<ActionButton title="Show more readings" secondary onPress={()=>setVisibleCount(count=>count+20)}/>}
      {!!history.error&&<Notice text={history.error} error/>}
    </View>
    <DayPicker visible={picker} selectedDay={plan.selectedDay} currentDay={plan.currentDay} finished={plan.finished} completedDays={plan.completedDays} onClose={()=>setPicker(false)} onIntro={onOpenPlan?()=>onOpenPlan(0):undefined} onSelect={selected=>{if(onOpenPlan)onOpenPlan(selected);else plan.selectDay(selected);}}/>
  </AccountPage>;
}
const styles=(c:Colors)=>StyleSheet.create({label:{...t.label,color:c.muted,letterSpacing:1},day:{...t.title,color:c.ink,marginTop:10},reference:{...t.section,color:c.ink,marginTop:6},metrics:{flexDirection:'row',flexWrap:'wrap',gap:12},section:{marginTop:30,paddingTop:24,borderTopWidth:1,borderColor:c.border},heading:{...t.section,color:c.ink,marginBottom:12},body:{...t.meta,color:c.muted},loading:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:20},historyNote:{...t.meta,color:c.muted,marginBottom:16}});

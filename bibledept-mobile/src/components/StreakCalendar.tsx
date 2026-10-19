import { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { shiftDate } from '../../shared/habits';
import { Colors, useThemedStyles, typography as t } from '../theme';
import { readingCalendar, readingRunColor, readingRunIntensity } from '../services/readingCalendar';
import { useReducedMotion } from './LiquidBottomNav';
import { useScreenScrollControls } from './ScreenScrollView';

/** All 52 weekly columns fit the available mobile width without scrolling. */
export function StreakCalendar({days,today}:{days:readonly string[];today:string}) {
  const {c,s}=useThemedStyles(styles);
  const controls=useScreenScrollControls(),reduced=useReducedMotion(),pulse=useSharedValue(.55);
  const [active,setActive]=useState(controls.getMetrics().active),[foreground,setForeground]=useState(AppState.currentState!=='background'),[width,setWidth]=useState(0);
  const activity=useMemo(()=>readingCalendar(days,today),[days,today]);
  const hasRun=[...activity.runs.values()].some(run=>run>1);
  useEffect(()=>{
    let previous=controls.getMetrics().active;setActive(previous);
    return controls.subscribe(metrics=>{if(metrics.active!==previous){previous=metrics.active;setActive(previous);}});
  },[controls]);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>listener.remove();},[]);
  useEffect(()=>{
    cancelAnimation(pulse);pulse.value=.55;
    if(active&&foreground&&!reduced&&hasRun)pulse.value=withRepeat(withTiming(1,{duration:1900,easing:Easing.inOut(Easing.sin)}),-1,true);
    return()=>cancelAnimation(pulse);
  },[active,foreground,reduced,hasRun,pulse]);
  const glowStyle=useAnimatedStyle(()=>({opacity:pulse.value}));
  const cellSize=Math.max(0,(width-51)/52);
  const weeks=useMemo(()=>{
    const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
    const first=shiftDate(today,-(51*7+weekday));
    return Array.from({length:52},(_,week)=>Array.from({length:7},(_,day)=>shiftDate(first,week*7+day)));
  },[today]);
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Track your reading</Text><Text style={s.meta}>Past year</Text></View>
    <View style={s.stats}>
      <Text style={s.streak}><Text style={s.number}>{activity.total}</Text> total {activity.total===1?'day':'days'}</Text>
      <Text style={s.current}>{activity.current} {activity.current===1?'day':'days'} in a row</Text>
    </View>
    <View testID="reading-contribution-calendar" style={s.chart} onLayout={event=>setWidth(event.nativeEvent.layout.width)}>
      <Animated.View testID="reading-streak-glow" pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,glowStyle]}>
        {width>0&&weeks.flatMap((week,column)=>week.map((date,row)=>{
          const run=activity.runs.get(date)||0;if(run<2)return null;
          const intensity=readingRunIntensity(run);
          return <View key={date} style={{position:'absolute',left:column*(cellSize+1),top:row*(cellSize+1),width:cellSize,height:cellSize,borderRadius:1,
            backgroundColor:'rgba(255,188,66,0.01)',boxShadow:`0 0 2px rgba(240,90,0,${.45+intensity*.4}), 0 0 3px rgba(255,188,66,${.3+intensity*.4})`}}/>;
        }))}
      </Animated.View>
      {weeks.map(week=><View key={week[0]} style={s.week}>
        {week.map(date=>{
          const run=activity.runs.get(date)||0,done=run>0,future=date>today;
          const fill=done?readingRunColor(c.orange,run):undefined;
          return <View key={date} accessible accessibilityLabel={`${new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}: ${future?'upcoming':done?'read':'no reading saved'}${done?`, ${run} ${run===1?'day':'days'} in a row`:''}`}
            style={[s.square,done&&{backgroundColor:fill,borderColor:c.orange},date===today&&s.today,future&&s.future]}/>;
        })}
      </View>)}
    </View>
    <View style={s.legend}><View style={[s.key,s.read]}/><Text style={s.meta}>Reading saved</Text><View style={[s.key,s.today]}/><Text style={s.meta}>Today</Text></View>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  section:{marginTop:28,paddingVertical:24,borderTopWidth:1,borderBottomWidth:1,borderColor:c.border},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},title:{...t.section,fontSize:20,lineHeight:27,color:c.ink},meta:{...t.meta,fontSize:11,color:c.muted},
  stats:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginTop:12,marginBottom:20},streak:{...t.body,color:c.ink},current:{...t.meta,fontSize:12,color:c.ink},number:{fontSize:30,lineHeight:36,fontWeight:'800',color:c.actionText,fontVariant:['tabular-nums']},
  chart:{flexDirection:'row',gap:1,alignSelf:'stretch'},week:{gap:1,flex:1,minWidth:0},square:{width:'100%',aspectRatio:1,borderRadius:1,backgroundColor:c.tint,borderWidth:.5,borderColor:c.border},read:{backgroundColor:c.orange,borderColor:c.orange},today:{borderColor:c.ink,borderWidth:.75},future:{opacity:.25},
  legend:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,marginTop:16},key:{width:10,height:10,borderRadius:2,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},
});

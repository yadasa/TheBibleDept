import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { shiftDate } from '../../shared/habits';
import { Colors, useThemedStyles, typography as t } from '../theme';
import { calendarRecencyOffset, readingCalendar, readingFillColors, readingGlowProfile, readingRunColor } from '../services/readingCalendar';
import { useReducedMotion } from './LiquidBottomNav';
import { useScreenScrollControls } from './ScreenScrollView';

/** Twenty-six weeks, opening at the reader's most recent activity. */
export function StreakCalendar({days,today}:{days:readonly string[];today:string}) {
  const {c,s}=useThemedStyles(styles);
  const controls=useScreenScrollControls(),reduced=useReducedMotion();
  const [active,setActive]=useState(controls.getMetrics().active),[foreground,setForeground]=useState(AppState.currentState!=='background'),[width,setWidth]=useState(0);
  const scroll=useRef<ScrollView>(null);
  const activity=useMemo(()=>readingCalendar(days,today),[days,today]);
  useEffect(()=>{
    let previous=controls.getMetrics().active;setActive(previous);
    return controls.subscribe(metrics=>{if(metrics.active!==previous){previous=metrics.active;setActive(previous);}});
  },[controls]);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>listener.remove();},[]);
  const cellSize=Math.max(14,Math.min(28,(width-56)/15));
  const weeks=useMemo(()=>{
    const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
    const first=shiftDate(today,-(25*7+weekday));
    return Array.from({length:26},(_,week)=>Array.from({length:7},(_,day)=>shiftDate(first,week*7+day)));
  },[today]);
  // At most 21 UI-thread pulse groups, rather than one clock for every square.
  const haloGroups=useMemo(()=>{
    const groups=new Map<number,HaloPosition[]>();
    weeks.forEach((week,column)=>week.forEach((date,row)=>{
      const run=activity.runs.get(date);if(!run)return;
      const level=Math.min(21,run),positions=groups.get(level)||[];
      positions.push({date,column,row});groups.set(level,positions);
    }));
    return [...groups];
  },[weeks,activity]);
  const latest=[...activity.runs.keys()].at(-1)||today;
  const snapToRecent=useCallback(()=>scroll.current?.scrollTo({x:calendarRecencyOffset(latest,weeks[0][0],width,cellSize),animated:false}),[latest,weeks,width,cellSize]);
  useEffect(()=>{if(active&&width>0)snapToRecent();},[active,width,snapToRecent]);
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Track your reading</Text><Text style={s.meta}>Past 26 weeks</Text></View>
    <View style={s.stats}>
      <Text style={s.streak}><Text style={s.number}>{activity.total}</Text> total {activity.total===1?'day':'days'}</Text>
      <Text style={s.current}>{activity.current} {activity.current===1?'day':'days'} in a row</Text>
    </View>
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} testID="reading-contribution-calendar" style={s.chart} contentContainerStyle={s.weeks}
      onLayout={event=>setWidth(event.nativeEvent.layout.width)} onContentSizeChange={snapToRecent}>
      {weeks.map(week=><View key={week[0]} style={s.week}>
        {week.map(date=>{
          const run=activity.runs.get(date)||0,done=run>0,future=date>today;
          const fill=done?readingRunColor(c.orange,run):undefined;
          return <View key={date} accessible accessibilityLabel={`${new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}: ${future?'upcoming':done?'read':'no reading saved'}${done?`, ${run} ${run===1?'day':'days'} in a row`:''}`}
            style={[s.square,{width:cellSize,height:cellSize},date===today&&s.today,done&&{backgroundColor:fill,borderWidth:0},future&&s.future]}/>;
        })}
      </View>)}
      <View testID="reading-streak-glow" pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {width>0&&haloGroups.map(([run,positions])=><StreakHaloGroup key={run} run={run} positions={positions} cellSize={cellSize} orange={c.orange} animate={active&&foreground&&!reduced}/>)}
      </View>
    </ScrollView>
    <View style={s.legend}><View style={[s.key,s.read]}/><Text style={s.meta}>Reading saved</Text><View style={[s.key,s.today]}/><Text style={s.meta}>Today</Text></View>
    <Text style={[s.meta,{marginTop:8}]}>Swipe for earlier weeks</Text>
  </View>;
}

type HaloPosition={date:string;column:number;row:number};
function StreakHaloGroup({run,positions,cellSize,orange,animate}:{run:number;positions:HaloPosition[];cellSize:number;orange:string;animate:boolean}) {
  const {cycleMs,minOpacity,maxOpacity}=readingGlowProfile(run),pulse=useSharedValue(minOpacity);
  const {rest,peak}=readingFillColors(orange,run),settledColor=readingRunColor(orange,run);
  useEffect(()=>{
    cancelAnimation(pulse);
    pulse.value=animate?minOpacity:(minOpacity+maxOpacity)/2;
    if(animate)pulse.value=withRepeat(withTiming(maxOpacity,{duration:cycleMs/2,easing:Easing.inOut(Easing.sin)}),-1,true);
    return()=>cancelAnimation(pulse);
  },[animate,cycleMs,minOpacity,maxOpacity,pulse]);
  const glowStyle=useAnimatedStyle(()=>({opacity:pulse.value}));
  // Animate opaque RGB colors directly. No fading surface or black dimming layer.
  // Reanimated 4 shares this color style across matching squares on the UI thread.
  const fillStyle=useAnimatedStyle(()=>({opacity:1,backgroundColor:animate?interpolateColor(Math.max(0,Math.min(1,(pulse.value-minOpacity)/(maxOpacity-minOpacity))),[0,1],[rest,peak]):settledColor}));
  return <View style={StyleSheet.absoluteFill}>
    <Animated.View testID={`reading-streak-glow-${run}`} style={[StyleSheet.absoluteFill,glowStyle]}>
    {positions.map(({date,column,row})=><View key={date} style={{position:'absolute',left:column*(cellSize+4)+2.5,top:row*(cellSize+4)+2.5,width:cellSize+3,height:cellSize+3,borderRadius:4.5,overflow:'hidden'}}>
      {/* Clip the brighter gold ring to 1.5 px beyond the square. */}
      <View style={{position:'absolute',left:1.5,top:1.5,width:cellSize,height:cellSize,borderRadius:3,
        backgroundColor:'rgba(255,188,66,0.01)',boxShadow:'0 0 1px .9px rgba(255,211,100,1), 0 0 2px .5px rgba(255,174,38,1)'}}/>
    </View>)}
    </Animated.View>
    <View testID={`reading-streak-fill-${run}`} style={StyleSheet.absoluteFill}>
      {positions.map(({date,column,row})=><Animated.View key={date} testID={`reading-streak-color-${date}`} style={[{position:'absolute',left:column*(cellSize+4)+4,top:row*(cellSize+4)+4,width:cellSize,height:cellSize,borderRadius:3,opacity:1},fillStyle]}/>)}
    </View>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  section:{marginTop:28,paddingVertical:24,borderBottomWidth:1,borderColor:c.border},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},title:{...t.section,fontSize:20,lineHeight:27,color:c.ink},meta:{...t.meta,fontSize:11,color:c.muted},
  stats:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginTop:12,marginBottom:20},streak:{...t.body,color:c.ink},current:{...t.meta,fontSize:12,color:c.ink},number:{fontSize:30,lineHeight:36,fontWeight:'800',color:c.actionText,fontVariant:['tabular-nums']},
  chart:{alignSelf:'stretch'},weeks:{flexDirection:'row',gap:4,padding:4},week:{gap:4},square:{borderRadius:3,backgroundColor:c.tint,borderWidth:.5,borderColor:c.border},read:{backgroundColor:c.orange,borderWidth:0},today:{borderColor:c.ink,borderWidth:1},future:{opacity:.25},
  legend:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,marginTop:16},key:{width:10,height:10,borderRadius:2,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},
});

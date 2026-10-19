import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolateColor, SharedValue, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { shiftDate } from '../../shared/habits';
import { Colors, useTheme, useThemedStyles, typography as t } from '../theme';
import { luminousPalettes } from '../themeColors';
import { calendarRecencyOffset, readingCalendar, readingFillColors, readingGlowProfile, readingPulseLevel, readingRunColor, readingShouldPulse, readingSquarePhase } from '../services/readingCalendar';
import { useReducedMotion } from './LiquidBottomNav';
import { useScreenScrollControls } from './ScreenScrollView';
import { CalendarWindow, sameCalendarWindow, visibleCalendarWindow } from '../services/calendarVisibility';

const CALENDAR_GAP=8,CALENDAR_PADDING=6,GLOW_REACH=3.5;

/** Twenty-six weeks, opening at the reader's most recent activity. */
export function StreakCalendar(props:{days:readonly string[];today:string}) {
  return <MemoizedStreakCalendar {...props}/>;
}
const MemoizedStreakCalendar=memo(function StreakCalendarContent({days,today}:{days:readonly string[];today:string}) {
  const {c,s}=useThemedStyles(styles),{mode}=useTheme(),palette=luminousPalettes[mode];
  const controls=useScreenScrollControls(),reduced=useReducedMotion();
  const [active,setActive]=useState(controls.getMetrics().active),[foreground,setForeground]=useState(AppState.currentState!=='background'),[width,setWidth]=useState(0);
  const scroll=useRef<ScrollView>(null);
  const chart=useRef<View>(null),chartTop=useRef<number|null>(null),horizontalOffset=useRef(0),windowRef=useRef<CalendarWindow|null>(null);
  const [visible,setVisible]=useState<CalendarWindow|null>(null);
  const visibilityTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const horizontalScrollAt=useSharedValue(0);
  const cellSize=Math.max(14,Math.min(28,(width-56)/15));
  const updateVisibility=useCallback(()=>{
    const metrics=controls.getMetrics();
    const next=visibleCalendarWindow({active:metrics.active,chartTop:chartTop.current,scrollTop:metrics.offsetY,viewportHeight:metrics.viewportHeight,horizontalOffset:horizontalOffset.current,viewportWidth:width,cellSize,gap:CALENDAR_GAP,padding:CALENDAR_PADDING,halo:GLOW_REACH});
    if(!sameCalendarWindow(windowRef.current,next)){windowRef.current=next;setVisible(next);}
  },[controls,width,cellSize]);
  const settleVisibility=useCallback(()=>{
    if(visibilityTimer.current)clearTimeout(visibilityTimer.current);
    visibilityTimer.current=setTimeout(()=>{visibilityTimer.current=null;updateVisibility();},120);
  },[updateVisibility]);
  useEffect(()=>()=>{if(visibilityTimer.current)clearTimeout(visibilityTimer.current);},[]);
  const measure=useCallback(()=>controls.measureContent(chart.current,bounds=>{chartTop.current=bounds.top;updateVisibility();}),[controls,updateVisibility]);
  const activity=useMemo(()=>readingCalendar(days,today),[days,today]);
  useEffect(()=>{
    let previous=controls.getMetrics();setActive(previous.active);measure();updateVisibility();
    return controls.subscribe(metrics=>{
      if(metrics.active!==previous.active)setActive(metrics.active);
      if(metrics.active&&(!previous.active||metrics.contentHeight!==previous.contentHeight||metrics.viewportHeight!==previous.viewportHeight))measure();
      const scrolling=metrics.active&&metrics.offsetY!==previous.offsetY;
      previous=metrics;
      // Do not mount/unmount dozens of worklets while a finger or fling moves
      // the chart. The clock is frozen on the UI thread until scrolling rests.
      if(scrolling)settleVisibility();else updateVisibility();
    });
  },[controls,measure,updateVisibility,settleVisibility]);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>listener.remove();},[]);
  const weeks=useMemo(()=>{
    const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
    const first=shiftDate(today,-(25*7+weekday));
    return Array.from({length:26},(_,week)=>Array.from({length:7},(_,day)=>shiftDate(first,week*7+day)));
  },[today]);
  // Cull before creating animated views: offscreen dates have no worklets.
  const haloGroups=useMemo(()=>{
    if(!visible)return [];
    const groups=new Map<number,HaloPosition[]>();
    weeks.forEach((week,column)=>week.forEach((date,row)=>{
      if(column<visible.firstColumn||column>visible.lastColumn||row<visible.firstRow||row>visible.lastRow)return;
      const run=activity.runs.get(date);if(!run)return;
      const level=Math.min(21,run),positions=groups.get(level)||[];
      positions.push({date,column,row});groups.set(level,positions);
    }));
    return [...groups];
  },[weeks,activity,visible]);
  // One clock for the entire chart. Slow ambient pulses need only 30 updates/s;
  // native scrolling keeps its full refresh rate independently of this clock.
  const clock=useSharedValue(0),pendingTime=useSharedValue(0);
  const verticalScrollAt=controls.motion?.lastScrollAt;
  const pulseFrame=useFrameCallback(frame=>{
    const now=Date.now();
    if(now-horizontalScrollAt.value<160||(verticalScrollAt&&now-verticalScrollAt.value<160))return;
    pendingTime.value+=Math.min(frame.timeSincePreviousFrame??0,64);
    if(pendingTime.value>=1000/30){clock.value+=pendingTime.value;pendingTime.value=0;}
  },false);
  const animate=active&&foreground&&!reduced;
  const hasPulsingSquares=haloGroups.some(([run])=>readingShouldPulse(run));
  useEffect(()=>{
    pulseFrame.setActive(animate&&hasPulsingSquares);
    return()=>pulseFrame.setActive(false);
  },[animate,hasPulsingSquares,pulseFrame]);
  const latest=[...activity.runs.keys()].at(-1)||today;
  const snapToRecent=useCallback(()=>scroll.current?.scrollTo({x:calendarRecencyOffset(latest,weeks[0][0],width,cellSize,CALENDAR_GAP,CALENDAR_PADDING),animated:false}),[latest,weeks,width,cellSize]);
  useEffect(()=>{if(active&&width>0)snapToRecent();},[active,width,snapToRecent]);
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Track your reading</Text><Text style={s.meta}>Past 26 weeks</Text></View>
    <View style={s.stats}>
      <Text style={s.streak}><Text style={s.number}>{activity.total}</Text> total {activity.total===1?'day':'days'}</Text>
      <Text style={s.current}>{activity.current} {activity.current===1?'day':'days'} in a row</Text>
    </View>
    <View ref={chart} collapsable={false} onLayout={measure}>
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} testID="reading-contribution-calendar" style={[s.chart,{backgroundColor:palette.calendarWell,boxShadow:palette.calendarInset,borderRadius:10}]} contentContainerStyle={s.weeks}
      onLayout={event=>{setWidth(event.nativeEvent.layout.width);measure();}} onContentSizeChange={snapToRecent}
      scrollEventThrottle={48} onScroll={event=>{horizontalScrollAt.value=Date.now();horizontalOffset.current=event.nativeEvent.contentOffset.x;settleVisibility();}}>
      {useMemo(()=>weeks.map(week=><View key={week[0]} style={s.week}>
        {week.map(date=>{
          const run=activity.runs.get(date)||0,done=run>0,future=date>today;
          const fill=done?readingRunColor(c.orange,run):undefined;
          return <View key={date} accessible accessibilityLabel={`${new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}: ${future?'upcoming':done?'read':'no reading saved'}${done?`, ${run} ${run===1?'day':'days'} in a row`:''}`}
            style={[s.square,{width:cellSize,height:cellSize,backgroundColor:palette.empty,borderColor:palette.emptyBorder},date===today&&s.today,done&&{backgroundColor:fill,borderWidth:0},future&&s.future]}/>;
        })}
      </View>),[weeks,activity,c.orange,palette.empty,palette.emptyBorder,cellSize,today,s])}
      <View testID="reading-streak-glow" pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {width>0&&haloGroups.map(([run,positions])=><StreakHaloGroup key={run} run={run} positions={positions} cellSize={cellSize} orange={c.orange} shadow={palette.streakGlow} animate={animate&&readingShouldPulse(run)} clock={clock}/>)}
      </View>
    </ScrollView>
    </View>
    <View style={s.legend}><View style={[s.key,s.read]}/><Text style={s.meta}>Reading saved</Text><View style={[s.key,s.today]}/><Text style={s.meta}>Today</Text></View>
    <Text style={[s.meta,{marginTop:8}]}>Swipe for earlier weeks</Text>
  </View>;
});

type HaloPosition={date:string;column:number;row:number};
function StreakHaloGroup({run,positions,cellSize,orange,shadow,animate,clock}:{run:number;positions:HaloPosition[];cellSize:number;orange:string;shadow:string;animate:boolean;clock:SharedValue<number>}) {
  return <View testID={`reading-streak-fill-${run}`} style={StyleSheet.absoluteFill}>
    {positions.map(position=>animate?<StreakSquareLight key={position.date} {...position} run={run} cellSize={cellSize} orange={orange} shadow={shadow} clock={clock}/>:<StaticSquareLight key={position.date} {...position} run={run} cellSize={cellSize} shadow={shadow}/>)}
  </View>;
}

const haloBounds=(column:number,row:number,cellSize:number)=>({position:'absolute' as const,left:column*(cellSize+CALENDAR_GAP)+CALENDAR_PADDING-GLOW_REACH,top:row*(cellSize+CALENDAR_GAP)+CALENDAR_PADDING-GLOW_REACH,width:cellSize+GLOW_REACH*2,height:cellSize+GLOW_REACH*2,borderRadius:3+GLOW_REACH,overflow:'hidden' as const});
const SquareBloom=memo(function SquareBloom({cellSize,shadow}:{cellSize:number;shadow:string}) {
  return <View style={{position:'absolute',left:GLOW_REACH,top:GLOW_REACH,width:cellSize,height:cellSize,borderRadius:3,backgroundColor:'rgba(255,188,66,0.01)',boxShadow:shadow}}/>;
});
const StaticSquareLight=memo(function StaticSquareLight({date,column,row,run,cellSize,shadow}:HaloPosition&{run:number;cellSize:number;shadow:string}) {
  const {minOpacity,maxOpacity}=readingGlowProfile(run);
  return <View testID={`reading-streak-static-${date}`} style={[haloBounds(column,row,cellSize),{opacity:(minOpacity+maxOpacity)/2}]}><SquareBloom cellSize={cellSize} shadow={shadow}/></View>;
});

/** Shared elapsed time, independent stable phases, one cosine per visible square. */
const StreakSquareLight=memo(function StreakSquareLight({date,column,row,run,cellSize,orange,shadow,clock}:HaloPosition&{run:number;cellSize:number;orange:string;shadow:string;clock:SharedValue<number>}) {
  const offset=readingSquarePhase(date),{minOpacity,maxOpacity,cycleMs}=readingGlowProfile(run);
  const {rest,peak}=readingFillColors(orange,run);
  const level=useDerivedValue(()=>readingPulseLevel(clock.value/cycleMs,offset));
  const glowStyle=useAnimatedStyle(()=>({opacity:minOpacity+(maxOpacity-minOpacity)*level.value}));
  const fillStyle=useAnimatedStyle(()=>({backgroundColor:interpolateColor(level.value,[0,1],[rest,peak])}));
  return <View style={StyleSheet.absoluteFill}>
    <Animated.View testID={`reading-streak-glow-${date}`} shouldRasterizeIOS renderToHardwareTextureAndroid style={[haloBounds(column,row,cellSize),glowStyle]}>
      {/* Visible soft bloom, leaving a 1 px dark separation in the 8 px gap. */}
      <SquareBloom cellSize={cellSize} shadow={shadow}/>
    </Animated.View>
    <Animated.View testID={`reading-streak-color-${date}`} style={[{position:'absolute',left:column*(cellSize+CALENDAR_GAP)+CALENDAR_PADDING,top:row*(cellSize+CALENDAR_GAP)+CALENDAR_PADDING,width:cellSize,height:cellSize,borderRadius:3,opacity:1},fillStyle]}/>
  </View>;
});
const styles=(c:Colors)=>StyleSheet.create({
  section:{marginTop:16,paddingTop:8,paddingBottom:24,borderBottomWidth:1,borderColor:c.border},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},title:{...t.section,fontSize:20,lineHeight:27,color:c.ink},meta:{...t.meta,fontSize:11,color:c.muted},
  stats:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginTop:12,marginBottom:20},streak:{...t.body,color:c.ink},current:{...t.meta,fontSize:12,color:c.ink},number:{fontSize:30,lineHeight:36,fontWeight:'800',color:c.actionText,fontVariant:['tabular-nums']},
  chart:{alignSelf:'stretch'},weeks:{flexDirection:'row',gap:CALENDAR_GAP,padding:CALENDAR_PADDING},week:{gap:CALENDAR_GAP},square:{borderRadius:3,backgroundColor:c.tint,borderWidth:.5,borderColor:c.border},read:{backgroundColor:c.orange,borderWidth:0},today:{borderColor:c.ink,borderWidth:1},future:{opacity:.25},
  legend:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,marginTop:16},key:{width:10,height:10,borderRadius:2,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},
});

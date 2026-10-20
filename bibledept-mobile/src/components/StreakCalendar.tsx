import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { shiftDate } from '../../shared/habits';
import { Colors, ThemeMode, useTheme, useThemedStyles, typography as t } from '../theme';
import { luminousPalettes } from '../themeColors';
import { calendarRecencyOffset, readingCalendar, readingGlowOpacity, readingRunColor } from '../services/readingCalendar';

const CALENDAR_GAP=8,CALENDAR_PADDING=6,GLOW_REACH=3.5;
const glowImages={dark:require('../../assets/streak-glow/dark.png'),light:require('../../assets/streak-glow/light.png')};
const glowCaps={top:7,left:7,bottom:7,right:7};

/** Twenty-six weeks, opening at the reader's most recent activity. */
export function StreakCalendar(props:{days:readonly string[];today:string;active?:boolean}) {
  return <MemoizedStreakCalendar {...props}/>;
}
const MemoizedStreakCalendar=memo(function StreakCalendarContent({days,today,active=true}:{days:readonly string[];today:string;active?:boolean}) {
  const {c,s}=useThemedStyles(styles),{mode}=useTheme(),palette=luminousPalettes[mode];
  const [width,setWidth]=useState(0);
  const scroll=useRef<ScrollView>(null);
  const cellSize=Math.max(14,Math.min(28,(width-56)/15));
  const activity=useMemo(()=>readingCalendar(days,today),[days,today]);
  const weeks=useMemo(()=>{
    const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
    const first=shiftDate(today,-(25*7+weekday));
    return Array.from({length:26},(_,week)=>Array.from({length:7},(_,day)=>shiftDate(first,week*7+day)));
  },[today]);
  const latest=[...activity.runs.keys()].at(-1)||today;
  const snapToRecent=useCallback(()=>scroll.current?.scrollTo({x:calendarRecencyOffset(latest,weeks[0][0],width,cellSize,CALENDAR_GAP,CALENDAR_PADDING),animated:false}),[latest,weeks,width,cellSize]);
  useEffect(()=>{if(active&&width>0)snapToRecent();},[active,width,snapToRecent]);
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Track your reading</Text><Text style={s.meta}>Past 26 weeks</Text></View>
    <View style={s.stats}>
      <Text style={s.streak}><Text style={s.number}>{activity.total}</Text> total {activity.total===1?'day':'days'}</Text>
      <Text style={s.current}>{activity.current} {activity.current===1?'day':'days'} in a row</Text>
    </View>
    <ScrollView ref={scroll} horizontal directionalLockEnabled alwaysBounceVertical={false} showsHorizontalScrollIndicator={false} testID="reading-contribution-calendar" style={[s.chart,{backgroundColor:palette.calendarWell,boxShadow:palette.calendarInset,borderRadius:10}]} contentContainerStyle={s.weeks}
      onLayout={event=>setWidth(event.nativeEvent.layout.width)} onContentSizeChange={snapToRecent}>
      {useMemo(()=>weeks.map(week=><View key={week[0]} style={s.week}>
        {week.map(date=>{
          const run=activity.runs.get(date)||0,done=run>0,future=date>today;
          const fill=done?readingRunColor(c.orange,run):undefined;
          return <View key={date} accessible accessibilityLabel={`${new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}: ${future?'upcoming':done?'read':'no reading saved'}${done?`, ${run} ${run===1?'day':'days'} in a row`:''}`}
            style={{width:cellSize,height:cellSize}}>
            {done&&<StaticSquareLight date={date} run={run} cellSize={cellSize} mode={mode}/>}
            <View style={[StyleSheet.absoluteFill,s.square,{backgroundColor:palette.empty,borderColor:palette.emptyBorder},date===today&&s.today,done&&{backgroundColor:fill,borderWidth:0},future&&s.future]}/>
          </View>;
        })}
      </View>),[weeks,activity,c.orange,palette.empty,palette.emptyBorder,mode,cellSize,today,s])}
    </ScrollView>
    <View style={s.legend}><View style={[s.key,s.read]}/><Text style={s.meta}>Reading saved</Text><View style={[s.key,s.today]}/><Text style={s.meta}>Today</Text></View>
    <Text style={[s.meta,{marginTop:8}]}>Swipe for earlier weeks</Text>
  </View>;
});

/** Fixed halo: no animation hooks, timers, scroll listeners or visibility work. */
const StaticSquareLight=memo(function StaticSquareLight({date,run,cellSize,mode}:{date:string;run:number;cellSize:number;mode:ThemeMode}) {
  return <View testID={`reading-streak-static-${date}`} pointerEvents="none" accessible={false}
    style={{position:'absolute',left:-GLOW_REACH,top:-GLOW_REACH,width:cellSize+GLOW_REACH*2,height:cellSize+GLOW_REACH*2,borderRadius:3+GLOW_REACH,overflow:'hidden',opacity:readingGlowOpacity(run)}}>
    <Image source={glowImages[mode]} resizeMode="stretch" capInsets={glowCaps} fadeDuration={0} accessible={false} style={StyleSheet.absoluteFill}/>
  </View>;
});
const styles=(c:Colors)=>StyleSheet.create({
  section:{marginTop:16,paddingTop:8,paddingBottom:24,borderBottomWidth:1,borderColor:c.border},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},title:{...t.section,fontSize:20,lineHeight:27,color:c.ink},meta:{...t.meta,fontSize:11,color:c.muted},
  stats:{flexDirection:'row',alignItems:'baseline',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginTop:12,marginBottom:20},streak:{...t.body,color:c.ink},current:{...t.meta,fontSize:12,color:c.ink},number:{fontSize:30,lineHeight:36,fontWeight:'800',color:c.actionText,fontVariant:['tabular-nums']},
  chart:{alignSelf:'stretch'},weeks:{flexDirection:'row',gap:CALENDAR_GAP,padding:CALENDAR_PADDING},week:{gap:CALENDAR_GAP},square:{borderRadius:3,backgroundColor:c.tint,borderWidth:.5,borderColor:c.border},read:{backgroundColor:c.orange,borderWidth:0},today:{borderColor:c.ink,borderWidth:1},future:{opacity:.25},
  legend:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,marginTop:16},key:{width:10,height:10,borderRadius:2,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},
});

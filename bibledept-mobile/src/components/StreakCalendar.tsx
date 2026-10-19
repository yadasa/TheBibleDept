import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { shiftDate } from '../../shared/habits';
import { Colors, useThemedStyles, typography as t } from '../theme';
import { readingCalendar, readingRunIntensity } from '../services/readingCalendar';

/** Twelve weeks of real saved reading dates; plan-day numbers are not dates. */
export function StreakCalendar({days,today}:{days:readonly string[];today:string}) {
  const {c,s}=useThemedStyles(styles);
  const activity=useMemo(()=>readingCalendar(days,today),[days,today]);
  const weeks=useMemo(()=>{
    const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
    const first=shiftDate(today,-(11*7+weekday));
    return Array.from({length:12},(_,week)=>Array.from({length:7},(_,day)=>shiftDate(first,week*7+day)));
  },[today]);
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Track your reading</Text><Text style={s.meta}>Last 12 weeks</Text></View>
    <View style={s.stats}>
      <Text style={s.streak}><Text style={s.number}>{activity.total}</Text> total {activity.total===1?'day':'days'}</Text>
      <Text style={s.current}>{activity.current} {activity.current===1?'day':'days'} in a row</Text>
    </View>
    <View testID="reading-contribution-calendar" style={s.chart}>
      <View accessible={false} style={s.weekdays}>{['','M','','W','','F',''].map((label,index)=><Text key={index} style={s.weekday}>{label}</Text>)}</View>
      {weeks.map((week,index)=><View key={week[0]} style={s.week}>
        {week.map(date=>{
          const run=activity.runs.get(date)||0,done=run>0,future=date>today;
          const intensity=readingRunIntensity(run);
          // Keep orange recognizable: lift at most 22% toward white, with a tight gold halo.
          const fill=done?c.orange.replace(/#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i,(_,r,g,b)=>`rgb(${[r,g,b].map(hex=>Math.round(parseInt(hex,16)+(255-parseInt(hex,16))*intensity*.22)).join(',')})`):undefined;
          return <View key={date} accessible accessibilityLabel={`${new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}: ${future?'upcoming':done?'read':'no reading saved'}${done?`, ${run} ${run===1?'day':'days'} in a row`:''}`}
            style={[s.square,done&&{backgroundColor:fill,borderColor:fill},run>1&&{boxShadow:`0 0 ${2+intensity}px rgba(255, 188, 66, ${.1+intensity*.12})`},date===today&&s.today,future&&s.future]}/>;
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
  chart:{flexDirection:'row',gap:4,alignSelf:'flex-start'},weekdays:{gap:4,marginRight:4},weekday:{width:16,height:14,fontSize:9,lineHeight:14,color:c.muted},
  week:{gap:4},square:{width:14,height:14,borderRadius:3,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},read:{backgroundColor:c.orange,borderColor:c.orange},today:{borderColor:c.ink,borderWidth:1.5},future:{opacity:.25},
  legend:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,marginTop:16},key:{width:10,height:10,borderRadius:2,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},
});

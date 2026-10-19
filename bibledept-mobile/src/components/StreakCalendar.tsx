import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { shiftDate } from '../../shared/habits';
import { Colors, useThemedStyles, typography as t } from '../theme';

/** Twelve weeks of real saved reading dates; plan-day numbers are not dates. */
export function StreakCalendar({days,today,current}:{days:readonly string[];today:string;current:number}) {
  const {c,s}=useThemedStyles(styles),read=new Set(days);
  const weeks=useMemo(()=>{
    const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
    const first=shiftDate(today,-(11*7+weekday));
    return Array.from({length:12},(_,week)=>Array.from({length:7},(_,day)=>shiftDate(first,week*7+day)));
  },[today]);
  return <View style={s.section}>
    <View style={s.heading}><Text accessibilityRole="header" style={s.title}>Track your reading</Text><Text style={s.meta}>Last 12 weeks</Text></View>
    <Text style={s.streak}><Text style={s.number}>{current}</Text> {current===1?'day':'days'} in a row</Text>
    <View testID="reading-contribution-calendar" style={s.chart}>
      <View accessible={false} style={s.weekdays}>{['','M','','W','','F',''].map((label,index)=><Text key={index} style={s.weekday}>{label}</Text>)}</View>
      {weeks.map((week,index)=><View key={week[0]} style={s.week}>
        {week.map(date=>{
          const done=read.has(date)&&date<=today,future=date>today;
          return <View key={date} accessible accessibilityLabel={`${new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}: ${future?'upcoming':done?'read':'no reading saved'}`}
            style={[s.square,done&&s.read,date===today&&s.today,future&&s.future]}/>;
        })}
      </View>)}
    </View>
    <View style={s.legend}><View style={[s.key,s.read]}/><Text style={s.meta}>Reading saved</Text><View style={[s.key,s.today]}/><Text style={s.meta}>Today</Text></View>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  section:{marginTop:28,paddingVertical:24,borderTopWidth:1,borderBottomWidth:1,borderColor:c.border},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},title:{...t.section,fontSize:20,lineHeight:27,color:c.ink},meta:{...t.meta,fontSize:11,color:c.muted},
  streak:{...t.body,color:c.ink,marginTop:12,marginBottom:20},number:{fontSize:30,lineHeight:36,fontWeight:'800',color:c.actionText,fontVariant:['tabular-nums']},
  chart:{flexDirection:'row',gap:4,alignSelf:'flex-start'},weekdays:{gap:4,marginRight:4},weekday:{width:16,height:14,fontSize:9,lineHeight:14,color:c.muted},
  week:{gap:4},square:{width:14,height:14,borderRadius:3,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},read:{backgroundColor:c.orange,borderColor:c.orange},today:{borderColor:c.ink,borderWidth:1.5},future:{opacity:.25},
  legend:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:7,marginTop:16},key:{width:10,height:10,borderRadius:2,backgroundColor:c.tint,borderWidth:1,borderColor:c.border},
});

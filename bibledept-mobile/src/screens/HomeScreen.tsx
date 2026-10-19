import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Notice } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../services/AuthProvider';
import { useReadings } from '../services/ReadingProvider';
import { useThemedStyles, Colors, typography as t } from '../theme';
import { usePlan } from '../services/PlanProvider';
import { getPlanChapters, getReadingPlanDay } from '../services/readingPlan';

export function HomeScreen({onRead,onAccount,onPrayer}:{onRead:()=>void;onAccount:()=>void;onPrayer:()=>void}) {
  const {c,s}=useThemedStyles(styles);
  const {user}=useAuth(),{readings,streak,error}=useReadings();
  const plan=usePlan(),current=getReadingPlanDay(plan.currentDay)!;
  const complete=plan.finished?365:plan.currentDay-1;
  const chapters=getPlanChapters(current.day);
  return <View>
    <Text style={s.welcome}>A little every day. At your pace.</Text>
    <View style={s.reading}>
      <View style={s.row}><Text style={s.eyebrow}>Your reading plan</Text><Icon name={plan.finished?'checkCircle':'book'} color={c.action}/></View>
      <View style={s.dayRow}><Text style={s.day}>Day {current.day}</Text><Text style={s.total}>of 365</Text></View>
      <Text style={s.passage}>{current.label}</Text>
      <Text style={s.meta}>{chapters.length} chapters · {plan.finished?'Plan complete':'Your current day'}</Text>
      <ActionButton title={plan.finished?'Revisit this reading':`Read day ${current.day}`} icon="arrowRight" disabled={!plan.ready} onPress={()=>{plan.returnToCurrent();onRead();}}/>
      <View style={s.progressRow}><View style={s.track}><View style={[s.fill,{width:`${100*complete/365}%`}]}/></View><Text style={s.progressText}>{complete} / 365 complete</Text></View>
    </View>
    {!!plan.error&&<View><Notice text={plan.error} error/><ActionButton title="Retry saved plan" secondary onPress={plan.retry}/></View>}
    <Text style={s.local}>Your place in the plan is saved on this device.</Text>
    <View style={s.sectionHeading}><Text accessibilityRole="header" style={s.sectionTitle}>Make time to reflect</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Open your prayer journal" onPress={onPrayer} style={({pressed})=>[s.journal,pressed&&s.pressed]}>
      <View style={s.journalIcon}><Icon name="heart" color={c.action}/></View><View style={s.journalText}><Text style={s.rowTitle}>Your prayer journal</Text><Text style={s.rowBody}>Bring what's on your heart.</Text></View><Icon name="chevronRight" size={18} color={c.muted}/>
    </Pressable>
    {user?<View style={s.history}><View style={s.row}><Text style={s.rowTitle}>Reading history</Text><Text style={s.streak}>{streak} day streak</Text></View><Text style={s.rowBody}>{readings.length} recent reading {readings.length===1?'day':'days'} saved to your account.</Text>{readings[0]&&<Text style={s.last}>Last saved · {readings[0].reference}</Text>}</View>:<View style={s.account}><Text style={s.rowTitle}>A space of your own</Text><Text style={s.rowBody}>Save prayers and reading history with a free account.</Text><ActionButton title="Open your account" variant="ghost" icon="arrowRight" onPress={onAccount}/></View>}
    {!!error&&<Notice text={error} error/>}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  welcome:{...t.body,color:c.muted,marginTop:-12,marginBottom:24},
  reading:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderTopWidth:3,borderTopColor:c.orange,borderRadius:4,padding:20},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},eyebrow:{...t.label,color:c.muted},
  dayRow:{flexDirection:'row',alignItems:'baseline',gap:10,marginTop:24},day:{fontSize:36,lineHeight:42,fontWeight:'800',letterSpacing:-1,color:c.ink},total:{...t.body,color:c.muted},
  passage:{fontSize:25,lineHeight:32,fontWeight:'700',letterSpacing:-.6,color:c.ink,marginTop:12},meta:{...t.meta,color:c.muted,marginTop:6,marginBottom:16},
  progressRow:{marginTop:20,gap:8},track:{height:4,backgroundColor:c.tint},fill:{height:4,backgroundColor:c.action},progressText:{...t.meta,color:c.muted},local:{...t.meta,color:c.muted,marginTop:12},
  sectionHeading:{marginTop:32,marginBottom:16},sectionTitle:{...t.section,color:c.ink},journal:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:16,borderTopWidth:1,borderBottomWidth:1,borderColor:c.border},journalIcon:{width:44,height:44,backgroundColor:c.tint,alignItems:'center',justifyContent:'center',borderRadius:4},journalText:{flex:1},rowTitle:{...t.label,fontSize:16,lineHeight:24,color:c.ink},rowBody:{...t.meta,color:c.muted,marginTop:4},account:{marginTop:24},history:{marginTop:24},streak:{...t.meta,color:c.action,fontWeight:'600'},last:{...t.meta,color:c.muted,marginTop:12},pressed:{opacity:.65},
});

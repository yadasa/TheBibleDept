import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Notice } from '../components/ui';
import { useAuth } from '../services/AuthProvider';
import { useReadings } from '../services/ReadingProvider';
import { theme as c } from '../theme';

export function HomeScreen({onRead,onAccount}:{onRead:(reference?:string)=>void;onAccount:()=>void}) {
  const {user}=useAuth();const {readings,streak,error}=useReadings();
  return <View>
    <View style={s.hero}><Text style={s.kicker}>YOUR DAILY RHYTHM</Text><Text style={s.heroTitle}>{'Read. Reflect.\nLive it out.'}</Text><Text style={s.heroBody}>Start with a passage. Take a moment to understand it. Carry one truth into your day.</Text><Pressable accessibilityRole="button" onPress={()=>onRead(readings[0]?.reference)} style={s.button}><Text style={s.buttonText}>{readings.length?'Continue reading':'Open the Bible'}  →</Text></Pressable></View>
    <Text style={s.sectionTitle}>Grow with intention.</Text>
    {user?<View style={s.card}><Text style={s.metric}>{streak}<Text style={s.metricLabel}> day streak</Text></Text><Text style={s.body}>{readings.length} recent reading {readings.length===1?'day':'days'} saved.</Text>{readings[0]&&<Text style={s.last}>LAST READ · {readings[0].reference}</Text>}</View>:<View style={s.card}><Text style={s.cardTitle}>One chapter. A fresh start.</Text><Text style={s.body}>You do not have to catch up to begin. Take the next step today.</Text><Pressable accessibilityRole="button" onPress={onAccount}><Text style={s.link}>Save your progress with a free account →</Text></Pressable></View>}
    {!!error&&<Notice text={error} error/>}
  </View>;
}
const s=StyleSheet.create({hero:{backgroundColor:c.orange,padding:24,borderRadius:3,marginBottom:30},kicker:{fontSize:10,letterSpacing:1.8,fontWeight:'800',color:c.ink,marginBottom:20},heroTitle:{fontSize:34,lineHeight:37,fontWeight:'900',letterSpacing:-1,color:c.ink,marginBottom:14},heroBody:{fontSize:15,lineHeight:23,color:c.ink,marginBottom:25},button:{backgroundColor:c.ink,paddingVertical:17,paddingHorizontal:18,borderRadius:3},buttonText:{color:'#FFF5F5',fontWeight:'800',fontSize:15,textAlign:'center'},sectionTitle:{fontSize:23,fontWeight:'800',letterSpacing:-.5,color:c.ink,marginBottom:14},card:{backgroundColor:c.surface,padding:20,borderColor:c.border,borderWidth:1,borderRadius:4},cardTitle:{fontSize:18,fontWeight:'800',color:c.ink,marginBottom:8},body:{color:c.muted,fontSize:15,lineHeight:23},link:{color:c.action,fontWeight:'700',fontSize:13,marginTop:16},metric:{fontSize:36,fontWeight:'900',color:c.ink,marginBottom:8},metricLabel:{fontSize:18,fontWeight:'700'},last:{fontSize:11,fontWeight:'800',letterSpacing:.8,color:c.action,marginTop:18}});

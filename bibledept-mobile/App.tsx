import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme as c } from './src/theme';
import { BibleScreen } from './src/screens/BibleScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { AuthProvider } from './src/services/AuthProvider';
import { ReadingProvider } from './src/services/ReadingProvider';
import { HomeScreen } from './src/screens/HomeScreen';
import { PrayerScreen } from './src/screens/PrayerScreen';

const tabs = ['Today', 'Bible', 'Prayer', 'Account'] as const;
export default function App() {
  const [tab, setTab] = useState<(typeof tabs)[number]>('Today');
  const [reference,setReference]=useState('Luke 1');
  return <SafeAreaProvider><AuthProvider><ReadingProvider><SafeAreaView style={s.safe}>
    <StatusBar style="light" />
    <View style={s.header}><Text style={s.wordmark}>THE BIBLE DEPT.</Text><Text style={s.badge}>FREE TO GROW</Text></View>
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>A LITTLE EVERY DAY.</Text>
      <Text style={s.heading}>{tab === 'Today' ? 'Make room\nfor the Word.' : tab}</Text>
      {tab === 'Today' ? <HomeScreen onRead={value=>{setReference(value||'Luke 1');setTab('Bible');}} onAccount={()=>setTab('Account')}/>
        : tab === 'Bible' ? <BibleScreen initialReference={reference} onAccount={()=>setTab('Account')}/>
        : tab === 'Account' ? <AccountScreen/>
        : <PrayerScreen onAccount={()=>setTab('Account')}/>}

    </ScrollView>
    <View style={s.tabs}>{tabs.map(t => <Pressable key={t} accessibilityRole="tab" accessibilityState={{selected:t===tab}} onPress={()=>setTab(t)} style={s.tab}><Text style={[s.tabLabel,t===tab&&s.activeTab]}>{t}</Text><View style={[s.tabDot,t===tab&&s.activeDot]}/></Pressable>)}</View>
  </SafeAreaView></ReadingProvider></AuthProvider></SafeAreaProvider>;
}
const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:c.ink},header:{backgroundColor:c.ink,paddingHorizontal:22,paddingVertical:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},wordmark:{color:c.orange,fontSize:18,fontWeight:'900',letterSpacing:-.5},badge:{color:'#FFF5F5',fontSize:9,fontWeight:'800',letterSpacing:1.4},content:{backgroundColor:c.background,padding:24,paddingBottom:40,flexGrow:1},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:2,color:c.action,marginBottom:12},heading:{fontSize:40,lineHeight:43,fontWeight:'900',letterSpacing:-1.6,color:c.ink,marginBottom:26},hero:{backgroundColor:c.orange,padding:24,borderRadius:3,marginBottom:30},kicker:{fontSize:10,letterSpacing:1.8,fontWeight:'800',color:c.ink,marginBottom:20},heroTitle:{fontSize:34,lineHeight:37,fontWeight:'900',letterSpacing:-1,color:c.ink,marginBottom:14},heroBody:{fontSize:15,lineHeight:23,color:c.ink,marginBottom:25},button:{backgroundColor:c.ink,paddingVertical:17,paddingHorizontal:18,borderRadius:3},buttonText:{color:'#FFF5F5',fontWeight:'800',fontSize:15,textAlign:'center'},sectionTitle:{fontSize:23,fontWeight:'800',letterSpacing:-.5,color:c.ink,marginBottom:14},card:{backgroundColor:c.surface,padding:20,borderColor:c.border,borderWidth:1,borderRadius:4},cardTitle:{fontSize:18,fontWeight:'800',color:c.ink,marginBottom:8},body:{color:c.muted,fontSize:15,lineHeight:23},tabs:{backgroundColor:c.background,flexDirection:'row',borderTopWidth:1,borderTopColor:c.border,paddingTop:15,paddingBottom:10},tab:{flex:1,alignItems:'center',paddingVertical:6},tabLabel:{fontSize:12,fontWeight:'600',color:c.muted},activeTab:{color:c.action,fontWeight:'800'},tabDot:{width:4,height:4,borderRadius:2,marginTop:7},activeDot:{backgroundColor:c.orange},
});

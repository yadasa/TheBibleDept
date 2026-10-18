import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BibleScreen } from './BibleScreen';
import { PlanScreen } from './PlanScreen';
import { theme as c } from '../theme';
import type { Translation } from '../services/bible';

export function BibleHub({initialReference,initialTranslation,onAccount}:{initialReference?:string;initialTranslation:Translation;onAccount:()=>void}) {
  const [mode,setMode]=useState<'plan'|'search'>(initialReference?'search':'plan');
  return <View>
    <View style={s.modes}>{(['plan','search'] as const).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:mode===value}} onPress={()=>setMode(value)} style={[s.mode,mode===value&&s.active]}><Text style={[s.text,mode===value&&s.activeText]}>{value==='plan'?'Reading plan':'Search passages'}</Text></Pressable>)}</View>
    {mode==='plan'?<PlanScreen/>:<BibleScreen initialReference={initialReference||'Luke 1'} initialTranslation={initialTranslation} onAccount={onAccount}/>}
  </View>;
}
const s=StyleSheet.create({modes:{flexDirection:'row',borderBottomWidth:1,borderColor:c.border,marginBottom:23},mode:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderBottomWidth:3,borderBottomColor:'transparent'},active:{borderBottomColor:c.orange},text:{fontSize:12,fontWeight:'700',color:c.muted},activeText:{color:c.ink,fontWeight:'900'}});

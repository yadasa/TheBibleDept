import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BibleScreen } from './BibleScreen';
import { PlanScreen } from './PlanScreen';
import { Icon } from '../components/Icon';
import { useScreenScroll } from '../components/ScreenScrollView';
import { theme as c } from '../theme';
import type { Translation } from '../services/bible';

export function BibleHub({initialReference,initialTranslation,onAccount}:{initialReference?:string;initialTranslation:Translation;onAccount:()=>void}) {
  const [mode,setMode]=useState<'plan'|'search'>(initialReference?'search':'plan');
  const scrollTop=useScreenScroll();
  return <View>
    <View style={s.modes}>{(['plan','search'] as const).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityLabel={value==='plan'?'Reading plan':'Search passages'} accessibilityState={{selected:mode===value}} onPress={()=>{setMode(value);scrollTop();}} style={({pressed})=>[s.mode,mode===value&&s.active,pressed&&s.pressed]}><Icon name={value==='plan'?'book':'search'} size={18} color={mode===value?c.ink:c.muted}/><Text style={[s.text,mode===value&&s.activeText]}>{value==='plan'?'Reading plan':'Search'}</Text></Pressable>)}</View>
    {mode==='plan'?<PlanScreen/>:<BibleScreen initialReference={initialReference||'Luke 1'} initialTranslation={initialTranslation} onAccount={onAccount}/>}
  </View>;
}
const s=StyleSheet.create({modes:{flexDirection:'row',borderBottomWidth:1,borderColor:c.border,marginBottom:24},mode:{flex:1,minHeight:48,paddingHorizontal:8,paddingVertical:12,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',borderBottomWidth:3,borderBottomColor:'transparent'},active:{borderBottomColor:c.orange},text:{fontSize:15,lineHeight:22,fontWeight:'500',color:c.muted,flexShrink:1},activeText:{color:c.ink,fontWeight:'700'},pressed:{opacity:.65}});

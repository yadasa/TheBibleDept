import { GlassPressable as Pressable } from "./Glass";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Translation } from '../services/bible';
import { useThemedStyles, Colors, typography as t } from '../theme';
import { IconButton, Notice } from './ui';

const Context=createContext<{fontSize:number;setFontSize:(value:number)=>void;error:string}|null>(null);
export function ReadingTextProvider({children}:{children:ReactNode}) {
  const [fontSize,setSize]=useState(20),[error,setError]=useState('');
  const changed=useRef(false);
  useEffect(()=>{let active=true;AsyncStorage.getItem('bibledept.readingTextSize').then(value=>{const size=Number(value);if(active&&!changed.current&&size>=18&&size<=28&&size%2===0)setSize(size);}).catch(()=>{});return()=>{active=false;};},[]);
  function setFontSize(value:number){
    if(value<18||value>28)return;
    changed.current=true;setSize(value);setError('');
    AsyncStorage.setItem('bibledept.readingTextSize',String(value)).catch(()=>setError('Text size changed for this session, but could not be saved on this device.'));
  }
  return <Context.Provider value={{fontSize,setFontSize,error}}>{children}</Context.Provider>;
}
export function useReadingText(){const value=useContext(Context);if(!value)throw new Error('ReadingTextProvider is missing.');return value;}
export function ReaderControls({translation,onTranslation}:{translation:Translation;onTranslation:(value:Translation)=>void}) {
  const {c,s}=useThemedStyles(styles);
  const [expanded,setExpanded]=useState(false),{fontSize,setFontSize,error}=useReadingText();
  return <View style={s.container}>
    <View style={s.row}><Text style={s.label}>Translation</Text><View style={s.translations}>{(['web','kjv'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={value==='web'?'World English Bible':'King James Version'} aria-checked={translation===value} accessibilityState={{checked:translation===value}} onPress={()=>onTranslation(value)} style={({pressed})=>[s.option,translation===value&&s.selected,pressed&&s.pressed]}><Text style={[s.optionText,translation===value&&s.selectedText]}>{value.toUpperCase()}</Text></Pressable>)}</View><Pressable accessibilityRole="button" accessibilityLabel="Reading text size" accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={({pressed})=>[s.appearance,expanded&&s.selected,pressed&&s.pressed]}><Text style={s.aa}>Aa</Text></Pressable></View>
    {expanded&&<View style={s.sizeRow}><Text style={s.sizeLabel}>Text size · {fontSize}</Text><IconButton name="minus" label="Decrease reading text size" disabled={fontSize<=18} onPress={()=>setFontSize(fontSize-2)}/><IconButton name="plus" label="Increase reading text size" disabled={fontSize>=28} onPress={()=>setFontSize(fontSize+2)}/></View>}
    {!!error&&<Notice text={error} error/>}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({container:{marginTop:16,marginBottom:24,borderTopWidth:1,borderBottomWidth:1,borderColor:c.border,paddingVertical:8},row:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},label:{...t.meta,color:c.muted,marginRight:'auto'},translations:{flexDirection:'row',gap:4},option:{minHeight:44,minWidth:48,paddingHorizontal:10,paddingVertical:12,alignItems:'center',justifyContent:'center',borderRadius:4,borderWidth:1,borderColor:c.controlBorder},selected:{backgroundColor:c.tint,borderColor:c.action},optionText:{...t.label,color:c.muted},selectedText:{color:c.action,fontWeight:'800',textDecorationLine:'underline'},appearance:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:c.controlBorder,borderRadius:4},aa:{fontSize:18,color:c.ink,fontWeight:'600'},sizeRow:{flexDirection:'row',alignItems:'center',marginTop:8,borderTopWidth:1,borderColor:c.border,paddingTop:8},sizeLabel:{...t.meta,color:c.muted,flex:1},pressed:{opacity:.65}});

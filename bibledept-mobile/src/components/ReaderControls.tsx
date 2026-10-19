import { GlassPressable as Pressable } from "./Glass";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Translation } from '../services/bible';
import { useThemedStyles, Colors, typography as t } from '../theme';
import { IconButton, Notice } from './ui';
import { SelectField } from './SelectField';

const Context=createContext<{fontSize:number;setFontSize:(value:number)=>void;preferredTranslation:Translation;setPreferredTranslation:(value:Translation)=>void;error:string}|null>(null);
export function ReadingTextProvider({children}:{children:ReactNode}) {
  const [fontSize,setSize]=useState(20),[error,setError]=useState('');
  const [preferredTranslation,setVersion]=useState<Translation>('web');
  const changed=useRef(false),versionChanged=useRef(false);
  useEffect(()=>{let active=true;AsyncStorage.getItem('bibledept.readingTextSize').then(value=>{const size=Number(value);if(active&&!changed.current&&size>=18&&size<=28&&size%2===0)setSize(size);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{let active=true;AsyncStorage.getItem('bibledept.translation').then(value=>{if(active&&!versionChanged.current&&(value==='web'||value==='kjv'))setVersion(value);}).catch(()=>{});return()=>{active=false;};},[]);
  function setFontSize(value:number){
    if(value<18||value>28)return;
    changed.current=true;setSize(value);setError('');
    AsyncStorage.setItem('bibledept.readingTextSize',String(value)).catch(()=>setError('Your text size changed, but we couldn’t save it. Please try again.'));
  }
  function setPreferredTranslation(value:Translation){
    versionChanged.current=true;setVersion(value);setError('');
    AsyncStorage.setItem('bibledept.translation',value).catch(()=>setError('Your translation changed, but we couldn’t save it. Please try again.'));
  }
  return <Context.Provider value={{fontSize,setFontSize,preferredTranslation,setPreferredTranslation,error}}>{children}</Context.Provider>;
}
export function useReadingText(){const value=useContext(Context);if(!value)throw new Error('ReadingTextProvider is missing.');return value;}
export function ReaderControls({translation,onTranslation}:{translation:Translation;onTranslation:(value:Translation)=>void}) {
  const {c,s}=useThemedStyles(styles);
  const [expanded,setExpanded]=useState(false),{fontSize,setFontSize,setPreferredTranslation,error}=useReadingText();
  return <View style={s.container}>
    <View style={s.row}><View style={s.translations}><SelectField compact label="Translation" value={translation} options={[{value:'web',label:'WEB',detail:'World English Bible'},{value:'kjv',label:'KJV',detail:'King James Version'}]} onChange={value=>{setPreferredTranslation(value as Translation);onTranslation(value as Translation);}}/></View><Pressable accessibilityRole="button" accessibilityLabel="Reading text size" accessibilityState={{expanded}} onPress={()=>setExpanded(!expanded)} style={({pressed})=>[s.appearance,expanded&&s.selected,pressed&&s.pressed]}><Text style={s.aa}>Aa</Text></Pressable></View>
    {expanded&&<View style={s.sizeRow}><Text style={s.sizeLabel}>Text size · {fontSize}</Text><IconButton name="minus" label="Decrease reading text size" disabled={fontSize<=18} onPress={()=>setFontSize(fontSize-2)}/><IconButton name="plus" label="Increase reading text size" disabled={fontSize>=28} onPress={()=>setFontSize(fontSize+2)}/></View>}
    {!!error&&<Notice text={error} error/>}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({container:{marginTop:16,marginBottom:24},row:{flexDirection:'row',alignItems:'center',gap:8},translations:{flex:1,maxWidth:180},selected:{backgroundColor:c.tint},appearance:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:14},aa:{fontSize:18,color:c.ink,fontWeight:'600'},sizeRow:{flexDirection:'row',alignItems:'center',marginTop:8,paddingTop:8},sizeLabel:{...t.meta,color:c.muted,flex:1},pressed:{opacity:.65}});

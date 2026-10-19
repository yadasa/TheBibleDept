import { useEffect, useId, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PLAYBACK_RATES } from '../services/podcastAudio';
import { Colors, typography as t, useThemedStyles } from '../theme';
import { Icon } from './Icon';

/** Briefly opens speed choices without leaving another toolbar on the screen. */
export function PlaybackSpeedControl({day,rate,onRate}:{day:number;rate:number;onRate:(rate:number)=>void}) {
  const {c,s}=useThemedStyles(styles),{width,fontScale}=useWindowDimensions();
  const [open,setOpen]=useState(false),[focused,setFocused]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null),id=useId();
  function clearTimer(){if(timer.current)clearTimeout(timer.current);timer.current=null;}
  function close(){clearTimer();setOpen(false);}
  function keepOpen(){clearTimer();timer.current=setTimeout(()=>{timer.current=null;setOpen(false);},4000);}
  useEffect(()=>{if(open)keepOpen();return clearTimer;},[open]);
  useEffect(()=>{close();return clearTimer;},[day]);
  return <View style={s.position}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Playback speed, ${rate} times`} accessibilityHint="Choose a listening speed"
      accessibilityState={{expanded:open}} aria-expanded={open} aria-controls={open?id:undefined}
      onPress={()=>open?close():setOpen(true)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
      style={({pressed})=>[s.toggle,focused&&s.focused,pressed&&s.pressed]}>
      <Icon name="speed" size={22} color={c.ink}/><Text style={s.rate}>{rate}×</Text>
    </Pressable>
    {open&&<View nativeID={id} accessibilityRole="radiogroup" accessibilityLabel="Playback speed" onAccessibilityEscape={close}
      onTouchStart={keepOpen} style={[s.options,{width:Math.min(292,Math.max(220,width-80))}]}>
      {PLAYBACK_RATES.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} times speed`}
        aria-checked={rate===value} accessibilityState={{checked:rate===value}} onFocus={keepOpen}
        onPress={()=>{onRate(value);close();}} style={({pressed})=>[s.option,{flexBasis:fontScale>1.4?'46%':'21%'},rate===value&&s.selected,pressed&&s.pressed]}>
        <Text style={[s.optionText,rate===value&&s.selectedText]}>{value}×</Text>
      </Pressable>)}
    </View>}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  position:{position:'relative',zIndex:5},toggle:{minWidth:44,minHeight:52,alignItems:'center',justifyContent:'center',gap:2,borderRadius:12},
  rate:{...t.meta,fontSize:11,lineHeight:14,color:c.muted,fontVariant:['tabular-nums']},
  options:{position:'absolute',right:0,bottom:60,flexDirection:'row',flexWrap:'wrap',gap:8,padding:10,borderRadius:16,backgroundColor:c.surface,boxShadow:'0 8px 30px rgba(0,0,0,.24)',zIndex:6},
  option:{flexGrow:1,minHeight:44,minWidth:40,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderRadius:10},
  optionText:{...t.label,color:c.ink,fontVariant:['tabular-nums']},selected:{backgroundColor:c.orange},selectedText:{color:c.onOrange,fontWeight:'800'},
  focused:{outlineColor:c.action,outlineWidth:2,outlineOffset:2},pressed:{opacity:.65},
});

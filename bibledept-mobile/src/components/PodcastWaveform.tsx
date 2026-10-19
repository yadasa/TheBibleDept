import { useId, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { PlayerWaveform } from 'react-native-waveforms';
import type { RendererProps } from 'react-native-waveforms';
import { Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';
import { audioTime } from '../services/podcasts';
import { useTheme } from '../theme';

const BAR=3,GAP=2,HEIGHT=76;
export function PodcastWaveform({samples,liveLevel,position,duration,playing,canSeek,onSeek}:{
  samples:number[];liveLevel:number;position:number;duration:number;playing:boolean;canSeek:boolean;onSeek:(seconds:number)=>void;
}) {
  const {colors:c,mode}=useTheme(),[width,setWidth]=useState(0);
  const gradientId=`podcast${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const progress=duration>0?Math.min(1,Math.max(0,position/duration)):0;
  const amplitudes=useMemo(()=>{
    const current=Math.min(samples.length-1,Math.floor(progress*samples.length));
    // A perceptual scale keeps quiet speech readable without inventing peaks.
    return samples.map((amplitude,index)=>Math.max(.035,Math.sqrt(Math.max(0,Math.min(1,index===current&&playing?liveLevel:amplitude)))));
  },[samples,liveLevel,playing,progress]);
  const count=Math.max(1,Math.min(samples.length,Math.floor((width+GAP)/(BAR+GAP))));
  // Stretch bars to use the entire available width, keeping time and x aligned.
  const barWidth=Math.max(1,(width-(count-1)*GAP)/count);
  const fadeWidth=width>0?1.5*(barWidth+GAP)/width:0;
  const start=Math.max(0,progress-fadeWidth);
  // A user-space gradient spans the whole timeline. The library's default
  // object-bounds gradient repeats inside each bar instead.
  function renderBars({samples:bars,width:w,height:h,color}:RendererProps) {
    const pitch=(w+GAP)/bars.length,bw=Math.max(1,pitch-GAP),filled=color===c.orange;
    return <G>
      {filled&&<Defs><LinearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={0} x2={w} y1={0} y2={0}>
        <Stop offset={0} stopColor={c.orange}/><Stop offset={start} stopColor={c.orange}/>
        <Stop offset={Math.max(start,progress-fadeWidth*.45)} stopColor="#FFAA54"/>
        <Stop offset={progress} stopColor={mode==='dark'?'#FFF3C4':'#A23500'}/>
        <Stop offset={1} stopColor={mode==='dark'?'#FFF3C4':'#A23500'}/>
      </LinearGradient></Defs>}
      {bars.map((amplitude,index)=><Rect key={index} x={index*pitch} y={(h-amplitude*h)/2} width={bw} height={amplitude*h} rx={bw/2} fill={filled?`url(#${gradientId})`:color}/>)}
    </G>;
  }
  const keyProps=Platform.OS==='web'?{onKeyDownCapture:(event:{key:string;preventDefault:()=>void})=>{
    const seconds=event.key==='Home'?0:event.key==='End'?duration:event.key==='ArrowRight'||event.key==='ArrowUp'?position+15:event.key==='ArrowLeft'||event.key==='ArrowDown'?position-15:undefined;
    if(seconds!==undefined&&canSeek){event.preventDefault();onSeek(seconds);}
  }}:{};
  return <View {...keyProps} testID="podcast-waveform" accessible focusable={canSeek} tabIndex={canSeek?0:-1} accessibilityRole="adjustable" accessibilityLabel="Episode playback position"
    aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(position)} aria-valuetext={`${audioTime(position)} of ${audioTime(duration)}`}
    aria-disabled={!canSeek} accessibilityState={{disabled:!canSeek}} accessibilityValue={{min:0,max:Math.round(duration),now:Math.round(position),text:`${audioTime(position)} of ${audioTime(duration)}`}}
    accessibilityActions={[{name:'increment',label:'Forward 15 seconds'},{name:'decrement',label:'Back 15 seconds'}]}
    onAccessibilityAction={event=>{if(canSeek)onSeek(position+(event.nativeEvent.actionName==='increment'?15:-15));}}
    onLayout={event=>setWidth(Math.max(0,event.nativeEvent.layout.width))} style={s.wave}>
    {width>0&&<PlayerWaveform samples={amplitudes} inputRange={[0,1]} width={width} height={HEIGHT} renderer={renderBars} barWidth={BAR} gap={GAP} rounded baseline="center"
      color={mode==='dark'?'#653014':'#E9BA9C'} progressColor={c.orange}
      // The stream's clock controls progress, including seeks and speed changes.
      // The library's free-running 1x timer would drift at 1.25x / 1.5x / 2x.
      progress={progress} isPlaying={false} animationDuration={120} onSeek={canSeek?p=>onSeek(p*duration):undefined}/>}
  </View>;
}
const s=StyleSheet.create({wave:{height:HEIGHT,marginTop:20,marginBottom:8,justifyContent:'center'}});

import { createContext, memo, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { PlayerWaveform } from 'react-native-waveforms';
import type { RendererProps } from 'react-native-waveforms';
import Animated, { Easing, SharedValue, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { ClipPath, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';
import { audioTime } from '../services/podcasts';
import { desaturatedPodcastColor, normalizePodcastAmplitude, podcastFutureOpacity, podcastWaveformSplit, previousPodcastBarHeight, renderedPodcastAmplitude } from '../services/podcastWaveform';
import { useTheme } from '../theme';
import { BRAND_ORANGE, ORANGE_TONES } from '../themeColors';

const BAR=3,GAP=2,HEIGHT=76,INPUT_RANGE:[number,number]=[0,1];
const AnimatedRect=Animated.createAnimatedComponent(Rect);
const AnimatedGradient=Animated.createAnimatedComponent(LinearGradient);
const FUTURE_COLOR=desaturatedPodcastColor(BRAND_ORANGE);
type RenderConfig={id:string;orange:string;outline:string;futureOpacity:number;liveLevel:number;referencePeak:number;playing:boolean;progress:number;clock:SharedValue<number>;contact:SharedValue<number>};
const RenderContext=createContext<RenderConfig|null>(null);

const PodcastBar=memo(function PodcastBar({x,width,height,level,fill}:{x:number;width:number;height:number;level:number;fill:string}) {
  const easedLevel=useSharedValue(level);
  useEffect(()=>{easedLevel.value=withTiming(level,{duration:150,easing:Easing.out(Easing.cubic)});},[level,easedLevel]);
  const shape=useAnimatedProps(()=>({y:(height-easedLevel.value*height)/2,height:easedLevel.value*height}));
  return <AnimatedRect x={x} width={width} rx={width/2} fill={fill} animatedProps={shape}/>;
});

const PodcastAnchor=memo(function PodcastAnchor({levels,width,height,clock,contact,outline}:{
  levels:readonly number[];width:number;height:number;clock:SharedValue<number>;contact:SharedValue<number>;outline:string;
}) {
  const anchorHeight=useSharedValue(0);
  useAnimatedReaction(()=>previousPodcastBarHeight(levels,clock.value,height),(next,previous)=>{
    if(next!==previous)anchorHeight.value=withTiming(next,{duration:180,easing:Easing.out(Easing.cubic)});
  },[levels,height,clock]);
  const edge=useAnimatedProps(()=>({
    x:Math.max(0,clock.value*width-2.5),width:Math.min(2.5,Math.max(0,clock.value*width)),
    y:(height-anchorHeight.value)/2,height:anchorHeight.value,opacity:clock.value>0?.75+.25*contact.value:0,
  }));
  const guide=useAnimatedProps(()=>({x:Math.max(0,clock.value*width-1),width:Math.min(1,Math.max(0,clock.value*width)),opacity:clock.value>0?.18+.1*contact.value:0}));
  return <G>
    <AnimatedRect y={0} height={height} fill="#FFF3C4" animatedProps={guide}/>
    <AnimatedRect fill="#FFF3C4" stroke={outline} strokeWidth={outline==='none'?0:.5} animatedProps={edge}/>
  </G>;
});

// Stable component types retain native SVG nodes across PCM updates.
const PodcastBars=memo(function PodcastBars({samples:bars,width,height,color}:RendererProps) {
  const config=useContext(RenderContext)!;
  const clock=config.clock;
  const pitch=(width+GAP)/Math.max(1,bars.length),barWidth=Math.max(1,pitch-GAP),filled=color===config.orange;
  const levels=useMemo(()=>{
    const recentRestAverage=previousPodcastBarHeight(bars,config.progress,1,.67,.035);
    return bars.map((amplitude,index)=>renderedPodcastAmplitude(amplitude,config.liveLevel,config.playing,index,bars.length,config.progress,config.referencePeak,recentRestAverage));
  },
    [bars,config.liveLevel,config.playing,config.progress,config.referencePeak]);
  const clip=useAnimatedProps(()=>({width:podcastWaveformSplit(clock.value,width).playedWidth}));
  const futureClip=useAnimatedProps(()=>{
    const split=podcastWaveformSplit(clock.value,width);
    return {x:split.futureX,width:split.futureWidth};
  });
  const gradient=useAnimatedProps(()=>({x1:Math.max(0,clock.value*width-4.5*pitch),x2:Math.max(.001,clock.value*width)}));
  return <G>
    <Defs>
      <ClipPath id={`${config.id}${filled?'clip':'future'}`}><AnimatedRect x={0} y={0} height={height} animatedProps={filled?clip:futureClip}/></ClipPath>
      {filled&&<AnimatedGradient id={config.id} gradientUnits="userSpaceOnUse" y1={0} y2={0} animatedProps={gradient}>
        <Stop offset={0} stopColor={config.orange}/><Stop offset={.55} stopColor={ORANGE_TONES.light}/><Stop offset={1} stopColor="#FFF3C4"/>
      </AnimatedGradient>}
    </Defs>
    <G clipPath={`url(#${config.id}${filled?'clip':'future'})`} opacity={filled?1:config.futureOpacity}>
      {levels.map((level,index)=><PodcastBar key={index} x={index*pitch} width={barWidth} height={height} level={level}
        fill={filled?`url(#${config.id})`:color}/>)}
    </G>
    {filled&&<PodcastAnchor levels={levels} width={width} height={height} clock={clock} contact={config.contact} outline={config.outline}/>}
  </G>;
});

// PlayerWaveform checks typeof renderer === 'function'; memo() itself is an
// object at runtime, so keep a plain stable adapter at the library boundary.
function renderPodcastBars(props:RendererProps) { return <PodcastBars {...props}/>; }

export function PodcastWaveform({samples,referencePeak,liveLevel,position,duration,playing,canSeek,onSeek}:{
  samples:readonly number[];referencePeak:number;liveLevel:number;position:number;duration:number;playing:boolean;canSeek:boolean;onSeek:(seconds:number)=>void;
}) {
  const {colors:c,mode}=useTheme(),[width,setWidth]=useState(0);
  const [preview,setPreview]=useState<number|null>(null),[scrubbing,setScrubbing]=useState(false),[touching,setTouching]=useState(false);
  const frame=useRef<View>(null),left=useRef(0),dragging=useRef(false),didDrag=useRef(false),previewRef=useRef<number|null>(null),gestureVersion=useRef(0);
  const latest=useRef({duration,canSeek,onSeek,width});latest.current={duration,canSeek,onSeek,width};
  const gradientId=`podcast${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  const nativeProgress=duration>0?Math.min(1,Math.max(0,position/duration)):0,progress=preview??nativeProgress;
  const clock=useSharedValue(progress),contact=useSharedValue(0);
  useEffect(()=>{clock.value=withTiming(progress,{duration:scrubbing?70:160,easing:Easing.out(Easing.cubic)});},[progress,scrubbing,clock]);
  useEffect(()=>{contact.value=withTiming(touching||scrubbing?1:0,{duration:touching||scrubbing?140:220,easing:Easing.out(Easing.cubic)});},[touching,scrubbing,contact]);
  const amplitudes=useMemo(()=>samples.map(value=>Math.max(.035,normalizePodcastAmplitude(value,referencePeak))),[samples,referencePeak]);
  // Previewing a seek moves the cursor, while live PCM still belongs to the
  // native audio position until the release actually seeks the transport.
  const outline=mode==='light'?c.action:'none';
  const futureOpacity=podcastFutureOpacity(mode==='dark'?.42:.36);
  const config=useMemo<RenderConfig>(()=>({id:gradientId,orange:c.orange,outline,futureOpacity,liveLevel,referencePeak,playing,progress:nativeProgress,clock,contact}),[gradientId,c.orange,outline,futureOpacity,liveLevel,referencePeak,playing,nativeProgress,clock,contact]);

  function previewAt(pageX:number) {
    const value=Math.max(0,Math.min(1,(pageX-left.current)/Math.max(1,latest.current.width)));
    previewRef.current=value;setPreview(value);
  }
  function measureAndPreview(pageX:number,version:number,commit:boolean) {
    frame.current?.measureInWindow(origin=>{
      if(version!==gestureVersion.current||!latest.current.canSeek)return;
      left.current=origin;previewAt(pageX);
      if(commit)latest.current.onSeek(previewRef.current!*latest.current.duration);
    });
  }
  const gesture=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_event,state)=>latest.current.canSeek&&Math.abs(state.dx)>4&&Math.abs(state.dx)>Math.abs(state.dy),
    onPanResponderGrant:(_event,state)=>{
      dragging.current=true;didDrag.current=true;setScrubbing(true);setTouching(true);
      measureAndPreview(state.moveX,++gestureVersion.current,false);
    },
    onPanResponderMove:(_event,state)=>{if(dragging.current)previewAt(state.moveX);},
    onPanResponderRelease:()=>{
      dragging.current=false;gestureVersion.current++;
      if(previewRef.current!==null)latest.current.onSeek(previewRef.current*latest.current.duration);
      setScrubbing(false);setTouching(false);
    },
    onPanResponderTerminate:()=>{
      dragging.current=false;gestureVersion.current++;setScrubbing(false);setTouching(false);previewRef.current=null;setPreview(null);
    },
    onPanResponderTerminationRequest:()=>false,
  }),[]);
  useEffect(()=>{
    if(preview===null||scrubbing)return;
    if(Math.abs(position-preview*duration)<1){setPreview(null);previewRef.current=null;return;}
  },[preview,scrubbing,position,duration]);
  useEffect(()=>{
    if(preview===null||scrubbing)return;
    const timeout=setTimeout(()=>{setPreview(null);previewRef.current=null;},2000);
    return()=>clearTimeout(timeout);
  },[preview,scrubbing]);
  useEffect(()=>{
    if(canSeek)return;
    dragging.current=false;gestureVersion.current++;setScrubbing(false);setTouching(false);previewRef.current=null;setPreview(null);
  },[canSeek]);
  function seek(seconds:number) {
    if(!canSeek)return;
    const target=Math.max(0,Math.min(duration,seconds));
    previewRef.current=duration>0?target/duration:0;setPreview(previewRef.current);onSeek(target);
  }
  const keyProps=Platform.OS==='web'?{onKeyDownCapture:(event:{key:string;preventDefault:()=>void})=>{
    const seconds=event.key==='Home'?0:event.key==='End'?duration:event.key==='ArrowRight'||event.key==='ArrowUp'?position+15:event.key==='ArrowLeft'||event.key==='ArrowDown'?position-15:undefined;
    if(seconds!==undefined&&canSeek){event.preventDefault();seek(seconds);}
  }}:{};
  return <View ref={frame} {...gesture.panHandlers} {...keyProps} testID="podcast-waveform" accessible focusable={canSeek} tabIndex={canSeek?0:-1}
    accessibilityRole="adjustable" accessibilityLabel="Episode playback position"
    aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(position)} aria-valuetext={`${audioTime(position)} of ${audioTime(duration)}`}
    aria-disabled={!canSeek} accessibilityState={{disabled:!canSeek}} accessibilityValue={{min:0,max:Math.round(duration),now:Math.round(position),text:`${audioTime(position)} of ${audioTime(duration)}`}}
    accessibilityActions={[{name:'increment',label:'Forward 15 seconds'},{name:'decrement',label:'Back 15 seconds'}]}
    onAccessibilityAction={event=>seek(position+(event.nativeEvent.actionName==='increment'?15:-15))}
    onLayout={event=>{setWidth(Math.max(0,event.nativeEvent.layout.width));frame.current?.measureInWindow(origin=>{left.current=origin;});}} style={s.wave}>
    <Pressable accessible={false} focusable={false} tabIndex={-1} disabled={!canSeek} onPressIn={()=>{didDrag.current=false;setTouching(true);}}
      onPressOut={()=>{if(!dragging.current)setTouching(false);}}
      onPress={event=>{if(!didDrag.current)measureAndPreview(event.nativeEvent.pageX,++gestureVersion.current,true);}}>
      <RenderContext.Provider value={config}>{width>0&&<PlayerWaveform samples={amplitudes} inputRange={INPUT_RANGE} width={width} height={HEIGHT}
        renderer={renderPodcastBars} barWidth={BAR} gap={GAP} rounded baseline="center" color={FUTURE_COLOR} progressColor={c.orange}
        // The stable renderer owns the eased clip; no 1x timer or responder
        // competes with the native playback clock or the page's vertical scroll.
        progress={1} isPlaying={false} animationDuration={0}/>}</RenderContext.Provider>
    </Pressable>
  </View>;
}
const s=StyleSheet.create({wave:{height:HEIGHT,marginTop:20,marginBottom:8,justifyContent:'center'}});

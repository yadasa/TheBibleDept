import { createContext, memo, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { PlayerWaveform } from 'react-native-waveforms';
import type { RendererProps } from 'react-native-waveforms';
import Animated, { Easing, SharedValue, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';
import { audioTime } from '../services/podcasts';
import { renderedPodcastAmplitude } from '../services/podcastWaveform';
import { useTheme } from '../theme';

const BAR=3,GAP=2,HEIGHT=76,INPUT_RANGE:[number,number]=[0,1];
const AnimatedRect=Animated.createAnimatedComponent(Rect);
const AnimatedGradient=Animated.createAnimatedComponent(LinearGradient);
type RenderConfig={id:string;orange:string;liveLevel:number;playing:boolean;progress:number;clock:SharedValue<number>};
const RenderContext=createContext<RenderConfig|null>(null);

const PodcastBar=memo(function PodcastBar({x,width,height,level,fill}:{x:number;width:number;height:number;level:number;fill:string}) {
  const easedLevel=useSharedValue(level);
  useEffect(()=>{easedLevel.value=withTiming(level,{duration:150,easing:Easing.out(Easing.cubic)});},[level,easedLevel]);
  const shape=useAnimatedProps(()=>({y:(height-easedLevel.value*height)/2,height:easedLevel.value*height}));
  return <AnimatedRect x={x} width={width} rx={width/2} fill={fill} animatedProps={shape}/>;
});

// Stable component types retain native SVG nodes across PCM updates.
const PodcastBars=memo(function PodcastBars({samples:bars,width,height,color}:RendererProps) {
  const config=useContext(RenderContext)!;
  const clock=config.clock;
  const pitch=(width+GAP)/Math.max(1,bars.length),barWidth=Math.max(1,pitch-GAP),filled=color===config.orange;
  const clip=useAnimatedProps(()=>({width:Math.max(0,Math.min(width,clock.value*width))}));
  const gradient=useAnimatedProps(()=>({x1:Math.max(0,clock.value*width-1.5*pitch),x2:Math.max(.001,clock.value*width)}));
  return <G>
    {filled&&<Defs>
      <ClipPath id={`${config.id}clip`}><AnimatedRect x={0} y={0} height={height} animatedProps={clip}/></ClipPath>
      <AnimatedGradient id={config.id} gradientUnits="userSpaceOnUse" y1={0} y2={0} animatedProps={gradient}>
        <Stop offset={0} stopColor={config.orange}/><Stop offset={.55} stopColor="#FFAA54"/><Stop offset={1} stopColor="#FFF3C4"/>
      </AnimatedGradient>
    </Defs>}
    <G clipPath={filled?`url(#${config.id}clip)`:undefined}>
      {bars.map((amplitude,index)=><PodcastBar key={index} x={index*pitch} width={barWidth} height={height}
        level={renderedPodcastAmplitude(amplitude,config.liveLevel,config.playing,index,bars.length,config.progress)}
        fill={filled?`url(#${config.id})`:color}/>)}
    </G>
  </G>;
});

// PlayerWaveform checks typeof renderer === 'function'; memo() itself is an
// object at runtime, so keep a plain stable adapter at the library boundary.
function renderPodcastBars(props:RendererProps) { return <PodcastBars {...props}/>; }

export function PodcastWaveform({samples,liveLevel,position,duration,playing,canSeek,onSeek}:{
  samples:readonly number[];liveLevel:number;position:number;duration:number;playing:boolean;canSeek:boolean;onSeek:(seconds:number)=>void;
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
  const amplitudes=useMemo(()=>samples.map(value=>Math.max(.035,Math.sqrt(Math.max(0,Math.min(1,value))))),[samples]);
  // Previewing a seek moves the cursor, while live PCM still belongs to the
  // native audio position until the release actually seeks the transport.
  const config=useMemo<RenderConfig>(()=>({id:gradientId,orange:c.orange,liveLevel,playing,progress:nativeProgress,clock}),[gradientId,c.orange,liveLevel,playing,nativeProgress,clock]);
  const count=Math.max(1,Math.min(samples.length,Math.floor((width+GAP)/(BAR+GAP))));
  const pitch=(width+GAP)/count;
  const cursor=useAnimatedProps(()=>{
    const tip=Math.max(0,Math.min(width,clock.value*width)),trail=Math.min(tip,1.5*pitch);
    return {x:tip-trail,width:trail,opacity:tip>0?.65+.35*contact.value:0};
  });
  const edge=useAnimatedProps(()=>({x:Math.max(0,clock.value*width-2.5),width:Math.min(2.5,Math.max(0,clock.value*width)),opacity:clock.value>0?.75+.25*contact.value:0}));

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
        renderer={renderPodcastBars} barWidth={BAR} gap={GAP} rounded baseline="center" color={mode==='dark'?'#653014':'#E9BA9C'} progressColor={c.orange}
        // The stable renderer owns the eased clip; no 1x timer or responder
        // competes with the native playback clock or the page's vertical scroll.
        progress={1} isPlaying={false} animationDuration={0}/>}</RenderContext.Provider>
    </Pressable>
    {width>0&&<Svg pointerEvents="none" aria-hidden width={width} height={HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs><LinearGradient id={`${gradientId}cursor`} x1="0%" x2="100%" y1="0%" y2="0%">
        <Stop offset={0} stopColor="#FFD080" stopOpacity={0}/><Stop offset={.65} stopColor="#FFD080" stopOpacity={.15}/><Stop offset={1} stopColor="#FFF3C4" stopOpacity={.9}/>
      </LinearGradient></Defs>
      <AnimatedRect y={5} height={HEIGHT-10} fill={`url(#${gradientId}cursor)`} animatedProps={cursor}/>
      <AnimatedRect y={5} height={HEIGHT-10} fill="#FFF3C4" stroke={mode==='light'?c.action:'none'} strokeWidth={mode==='light'?.5:0} animatedProps={edge}/>
    </Svg>}
  </View>;
}
const s=StyleSheet.create({wave:{height:HEIGHT,marginTop:20,marginBottom:8,justifyContent:'center'}});

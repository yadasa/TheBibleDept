import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PodcastState, usePodcast } from '../state/PodcastProvider';
import { audioTime } from '../services/podcasts';
import { Colors, typography as t, useTheme, useThemedStyles } from '../theme';
import { GlassPressable } from './Glass';
import { Icon } from './Icon';
import { MiniPodcastWaveform } from './MiniPodcastWaveform';
import { getPodcastReferenceSamples } from '../services/podcastReferenceWaveforms';
import { createMiniPlayerTransition } from '../services/miniPlayerTransition';
import { useReducedMotion } from './LiquidBottomNav';

const WEB=Platform.OS==='web';
const AnimatedBlurView=Animated.createAnimatedComponent(BlurView);
type MiniSnapshot=Pick<PodcastState,'episode'|'position'|'duration'|'playbackRate'|'loading'|'error'|'status'|'samples'>;

export function PodcastNowPlaying({onOpen}:{onOpen:(day:number)=>void}) {
  const audio=usePodcast(),{c,s}=useThemedStyles(styles);
  const {mode}=useTheme(),visible=!!audio.episode,reduced=useReducedMotion();
  const retained=useRef<MiniSnapshot|null>(null),blurTarget=useRef<View>(null);
  if(audio.episode)retained.current={episode:audio.episode,position:audio.position,duration:audio.duration,playbackRate:audio.playbackRate,loading:audio.loading,error:audio.error,status:audio.status,samples:audio.samples};
  const shown=audio.episode?audio:retained.current;
  const [mounted,setMounted]=useState(visible),[transitioning,setTransitioning]=useState(false),[transition]=useState(createMiniPlayerTransition);
  const presence=useSharedValue(0);
  const details=useRef<View>(null), left=useRef(0),dragGeneration=useRef(0),dragActive=useRef(false),didDrag=useRef(false);
  const [size,setSize]=useState({width:0,height:56}),[scrubbing,setScrubbing]=useState(false),[touching,setTouching]=useState(false),[preview,setPreview]=useState<number|null>(null);
  const latest=useRef(audio),previewRef=useRef<number|null>(null);latest.current=audio;
  const progress=preview??(shown&&shown.duration>0?shown.position/shown.duration:0);
  const finishTransition=useCallback((token:number)=>{
    const result=transition.complete(token);
    if(!result||(result==='hidden'&&latest.current.episode))return;
    setTransitioning(false);
    if(result==='hidden'){retained.current=null;setMounted(false);}
  },[transition]);
  useEffect(()=>{
    if(!visible&&!retained.current)return;
    const token=transition.begin(visible);
    if(visible)setMounted(true);
    if(reduced){cancelAnimation(presence);presence.value=visible?1:0;finishTransition(token);return;}
    setTransitioning(true);
    presence.value=withTiming(visible?1:0,{duration:visible?260:220,easing:visible?Easing.out(Easing.cubic):Easing.in(Easing.cubic)},finished=>{
      if(finished)runOnJS(finishTransition)(token);
    });
  },[visible,reduced,presence,transition,finishTransition]);
  useEffect(()=>()=>{transition.cancel();cancelAnimation(presence);},[transition,presence]);
  const motion=useAnimatedStyle(()=>({opacity:reduced?(visible?1:0):presence.value,...(WEB?{filter:reduced?'none':`blur(${(1-presence.value)*6}px)`}:{})}));
  const transitionBlur=useAnimatedProps(()=>({intensity:reduced?0:(1-presence.value)*32}));
  function previewAt(x:number) {
    const value=Math.max(0,Math.min(1,(x-left.current)/Math.max(1,size.width)));
    previewRef.current=value;setPreview(value);
  }
  const gesture=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_event,state)=>latest.current.status.isLoaded&&!latest.current.error&&Math.abs(state.dx)>4&&Math.abs(state.dx)>Math.abs(state.dy),
    onPanResponderGrant:(_event,state)=>{
      const x=state.moveX, generation=++dragGeneration.current;
      dragActive.current=true;didDrag.current=true;
      setScrubbing(true);setTouching(true);
      details.current?.measureInWindow(origin=>{if(dragActive.current&&generation===dragGeneration.current){left.current=origin;previewAt(x);}});
    },
    onPanResponderMove:(_event,state)=>previewAt(state.moveX),
    onPanResponderRelease:()=>{
      dragActive.current=false;dragGeneration.current++;
      const value=previewRef.current;
      if(value!==null)latest.current.seek(value*latest.current.duration);
      setScrubbing(false);setTouching(false);
    },
    onPanResponderTerminate:()=>{dragActive.current=false;dragGeneration.current++;setScrubbing(false);setTouching(false);previewRef.current=null;setPreview(null);},
    onPanResponderTerminationRequest:()=>false,
  }),[size.width]);
  useEffect(()=>{
    if(preview===null||scrubbing)return;
    if(Math.abs(audio.position-preview*audio.duration)<1){setPreview(null);previewRef.current=null;return;}
  },[preview,scrubbing,audio.position,audio.duration]);
  useEffect(()=>{
    if(preview===null||scrubbing)return;
    const timer=setTimeout(()=>{setPreview(null);previewRef.current=null;},2000);
    return()=>clearTimeout(timer);
  },[preview,scrubbing]);
  useEffect(()=>{dragActive.current=false;dragGeneration.current++;setPreview(null);previewRef.current=null;setScrubbing(false);setTouching(false);},[audio.episode?.day]);
  if((!visible&&!mounted)||!shown?.episode)return null;
  return <View pointerEvents={visible?'box-none':'none'} accessibilityElementsHidden={!visible} importantForAccessibility={visible?'auto':'no-hide-descendants'} aria-hidden={!visible} style={s.position}>
    <Animated.View style={[s.transition,motion]}>
    <BlurTargetView ref={blurTarget} style={s.player}>
      <View ref={details} {...gesture.panHandlers} style={s.detailsFrame} onLayout={event=>{setSize(event.nativeEvent.layout);details.current?.measureInWindow(origin=>{left.current=origin;});}}>
        <GlassPressable accessibilityRole="button" accessibilityLabel={`Open podcast for day ${shown.episode.day}`} accessibilityHint="Drag horizontally to change playback position. Additional actions skip 15 seconds."
          accessibilityActions={[{name:'increment',label:'Forward 15 seconds'},{name:'decrement',label:'Back 15 seconds'}]}
          onAccessibilityAction={event=>audio.seek(audio.position+(event.nativeEvent.actionName==='increment'?15:-15))}
          onPressIn={()=>{didDrag.current=false;setTouching(true);}} onPressOut={()=>{if(!dragActive.current)setTouching(false);}}
          onPress={()=>{if(!didDrag.current)onOpen(shown.episode!.day);}} style={s.details}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}><MiniPodcastWaveform samples={getPodcastReferenceSamples(shown.episode.day)??shown.samples} width={size.width} height={size.height} progress={progress} scrubbing={scrubbing} touching={touching}/></View>
          <View pointerEvents="none" style={s.text}><Text numberOfLines={1} style={s.title}>Day {shown.episode.day} · {shown.episode.reading}</Text><Text style={s.meta}>{shown.error?'Couldn’t play episode':shown.loading?'Loading episode…':`${audioTime(progress*shown.duration)} / ${audioTime(shown.duration)} · ${shown.playbackRate}×`}</Text></View>
        </GlassPressable>
      </View>
      <GlassPressable tone="primary" accessibilityRole="button" accessibilityLabel={shown.status.playing?'Pause podcast':'Play podcast'} onPress={audio.toggle} style={s.button}><View style={s.glyph}><Icon name={shown.status.playing?'pause':'play'} size={20} color={c.onAction}/></View></GlassPressable>
      <GlassPressable accessibilityRole="button" accessibilityLabel="Close podcast player" onPress={audio.dismiss} style={s.button}><View style={s.glyph}><Icon name="close" size={18}/></View></GlassPressable>
    </BlurTargetView>
    {!WEB&&!reduced&&transitioning&&<View pointerEvents="none" accessible={false} style={s.transitionBlur}>
      <AnimatedBlurView blurTarget={blurTarget} tint={mode==='dark'?'systemUltraThinMaterialDark':'systemUltraThinMaterialLight'} blurMethod="dimezisBlurViewSdk31Plus" intensity={0} animatedProps={transitionBlur} style={StyleSheet.absoluteFill}/>
    </View>}
    </Animated.View>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  position:{position:'absolute',bottom:110,left:12,right:12,alignItems:'center',zIndex:90},
  transition:{width:'100%',maxWidth:680},transitionBlur:{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:18,overflow:'hidden'},
  player:{width:'100%',maxWidth:680,flexDirection:'row',gap:6,alignItems:'center',padding:6,borderRadius:18,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,boxShadow:'0 6px 24px rgba(0,0,0,.18)'},
  detailsFrame:{flex:1,minWidth:0},details:{minHeight:56,paddingHorizontal:10,flexDirection:'row',alignItems:'center'},
  text:{flex:1,minWidth:0,position:'relative',zIndex:1},title:{...t.label,color:c.ink,textShadowColor:c.background,textShadowRadius:3,textShadowOffset:{width:0,height:0}},meta:{...t.meta,color:c.muted,marginTop:3,fontVariant:['tabular-nums'],textShadowColor:c.background,textShadowRadius:3,textShadowOffset:{width:0,height:0}},button:{minHeight:48,minWidth:44,alignItems:'center',justifyContent:'center',borderRadius:12},glyph:{position:'relative',zIndex:1},
});

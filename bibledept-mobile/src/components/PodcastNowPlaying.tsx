import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { usePodcast } from '../state/PodcastProvider';
import { audioTime } from '../services/podcasts';
import { Colors, typography as t, useThemedStyles } from '../theme';
import { GlassPressable } from './Glass';
import { Icon } from './Icon';
import { MiniPodcastWaveform } from './MiniPodcastWaveform';
import { getPodcastReferenceSamples } from '../services/podcastReferenceWaveforms';

export function PodcastNowPlaying({onOpen}:{onOpen:(day:number)=>void}) {
  const audio=usePodcast(),{c,s}=useThemedStyles(styles);
  const details=useRef<View>(null), left=useRef(0),dragGeneration=useRef(0),dragActive=useRef(false);
  const [size,setSize]=useState({width:0,height:56}),[scrubbing,setScrubbing]=useState(false),[preview,setPreview]=useState<number|null>(null);
  const latest=useRef(audio),previewRef=useRef<number|null>(null);latest.current=audio;
  const progress=preview??(audio.duration>0?audio.position/audio.duration:0);
  function previewAt(x:number) {
    const value=Math.max(0,Math.min(1,(x-left.current)/Math.max(1,size.width)));
    previewRef.current=value;setPreview(value);
  }
  const gesture=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_event,state)=>latest.current.status.isLoaded&&!latest.current.error&&Math.abs(state.dx)>4&&Math.abs(state.dx)>Math.abs(state.dy),
    onPanResponderGrant:(_event,state)=>{
      const x=state.moveX, generation=++dragGeneration.current;
      dragActive.current=true;
      setScrubbing(true);
      details.current?.measureInWindow(origin=>{if(dragActive.current&&generation===dragGeneration.current){left.current=origin;previewAt(x);}});
    },
    onPanResponderMove:(_event,state)=>previewAt(state.moveX),
    onPanResponderRelease:()=>{
      dragActive.current=false;dragGeneration.current++;
      const value=previewRef.current;
      if(value!==null)latest.current.seek(value*latest.current.duration);
      setScrubbing(false);
    },
    onPanResponderTerminate:()=>{dragActive.current=false;dragGeneration.current++;setScrubbing(false);previewRef.current=null;setPreview(null);},
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
  useEffect(()=>{dragActive.current=false;dragGeneration.current++;setPreview(null);previewRef.current=null;setScrubbing(false);},[audio.episode?.day]);
  if(!audio.episode)return null;
  return <View pointerEvents="box-none" style={s.position}>
    <View style={s.player}>
      <View ref={details} {...gesture.panHandlers} style={s.detailsFrame} onLayout={event=>{setSize(event.nativeEvent.layout);details.current?.measureInWindow(origin=>{left.current=origin;});}}>
        <GlassPressable accessibilityRole="button" accessibilityLabel={`Open podcast for day ${audio.episode.day}`} accessibilityHint="Drag horizontally to change playback position. Additional actions skip 15 seconds."
          accessibilityActions={[{name:'increment',label:'Forward 15 seconds'},{name:'decrement',label:'Back 15 seconds'}]}
          onAccessibilityAction={event=>audio.seek(audio.position+(event.nativeEvent.actionName==='increment'?15:-15))}
          onPress={()=>{if(!scrubbing)onOpen(audio.episode!.day);}} style={s.details}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}><MiniPodcastWaveform samples={getPodcastReferenceSamples(audio.episode.day)??audio.samples} width={size.width} height={size.height} progress={progress} scrubbing={scrubbing}/></View>
          <View pointerEvents="none" style={s.text}><Text numberOfLines={1} style={s.title}>Day {audio.episode.day} · {audio.episode.reading}</Text><Text style={s.meta}>{audio.error?'Couldn’t play episode':audio.loading?'Loading episode…':`${audioTime(progress*audio.duration)} / ${audioTime(audio.duration)} · ${audio.playbackRate}×`}</Text></View>
        </GlassPressable>
      </View>
      <GlassPressable tone="primary" accessibilityRole="button" accessibilityLabel={audio.status.playing?'Pause podcast':'Play podcast'} onPress={audio.toggle} style={s.button}><View style={s.glyph}><Icon name={audio.status.playing?'pause':'play'} size={20} color={c.onAction}/></View></GlassPressable>
      <GlassPressable accessibilityRole="button" accessibilityLabel="Close podcast player" onPress={audio.dismiss} style={s.button}><View style={s.glyph}><Icon name="close" size={18}/></View></GlassPressable>
    </View>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  position:{position:'absolute',bottom:110,left:12,right:12,alignItems:'center',zIndex:90},
  player:{width:'100%',maxWidth:680,flexDirection:'row',gap:6,alignItems:'center',padding:6,borderRadius:18,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,boxShadow:'0 6px 24px rgba(0,0,0,.18)'},
  detailsFrame:{flex:1,minWidth:0},details:{minHeight:56,paddingHorizontal:10,flexDirection:'row',alignItems:'center'},
  text:{flex:1,minWidth:0,position:'relative',zIndex:1},title:{...t.label,color:c.ink,textShadowColor:c.background,textShadowRadius:3,textShadowOffset:{width:0,height:0}},meta:{...t.meta,color:c.muted,marginTop:3,fontVariant:['tabular-nums'],textShadowColor:c.background,textShadowRadius:3,textShadowOffset:{width:0,height:0}},button:{minHeight:48,minWidth:44,alignItems:'center',justifyContent:'center',borderRadius:12},glyph:{position:'relative',zIndex:1},
});

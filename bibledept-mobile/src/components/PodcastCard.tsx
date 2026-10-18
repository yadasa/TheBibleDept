import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { audioTime, getDayPodcast, PODCAST_LINKS } from '../services/podcasts';
import { theme as c } from '../theme';
import { ActionButton, Notice } from './ui';

type Episode=NonNullable<ReturnType<typeof getDayPodcast>>;

export function PodcastCard({day}:{day:number}) {
  const episode=getDayPodcast(day);
  // Changing days releases the old player, so another day's episode cannot keep playing.
  return episode?<EpisodePlayer key={day} episode={episode}/>:null;
}

function EpisodePlayer({episode}:{episode:Episode}) {
  const player=useAudioPlayer(null,{updateInterval:500,downloadFirst:false,preferredForwardBufferDuration:15});
  const status=useAudioPlayerStatus(player);
  const [started,setStarted]=useState(false),[error,setError]=useState(''),[width,setWidth]=useState(0);
  const seekRef=useRef<View>(null);
  const problem=error||status.error;
  const duration=Number.isFinite(status.duration)&&status.duration>0?status.duration:episode.durationSeconds;
  const position=Number.isFinite(status.currentTime)?Math.max(0,status.currentTime):0;
  const loading=started&&!status.isLoaded&&!problem;
  useEffect(()=>{
    setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false,interruptionMode:'doNotMix'})
      .catch(()=>setError('Audio could not be prepared. Retry or open the episode below.'));
  },[]);
  useEffect(()=>{
    if(!loading)return;
    const timer=setTimeout(()=>{player.pause();setError('The episode took too long to load. Check your connection, then retry.');},20000);
    return()=>clearTimeout(timer);
  },[loading,player]);
  function report(){setError('The episode could not play. Check your connection, retry, or open the episode below.');}
  function toggle() {
    setError('');
    try {
      if(status.playing){player.pause();return;}
      if(!started||problem){player.replace({uri:episode.audioUrl});setStarted(true);}
      if(status.didJustFinish||position>=duration)player.seekTo(0).then(()=>player.play()).catch(report);
      else player.play();
    } catch {report();}
  }
  function seek(seconds:number) {
    if(!status.isLoaded||problem||!Number.isFinite(seconds))return;
    player.seekTo(Math.max(0,Math.min(duration,seconds))).catch(report);
  }
  async function open(url:string) {
    try {await Linking.openURL(url);}catch{setError('This link could not open. Please try again.');}
  }
  return <View style={s.card}>
    <View style={s.heading}><View style={s.mark}><Text style={s.markText}>▶</Text></View><View style={s.intro}><Text style={s.kicker}>LISTEN & UNDERSTAND</Text><Text style={s.host}>Dr. Manny Arango · The Bible Dept.</Text></View></View>
    <Text style={s.title}>{episode.title}</Text>
    {!!episode.rangeNote&&<Text style={s.note}>{episode.rangeNote}</Text>}
    <Pressable ref={seekRef} accessibilityRole="adjustable" accessibilityLabel="Episode playback position" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(Math.min(position,duration))} aria-valuetext={`${audioTime(position)} of ${audioTime(duration)}`} aria-disabled={!status.isLoaded||!!problem} accessibilityValue={{min:0,max:Math.round(duration),now:Math.round(Math.min(position,duration)),text:`${audioTime(position)} of ${audioTime(duration)}`}} accessibilityActions={[{name:'increment',label:'Forward 15 seconds'},{name:'decrement',label:'Back 15 seconds'}]} onAccessibilityAction={event=>seek(position+(event.nativeEvent.actionName==='increment'?15:-15))} onLayout={event=>setWidth(event.nativeEvent.layout.width)} onPress={event=>{
      const {locationX,pageX}=event.nativeEvent;
      if(Number.isFinite(locationX)&&width>0)seek(duration*locationX/width);
      else if(Number.isFinite(pageX))seekRef.current?.measureInWindow((x,_y,measuredWidth)=>{if(measuredWidth>0)seek(duration*(pageX-x)/measuredWidth);});
    }} style={s.seek}>
      <View style={s.track}><View style={[s.progress,{width:`${Math.min(100,100*position/duration)}%`}]}/></View>
    </Pressable>
    <View style={s.times}><Text style={s.time}>{audioTime(position)}</Text><Text style={s.time}>{audioTime(duration)}</Text></View>
    <View style={s.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Rewind podcast 15 seconds" disabled={!status.isLoaded||!!problem} onPress={()=>seek(position-15)} style={[s.skip,!status.isLoaded&&s.disabled]}><Text style={s.skipText}>↶ 15</Text></Pressable>
      <View style={s.play}><ActionButton title={problem?'Retry episode':status.playing?'Pause episode':'Play episode'} onPress={toggle} loading={loading}/></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Forward podcast 15 seconds" disabled={!status.isLoaded||!!problem} onPress={()=>seek(position+15)} style={[s.skip,!status.isLoaded&&s.disabled]}><Text style={s.skipText}>15 ↷</Text></Pressable>
    </View>
    {loading&&<Notice text="Opening the episode…"/>}
    {!!problem&&<Notice text={error||'The audio stream could not load. Retry or open the episode below.'} error/>}
    <Pressable accessibilityRole="link" onPress={()=>void open(episode.episodeUrl)} style={s.episodeLink}><Text style={s.link}>Open this episode ↗</Text></Pressable>
    <View style={s.follow}><Text style={s.followLabel}>FOLLOW THE PODCAST</Text><View style={s.platforms}><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Apple Podcasts" onPress={()=>void open(PODCAST_LINKS.apple)} style={s.platform}><Text style={s.platformText}>Apple Podcasts ↗</Text></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Spotify" onPress={()=>void open(PODCAST_LINKS.spotify)} style={s.platform}><Text style={s.platformText}>Spotify ↗</Text></Pressable></View></View>
    <Text style={s.credit}>Official publisher stream. Internet required. Press Play to listen.</Text>
  </View>;
}

const s=StyleSheet.create({card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderTopWidth:4,borderTopColor:c.orange,borderRadius:7,padding:20,marginTop:30},heading:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:20},mark:{width:38,height:38,backgroundColor:c.ink,borderRadius:7,alignItems:'center',justifyContent:'center'},markText:{color:c.orange,fontSize:18},intro:{flex:1},kicker:{fontSize:9,letterSpacing:1.5,fontWeight:'900',color:c.action},host:{fontSize:11,color:c.muted,lineHeight:17,marginTop:5},title:{fontSize:23,fontWeight:'900',letterSpacing:-.6,lineHeight:29,color:c.ink},note:{fontSize:12,lineHeight:19,color:c.muted,backgroundColor:c.tint,padding:12,borderRadius:4,marginTop:14},seek:{minHeight:36,justifyContent:'center',marginTop:10},track:{height:5,backgroundColor:c.tint,borderRadius:3,overflow:'hidden'},progress:{height:5,backgroundColor:c.orange},times:{flexDirection:'row',justifyContent:'space-between'},time:{fontSize:11,fontVariant:['tabular-nums'],color:c.muted},controls:{flexDirection:'row',alignItems:'center',gap:8,marginTop:8},skip:{width:49,minHeight:50,alignItems:'center',justifyContent:'center'},skipText:{color:c.action,fontSize:14,fontWeight:'800'},play:{flex:1},disabled:{opacity:.4},episodeLink:{minHeight:44,alignItems:'center',justifyContent:'center',marginTop:10},link:{fontSize:12,fontWeight:'800',color:c.action},follow:{borderTopWidth:1,borderColor:c.border,paddingTop:17,marginTop:10},followLabel:{fontSize:8,fontWeight:'800',letterSpacing:1.4,color:c.muted},platforms:{flexDirection:'row',gap:16,flexWrap:'wrap'},platform:{minHeight:44,justifyContent:'center'},platformText:{fontSize:11,fontWeight:'700',color:c.ink},credit:{fontSize:10,lineHeight:16,color:c.muted,marginTop:5}});

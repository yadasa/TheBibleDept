import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { audioTime, getDayPodcast, PODCAST_LINKS } from '../services/podcasts';
import { control, radius, theme as c, typography as t } from '../theme';
import { Icon } from './Icon';
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
    <View style={s.heading}><Icon name="headphones" size={20} color={c.action}/><Text style={s.kicker}>Daily teaching</Text></View>
    <Text accessibilityRole="header" style={s.title}>{episode.title}</Text>
    <Text style={s.host}>Dr. Manny Arango · The Bible Dept.</Text>
    {!!episode.rangeNote&&<Text style={s.note}>{episode.rangeNote}</Text>}
    <Pressable ref={seekRef} accessibilityRole="adjustable" accessibilityLabel="Episode playback position" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(Math.min(position,duration))} aria-valuetext={`${audioTime(position)} of ${audioTime(duration)}`} aria-disabled={!status.isLoaded||!!problem} accessibilityValue={{min:0,max:Math.round(duration),now:Math.round(Math.min(position,duration)),text:`${audioTime(position)} of ${audioTime(duration)}`}} accessibilityActions={[{name:'increment',label:'Forward 15 seconds'},{name:'decrement',label:'Back 15 seconds'}]} onAccessibilityAction={event=>seek(position+(event.nativeEvent.actionName==='increment'?15:-15))} onLayout={event=>setWidth(event.nativeEvent.layout.width)} onPress={event=>{
      const {locationX,pageX}=event.nativeEvent;
      if(Number.isFinite(locationX)&&width>0)seek(duration*locationX/width);
      else if(Number.isFinite(pageX))seekRef.current?.measureInWindow((x,_y,measuredWidth)=>{if(measuredWidth>0)seek(duration*(pageX-x)/measuredWidth);});
    }} style={({pressed})=>[s.seek,pressed&&s.pressed]}>
      <View style={s.track}><View style={[s.progress,{width:`${Math.min(100,100*position/duration)}%`}]}/></View>
    </Pressable>
    <View style={s.times}><Text style={s.time}>{audioTime(position)}</Text><Text style={s.time}>{audioTime(duration)}</Text></View>
    <View style={s.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Rewind podcast 15 seconds" accessibilityState={{disabled:!status.isLoaded||!!problem}} disabled={!status.isLoaded||!!problem} onPress={()=>seek(position-15)} style={({pressed})=>[s.skip,pressed&&s.pressed,(!status.isLoaded||!!problem)&&s.disabled]}><View style={s.reverse}><Icon name="refresh" size={22}/></View><Text style={s.skipText}>15s</Text></Pressable>
      <View style={s.play}><ActionButton title={problem?'Retry episode':status.playing?'Pause episode':'Play episode'} icon={problem?'refresh':status.playing?'pause':'play'} onPress={toggle} loading={loading}/></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Forward podcast 15 seconds" accessibilityState={{disabled:!status.isLoaded||!!problem}} disabled={!status.isLoaded||!!problem} onPress={()=>seek(position+15)} style={({pressed})=>[s.skip,pressed&&s.pressed,(!status.isLoaded||!!problem)&&s.disabled]}><Icon name="refresh" size={22}/><Text style={s.skipText}>15s</Text></Pressable>
    </View>
    {loading&&<Notice text="Opening the episode…"/>}
    {!!problem&&<Notice text={error||'The audio stream could not load. Retry or open the episode below.'} error/>}
    <Pressable accessibilityRole="link" onPress={()=>void open(episode.episodeUrl)} style={({pressed})=>[s.episodeLink,pressed&&s.pressed]}><Text style={s.link}>Open episode page</Text><Icon name="external" size={16} color={c.action}/></Pressable>
    <View style={s.follow}><Text style={s.followLabel}>Follow the podcast</Text><View style={s.platforms}><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Apple Podcasts" onPress={()=>void open(PODCAST_LINKS.apple)} style={({pressed})=>[s.platform,pressed&&s.pressed]}><Text style={s.platformText}>Apple Podcasts</Text><Icon name="external" size={14}/></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Spotify" onPress={()=>void open(PODCAST_LINKS.spotify)} style={({pressed})=>[s.platform,pressed&&s.pressed]}><Text style={s.platformText}>Spotify</Text><Icon name="external" size={14}/></Pressable></View></View>
    <Text style={s.credit}>Official publisher stream · Internet required</Text>
  </View>;
}

const s=StyleSheet.create({
  card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:radius,padding:20,marginTop:32},
  heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  kicker:{...t.label,color:c.action},
  title:{...t.section,color:c.ink},
  host:{...t.meta,color:c.muted,marginTop:8},
  note:{...t.meta,color:c.muted,backgroundColor:c.tint,padding:12,borderRadius:radius,marginTop:16},
  seek:{minHeight:control.iconSize,justifyContent:'center',marginTop:12},
  track:{height:5,backgroundColor:c.border,borderRadius:radius,overflow:'hidden'},
  progress:{height:5,backgroundColor:c.action},
  times:{flexDirection:'row',justifyContent:'space-between'},
  time:{...t.meta,fontVariant:['tabular-nums'],color:c.muted},
  controls:{flexDirection:'row',alignItems:'center',gap:8,marginTop:8},
  skip:{minWidth:44,minHeight:56,alignItems:'center',justifyContent:'center',gap:4,borderRadius:radius},
  skipText:{...t.meta,color:c.ink,fontWeight:'600'},
  reverse:{transform:[{scaleX:-1}]},
  play:{flex:1},
  disabled:{opacity:.4},
  pressed:{opacity:.65},
  episodeLink:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:12},
  link:{...t.label,color:c.action,textDecorationLine:'underline'},
  follow:{borderTopWidth:1,borderColor:c.border,paddingTop:16,marginTop:16},
  followLabel:{...t.label,color:c.ink},
  platforms:{flexDirection:'row',gap:20,flexWrap:'wrap',marginTop:4},
  platform:{minHeight:44,flexDirection:'row',gap:6,alignItems:'center'},
  platformText:{...t.meta,fontWeight:'600',color:c.ink,textDecorationLine:'underline'},
  credit:{...t.meta,color:c.muted,marginTop:8},
});

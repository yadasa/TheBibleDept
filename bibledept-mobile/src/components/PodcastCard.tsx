import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { audioTime, getDayPodcast, PODCAST_LINKS } from '../services/podcasts';
import { usePodcast, PLAYBACK_RATES } from '../state/PodcastProvider';
import { radius, useThemedStyles, Colors, typography as t } from '../theme';
import { GlassPressable } from './Glass';
import { Icon } from './Icon';
import { ActionButton, Notice } from './ui';
import { PodcastWaveform } from './PodcastWaveform';

export function PodcastCard({day}:{day:number}) {
  const {c,s}=useThemedStyles(styles),audio=usePodcast();
  const episode=getDayPodcast(day),[linkError,setLinkError]=useState('');
  if(!episode)return null;
  const current=audio.episode?.day===day;
  const problem=current?audio.error||audio.status.error:'';
  const position=current?audio.position:0,duration=current?audio.duration:episode.durationSeconds;
  const loaded=current&&audio.status.isLoaded&&!problem;
  const playing=current&&audio.status.playing;
  async function open(url:string) {
    setLinkError('');
    try {await Linking.openURL(url);}catch{setLinkError('This link couldn’t open. Try again.');}
  }
  return <View style={s.card}>
    <View style={s.heading}><Icon name="headphones" size={20} color={c.action}/><Text style={s.kicker}>Daily teaching</Text></View>
    <Text accessibilityRole="header" style={s.title}>{episode.title}</Text>
    <Text style={s.host}>Dr. Manny Arango · The Bible Dept.</Text>
    {!!episode.rangeNote&&<Text style={s.note}>{episode.rangeNote}</Text>}
    <PodcastWaveform samples={current?audio.samples:Array(96).fill(0)} liveLevel={current?audio.liveLevel:0} position={position} duration={duration} playing={playing} canSeek={!!loaded} onSeek={audio.seek}/>
    <View style={s.times}><Text style={s.time}>{audioTime(position)}</Text><Text style={s.time}>{audioTime(duration)}</Text></View>
    <Text style={s.waveCaption}>{current&&!audio.samplingSupported?'Audio visualization isn’t available on this device.':current&&audio.hasSamples?'Drag the waveform to skip through the episode.':'The waveform fills in as you listen.'}</Text>
    <View style={s.controls}>
      <GlassPressable accessibilityRole="button" accessibilityLabel="Rewind podcast 15 seconds" accessibilityState={{disabled:!loaded}} disabled={!loaded} onPress={()=>audio.seek(position-15)} style={({pressed})=>[s.skip,pressed&&s.pressed,!loaded&&s.disabled]}><View style={s.reverse}><Icon name="refresh" size={22}/></View><Text style={s.skipText}>15s</Text></GlassPressable>
      <View style={s.play}><ActionButton title={problem?'Retry episode':playing?'Pause episode':'Play episode'} icon={problem?'refresh':playing?'pause':'play'} onPress={()=>audio.play(day)} loading={current&&audio.loading}/></View>
      <GlassPressable accessibilityRole="button" accessibilityLabel="Forward podcast 15 seconds" accessibilityState={{disabled:!loaded}} disabled={!loaded} onPress={()=>audio.seek(position+15)} style={({pressed})=>[s.skip,pressed&&s.pressed,!loaded&&s.disabled]}><Icon name="refresh" size={22}/><Text style={s.skipText}>15s</Text></GlassPressable>
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel="Playback speed" style={s.speeds}>{PLAYBACK_RATES.map(rate=><GlassPressable key={rate} tone={audio.playbackRate===rate?'selected':'neutral'} accessibilityRole="radio" accessibilityLabel={`${rate} times speed`} aria-checked={audio.playbackRate===rate} accessibilityState={{checked:audio.playbackRate===rate}} onPress={()=>audio.setRate(rate)} style={s.speed}><Text style={[s.speedText,audio.playbackRate===rate&&s.selectedSpeed]}>{rate}×</Text></GlassPressable>)}</View>
    {!!problem&&<Notice text={String(problem)} error/>}
    {!current&&audio.episode&&<Text style={s.note}>Day {audio.episode.day} is {audio.status.playing?'playing':'paused'}. Play this episode to switch.</Text>}
    {!!linkError&&<Notice text={linkError} error/>}
    <Pressable accessibilityRole="link" onPress={()=>void open(episode.episodeUrl)} style={({pressed})=>[s.episodeLink,pressed&&s.pressed]}><Text style={s.link}>Open episode page</Text><Icon name="external" size={16} color={c.action}/></Pressable>
    <View style={s.follow}><Text style={s.followLabel}>Follow the podcast</Text><View style={s.platforms}><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Apple Podcasts" onPress={()=>void open(PODCAST_LINKS.apple)} style={({pressed})=>[s.platform,pressed&&s.pressed]}><Text style={s.platformText}>Apple Podcasts</Text><Icon name="external" size={14}/></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Spotify" onPress={()=>void open(PODCAST_LINKS.spotify)} style={({pressed})=>[s.platform,pressed&&s.pressed]}><Text style={s.platformText}>Spotify</Text><Icon name="external" size={14}/></Pressable></View></View>
    <Text style={s.credit}>Streaming from the official RedCircle podcast feed.</Text>
  </View>;
}

const styles=(c:Colors)=>StyleSheet.create({
  card:{backgroundColor:c.surface,borderWidth:1,borderColor:c.border,borderRadius:radius,padding:20,marginTop:32},
  heading:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12},
  kicker:{...t.label,color:c.action},
  title:{...t.section,color:c.ink},
  host:{...t.meta,color:c.muted,marginTop:8},
  note:{...t.meta,color:c.muted,backgroundColor:c.tint,padding:12,borderRadius:radius,marginTop:16},
  waveCaption:{...t.meta,color:c.muted,marginTop:6},
  speeds:{flexDirection:'row',gap:8,marginTop:16},speed:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:8},speedText:{...t.label,color:c.ink,fontVariant:['tabular-nums']},selectedSpeed:{color:c.action,textDecorationLine:'underline'},
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

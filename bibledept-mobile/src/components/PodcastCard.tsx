import { memo, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { audioTime, getDayPodcast, PODCAST_LINKS } from '../services/podcasts';
import { getPodcastReferenceSamples } from '../services/podcastReferenceWaveforms';
import { podcastAmplitudePeak } from '../services/podcastWaveform';
import { usePodcast } from '../state/PodcastProvider';
import { radius, useThemedStyles, Colors, typography as t } from '../theme';
import { GlassPressable, GlassSurface } from './Glass';
import { Icon } from './Icon';
import { Notice } from './ui';
import { PodcastWaveform } from './PodcastWaveform';
import { PlaybackSpeedControl } from './PlaybackSpeedControl';

const unknownSamples = Array(96).fill(0) as number[];
const frostStyles=StyleSheet.create({
  frame:{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:radius,overflow:'hidden'},
  surface:{position:'absolute',left:0,right:0,top:0,bottom:0,borderRadius:radius},
});
const PodcastCardFrost=memo(function PodcastCardFrost() {
  return <View pointerEvents="none" accessible={false} style={frostStyles.frame}><GlassSurface style={frostStyles.surface}/></View>;
});

export function PodcastCard({day}:{day:number}) {
  const {c,s}=useThemedStyles(styles),audio=usePodcast();
  const episode=getDayPodcast(day),[linkError,setLinkError]=useState('');
  const reference=getPodcastReferenceSamples(day)||unknownSamples;
  const referencePeak=useMemo(()=>podcastAmplitudePeak(reference),[reference]);
  if(!episode)return null;
  const current=audio.episode?.day===day;
  const problem=current?audio.error||(audio.status.error?'We couldn’t play this episode. Please try again.':''):'';
  const position=current?audio.position:0,duration=current?audio.duration:episode.durationSeconds;
  const loaded=current&&audio.status.isLoaded&&!problem;
  const playing=current&&audio.status.playing;
  const waveform=current?audio.samples:reference;
  async function open(url:string) {
    setLinkError('');
    try {await Linking.openURL(url);}catch{setLinkError('This link couldn’t open. Try again.');}
  }
  return <View style={s.card}>
    <PodcastCardFrost/>
    <View style={s.content}>
    <View style={s.heading}><View style={s.headingLabel}><Icon name="headphones" size={20} color={c.action}/><Text style={s.kicker}>{day===0?'Introduction':'Daily teaching'}</Text></View><Image source={require('../../assets/teaching-cover.jpg')} contentFit="cover" accessibilityLabel="The Bible Dept podcast cover" style={s.cover}/></View>
    <Text accessibilityRole="header" style={s.title}>{episode.title}</Text>
    <Text style={s.host}>Dr. Manny Arango · The Bible Dept.</Text>
    {!!episode.rangeNote&&<Text style={s.note}>{episode.rangeNote}</Text>}
    <PodcastWaveform samples={waveform} referencePeak={referencePeak} liveLevel={current?audio.liveLevel:0} position={position} duration={duration} playing={playing&&audio.hasLiveSamples} canSeek={!!loaded} onSeek={audio.seek}/>
    <View style={s.times}><Text style={s.time}>{audioTime(position)}</Text><Text style={s.time}>{audioTime(duration)}</Text></View>
    <Text style={s.waveCaption}>{loaded?'Drag the waveform to skip through the episode.':'Press play to listen to this episode.'}</Text>
    <View style={s.controls}>
      <View style={s.transport}>
        <SkipButton forward={false} disabled={!loaded} onPress={()=>audio.seek(position-15)}/>
        <GlassPressable tone="primary" accessibilityRole="button" accessibilityLabel={problem?'Retry episode':playing?'Pause episode':'Play episode'}
          accessibilityState={{busy:current&&audio.loading,disabled:current&&audio.loading}} disabled={current&&audio.loading} onPress={()=>audio.play(day)} style={({pressed})=>[s.play,pressed&&s.pressed]}>
          {current&&audio.loading?<ActivityIndicator color={c.onAction}/>:<Icon name={problem?'refresh':playing?'pause':'play'} size={28} color={c.onAction}/>}
        </GlassPressable>
        <SkipButton forward disabled={!loaded} onPress={()=>audio.seek(position+15)}/>
      </View>
      <PlaybackSpeedControl day={day} rate={audio.playbackRate} onRate={audio.setRate}/>
    </View>
    {!!problem&&<Notice text={String(problem)} error/>}
    {!current&&audio.episode&&<Text style={s.note}>{audio.episode.day===0?'The introduction':`Day ${audio.episode.day}`} is {audio.status.playing?'playing':'paused'}. Play this episode to switch.</Text>}
    {!!linkError&&<Notice text={linkError} error/>}
    <Pressable accessibilityRole="link" onPress={()=>void open(episode.episodeUrl)} style={({pressed})=>[s.episodeLink,pressed&&s.pressed]}><Text style={s.link}>Open episode page</Text><Icon name="external" size={16} color={c.action}/></Pressable>
    <View style={s.follow}><Text style={s.followLabel}>Follow the podcast</Text><View style={s.platforms}><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Apple Podcasts" onPress={()=>void open(PODCAST_LINKS.apple)} style={({pressed})=>[s.platform,pressed&&s.pressed]}><Text style={s.platformText}>Apple Podcasts</Text><Icon name="external" size={14}/></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Follow The Bible Dept on Spotify" onPress={()=>void open(PODCAST_LINKS.spotify)} style={({pressed})=>[s.platform,pressed&&s.pressed]}><Text style={s.platformText}>Spotify</Text><Icon name="external" size={14}/></Pressable></View></View>
    </View>
  </View>;
}

function SkipButton({forward,disabled,onPress}:{forward:boolean;disabled:boolean;onPress:()=>void}) {
  const {s}=useThemedStyles(styles);
  return <Pressable accessibilityRole="button" accessibilityLabel={forward?'Forward 15 seconds':'Back 15 seconds'} accessibilityState={{disabled}} disabled={disabled}
    hitSlop={4} onPress={onPress} style={({pressed})=>[s.skip,pressed&&s.pressed,disabled&&s.disabled]}>
    <View style={s.skipGlyph}><View style={!forward&&s.reverse}><Icon name="refresh" size={28}/></View><Text accessible={false} style={s.skipText}>15</Text></View>
  </Pressable>;
}

const styles=(c:Colors)=>StyleSheet.create({
  card:{position:'relative',borderWidth:0,borderRadius:radius,marginTop:32,overflow:'visible'},content:{padding:20},
  heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12},
  headingLabel:{flexDirection:'row',alignItems:'center',gap:8,flex:1,minWidth:0},
  cover:{width:44*4/3,height:44*4/3,borderRadius:13,flexShrink:0},
  kicker:{...t.label,color:c.actionText},
  title:{...t.section,color:c.ink},
  host:{...t.meta,color:c.muted,marginTop:8},
  note:{...t.meta,color:c.muted,backgroundColor:c.tint,padding:12,borderRadius:radius,marginTop:16},
  waveCaption:{...t.meta,color:c.muted,marginTop:6},
  times:{flexDirection:'row',justifyContent:'space-between'},
  time:{...t.meta,fontVariant:['tabular-nums'],color:c.muted},
  controls:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12},transport:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12},
  skip:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:22},skipGlyph:{width:28,height:28},
  skipText:{position:'absolute',left:0,right:0,top:8,fontSize:9,lineHeight:12,textAlign:'center',color:c.ink,fontWeight:'800',fontVariant:['tabular-nums']},
  reverse:{transform:[{scaleX:-1}]},
  play:{width:60,height:60,borderRadius:30,alignItems:'center',justifyContent:'center'},
  disabled:{opacity:.4},
  pressed:{opacity:.65},
  episodeLink:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:12},
  link:{...t.label,color:c.actionText},
  follow:{borderTopWidth:1,borderColor:c.border,paddingTop:16,marginTop:16},
  followLabel:{...t.label,color:c.ink},
  platforms:{flexDirection:'row',gap:20,flexWrap:'wrap',marginTop:4},
  platform:{minHeight:44,flexDirection:'row',gap:6,alignItems:'center'},
  platformText:{...t.meta,fontWeight:'600',color:c.ink},
});

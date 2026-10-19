import { StyleSheet, Text, View } from 'react-native';
import { usePodcast } from '../state/PodcastProvider';
import { audioTime } from '../services/podcasts';
import { Colors, typography as t, useThemedStyles } from '../theme';
import { GlassPressable } from './Glass';
import { Icon } from './Icon';

export function PodcastNowPlaying({onOpen}:{onOpen:(day:number)=>void}) {
  const audio=usePodcast(),{c,s}=useThemedStyles(styles);
  if(!audio.episode)return null;
  return <View pointerEvents="box-none" style={s.position}>
    <View style={s.player}>
      <GlassPressable accessibilityRole="button" accessibilityLabel={`Open podcast for day ${audio.episode.day}`} onPress={()=>onOpen(audio.episode!.day)} style={s.details}>
        <Icon name="headphones" size={20} color={c.action}/>
        <View style={s.text}><Text numberOfLines={1} style={s.title}>Day {audio.episode.day} · {audio.episode.reading}</Text><Text style={s.meta}>{audio.error?'Couldn’t play episode':audio.loading?'Loading episode…':`${audioTime(audio.position)} / ${audioTime(audio.duration)} · ${audio.playbackRate}×`}</Text></View>
      </GlassPressable>
      <GlassPressable tone="primary" accessibilityRole="button" accessibilityLabel={audio.status.playing?'Pause podcast':'Play podcast'} onPress={audio.toggle} style={s.button}><View style={s.glyph}><Icon name={audio.status.playing?'pause':'play'} size={20} color={c.onAction}/></View></GlassPressable>
      <GlassPressable accessibilityRole="button" accessibilityLabel="Close podcast player" onPress={audio.dismiss} style={s.button}><View style={s.glyph}><Icon name="close" size={18}/></View></GlassPressable>
    </View>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  position:{position:'absolute',bottom:110,left:12,right:12,alignItems:'center',zIndex:90},
  player:{width:'100%',maxWidth:680,flexDirection:'row',gap:6,alignItems:'center',padding:6,borderRadius:18,backgroundColor:c.surface,borderWidth:1,borderColor:c.border,boxShadow:'0 6px 24px rgba(0,0,0,.18)'},
  details:{flex:1,minWidth:0,minHeight:50,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:10},
  text:{flex:1,minWidth:0},title:{...t.label,color:c.ink},meta:{...t.meta,color:c.muted,marginTop:3,fontVariant:['tabular-nums']},button:{minHeight:48,minWidth:44,alignItems:'center',justifyContent:'center',borderRadius:12},glyph:{position:'relative',zIndex:1},
});

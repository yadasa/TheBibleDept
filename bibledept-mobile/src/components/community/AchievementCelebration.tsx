import { Pressable, Text, View } from 'react-native';
import { ACHIEVEMENTS } from '../../../shared/community';
import { useCommunity } from '../../services/CommunityProvider';
import { usePodcastPresence } from '../../state/PodcastProvider';
import { typography as t, useTheme } from '../../theme';
import { GlassSurface } from '../Glass';
import { Icon } from '../Icon';
import { IconButton } from '../ui';
import { BadgeArt } from './BadgeArt';

/** A dismissible celebration leaves reading and audio playback uninterrupted. */
export function AchievementCelebration({onOpen}:{onOpen:()=>void}) {
  const community=useCommunity(),{colors:c}=useTheme(),hasEpisode=usePodcastPresence();
  const awards=ACHIEVEMENTS.filter(badge=>community.newlyEarned.includes(badge.id));
  const featured=awards.find(badge=>badge.id==='six-percent-club')||awards[awards.length-1];
  if(!featured)return null;
  function open(){community.dismissNewBadges();onOpen();}
  const label=awards.length===1?'Badge earned':`${awards.length} badges earned`;
  return <View pointerEvents="box-none" style={{position:'absolute',left:16,right:16,bottom:hasEpisode?186:110,zIndex:95,alignItems:'center'}}>
    <GlassSurface style={{width:'100%',maxWidth:680,borderRadius:22,padding:12,borderWidth:1,borderColor:c.orange,flexDirection:'row',alignItems:'center',gap:6}}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${featured.name}. Open your badge collection`} onPress={open} style={({pressed})=>({flex:1,flexDirection:'row',alignItems:'center',gap:12,minHeight:64,opacity:pressed?.7:1})}>
        <BadgeArt symbol={featured.symbol} size={52}/><View style={{flex:1,minWidth:0}}>
          <Text accessibilityLiveRegion="polite" style={{...t.meta,color:c.muted}}>{label}</Text>
          <Text style={{...t.label,color:c.ink,marginTop:3}}>{featured.name}</Text>
          <Text style={{...t.meta,color:c.muted,fontSize:12,marginTop:3}}>View your collection</Text>
        </View><Icon name="chevronRight" size={18} color={c.muted}/>
      </Pressable>
      <IconButton name="close" label="Dismiss badge celebration" onPress={community.dismissNewBadges}/>
    </GlassSurface>
  </View>;
}

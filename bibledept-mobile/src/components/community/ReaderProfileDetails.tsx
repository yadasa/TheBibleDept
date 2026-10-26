import { Text, View } from 'react-native';
import { ACHIEVEMENTS, CommunityProfile, visibleCommunityStreak } from '../../../shared/community';
import { typography as t, useTheme } from '../../theme';
import { Icon } from '../Icon';
import { BadgeArt } from './BadgeArt';
import { ProfileAvatar } from './ProfileAvatar';

export function ReaderProfileDetails({profile,now=Date.now()}:{profile:CommunityProfile;now?:number}) {
  const {colors:c}=useTheme(),streak=visibleCommunityStreak(profile,now);
  return <View>
    <View style={{alignItems:'center',gap:16,marginBottom:24}}>
      <ProfileAvatar name={profile.displayName} photoData={profile.photoData} size={112} club={profile.badgeIds.includes('six-percent-club')}/>
      <Text accessibilityRole="header" style={{...t.title,color:c.ink,textAlign:'center'}}>{profile.displayName}</Text>
      {streak!==null&&<View accessible accessibilityLabel={`${streak}-day reading streak`} style={{flexDirection:'row',gap:6,alignItems:'center',backgroundColor:c.tint,borderRadius:20,paddingVertical:8,paddingHorizontal:12}}><Icon name="flame" color={c.orange} size={18}/><Text style={{...t.label,color:c.ink}}>{streak} {streak===1?'day':'days'} in a row</Text></View>}
      {profile.planDays!==null&&<Text style={{...t.body,color:c.muted}}>{profile.planDays} / 365 journey days</Text>}
    </View>
    <Text style={{...t.section,color:c.ink}}>Shared badges</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:14,marginVertical:18}}>
      {ACHIEVEMENTS.filter(badge=>profile.badgeIds.includes(badge.id)).map(badge=><View key={badge.id} accessible accessibilityLabel={`${badge.name}. ${badge.description}`} style={{alignItems:'center',width:'29%',gap:8}}><BadgeArt symbol={badge.symbol} size={68}/><Text style={{...t.meta,color:c.ink,textAlign:'center'}}>{badge.name}</Text></View>)}
    </View>
    {!profile.badgeIds.length&&<Text style={{...t.body,color:c.muted,marginBottom:16}}>No badges shared yet.</Text>}
  </View>;
}

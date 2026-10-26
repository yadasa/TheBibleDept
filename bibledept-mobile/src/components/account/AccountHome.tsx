import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../services/AuthProvider';
import { Colors, typography as t, useThemedStyles } from '../../theme';
import { Icon } from '../Icon';
import { AccountLink } from './AccountPage';
import { useCommunity } from '../../services/CommunityProvider';
import { ProfileAvatar } from '../community/ProfileAvatar';
import { BadgeArt } from '../community/BadgeArt';
import { ACHIEVEMENTS } from '../../../shared/community';

export function AccountHome({onProfile,onProgress,onSettings,onPrayer,onNotes,onBadges,onCommunity,onCircles}:{onProfile:()=>void;onProgress:()=>void;onSettings:()=>void;onPrayer?:()=>void;onNotes?:()=>void;onBadges:()=>void;onCommunity?:()=>void;onCircles?:()=>void}) {
  const {user}=useAuth(),{c,s}=useThemedStyles(styles),community=useCommunity();
  if(!user)return null;
  return <View><View style={s.identity}><ProfileAvatar name={community.settings.displayName||user.displayName||'Your profile'} photoData={community.settings.photoData} size={72} club={community.earned.some(a=>a.id==='six-percent-club')}/><View style={s.identityCopy}>
    <Text accessibilityRole="header" style={s.name}>{community.settings.displayName||user.displayName||user.email||user.phoneNumber||'Your Bible Dept account'}</Text>
    <View style={s.status}><Icon name="checkCircle" size={14} color={c.success}/><Text style={s.statusText}>Signed in</Text></View>
  </View></View>
    <View style={{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:12,marginBottom:14}}><BadgeArt size={58} locked={!community.earned.some(a=>a.id==='six-percent-club')}/><View style={{flex:1}}><Text style={{...t.label,color:c.ink}}>Your journey, recognized.</Text><Text style={{...t.meta,color:c.muted,marginTop:5}}>{community.achievementsReady?`${community.earned.filter(award=>ACHIEVEMENTS.some(badge=>badge.id===award.id)).length} of ${ACHIEVEMENTS.length} badges earned · ${community.metrics.planDays}/365 days`:community.achievementError?'Your achievements couldn’t load. Open your collection to retry.':'Loading your saved achievements…'}</Text></View></View>
    <AccountLink icon="award" title="Badges & achievements" detail="Your collection and how to earn every badge" onPress={onBadges}/>
    <AccountLink icon="user" title="Profile & sign-in" detail="Your photo, name, sharing, and contact details" onPress={onProfile}/>
    <AccountLink icon="book" title="Reading progress" detail="Your plan, saved chapters, and reading streaks" onPress={onProgress}/>
    <AccountLink icon="people" title="Community" detail="Celebrate reading streaks and milestones" onPress={onCommunity}/>
    <AccountLink icon="chat" title="Reading circles & chat" unread={community.circles.some(circle=>circle.unread)} detail={community.circles.some(circle=>circle.unread)?`${community.circles.filter(circle=>circle.unread).length} ${community.circles.filter(circle=>circle.unread).length===1?'circle has':'circles have'} new messages`:'Read and talk together in a private group'} onPress={onCircles}/>
    <AccountLink icon="notes" title="Your notes" detail="Return to your highlights and comments" onPress={onNotes}/>
    <AccountLink icon="heart" title="Prayer journal" detail="Read your prayers and mark answered prayers" onPress={onPrayer}/>
    <AccountLink icon="settings" title="Preferences" detail="Appearance, reading, and reminders" onPress={onSettings}/>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({identity:{flexDirection:'row',alignItems:'center',gap:16,marginBottom:28,paddingVertical:8},avatar:{height:58,width:58,borderRadius:29,backgroundColor:c.tint,alignItems:'center',justifyContent:'center'},identityCopy:{flex:1,minWidth:0},name:{...t.section,color:c.ink},status:{flexDirection:'row',alignItems:'center',gap:6,marginTop:7},statusText:{...t.meta,color:c.success}});

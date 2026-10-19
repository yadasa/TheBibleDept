import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../services/AuthProvider';
import { Colors, typography as t, useThemedStyles } from '../../theme';
import { Icon } from '../Icon';
import { AccountLink } from './AccountPage';

export function AccountHome({onProfile,onProgress,onSettings,onPrayer,onNotes}:{onProfile:()=>void;onProgress:()=>void;onSettings:()=>void;onPrayer?:()=>void;onNotes?:()=>void}) {
  const {user}=useAuth(),{c,s}=useThemedStyles(styles);
  if(!user)return null;
  return <View><View style={s.identity}><View style={s.avatar}><Icon name="user" size={28} color={c.ink}/></View><View style={s.identityCopy}>
    <Text accessibilityRole="header" style={s.name}>{user.displayName||user.email||user.phoneNumber||'Your Bible Dept account'}</Text>
    <View style={s.status}><Icon name="checkCircle" size={14} color={c.success}/><Text style={s.statusText}>Signed in</Text></View>
  </View></View>
    <AccountLink icon="user" title="Profile & sign-in" detail="Your name and contact details" onPress={onProfile}/>
    <AccountLink icon="book" title="Reading progress" detail="Your plan, saved chapters, and reading streaks" onPress={onProgress}/>
    <AccountLink icon="notes" title="Your notes" detail="Return to your highlights and comments" onPress={onNotes}/>
    <AccountLink icon="heart" title="Prayer journal" detail="Read your prayers and mark answered prayers" onPress={onPrayer}/>
    <AccountLink icon="settings" title="Preferences" detail="Appearance, reading, and reminders" onPress={onSettings}/>
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({identity:{flexDirection:'row',alignItems:'center',gap:16,marginBottom:28,paddingVertical:8},avatar:{height:58,width:58,borderRadius:29,backgroundColor:c.tint,alignItems:'center',justifyContent:'center'},identityCopy:{flex:1,minWidth:0},name:{...t.section,color:c.ink},status:{flexDirection:'row',alignItems:'center',gap:6,marginTop:7},statusText:{...t.meta,color:c.success}});

import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, typography as t, useThemedStyles } from '../../theme';
import { GlassPressable } from '../Glass';
import { Icon, IconName } from '../Icon';

export function AccountPage({title,intro,onBack,backLabel='Back to account',children}:{title:string;intro?:string;onBack:()=>void;backLabel?:string;children:ReactNode}) {
  const {s}=useThemedStyles(styles);
  return <View><Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={({pressed})=>[s.back,pressed&&s.pressed]}><Icon name="chevronLeft" size={20}/><Text style={s.backText}>{backLabel}</Text></Pressable>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>{!!intro&&<Text style={s.intro}>{intro}</Text>}<View style={s.content}>{children}</View>
  </View>;
}
export function AccountLink({icon,title,detail,onPress,disabled=false}:{icon:IconName;title:string;detail:string;onPress?:()=>void;disabled?:boolean}) {
  const {c,s}=useThemedStyles(styles),unavailable=disabled||!onPress;
  return <GlassPressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={detail} disabled={unavailable} accessibilityState={{disabled:unavailable}} onPress={onPress}
    style={({pressed})=>[s.link,pressed&&s.pressed,unavailable&&s.disabled]}><Icon name={icon} color={c.orange} size={22}/><View style={s.linkCopy}><Text style={s.linkTitle}>{title}</Text><Text style={s.linkDetail}>{detail}</Text></View><Icon name="chevronRight" size={18} color={c.muted}/></GlassPressable>;
}
export function AccountMetric({value,label}:{value:number;label:string}) {
  const {s}=useThemedStyles(styles);
  return <View style={s.metric}><Text style={s.metricValue}>{value.toLocaleString()}</Text><Text style={s.metricLabel}>{label}</Text></View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  back:{minHeight:44,flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',paddingRight:12,marginBottom:12},backText:{...t.label,color:c.ink},
  title:{...t.title,color:c.ink},intro:{...t.body,color:c.muted,marginTop:12},content:{marginTop:24},
  link:{flexDirection:'row',alignItems:'center',gap:14,padding:18,borderRadius:16,marginBottom:10,minHeight:80},linkCopy:{flex:1,minWidth:0},linkTitle:{...t.body,fontWeight:'700',color:c.ink},linkDetail:{...t.meta,color:c.muted,marginTop:4},
  metric:{flex:1,minWidth:84,paddingVertical:16},metricValue:{fontSize:28,lineHeight:34,fontWeight:'800',fontVariant:['tabular-nums'],color:c.ink},metricLabel:{...t.meta,color:c.muted,marginTop:4},pressed:{opacity:.65},disabled:{opacity:.45},
});

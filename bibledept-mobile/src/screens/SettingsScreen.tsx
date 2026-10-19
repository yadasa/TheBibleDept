import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../services/AuthProvider';
import { Colors, typography as t, useTheme, useThemedStyles } from '../theme';
import { ActionButton, Notice } from '../components/ui';

export function SettingsScreen({onBack}:{onBack:()=>void}){
  const {user}=useAuth(),{mode,setMode,error}=useTheme(),{s}=useThemedStyles(styles);
  if(!user)return null;
  return <View>
    <ActionButton title="Back to account" secondary icon="chevronLeft" onPress={onBack}/>
    <Text accessibilityRole="header" style={s.title}>Settings</Text>
    <Text style={s.label}>Appearance</Text>
    <Text style={s.body}>Choose a comfortable reading space. Dark is the default.</Text>
    <View style={s.choices}>{(['dark','light'] as const).map(value=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} mode`} accessibilityState={{checked:mode===value}} onPress={()=>setMode(value)} style={[s.choice,mode===value&&s.selected]}><Text style={s.choiceText}>{value==='dark'?'Dark':'Light'}{mode===value?' ✓':''}</Text></Pressable>)}</View>
    <Text style={s.body}>Your choice is saved for this account on this device.</Text>
    {!!error&&<Notice text={error} error/>}
  </View>;
}
const styles=(c:Colors)=>StyleSheet.create({
  title:{...t.title,color:c.ink,marginTop:24,marginBottom:24},label:{...t.section,color:c.ink},body:{...t.meta,color:c.muted,marginTop:8},
  choices:{flexDirection:'row',gap:12,marginTop:16},choice:{flex:1,minHeight:52,padding:16,borderWidth:1,borderColor:c.controlBorder,borderRadius:4,backgroundColor:c.surface},selected:{borderColor:c.action,backgroundColor:c.tint},choiceText:{...t.button,color:c.ink},
});

import { StyleSheet, Text, View } from 'react-native';
import { Colors, typography as t, useTheme, useThemedStyles } from '../../theme';
import { GlassPressable } from '../Glass';
import { Icon } from '../Icon';
import { Notice } from '../ui';
import { AccountPage } from './AccountPage';
import { AccountTransition } from './AccountTransition';

export function AppearancePage({onBack}:{onBack:()=>void}) {
  const {mode,setMode,error}=useTheme(),{c,s}=useThemedStyles(styles);
  return <AccountPage title="Appearance" intro="Choose the look that’s easiest on your eyes." onBack={onBack} backLabel="Back to preferences">
    <AccountTransition pageKey={mode}><View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={s.choices}>
      {(['dark','light'] as const).map(value=><GlassPressable key={value} accessibilityRole="radio" accessibilityLabel={`${value==='dark'?'Dark':'Light'} mode`} accessibilityState={{checked:mode===value}} aria-checked={mode===value} onPress={()=>setMode(value)} style={({pressed})=>[s.choice,mode===value&&s.selected,pressed&&s.pressed]}>
        <View style={[s.sample,value==='dark'?s.dark:s.light]}><View style={[s.sampleLine,value==='dark'?s.lightLine:s.darkLine]}/><View style={[s.sampleLine,s.shortLine,value==='dark'?s.lightLine:s.darkLine]}/></View>
        <View style={s.labelRow}><Text style={s.label}>{value==='dark'?'Dark':'Light'}</Text>{mode===value&&<Icon name="checkCircle" size={20} color={c.action}/>}</View>
      </GlassPressable>)}
    </View></AccountTransition>
    {!!error&&<Notice text={error} error/>}
    <Text style={s.note}>Your choice is saved for this account on this phone.</Text>
  </AccountPage>;
}
const styles=(c:Colors)=>StyleSheet.create({choices:{flexDirection:'row',gap:14},choice:{flex:1,borderRadius:18,borderWidth:1,borderColor:c.controlBorder,padding:12},selected:{borderColor:c.orange,backgroundColor:c.tint},sample:{height:104,borderRadius:10,padding:16,justifyContent:'center',gap:12},dark:{backgroundColor:'#111111'},light:{backgroundColor:'#FAF8F5'},sampleLine:{height:7,borderRadius:4,width:'100%'},shortLine:{width:'65%'},lightLine:{backgroundColor:'#EAE7E2'},darkLine:{backgroundColor:'#292724'},labelRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:14,paddingBottom:4},label:{...t.label,color:c.ink},note:{...t.meta,color:c.muted,marginTop:20},pressed:{opacity:.65}});

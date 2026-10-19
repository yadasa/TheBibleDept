import { useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getReadingPlanDay } from '../services/readingPlan';
import { Colors, typography as t, useThemedStyles } from '../theme';
import { GlassSurface } from './Glass';
import { Icon } from './Icon';
import { ActionButton, Notice } from './ui';

export function LessonCompleteModal({day,busy,error,onClose}:{day?:number;busy:boolean;error:string;onClose:()=>void}) {
  const {c,s}=useThemedStyles(styles),insets=useSafeAreaInsets(),heading=useRef<Text>(null);
  function focusHeading() {
    if(Platform.OS==='web')return;
    const handle=findNodeHandle(heading.current);
    if(handle)AccessibilityInfo.setAccessibilityFocus(handle);
  }
  return <Modal visible={!!day} transparent animationType="fade" onRequestClose={onClose} onShow={focusHeading}>
    <View style={[s.overlay,{paddingTop:insets.top+24,paddingBottom:insets.bottom+24}]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <GlassSurface style={s.card}>
        <View style={s.seal}><Icon name="check" size={30} color={c.orange}/></View>
        <Text style={s.eyebrow}>DAY {day} COMPLETE</Text>
        <Text ref={heading} accessibilityRole="header" style={s.title}>Congratulations!</Text>
        <Text style={s.copy}>You’ve finished day {day}: {day?getReadingPlanDay(day)?.label:''}.</Text>
        <Text style={s.detail}>The reading and teaching are complete. Your progress is saved on this device.</Text>
        <ActionButton title="Keep going" icon="arrowRight" onPress={onClose} loading={busy}/>
        {!!error&&<Notice text={error} error/>}
      </GlassSurface>
    </View>
  </Modal>;
}
const styles=(c:Colors)=>StyleSheet.create({
  overlay:{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(8,7,6,.72)'},
  card:{width:'100%',maxWidth:440,alignSelf:'center',padding:28,backgroundColor:c.background},
  seal:{width:62,height:62,borderRadius:31,backgroundColor:c.tint,justifyContent:'center',alignItems:'center',marginBottom:24},
  eyebrow:{...t.label,color:c.action,letterSpacing:1.2,marginBottom:10},title:{...t.title,fontSize:32,lineHeight:38,color:c.ink},
  copy:{...t.body,fontSize:18,lineHeight:27,color:c.ink,marginTop:16},detail:{...t.body,color:c.muted,marginTop:12,marginBottom:20},
});

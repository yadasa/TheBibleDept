import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography as t, useTheme } from '../../theme';
import { useReducedMotion } from '../LiquidBottomNav';
import { IconButton } from '../ui';

/** Keep dismissal visible while long profiles or a keyboard reduce reading space. */
export function CommunityDialog({visible,title,closeLabel,onClose,children}:{visible:boolean;title:string;closeLabel:string;onClose:()=>void;children:ReactNode}) {
  const {colors:c}=useTheme(),reduced=useReducedMotion();
  return <Modal visible={visible} transparent animationType={reduced?'none':'fade'} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':Platform.OS==='android'?'height':undefined} style={{flex:1,backgroundColor:'rgba(0,0,0,.75)'}}>
      <SafeAreaView style={{flex:1,justifyContent:'center',padding:20}}>
        <View style={{width:'100%',maxWidth:480,maxHeight:'92%',alignSelf:'center',backgroundColor:c.surface,borderRadius:24,overflow:'hidden'}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingLeft:24,paddingRight:8,paddingVertical:8,borderBottomWidth:1,borderColor:c.border}}>
            <Text accessibilityRole="header" style={{...t.label,color:c.ink,flex:1}}>{title}</Text><IconButton name="close" label={closeLabel} onPress={onClose}/>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{flexShrink:1}} contentContainerStyle={{padding:24}}>{children}</ScrollView>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}

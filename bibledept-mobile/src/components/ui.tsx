import { useId, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { control, radius, theme as c, typography as t } from '../theme';
import { Icon, IconName } from './Icon';

export function ActionButton({ title, onPress, disabled = false, loading = false, secondary = false, variant = secondary ? 'secondary' : 'primary', icon }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: boolean; variant?: 'primary' | 'secondary' | 'ghost'; icon?: IconName }) {
  const color = variant === 'primary' ? c.surface : variant === 'ghost' ? c.action : c.ink;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={({pressed})=>[s.button, variant === 'secondary' && s.secondary, variant === 'ghost' && s.ghost, pressed && s.pressed, (disabled || loading) && s.disabled]}>
    {loading ? <ActivityIndicator color={color} /> : <><Text style={[s.buttonText, {color}]}>{title}</Text>{icon && <Icon name={icon} size={20} color={color}/>}</>}
  </Pressable>;
}

export function IconButton({ name, label, onPress, disabled = false }: { name: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[s.iconButton,pressed&&s.pressed,disabled&&s.disabled]}><Icon name={name}/></Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [focused,setFocused]=useState(false),id=useId();
  return <View style={s.field}><Text nativeID={`${id}-label`} style={s.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityLabelledBy={`${id}-label`} placeholderTextColor={c.muted} {...props} onFocus={event=>{setFocused(true);props.onFocus?.(event);}} onBlur={event=>{setFocused(false);props.onBlur?.(event);}} style={[s.input,props.multiline && s.multiline, focused && s.focused, props.style]} /></View>;
}

export function Notice({ text, error = false, success = false }: { text: string; error?: boolean; success?: boolean }) {
  return <Text accessibilityRole={error ? 'alert' : 'text'} accessibilityLiveRegion="polite" style={[s.notice, error && s.error, success && s.success]}>{text}</Text>;
}

const s = StyleSheet.create({
  button: { backgroundColor:c.action,minHeight:control.minHeight,paddingHorizontal:20,paddingVertical:14,borderRadius:radius,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:12,marginTop:10,borderWidth:1,borderColor:'transparent' },
  buttonText: {...t.button,textAlign:'center',flexShrink:1},
  secondary: {backgroundColor:c.surface,borderColor:c.controlBorder}, ghost:{backgroundColor:'transparent'},
  pressed:{opacity:.7},disabled:{opacity:.5},
  iconButton:{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center',borderRadius:radius},
  field:{marginBottom:16},label:{...t.label,color:c.ink,marginBottom:8},
  input:{backgroundColor:c.surface,borderWidth:1,borderColor:c.controlBorder,borderRadius:radius,minHeight:52,padding:14,fontSize:16,lineHeight:24,color:c.ink},
  focused:{borderColor:c.action,outlineColor:c.action,outlineWidth:2,outlineOffset:2},
  multiline:{minHeight:160,textAlignVertical:'top'},notice:{...t.meta,color:c.muted,marginVertical:10},error:{color:c.error},success:{color:c.success},
});

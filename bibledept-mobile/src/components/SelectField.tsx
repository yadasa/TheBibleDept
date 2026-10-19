import { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassPressable } from './Glass';
import { Icon } from './Icon';
import { IconButton } from './ui';
import { Colors, typography as t, useThemedStyles } from '../theme';

export type SelectOption = { value: string; label: string; detail?: string; disabled?: boolean };

/** A bounded, accessible selection sheet; menus never depend on a clipped parent. */
export function SelectField({ label, value, options, onChange, disabled = false, compact = false }: {
  label: string; value: string; options: readonly SelectOption[];
  onChange: (value: string) => void; disabled?: boolean; compact?: boolean;
}) {
  const { c, s } = useThemedStyles(styles);
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  return <View style={s.field}>
    {!compact && <Text style={s.label}>{label}</Text>}
    <GlassPressable accessibilityRole="button" accessibilityLabel={`${label}, ${selected?.label || 'Choose'}`}
      accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => setOpen(true)} style={({ pressed }) => [s.trigger, compact && s.compact, disabled && s.disabled, pressed && s.pressed]}>
      <Text numberOfLines={1} style={s.value}>{selected?.label || 'Choose'}</Text>
      <Icon name="chevronDown" size={18} color={c.muted}/>
    </GlassPressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={() => setOpen(false)}/>
        <SafeAreaView edges={['bottom']} style={s.sheet} accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)}>
          <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{label}</Text><IconButton name="close" label={`Close ${label.toLowerCase()} choices`} onPress={() => setOpen(false)}/></View>
          <FlatList style={s.list} data={options} keyExtractor={option=>option.value} initialNumToRender={14} maxToRenderPerBatch={12} windowSize={5} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={Platform.OS!=='web'} contentContainerStyle={s.choices}
            renderItem={({item:option}) => <Pressable accessibilityRole="radio" accessibilityLabel={option.label}
              accessibilityState={{ checked: option.value === value, disabled: !!option.disabled }} aria-checked={option.value===value} disabled={option.disabled}
              onPress={() => { onChange(option.value); setOpen(false); }}
              style={({ pressed }) => [s.option, option.value === value && s.selected, option.disabled && s.disabled, pressed && s.pressed]}>
              <View style={s.optionCopy}><Text style={[s.optionText, option.value === value && s.selectedText]}>{option.label}</Text>{!!option.detail && <Text style={s.detail}>{option.detail}</Text>}</View>
              {option.value === value && <Icon name="check" size={20} color={c.action}/>}
            </Pressable>}/>
        </SafeAreaView>
      </View>
    </Modal>
  </View>;
}
const styles = (c: Colors) => StyleSheet.create({
  field: { minWidth: 0, flexShrink: 1 }, label: { ...t.meta, color: c.muted, marginBottom: 7 },
  trigger: { minHeight: 52, minWidth: 72, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  compact: { minHeight: 44, paddingVertical: 9 }, value: { ...t.label, color: c.ink, flexShrink: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.5)' },
  sheet: { backgroundColor: c.background, width: '100%', maxWidth: 560, maxHeight: '78%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
  title: { ...t.section, color: c.ink, flexShrink: 1 }, list:{flexGrow:0,flexShrink:1}, choices: { paddingHorizontal: 16, paddingBottom: 24, gap: 4 },
  option: { minHeight: 52, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  selected: { backgroundColor: c.tint }, optionCopy: { flex: 1 }, optionText: { ...t.body, color: c.ink },
  selectedText: { color: c.actionText, fontWeight: '700' }, detail: { ...t.meta, color: c.muted, marginTop: 3 },
  disabled: { opacity: .45 }, pressed: { opacity: .65 },
});

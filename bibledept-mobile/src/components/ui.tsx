import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme as c } from '../theme';

export function ActionButton({ title, onPress, disabled = false, loading = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={[s.button, secondary && s.secondary, (disabled || loading) && s.disabled]}>
    {loading ? <ActivityIndicator color={secondary ? c.action : '#FFFFFF'} /> : <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>}
  </Pressable>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...props} style={[s.input, props.multiline && s.multiline, props.style]} /></View>;
}

export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <Text accessibilityRole={error ? 'alert' : 'text'} style={[s.notice, error && s.error]}>{text}</Text>;
}

const s = StyleSheet.create({
  button: { backgroundColor: c.action, minHeight: 50, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondary: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
  secondaryText: { color: c.action }, disabled: { opacity: .5 }, field: { marginBottom: 15 },
  label: { fontWeight: '700', fontSize: 12, color: c.ink, marginBottom: 8 },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 4, minHeight: 50, padding: 14, fontSize: 16, color: c.ink },
  multiline: { minHeight: 110, textAlignVertical: 'top' }, notice: { color: c.muted, fontSize: 13, lineHeight: 21, marginVertical: 10 }, error: { color: '#9F271E' },
});

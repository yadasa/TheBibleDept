import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ClockTime, formatClockTime, to12Hour, to24Hour } from "../services/clockTime";
import { Colors, typography as t, useThemedStyles } from "../theme";
import { GlassPressable as Pressable } from "./Glass";
import { ActionButton } from "./ui";

const hours = Array.from({ length: 12 }, (_, index) => index + 1);
const minutes = [0, 15, 30, 45];

export function TimeField({ label, value, onChange, disabled = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { c, s } = useThemedStyles(styles);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<ClockTime>({ hour: 7, minute: 30, period: "PM" });
  const close = () => setOpen(false);
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${formatClockTime(value)}`}
      accessibilityHint="Opens the time picker" accessibilityState={{ disabled, expanded: open }} disabled={disabled}
      onPress={() => { setChosen(to12Hour(value) || { hour: 7, minute: 30, period: "PM" }); setOpen(true); }}
      style={[s.value, disabled && { opacity: .5 }]}>
      <Text style={s.time}>{formatClockTime(value)}</Text>
      <Text style={s.change}>Change</Text>
    </Pressable>
    <Modal transparent visible={open} animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <SafeAreaView edges={["bottom"]} style={s.sheet}>
          <ScrollView contentContainerStyle={s.content}>
            <View style={s.heading}>
              <Text accessibilityRole="header" style={s.title}>{label}</Text>
              <Pressable accessibilityRole="button" onPress={close} style={s.cancel}><Text style={s.change}>Cancel</Text></Pressable>
            </View>
            <Text accessibilityLiveRegion="polite" style={s.preview}>{formatClockTime(to24Hour(chosen))}</Text>
            <Text style={s.label}>Hour</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Hour" style={s.grid}>
              {hours.map(hour => <Pressable key={hour} tone={chosen.hour === hour ? "selected" : "neutral"}
                accessibilityRole="radio" accessibilityLabel={`${hour} o’clock`} accessibilityState={{ checked: chosen.hour === hour }}
                onPress={() => setChosen(p => ({ ...p, hour }))} style={s.hour}>
                <Text style={[s.optionText, chosen.hour === hour && s.selected]}>{hour}</Text>
              </Pressable>)}
            </View>
            <Text style={s.label}>Minute</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="Minute" style={s.row}>
              {minutes.map(minute => <Pressable key={minute} tone={chosen.minute === minute ? "selected" : "neutral"}
                accessibilityRole="radio" accessibilityLabel={`${minute} minutes`} accessibilityState={{ checked: chosen.minute === minute }}
                onPress={() => setChosen(p => ({ ...p, minute }))} style={s.option}>
                <Text style={[s.optionText, chosen.minute === minute && s.selected]}>{String(minute).padStart(2, "0")}</Text>
              </Pressable>)}
            </View>
            <Text style={s.label}>AM or PM</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="AM or PM" style={s.row}>
              {(["AM", "PM"] as const).map(period => <Pressable key={period} tone={chosen.period === period ? "selected" : "neutral"}
                accessibilityRole="radio" accessibilityLabel={period} accessibilityState={{ checked: chosen.period === period }}
                onPress={() => setChosen(p => ({ ...p, period }))} style={s.option}>
                <Text style={[s.optionText, chosen.period === period && s.selected]}>{period}</Text>
              </Pressable>)}
            </View>
            <ActionButton title="Set time" onPress={() => { onChange(to24Hour(chosen)); close(); }} />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </View>;
}

const styles = (c: Colors) => StyleSheet.create({
  field: { marginBottom: 20 }, label: { ...t.label, color: c.ink, marginBottom: 8 },
  value: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  time: { ...t.body, color: c.ink, fontVariant: ["tabular-nums"] }, change: { ...t.label, color: c.action },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.55)", justifyContent: "flex-end", alignItems: "center", paddingTop: 48 },
  sheet: { backgroundColor: c.background, width: "100%", maxWidth: 520, maxHeight: "100%", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 20, paddingBottom: 24 }, heading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { ...t.section, color: c.ink, flexShrink: 1 }, cancel: { minHeight: 44, minWidth: 72, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  preview: { ...t.title, color: c.ink, fontVariant: ["tabular-nums"], marginVertical: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  hour: { minHeight: 48, minWidth: 44, flexBasis: "22%", flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  option: { flex: 1, minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", padding: 8 },
  optionText: { ...t.button, color: c.ink, fontVariant: ["tabular-nums"] }, selected: { color: c.action, textDecorationLine: "underline" },
});

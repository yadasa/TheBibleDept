import { GlassPressable as Pressable } from "../components/Glass";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../services/AuthProvider";
import { Colors, typography as t, useTheme, useThemedStyles } from "../theme";
import { ActionButton, Notice } from "../components/ui";
import { Field } from "../components/ui";
import { useState } from "react";
import { useHabit } from "../services/HabitProvider";
import { ReminderSettings } from "../components/ReminderSettings";

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth(),
    { mode, setMode, error } = useTheme(),
    { s } = useThemedStyles(styles);
  const habit = useHabit(),
    [zone, setZone] = useState(
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    );
  if (!user) return null;
  return (
    <View>
      <ActionButton
        title="Back to account"
        secondary
        icon="chevronLeft"
        onPress={onBack}
      />
      <Text accessibilityRole="header" style={s.title}>
        Settings
      </Text>
      <Text style={s.label}>Appearance</Text>
      <Text style={s.body}>
        Choose light or dark mode.
      </Text>
      <View style={s.choices}>
        {(["dark", "light"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityLabel={`${value} mode`}
            aria-checked={mode === value}
            accessibilityState={{ checked: mode === value }}
            onPress={() => setMode(value)}
            style={[s.choice, mode === value && s.selected]}
          >
            <Text style={s.choiceText}>
              {value === "dark" ? "Dark" : "Light"}
              {mode === value ? " ✓" : ""}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.body}>
        Choose the look that’s easiest on your eyes.
      </Text>
      {!!error && <Notice text={error} error />}
      <View style={{ marginTop: 32 }}>
        <Text style={s.label}>Reading streaks</Text>
        {habit.ready ? (
          <Notice
            text={`Reading days are counted in ${habit.zone}. Finish a whole chapter to count a reading day.`}
          />
        ) : (
          <>
            <Notice text="Choose the time zone used to count your reading days. It will stay the same when you travel. Existing reading dates will be kept as you recorded them." />
            <Field
              label="Reading time zone"
              value={zone}
              onChangeText={setZone}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="America/Chicago"
            />
            <ActionButton
              title="Confirm reading time zone"
              loading={habit.busy}
              onPress={() => void habit.configure(zone.trim()).catch(() => {})}
            />
          </>
        )}
        {!!habit.error && <Notice text={habit.error} error />}
      </View>
      <ReminderSettings />
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    title: { ...t.title, color: c.ink, marginTop: 24, marginBottom: 24 },
    label: { ...t.section, color: c.ink },
    body: { ...t.meta, color: c.muted, marginTop: 8 },
    choices: { flexDirection: "row", gap: 12, marginTop: 16 },
    choice: {
      flex: 1,
      minHeight: 52,
      padding: 16,
      borderWidth: 1,
      borderColor: c.controlBorder,
      borderRadius: 4,
      backgroundColor: c.surface,
    },
    selected: { borderColor: c.action, backgroundColor: c.tint },
    choiceText: { ...t.button, color: c.ink },
  });

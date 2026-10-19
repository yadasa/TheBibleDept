import { useEffect, useState } from "react";
import { Linking, Switch, Text, View } from "react-native";
import { NotificationPreferences } from "../../shared/reminders";
import {
  useNotifications,
  pushSupported,
} from "../services/NotificationProvider";
import { useHabit } from "../services/HabitProvider";
import { useTheme, typography as t } from "../theme";
import { ActionButton, Field, Notice } from "./ui";
export function ReminderSettings() {
  const n = useNotifications(),
    habit = useHabit(),
    { colors: c } = useTheme(),
    [draft, setDraft] = useState(n.prefs);
  useEffect(() => setDraft(n.prefs), [n.prefs]);
  function change(
    key: "enabled" | "keepMyRhythm" | "welcomeMeBack",
    value: boolean,
  ) {
    setDraft((p) => ({ ...p, [key]: value }));
  }
  const toggle = (
    label: string,
    key: "enabled" | "keepMyRhythm" | "welcomeMeBack",
  ) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingVertical: 12,
      }}
    >
      <Text style={{ ...t.body, color: c.ink, flex: 1 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={draft[key]}
        disabled={n.busy}
        onValueChange={(v) => change(key, v)}
        trackColor={{ false: c.border, true: c.action }}
        thumbColor={c.onAction}
      />
    </View>
  );
  return (
    <View
      style={{
        marginTop: 32,
        borderTopWidth: 1,
        borderColor: c.border,
        paddingTop: 24,
      }}
    >
      <Text style={{ ...t.section, color: c.ink }}>A gentle reminder</Text>
      <Notice text="A little encouragement, when you want it. At most one reminder a day and three a week. You can pause or turn them off anytime." />
      {!pushSupported && (
        <Notice text="Push delivery is available in signed iPhone and Android builds on a physical device. Preferences can be managed here; permission is requested only on your device." />
      )}
      {toggle("Enable reading reminders", "enabled")}
      {toggle("Keep my rhythm", "keepMyRhythm")}
      <Notice text="An evening nudge when yesterday was a reading day and you haven’t read today." />
      {toggle("Welcome me back", "welcomeMeBack")}
      <Notice text="A gentle invitation after 3 and 10 days away, then we give you space." />
      <Field
        label="Reminder time (HH:mm)"
        value={draft.preferredLocalTime}
        onChangeText={(v) => setDraft((p) => ({ ...p, preferredLocalTime: v }))}
        placeholder="19:30"
        maxLength={5}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Quiet hours start"
            value={draft.quietHours.start}
            onChangeText={(v) =>
              setDraft((p) => ({
                ...p,
                quietHours: { ...p.quietHours, start: v },
              }))
            }
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Quiet hours end"
            value={draft.quietHours.end}
            onChangeText={(v) =>
              setDraft((p) => ({
                ...p,
                quietHours: { ...p.quietHours, end: v },
              }))
            }
            maxLength={5}
          />
        </View>
      </View>
      <Notice
        text={`Times follow ${habit.zone || "your confirmed reading time zone"}. Use 15-minute steps. No sound or Focus bypass.`}
      />
      {pushSupported && (
        <ActionButton
          title={
            n.binding
              ? "Refresh permission on this device"
              : "Allow notifications on this device"
          }
          icon="bell"
          secondary
          disabled={!habit.ready}
          loading={n.busy}
          onPress={() => void n.enable().catch(() => {})}
        />
      )}
      {pushSupported && (
        <ActionButton
          title="Open device notification settings"
          variant="ghost"
          onPress={() => void Linking.openSettings()}
        />
      )}
      <ActionButton
        title="Save reminder preferences"
        loading={n.busy}
        onPress={() => void n.save(draft).catch(() => {})}
      />
      <ActionButton
        title="Pause for one week"
        secondary
        disabled={n.busy}
        onPress={() =>
          void n
            .save({ ...draft, pausedUntil: Date.now() + 7 * 86400000 })
            .catch(() => {})
        }
      />
      {!!n.prefs.pausedUntil && n.prefs.pausedUntil > Date.now() && (
        <>
          <Notice
            text={`Paused until ${new Date(n.prefs.pausedUntil).toLocaleDateString()}.`}
          />
          <ActionButton
            title="Resume reminders"
            variant="ghost"
            onPress={() =>
              void n.save({ ...draft, pausedUntil: null }).catch(() => {})
            }
          />
        </>
      )}
      {!!n.error && <Notice text={n.error} error />}
    </View>
  );
}

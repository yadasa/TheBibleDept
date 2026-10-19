import { useEffect, useState } from "react";
import { Linking, Switch, Text, View } from "react-native";
import {
  useNotifications,
  pushSupported,
} from "../services/NotificationProvider";
import { useHabit } from "../services/HabitProvider";
import { useTheme, typography as t } from "../theme";
import { ActionButton, Notice } from "./ui";
import { TimeField } from "./TimeField";
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
      <Text style={{ ...t.section, color: c.ink }}>Reading reminders</Text>
      <Notice text="Choose when you’d like a reminder. We send no more than one a day and three a week. You can pause or turn them off here." />
      {!pushSupported && (
        <Notice text="Notifications need the installed app on your phone. You can save your preferences here, but Expo Go and the browser preview won’t send reminders." />
      )}
      {toggle("Enable reading reminders", "enabled")}
      {toggle("Remind me after a missed day", "keepMyRhythm")}
      <Notice text="If you read yesterday but haven’t read today, we’ll remind you at the time below." />
      {toggle("Remind me after time away", "welcomeMeBack")}
      <Notice text="We’ll send a reminder after 3 days away and another after 10 days. After that, reminders stop until you read again." />
      <TimeField
        label="Reminder time"
        value={draft.preferredLocalTime}
        onChange={(v) => setDraft((p) => ({ ...p, preferredLocalTime: v }))}
        disabled={n.busy}
      />
      <View>
          <TimeField
            label="Quiet hours start"
            value={draft.quietHours.start}
            disabled={n.busy}
            onChange={(v) =>
              setDraft((p) => ({
                ...p,
                quietHours: { ...p.quietHours, start: v },
              }))
            }
          />
          <TimeField
            label="Quiet hours end"
            value={draft.quietHours.end}
            disabled={n.busy}
            onChange={(v) =>
              setDraft((p) => ({
                ...p,
                quietHours: { ...p.quietHours, end: v },
              }))
            }
          />
      </View>
      <Notice
        text={`Times use ${habit.zone || "your reading time zone"}. Choose a reminder time outside quiet hours. Reminders are silent and respect your phone’s Focus settings.`}
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

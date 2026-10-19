import { GlassPressable as Pressable, GlassSurface } from "../components/Glass";
import { StyleSheet, Text, View } from "react-native";
import { useMemo } from 'react';
import { currentStreak, summarizeDays, validDate } from "../../shared/habits";
import { ActionButton, Notice } from "../components/ui";
import { Icon, IconName } from "../components/Icon";
import { StreakCalendar } from '../components/StreakCalendar';
import { useReadings } from '../services/ReadingProvider';
import { useAuth } from "../services/AuthProvider";
import { useHabit } from "../services/HabitProvider";
import { useNotes } from "../services/NotesProvider";
import { usePlan } from "../services/PlanProvider";
import { getPlanChapters, getReadingPlanDay } from "../services/readingPlan";
import { Colors, useThemedStyles, typography as t } from "../theme";

export function HomeScreen({
  onRead,
  onAccount,
  onPrayer,
  onNotes,
}: {
  onRead: () => void;
  onAccount: () => void;
  onPrayer: () => void;
  onNotes: () => void;
}) {
  const { c, s } = useThemedStyles(styles),
    { user } = useAuth(),
    habit = useHabit(),
    notes = useNotes(),
    plan = usePlan(),
    history = useReadings(),
    day = getReadingPlanDay(plan.currentDay)!;
  const complete = plan.completedDays.length,
    dayComplete = plan.completedDays.includes(day.day),
    percent = Math.round((complete / 365) * 100),
    chapters = getPlanChapters(day.day),
    lastNote = notes.notes.find((n) => !!n.comment);
  const readDates=useMemo(()=>Array.from(new Set([...habit.days,...history.readings.map(reading=>reading.day)])).filter(day=>validDate(day)&&day<=habit.today),[habit.days,history.readings,habit.today]);
  const date = new Date(habit.today + "T12:00:00Z").toLocaleDateString(
    undefined,
    { month: "long", day: "numeric", weekday: "long", timeZone: "UTC" },
  );
  return (
    <View>
      <View style={s.dateRow}>
        <Text style={s.eyebrow}>{date}</Text>
        <View style={s.badge}>
          <View style={s.dot} />
          <Text style={s.badgeText}>READ & LISTEN</Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={s.hero}>
        Today’s reading<Text style={{ color: c.orange }}>.</Text>
      </Text>
      <Text style={s.intro}>
        Read today’s chapters, then listen to Dr. Manny Arango’s teaching.
      </Text>
      <GlassSurface style={s.reading}>
        <View style={s.topline}>
          <Text style={s.eyebrow}>THE 365-DAY PLAN</Text>
          <Icon name="book" color={c.action} />
        </View>
        <View style={s.dayRow}>
          <Text style={s.day}>Day {day.day.toString().padStart(2, "0")}</Text>
          <Text style={s.total}>/ 365</Text>
        </View>
        <Text style={s.reference}>{day.label}</Text>
        <Text style={s.meta}>
          {chapters.length} chapters ·{" "}
          {plan.finished ? "Plan complete" : dayComplete ? "Day complete" : "Your next reading"}
        </Text>
        <ActionButton
          title={plan.finished ? "Read again" : dayComplete ? `Review day ${day.day}` : `Read day ${day.day}`}
          icon="arrowRight"
          disabled={!plan.ready}
          onPress={onRead}
        />
        <View style={s.progressLabels}>
          <Text style={s.small}>{complete} days completed</Text>
          <Text style={s.small}>{percent}%</Text>
        </View>
        <View style={s.track}>
          <View
            style={{
              height: 4,
              backgroundColor: c.action,
              width: `${(complete / 365) * 100}%`,
            }}
          />
        </View>
      </GlassSurface>
      {!!plan.error && (
        <>
          <Notice text={plan.error} error />
          <ActionButton
            title="Reload saved progress"
            secondary
            onPress={plan.retry}
          />
        </>
      )}
      <Text style={s.device}>
        Pick up where you left off.
      </Text>
      <StreakCalendar days={readDates} today={habit.today} current={habit.ready?habit.current:currentStreak(summarizeDays(readDates),habit.today)}/>
      {!!habit.error && <Notice text={habit.error} error />}
      {!!plan.syncError && <Notice text={plan.syncError}/>}
      <View style={s.sectionRow}>
        <Text accessibilityRole="header" style={s.section}>
          Notes & prayers
        </Text>
        <Text style={s.small}>PRIVATE TO YOU</Text>
      </View>
      <View style={s.quickRow}>
        <QuickCard
          title="Your notes"
          body="Find your highlights and notes."
          icon="notes"
          onPress={onNotes}
        />
        <QuickCard
          title="Prayer journal"
          body="Write a prayer or revisit one."
          icon="heart"
          onPress={onPrayer}
        />
      </View>
      {lastNote && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to your latest note"
          onPress={onNotes}
          style={s.lastNote}
        >
          <Text style={s.eyebrow}>YOUR LATEST NOTE</Text>
          <Text style={s.noteComment} numberOfLines={3}>
            {lastNote.comment}
          </Text>
          <Text style={s.noteReference}>
            {lastNote.reference}:{lastNote.verseStart}
            {lastNote.verseStart === lastNote.verseEnd
              ? ""
              : `–${lastNote.verseEnd}`}
          </Text>
        </Pressable>
      )}
      <View style={s.footer}>
        <View style={s.shortRule} />
        <Text style={s.footerText}>The Bible Dept. with Dr. Manny Arango</Text>
      </View>
    </View>
  );
}
function QuickCard({
  title,
  body,
  icon,
  onPress,
}: {
  title: string;
  body: string;
  icon: IconName;
  onPress: () => void;
}) {
  const { c, s } = useThemedStyles(styles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [s.quick, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={24} color={c.action} />
      <Text style={s.quickTitle}>{title}</Text>
      <Text style={s.small}>{body}</Text>
      <View style={{ marginTop: 12 }}>
        <Icon name="arrowRight" size={18} color={c.muted} />
      </View>
    </Pressable>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    dateRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
    },
    eyebrow: {
      ...t.meta,
      color: c.muted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.3,
    },
    badge: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
    },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.action },
    badgeText: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1,
      color: c.muted,
    },
    hero: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "800",
      letterSpacing: -0.8,
      color: c.ink,
      marginTop: 16,
    },
    intro: { ...t.body, color: c.muted, marginTop: 8, marginBottom: 20 },
    reading: {
      borderRadius: 20,
      padding: 22,
    },
    topline: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    dayRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 10,
      marginTop: 26,
    },
    day: {
      fontSize: 42,
      lineHeight: 48,
      fontWeight: "800",
      letterSpacing: -1.5,
      color: c.ink,
    },
    total: { ...t.body, color: c.muted },
    reference: {
      fontSize: 25,
      lineHeight: 32,
      fontWeight: "600",
      letterSpacing: -0.6,
      color: c.ink,
      marginTop: 14,
    },
    meta: { ...t.meta, color: c.muted, marginTop: 6, marginBottom: 14 },
    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 22,
      marginBottom: 10,
    },
    track: { height: 4, backgroundColor: c.border },
    small: { ...t.meta, fontSize: 12, color: c.muted },
    device: { ...t.meta, fontSize: 11, color: c.muted, marginTop: 10 },
    section: { ...t.section, fontSize: 20, lineHeight: 27, color: c.ink },
    sectionRow: { marginTop: 32, marginBottom: 16, gap: 8 },
    quickRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
    quick: {
      flex: 1,
      minWidth: 140,
      padding: 18,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
    },
    quickTitle: {
      ...t.label,
      fontSize: 16,
      color: c.ink,
      marginTop: 18,
      marginBottom: 6,
    },
    lastNote: {
      marginTop: 24,
      borderLeftWidth: 2,
      borderLeftColor: c.action,
      paddingLeft: 18,
      paddingVertical: 8,
    },
    noteComment: { ...t.body, color: c.ink, marginTop: 12 },
    noteReference: { ...t.meta, color: c.actionText, marginTop: 10 },
    footer: { alignItems: "center", paddingTop: 36, gap: 12 },
    shortRule: { width: 26, height: 2, backgroundColor: c.orange },
    footerText: { ...t.meta, fontSize: 11, color: c.muted, letterSpacing: 1 },
  });

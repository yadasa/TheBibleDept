import { GlassPressable as Pressable, GlassSurface } from "../components/Glass";
import { StyleSheet, Text, View } from "react-native";
import { shiftDate } from "../../shared/habits";
import { ActionButton, Notice } from "../components/ui";
import { Icon, IconName } from "../components/Icon";
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
    day = getReadingPlanDay(plan.currentDay)!;
  const complete = plan.completedDays.length,
    dayComplete = plan.completedDays.includes(day.day),
    percent = Math.round((complete / 365) * 100),
    chapters = getPlanChapters(day.day),
    lastNote = notes.notes.find((n) => !!n.comment);
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
      {user && habit.ready ? (
        <View style={s.rhythm}>
          <View style={s.topline}>
            <Text style={s.section}>Reading streak</Text>
            <Icon name="flame" color={c.action} />
          </View>
          <View style={s.stats}>
            <View>
              <Text style={s.bigNumber}>
                {habit.current}
                <Text style={s.numberUnit}>
                  {" "}
                  {habit.current === 1 ? "day" : "days"}
                </Text>
              </Text>
              <Text style={s.small}>
                {habit.days.includes(habit.today)
                  ? "Today’s reading is counted."
                  : habit.current
                    ? "Read a chapter to count today."
                    : "Complete a chapter to start a streak."}
              </Text>
            </View>
            <View style={s.best}>
              <Text style={s.bestNumber}>{habit.streak.longest}</Text>
              <Text style={s.small}>Longest streak</Text>
            </View>
          </View>
          <View style={s.week}>
            {Array.from({ length: 7 }, (_, i) =>
              shiftDate(habit.today, i - 6),
            ).map((date) => {
              const done = habit.days.includes(date),
                today = date === habit.today,
                label = new Date(date + "T12:00:00Z").toLocaleDateString(
                  undefined,
                  { weekday: "short", timeZone: "UTC" },
                );
              return (
                <View
                  key={date}
                  accessibilityLabel={`${date}: ${done ? "read" : today ? "today, not completed" : "no reading"}`}
                  style={s.weekDay}
                >
                  <Text style={[s.weekLabel, today && { color: c.actionText }]}>
                    {label}
                  </Text>
                  <View
                    style={[
                      s.weekCircle,
                      done && {
                        backgroundColor: c.action,
                        borderColor: c.action,
                      },
                      today &&
                        !done && { borderColor: c.action, borderWidth: 2 },
                    ]}
                  >
                    {done ? (
                      <Icon name="check" size={18} color={c.onAction} />
                    ) : (
                      <Text style={{ color: c.muted, fontSize: 13 }}>
                        {date.slice(8)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={s.small}>
            {habit.streak.totalReadingDays} reading{" "}
            {habit.streak.totalReadingDays === 1 ? "day" : "days"} total ·{" "}
            {habit.zone}
          </Text>
        </View>
      ) : (
        <View style={s.setup}>
          <View style={s.topline}>
            <Text style={s.section}>Track your reading</Text>
            <Icon name="flame" color={c.action} />
          </View>
          <Notice
            text={
              user
                ? "Choose your time zone in Account → Settings to start counting reading days."
                : "Sign in to track reading days and save your notes and prayers."
            }
          />
          <ActionButton
            title={user ? "Open account" : "Sign in or create an account"}
            variant="ghost"
            icon="arrowRight"
            onPress={onAccount}
          />
        </View>
      )}
      {!!habit.error && <Notice text={habit.error} error />}
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
    rhythm: {
      marginTop: 32,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.border,
      paddingVertical: 24,
    },
    section: { ...t.section, fontSize: 20, lineHeight: 27, color: c.ink },
    stats: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      marginVertical: 20,
    },
    bigNumber: {
      fontSize: 38,
      lineHeight: 44,
      fontWeight: "800",
      letterSpacing: -1,
      color: c.ink,
    },
    numberUnit: {
      fontSize: 17,
      fontWeight: "500",
      letterSpacing: 0,
      color: c.muted,
    },
    best: {
      borderLeftWidth: 1,
      borderColor: c.border,
      paddingLeft: 20,
      justifyContent: "center",
    },
    bestNumber: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "700",
      color: c.ink,
    },
    week: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 4,
      marginBottom: 18,
    },
    weekDay: { alignItems: "center", flex: 1, gap: 9 },
    weekLabel: { fontSize: 10, lineHeight: 16, color: c.muted },
    weekCircle: {
      minWidth: 32,
      minHeight: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    setup: {
      marginTop: 28,
      paddingTop: 24,
      borderTopWidth: 1,
      borderColor: c.border,
    },
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

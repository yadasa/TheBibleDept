import { Text, View } from "react-native";
import { chapterFromReference } from "../../shared/habits";
import { Passage } from "../services/bible";
import { useAuth } from "../services/AuthProvider";
import { useHabit } from "../services/HabitProvider";
import { useTheme, typography as t } from "../theme";
import { ActionButton, Notice } from "./ui";
export function ReadingCompletion({
  passage,
  source,
  planDay,
  onAccount,
}: {
  passage: Passage;
  source: "reader" | "plan";
  planDay?: number;
  onAccount: () => void;
}) {
  const { user } = useAuth(),
    habit = useHabit(),
    { colors: c } = useTheme();
  if (!chapterFromReference(passage.reference))
    return (
      <Notice text="Only whole chapters count toward your reading streak. You can still highlight these verses and save a note." />
    );
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: c.border,
        paddingTop: 20,
        marginTop: 20,
        marginBottom: 16,
      }}
    >
      <Text style={{ ...t.section, color: c.ink }}>
        Finished this chapter?
      </Text>
      <Notice
        text={
          habit.days.includes(habit.today)
            ? "Today’s reading is already counted. You can still save this chapter."
            : "One complete chapter counts as a reading day."
        }
      />
      {!user ? (
        <ActionButton
          title="Sign in to track reading days"
          secondary
          onPress={onAccount}
        />
      ) : !habit.ready ? (
        <ActionButton
          title="Set up reading streaks in Settings"
          secondary
          onPress={onAccount}
        />
      ) : (
        <ActionButton
          title="I've finished this chapter"
          icon="check"
          loading={habit.busy}
          onPress={() =>
            void habit.complete(passage, source, planDay).catch(() => {})
          }
        />
      )}
      {habit.receipt && (
        <Notice
          success
          text={
            habit.receipt.milestone
              ? `That’s a ${habit.receipt.milestone}-day streak. Your reading is saved.`
              : habit.receipt.awardedNewDay
                ? `Reading saved. Your current streak is ${habit.receipt.current} ${habit.receipt.current === 1 ? "day" : "days"}.`
                : "Chapter saved. Your reading day was already counted."
          }
        />
      )}
      {!!habit.error && <Notice error text={habit.error} />}
      {!!habit.pending && (
        <View>
          <Notice
            text={`Reading from ${habit.pending.expectedHabitDate} is waiting to sync. If that reading day has ended, it won’t be counted as today.`}
          />
          <ActionButton
            title="Retry saving"
            secondary
            disabled={habit.busy}
            onPress={() => void habit.retry().catch(() => {})}
          />
          <ActionButton
            title="Discard unsaved reading"
            variant="ghost"
            disabled={habit.busy}
            onPress={() => void habit.discard().catch(() => {})}
          />
        </View>
      )}
    </View>
  );
}

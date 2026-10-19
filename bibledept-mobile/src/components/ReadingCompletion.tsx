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
      <Notice text="Finish a whole chapter to count a reading day. You can highlight these verses and save a note." />
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
        Take a moment. Let it settle.
      </Text>
      <Notice
        text={
          habit.days.includes(habit.today)
            ? "Today is counted. Another chapter is always welcome."
            : "One complete chapter counts as a reading day."
        }
      />
      {!user ? (
        <ActionButton
          title="Sign in to save your reading"
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
              ? `${habit.receipt.milestone} days of showing up. Keep growing at your pace.`
              : habit.receipt.awardedNewDay
                ? `Reading saved · ${habit.receipt.current} ${habit.receipt.current === 1 ? "day" : "days"} in your rhythm.`
                : "Chapter saved. Your reading day was already counted."
          }
        />
      )}
      {!!habit.error && <Notice error text={habit.error} />}
      {!!habit.pending && (
        <View>
          <Notice
            text={`Pending reading from ${habit.pending.expectedHabitDate}. Retry safely; a day that has ended will not be moved to today.`}
          />
          <ActionButton
            title="Retry pending reading"
            secondary
            disabled={habit.busy}
            onPress={() => void habit.retry().catch(() => {})}
          />
          <ActionButton
            title="Dismiss pending reading"
            variant="ghost"
            disabled={habit.busy}
            onPress={() => void habit.discard().catch(() => {})}
          />
        </View>
      )}
    </View>
  );
}

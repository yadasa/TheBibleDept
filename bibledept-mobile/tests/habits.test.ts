import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDay,
  chapterFromReference,
  currentStreak,
  emptyStreak,
  localDate,
  summarizeDays,
  validateCompletion,
} from "../shared/habits";
import {
  defaultPreferences,
  inQuietHours,
  parseResumeIntent,
  reminderCandidate,
  reminderWindow,
  validatePreferences,
} from "../shared/reminders";
test("habit dates cross DST and the year using the confirmed zone", () => {
  assert.equal(
    localDate(Date.parse("2026-03-08T07:59:00Z"), "America/Chicago"),
    "2026-03-08",
  );
  assert.equal(
    localDate(Date.parse("2026-03-08T08:01:00Z"), "America/Chicago"),
    "2026-03-08",
  );
  assert.equal(
    localDate(Date.parse("2026-01-01T01:00:00Z"), "America/Chicago"),
    "2025-12-31",
  );
  const streak = summarizeDays(["2025-12-31", "2026-01-01", "2026-01-01"]);
  assert.equal(streak.current, 2);
  assert.equal(currentStreak(streak, "2026-01-02"), 2);
  assert.equal(currentStreak(streak, "2026-01-03"), 0);
  const restarted = addDay(streak, "2026-01-04");
  assert.deepEqual(restarted, {
    current: 1,
    longest: 2,
    totalReadingDays: 3,
    lastQualifiedDate: "2026-01-04",
  });
});
test("only canonical complete chapters and matching plan membership qualify", () => {
  assert.equal(chapterFromReference("Luke 1"), "LUK.1");
  assert.equal(chapterFromReference("John 3:16"), null);
  assert.equal(chapterFromReference("Luke 25"), null);
  const data = {
    sessionId: "12345678-1234-1234-1234-123456789012",
    chapterId: "LUK.1",
    translation: "web",
    source: "plan",
    planDay: 1,
    expectedHabitDate: "2026-10-18",
  };
  assert.equal(validateCompletion(data).chapterId, "LUK.1");
  assert.throws(() => validateCompletion({ ...data, chapterId: "GEN.1" }));
  assert.throws(() =>
    validateCompletion({ ...data, expectedHabitDate: "2026-02-30" }),
  );
});
test("reminders respect local windows, quiet hours, cooldowns and the shared budget", () => {
  const now = Date.parse("2026-10-19T00:30:00Z"),
    zone = "America/Chicago",
    prefs = {
      ...defaultPreferences,
      enabled: true,
      preferredInstallationId: "12345678-1234-1234-1234-123456789012",
    };
  const streak = addDay(emptyStreak, "2026-10-17");
  assert.equal(reminderCandidate(now, zone, prefs, streak, {}), "streak");
  assert.equal(
    reminderCandidate(now, zone, prefs, addDay(streak, "2026-10-18"), {}),
    null,
  );
  assert.equal(
    reminderCandidate(now, zone, prefs, streak, {
      lastForegroundAt: now - 1000,
    }),
    null,
  );
  assert.equal(
    reminderCandidate(now, zone, prefs, streak, {
      recentAttempts: [now - 86400000, now - 2 * 86400000, now - 3 * 86400000],
    }),
    null,
  );
  assert.equal(
    reminderCandidate(now, zone, prefs, streak, {
      lastDispatchAttemptAt: now - 23 * 3600000,
    }),
    null,
  );
  assert.equal(reminderWindow(now + 3600000, zone, prefs), null);
  assert.equal(
    reminderWindow(Date.parse("2026-10-19T01:29:50Z"), zone, prefs)?.ttl,
    10,
  );
  assert.equal(inQuietHours(22 * 60, prefs.quietHours), true);
  assert.throws(() =>
    validatePreferences({ ...prefs, preferredLocalTime: "21:00" }),
  );
});
test("welcome-back is optional and stops after two handoffs in an inactivity episode", () => {
  const now = Date.parse("2026-10-19T00:30:00Z"),
    p = {
      ...defaultPreferences,
      enabled: true,
      welcomeMeBack: true,
      preferredInstallationId: "12345678-1234-1234-1234-123456789012",
    },
    streak = addDay(emptyStreak, "2026-10-15");
  assert.equal(
    reminderCandidate(now, "America/Chicago", p, streak, {}),
    "comeback",
  );
  const later = now + 7 * 86400000;
  assert.equal(
    reminderCandidate(later, "America/Chicago", p, streak, {
      inactivityEpisodeId: "2026-10-15",
      comebackHandoffs: 1,
      lastComebackHandoffAt: now,
    }),
    "comeback",
  );
  assert.equal(
    reminderCandidate(later, "America/Chicago", p, streak, {
      episodePaused: true,
      comebackHandoffs: 2,
    }),
    null,
  );
  assert.equal(
    reminderCandidate(later, "America/Chicago", p, streak, {}),
    null,
  );
  assert.equal(
    parseResumeIntent({
      version: 1,
      kind: "resume-reading",
      notificationId: "a".repeat(24),
      accountScope: "b".repeat(24),
    })?.kind,
    "resume-reading",
  );
  assert.equal(
    parseResumeIntent({
      version: 1,
      kind: "open-url",
      url: "https://bad.example",
    }),
    null,
  );
});

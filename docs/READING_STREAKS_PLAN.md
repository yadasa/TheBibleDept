# Reading streak implementation plan

Status: **Planned, not implemented.** Updated October 18, 2026 against repository commit `3b84b67`. This plan extends the active Expo client in `bibledept-mobile`. It does not deploy functions, alter Firestore rules, or enable reminders.

## Product outcome

Help a reader build a sustainable daily Scripture habit. One explicitly completed chapter earns one calendar day's credit. Additional chapters remain meaningful reading activity without adding extra streak days. Celebrate returning, keep a missed day easy to recover from, and preserve past achievements.

Use the [Bible Dept style direction](style-guide/README.md): warm paper, deep ink, purposeful orange, readable action colors, simple icons, modest corners, comfortable text, and patient copy. The streak is private by default. Leaderboards, paid restores, competitive points, and notification campaigns are outside the first release.

## Current implementation and gaps

| Existing source | Current behavior | Planned change |
| --- | --- | --- |
| [ReadingProvider](../bibledept-mobile/src/services/ReadingProvider.tsx) | Listens to at most 366 `readings` documents and calculates a streak locally. A completion overwrites that date's single passage record. | Introduce one completion service, immutable session receipts, a daily ledger, and a server-owned summary. Preserve recent-reading presentation during migration. |
| [readingDays](../bibledept-mobile/src/services/readingDays.ts) | Uses the device's calendar and permits today to be unfinished while yesterday's streak remains active. | Preserve that grace through the end of today, using an account habit timezone and server dates. |
| [BibleScreen](../bibledept-mobile/src/screens/BibleScreen.tsx) | Offers manual reading completion. Passage entry may include short verse selections. | Offer a qualifying full-chapter completion action and distinguish shorter passage history from streak credit. |
| [PlanScreen](../bibledept-mobile/src/screens/PlanScreen.tsx) and [PlanProvider](../bibledept-mobile/src/services/PlanProvider.tsx) | Completing a plan day advances device-only position. It does not call the cloud reading-completion service. | Add per-chapter completion through the same service. Keep the plan-day advancement action separate. |
| [HomeScreen](../bibledept-mobile/src/screens/HomeScreen.tsx) | Shows the current basic reading metric. | Add a weekly row, current status, longest streak, and milestone details. |
| [Firestore rules](../bibledept-mobile/firestore.rules) | Root profile writes accept only `displayName` and `updatedAt`; existing reading records are owner-writable. | Put habit data in explicit new subcollections with server-owned credit and statistics. |

The app now also has [daily podcast playback](PODCASTS.md). Listening alone does not qualify for this reading streak in version one. A later listening habit would need its own explicit qualification policy.

## Qualification policy

| Situation | Result |
| --- | --- |
| Reader confirms a full chapter complete | Save a session; award today's credit if it is the first qualifying session today. |
| Another chapter on the same day | Save the session; leave the day count unchanged. |
| A repeat tap or retry of the same session | Return the original result; create no duplicate session or credit. |
| The previous credited date is yesterday | Extend the streak by one when today qualifies. |
| The previous credited date is earlier than yesterday | Start a new current streak at one; preserve longest streak and total reading days. |
| Today is unfinished but yesterday qualified | Keep the current streak visible until today's account-local day ends. |
| Person opens the app, plays audio, changes translation, or browses a plan day | No reading credit. |
| Person completes the entire plan day's readings | Per-chapter sessions may already have earned today's credit; advancing the plan does not award a second day. |

This is a reader's explicit confirmation, not proof of attention or a timed reading test. Do not require a minimum screen timer, quiz, or scroll gesture to judge whether someone has read. Validate that the submitted chapter exists and the source is allowed; do not convert a single verse reference into a completed chapter automatically.

### Calendar and timezone

At setup, offer the device's IANA timezone and ask the reader to confirm their habit timezone. Store the confirmed value on the account. The backend derives the calendar date from server time in that zone. A client-supplied date is never the authority for awarding credit.

The first release keeps that habit timezone fixed after setup; travel or device-clock changes do not silently reassign days. A later timezone-change workflow must define prospective transitions before it is enabled. Use calendar-date arithmetic in the chosen zone, not subtraction of 86,400,000 milliseconds. Test both daylight-saving transitions and dates around UTC midnight.

## App experience

**Today:** keep the existing reading action prominent. Under the reading card, show a compact flame, the current streak, seven labeled day marks, and whether today is complete. Each mark uses text or a check as well as color. Tapping the card opens longest streak, a reading calendar, and the next milestone.

**Reader and plan chapter:** place “Mark chapter complete” after the chapter. Show saving, saved, retry, and expired-day feedback. Keep the reading itself free of decorative animations. A second completion today can save another session without replaying a daily-credit celebration.

**Confirmation:** after the backend confirms new daily credit, show a brief “7 days. Keep growing.” state. Celebrate 7, 30, 100, and 365 consecutive credited days once per milestone. Honor reduced motion; sound and haptics are optional. Historical migration does not replay old celebrations.

**Missed day:** use “Welcome back. Make room for today.” Preserve longest streak, lifetime reading days, and previous milestones. Streak freezes or grace tokens are a later feature; a protected day must not be represented as a day read.

**Guest:** keep reading available without an account. Explain that cloud streak history requires sign-in. Do not merge a guessed local total into cloud statistics; a future guest-history import would need individual events and an explicit policy.

## Proposed Firestore model

All paths remain separate from the retained church application's user records:

```text
bibledeptUsers/{uid}/settings/readingHabit
  timeZone: "America/Chicago"
  timeZoneConfirmedAt: Timestamp
  qualificationVersion: 1

bibledeptUsers/{uid}/habitDays/{YYYY-MM-DD}
  localDate: "2026-10-18"
  timeZone: "America/Chicago"
  firstCompletedAt: Timestamp
  firstSessionId: "stable-session-id"
  qualificationVersion: 1

bibledeptUsers/{uid}/readingSessions/{sessionId}
  chapterId: "luke-1"
  translation: "web"
  source: "plan" | "reader"
  planDay: number | null
  receivedAt: Timestamp
  creditedDate: "2026-10-18"
  awardedNewDay: true
  qualificationVersion: 1

bibledeptUsers/{uid}/stats/streak
  current: 7
  longest: 14
  totalReadingDays: 31
  lastQualifiedDate: "2026-10-18"
  updatedAt: Timestamp
  qualificationVersion: 1
```

Values above are examples. `current` describes the run as of `lastQualifiedDate`, not an automatically fresh number forever. Derive the displayed value from those fields and the current account-local date: use the stored run when the last date is today or yesterday; otherwise display zero. Refresh on app foreground, account changes, and the next local midnight. No per-user midnight write is needed just to reset a visible number.

Keep each daily record immutable. Sessions preserve multiple chapters in a day; the daily ledger deduplicates credit; the summary avoids downloading years of history. Read the summary plus the bounded calendar interval needed by the screen. Never cap the authoritative run at the existing 366-record listener window.

## Completion API and atomic update

Proposed authenticated callable: `completeReading({ sessionId, chapterId, translation, source, planDay?, expectedHabitDate })`.

The app creates a random stable session ID once for a confirmation attempt and persists the pending payload in AsyncStorage under the signed-in owner. It reuses the same ID for retries. `expectedHabitDate` is a stale-request guard, not a credit authority.

1. Require authentication and a supported account provider. Derive the UID from authentication, never from the payload. Validate field limits, canonical chapter, translation, source, and any supplied plan-day membership.
2. In a transaction, read the existing session receipt first. If present, return that original result before evaluating the new wall-clock date. Reuse of an ID with a different payload is rejected.
3. Read the confirmed habit settings and summary. Using a fixed server request time, derive the current date and yesterday in the account timezone. Read today's daily record before writing.
4. For a new session, require `expectedHabitDate` to equal the server-derived date. A stale first submission must not turn yesterday's unsent completion into today's activity.
5. Create the session receipt. If today's ledger already exists, award no new day. Otherwise create the daily record, extend yesterday's run or start at one, update longest, and increment lifetime reading days once.
6. Commit the receipt, daily ledger, and summary atomically. Return the canonical credited date, whether a new day was awarded, summary, and newly crossed milestone, if any.

Do not send push messages or perform other external side effects inside a transaction callback; it may retry. A milestone is derived from a confirmed result and displayed once per account/milestone, including after reconnecting on another device. The implementation should store the once-only achievement identifier if cross-device celebration suppression is required.

An acknowledged request whose response was lost can safely retry after midnight and return its original receipt. If no receipt exists and its expected day has passed, return `failed-precondition` with an `expired_day` reason. Preserve the pending reading for review, explain that it was not credited to today, and do not silently backdate or relabel it. A future bounded late-credit/grace policy is separate work. Never display an unconfirmed cloud award as saved.

## Rules and account lifecycle

Owners can read their own habit settings, daily ledger, session receipts, and summary. Clients cannot directly create, update, or delete credit, statistics, or receipts. Habit setup uses an authenticated validated backend operation. Add explicit rules for the new paths; the existing profile allowlist is not an invitation to put statistics on the root document.

Server SDK access requires validation in the callable itself; Firestore client rules do not validate Admin SDK writes. Keep credentials out of the app. Handle sign-out and account switches by clearing listeners, hiding the previous owner's state immediately, and segregating pending events. Account deletion removes the new subcollections as well as existing records through an appropriate backend deletion path.

## Migration and release sequence

1. **Define and test the policy.** Add a shared calendar/qualification specification and server tests for daily boundaries, gaps, and duplicate attempts.
2. **Add the backend in isolation.** Implement habit setup, completion transaction, schema versioning, and owner-only reads/server-owned writes. Use a maintained Functions deployment configuration; the retained functions project is migration source, not an assumption that this endpoint is already deployed.
3. **Backfill existing history once.** Read all valid legacy daily records, not only the latest 366. Validate actual date IDs, deduplicate dates, derive longest/current totals, record the timezone assumption and migration marker, and mark their origin as legacy self-reported history. Do not imply historical timezone precision that was never recorded. Serialize migration and live completions through the same per-user initialization transaction or keep new credits disabled until migration finishes.
4. **Connect both readers.** Replace their separate completion behavior with the shared service. Preserve device-only plan position and existing read access. Old clients can retain their legacy experience during the upgrade; do not count both legacy writes and new receipts for the same date.
5. **Add the streak UI.** Weekly row, accessible status, longest streak, calendar, milestone confirmation, pending/error states, and gentle restart language.
6. **Pilot and expand.** Use test accounts and a small opted-in group. Check counting integrity and actual device behavior before wider release. Introduce notifications only after their independent consent and suppression behavior has been verified.

## Required acceptance checks

- First completion creates one session, one daily record, and a current streak of one.
- Additional same-day sessions, simultaneous requests from two devices, double taps, transaction retries, and replay after midnight never award a second day.
- A yesterday-ending run remains active while today is unfinished; a real gap resets only the current run.
- The account timezone governs UTC-boundary and daylight-saving cases; a forged client time or date does not backdate credit.
- A stale unsent request is explained and not credited to another day.
- More than 366 consecutive historical days produce the full run and longest streak.
- Standalone and plan chapter completion behave identically; plan navigation and podcast playback do not create credits.
- Cross-user reads and direct client writes to totals/credits fail in emulator rule tests.
- Sign-out, account switching, migration retries, and deletion do not leak or duplicate history.
- Large text, screen readers, color-independent day states, reduced motion, and network recovery work on target devices.

## Technical references

[Firebase callable functions](https://firebase.google.com/docs/functions/callable) describes authenticated app-to-function calls. [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) explains atomic writes and retried callbacks. [Firestore rule conditions](https://firebase.google.com/docs/firestore/security/rules-conditions) covers owner checks and the server SDK distinction. Recheck these APIs and the repository's installed SDK versions at implementation time.

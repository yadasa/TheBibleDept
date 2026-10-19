# Launch plans

**Drafts for a later release. These documents do not activate a sign-in gate or a first-run onboarding flow.** Reading and listening currently remain available without an account.

| Plan | Purpose | Status |
| --- | --- | --- |
| [Required sign-in](AUTH_GATE_PLAN.md) | Introduce a clear account entry point, preserve links and existing local progress, and handle session recovery. | Proposed; off by default. |
| [First-time onboarding](ONBOARDING_PLAN.md) | Explain the daily reading/listening rhythm and help a reader start Day 1 without unnecessary setup. | Proposed; not implemented. |

## What can be reused

The active app is [bibledept-mobile](../../bibledept-mobile/). Its existing account flow supports email/password registration, sign-in, password recovery, and persistent sessions. Phone sign-in has separate platform/build requirements; it must not be the only way into the app. The current account pages expose real profile, progress, appearance, reading, and reminder preferences.

Plan position, chapter reading checks, scroll position, and observed podcast listening are stored locally under separate guest/account owners. Notes, prayers, saved chapter history, and reading-day records use the signed-in account. Signing in does not currently merge the guest's local plan with the account's local plan.

The new plans must preserve that distinction. Requiring an account would not by itself make local reading/listening progress sync across phones.

## Implementation order

1. Finish the release prerequisites and session tests in the sign-in plan.
2. Add the gate behind an explicit flag that defaults to off; validate in an isolated test environment.
3. Add versioned onboarding and test it with the gate both off and on.
4. Validate the signed iPhone build, recovery paths, accessibility, and links before considering a rollout.
5. Release in small reviewable parts, with a working rollback at each stage.

Do not deploy a gate, change production authentication settings, migrate local data, or request notification permission as part of this documentation checkpoint.

## Related implementation records

- [Local testing](../LOCAL_TESTING.md)
- [Reading plan and local progress](../READING_PLAN.md)
- [Habit setup and platform limits](../HABIT_FEATURES_SETUP.md)
- [App links](../APP_LINKS.md)
- [Current request and verification ledger](../REQUEST_AUDIT.md)
- [Style and taste guide](../style-guide/README.md)

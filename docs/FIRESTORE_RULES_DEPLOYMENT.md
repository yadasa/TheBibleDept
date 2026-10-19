# BibleDept shared-project rules repair

October 19, 2026: the live `church-2612f` rules still contained the original
readings/prayers namespace, without the newer annotations, habit-day, settings,
stats and device read branches. These omissions caused the highlights and
reading-history errors for signed-in readers.

The active app's canonical `bibledept-mobile/firestore.rules` namespace was merged
into a fresh download of the live rules and published. Every byte outside that
namespace was preserved. Reading-day summaries and settings remain server-owned;
annotation/prayer writes remain validated and private to email/phone owners.
No journal content was changed or seeded into the church project.

Validation: two merge tests, a compiled merged ruleset, and an emulator integration
test covering owner queries, cross-owner and signed-out denials, malformed notes,
and denied client writes to reading/streak/settings records. The active live web
preview was reloaded and both reported errors were absent after opening Bible.
The prior ruleset and complete downloaded source are retained locally for rollback.

For later shared-project releases, use
`bibledept-mobile/scripts/merge-firestore-rules.cjs` with a **fresh** live source,
the canonical rules, and a separate output file. It refuses ambiguous namespaces.
Review and test the merge before publishing; never deploy the standalone demo
rules over the shared project. Recheck the live release immediately before changing
it to avoid overwriting concurrent church updates.

Publishing used the [Firebase Rules release API](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/patch).
This checkpoint did not deploy backend Functions, enable notifications, or change
the sign-in/onboarding gate.

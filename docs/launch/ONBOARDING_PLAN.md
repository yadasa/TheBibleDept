# First-time onboarding: experience draft

**Status: proposed, not implemented.** This document does not add launch screens, require an account, request notification permission, or move anyone's plan day.

## Purpose

Help a new reader understand the daily rhythm: read the day's chapters, listen to the teaching, and come back tomorrow. Start at **Day 1**. Keep the first useful reading close; theme, text size, account details, and reminders should not turn into a long setup form.

Use the [Bible Dept style guide](../style-guide/README.md): warm, direct sentences, strong headings, quiet reading surfaces, consistent orange, and one clear next action. The welcome is an app screen, not a marketing landing page. Do not restore the logo removed from the sign-in form or add guest/free-access footer copy.

## Proposed sequence

| Step | Reader-facing content | Working action |
| --- | --- | --- |
| Welcome | “Read a little every day.” Explain the 365-day plan and corresponding daily teaching in two short sentences. | **Get started**. An existing reader has a clear **Sign in** option. |
| Account, when required | Reuse the existing account form and recovery routes. Describe notes, prayers, and reading history without promising cross-device plan/listening sync. | Sign in/create account, then continue the pending flow. If the proposed gate remains off, an explicit **Start reading** action may continue without an account. |
| Reading comfort | Offer the actual available translation and text-size controls with a small preview. Appearance remains optional and uses the real saved theme preference for signed-in accounts. | **Continue**; keeping the defaults must work. |
| Your first day | Show the real Day 1 passages from the bundled plan. Explain that the daily teaching sits with the reading. | **Start Day 1**, opening the plan at its first chapter. If a valid Scripture/reminder link started the flow, use **Continue reading** and open that destination instead. |

Only show choices that work. The current available Bible translations are World English Bible and King James Version. A licensed translation such as NIV must not appear as selectable until the access, provider integration, attribution, and error paths actually exist.

An optional introductory episode may be presented as **Before Day 1** after its official source and metadata are verified. It must be optional, distinct from the numbered plan, and must not count as Day 1 or manufacture completion/listening credit. Do not add a fake Day 0 to the 365-day passage map.

## Preferences without friction

- Keep translation and reading text size on their existing shared preference APIs. The current preferences save on the device; do not describe them as account synchronization.
- Appearance uses the existing per-account local theme preference. Do not promise a guest appearance option that the current provider does not support.
- Do not require reading-streak time-zone confirmation before someone can read. Explain it when the reader chooses to track reading days or set up reminders. The current reading time zone is fixed once confirmed, so present that fact before confirmation.
- Do not request notification permission at first launch. After a reader finishes or deliberately opens reminders, offer a contextual invitation with **Choose reminders** and **Not now**. Only the reader's explicit action may open the operating-system prompt.
- Expo Go/browser reminder limitations and unresolved lock-screen playback must not become promises of working installed-app features in the welcome.

## Resume and replay

Introduce a small versioned onboarding checkpoint only when implementing this flow. It should record the flow version, owner scope, current step, and completion acknowledgement; never credentials, verification codes, private note text, or audio content.

Wait for authentication and owner-scoped local progress to hydrate before deciding whether onboarding is due. Keep guest and account checkpoints separate. If someone signs in midway, continue with the authenticated owner and preserve any validated pending link. Do not silently convert the guest's lesson records into account progress; use the separate choice in the [sign-in plan](AUTH_GATE_PLAN.md#existing-guest-progress).

Persist each completed step, recover gracefully from a failed save, and do not declare onboarding finished until its final acknowledgement is durable. Closing the app should resume the same incomplete step. Back navigation must preserve entered preferences and avoid duplicate account creation or verification sends. A completed account should not see the welcome on every launch or after a small copy edit.

Provide a **Getting started** replay entry under Account once the flow exists. Replay explains the app without resetting Day 1, completed lessons, notes, theme, reminder settings, or onboarding eligibility. An existing reader's plan continues from their current day.

## Motion and accessibility

Use the same short, gentle page transitions as the account subpages. Honor reduced motion, keep a single interactive page mounted for a step, and move screen-reader focus to the new heading when the step changes. Do not rely on animation or orange alone to indicate selection.

Support narrow iPhone widths, large text, VoiceOver, keyboard navigation, safe-area insets, and the software keyboard. Controls should retain at least 44-point touch targets; descriptions may wrap without pushing the only next action out of reach. Show a simple step indicator in text, not an autoplay carousel or timed advance.

## Implementation parts and acceptance

1. Define and test versioned checkpoint parsing, owner separation, resume rules, and a default-off onboarding release flag.
2. Build the welcome and real preference screens using current controls; make Back, continue, skip, reduced-motion behavior, and screen-reader focus work.
3. Integrate the existing account/recovery routes and pending destinations with both optional-account and mandatory-account modes.
4. Add the real Day 1 handoff and an optional verified introduction if available. Never write lesson completion from an onboarding action.
5. Add replay and contextual reminder invitations, then validate with the actual signed iPhone build.

Check a fresh install, a returning account, guest-to-account sign-in, two accounts on one phone, interrupted registration, expired verification, app closure at every step, failed local saves, a valid incoming link, a rejected link, and a notification resume intent. Verify that no settings are applied twice and no progress is reset.

Do not add analytics as an incidental dependency. If product measurement is introduced separately, use coarse flow-step and success/failure events, avoid passage/note content and account identifiers, and document retention and opt-out behavior before enabling it. No analytics instrumentation is activated by this draft.

Rollback disables the onboarding flag and returns directly to the existing app/account behavior. Preserve checkpoints and all reading data so a later corrected flow can resume safely.

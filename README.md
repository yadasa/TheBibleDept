# The Bible Department

**A daily Bible reading plan with teaching from Dr. Manny Arango.**

The Bible Department, also known as **BibleDept**, is a free app for following The Bible Dept.'s 365-day reading plan, reading Scripture, and listening to each day's podcast. Readers can also save private notes and prayers and track their reading days.

The app follows the reading plan and daily teaching described on the [Bible Dept website](https://www.thebibledept.com/). Older community, study, and ministry features remain in the repository as migration references; the active client's features are listed below.

## Purpose

Open your current plan day, read its chapters, and listen to the corresponding teaching. Your place in the plan stays on the device, so you can return to it or browse another day without losing your place.

An optional account saves notes, prayers, and reading history. Reading and listening do not require an account or payment.

## The public Bible Dept experience

The website currently offers:

- **A year-long reading journey:** a 365-day plan that starts in the New Testament and guides readers through the Bible.
- **A free printable reading plan:** available through the [reading-plan page](https://www.thebibledept.com/plan).
- **Daily teaching with Dr. Manny Arango:** podcast and video episodes available through Apple Podcasts, Spotify, and YouTube on the [Listen page](https://www.thebibledept.com/listen).
- **A guided starting point:** the [Start Here page](https://www.thebibledept.com/start-here) explains how to choose a Bible, get the plan, and follow the daily teaching.
- **Community and further learning:** connections to the ARMA community and courses for people who want to go deeper.

These are the public website's offerings. The app's existing software capabilities are outlined below; the website's content and services should not be assumed to be integrated into the app already.

## Style and taste guide

The [Bible Dept and ARMA style and taste guide](docs/style-guide/README.md) documents the two public sites' visual foundations, design judgment, page schemas, components, imagery, and voice for related projects. It includes measured source evidence, reusable reference tokens, a local visual reference, and guidance for the active app. Source values, existing app adaptations, and new recommendations are labeled separately.

For a single illustrated document, view the [19-page visual style guide PDF](docs/style-guide/BibleDept-and-ARMA-Visual-Style-Guide.pdf), with color swatches, type samples, source imagery, component specimens, and layout diagrams.

## Run the current iPhone app

The active client is **[bibledept-mobile](bibledept-mobile/)**, built with Expo and the Firebase JavaScript SDK. Start here for local testing: **[Local iPhone setup](docs/LOCAL_TESTING.md)**.

BibleDept is a **free app**. The active client has no giving, checkout, subscriptions, or payment SDKs.

| Available in the current client | Status |
| --- | --- |
| Website-inspired design | Default dark theme with orange accents, five separately positioned circular gradients, cached grain, borderless frosted buttons and plan card, and the original transparent navbar logo with safe top clearance. Signed-in users can choose Light or Dark under Account → Settings. |
| Frosted floating navigation | Notes · Prayer · Home · Bible · Account, adapted from the Church repo. One frosted shell backs the selected orange pill and its stretch/compress motion. Isolated paint layers prevent ghosted labels. A continuous horizontal track carries pages through intermediate destinations and interrupted transitions continue from the visible position. Web scroll edges fade; native content stays unmasked to support backdrop blur. |
| Home | Current reading, device plan progress, private streak/week/longest-streak stats, notes and prayer shortcuts, and the latest saved note. |
| Online Bible reading | Real passages from bible-api.com, with World English Bible and King James Version selection. No API key required. |
| Official 365-day plan | A compact 5.1 KB mapping bundled inside the app, Day 1 start, current-day marker, next-day continuation, chapter selection, and a numbered day picker with direct jump. Plan position saves only on the device. |
| Daily podcast | Official RedCircle episodes matched to all 365 days. One global player continues across pages, with mini controls, measured reference waveforms, live PCM influence, a narrow gradient progress accent, seeking, and pitch-corrected 1×/1.25×/1.5×/2× speeds. Metadata and compact amplitudes stay bundled locally; audio streams on demand. iPhone lock/background playback still fails in Expo Go and is explicitly deferred. See [podcast implementation](docs/PODCASTS.md). |
| Email accounts | Firebase email/password sign-in, free registration, password reset, and persistent native sessions. |
| Reading progress | Saved day/chapter/scroll position, all-chapter reading detection, and automatic lesson completion after genuine listening excluding the last two minutes, with a day-specific congratulations modal. These records stay local per guest/account. Whole-chapter cloud credits, confirmed reading time zone, streak totals, milestones and retry IDs remain available. |
| Highlights and Notes | Select a verse range, choose a highlight color, and add a private comment. Bible and Notes subscribe to the same Firestore records. Edit, delete, search loaded notes, load older notes, or reopen a passage. |
| Private prayer journal | Save prayers and mark them answered in Firestore. |
| Phone sign-in | SMS verification UI, resend handling, web reCAPTCHA, and native Firebase verification adapter implemented. Fictional emulator verification tested. Live SMS needs a configured hosted domain or signed native build and Firebase Phone setup. |
| Optional reading reminders | Separate daily/welcome-back choices, AM/PM time pickers, quiet hours, pause/off, device registration, bounded scheduler, frequency caps, receipts and account-scoped reading links implemented. Live delivery is disabled by default; signed-device validation and deployment are required. |
| App links | Validated passage/prayer/account routing and Expo Go links. Public universal links need website association deployment and a signed build. |

Offline Bible downloads are postponed. Online requests are cached briefly in memory,
with loading, retry, missing-passage, and rate-limit handling. See the
[Bible API endpoints and response format](docs/BIBLE_API.md).

Firebase journals use `/bibledeptUsers/{uid}` to stay separate from an existing church
app's records. Local emulator checks cover owner access, cross-user denial, and field validation.
The Firebase project configuration belongs in the ignored `.env.local` file.

## Reading habits, reminders, and Notes

These features are implemented in the active client and its new `bibledept-mobile/functions` codebase. The [feature setup guide](docs/HABIT_FEATURES_SETUP.md) documents the Firestore schema, time-zone confirmation, legacy migration, retry behavior, notification policy, and live configuration. The [design implementation guide](docs/APP_DESIGN_IMPLEMENTATION.md) explains the Home layout, Church navigation port, frosted blur, transparent logo, grain, and synchronized highlights/comments.

The original [streak plan](docs/READING_STREAKS_PLAN.md) and [gentle reminder plan](docs/READING_REMINDERS_PLAN.md) remain as design rationale, with links to the delivered implementation and its queue simplifications. Reading stays free and reminders remain optional. A completed plan day changes the saved device position; **I've finished this chapter** records the cloud reading day.

The checked-in Firebase default is `demo-bibledept`; a local ignored environment file selects the development target. Live SMS and push delivery have not been validated. Release setup includes reviewed rules/indexes, native Firebase/APNs/FCM credentials, Expo project configuration and physical-device testing. See the [release review](docs/APP_RELEASE_REVIEW.md) for verification and remaining release work.

## Retained source for future migration

The older native app, dashboard, and functions remain available as migration references.
These capabilities are present in that source and **are not yet ported into the Expo client**:

| Area | Existing capabilities |
| --- | --- |
| Bible reading | Offline translation/database handling and the older verse-sharing interfaces. The active reader now has its own private highlights and comments. |
| Guided studies | Reading plans, custom plan creation, reusable templates, scheduled daily activities, discussion prompts, and plan progress. |
| Community | Group creation and invitations, group chat, direct messages, study discussions, and member participation. |
| Prayer and application | Prayer requests and responses, gratitude prompts, action steps, and follow-up activities. |
| Reading habits | Additional achievement screens and study-specific progress reviews. The active app now has its own streak and reminder implementation. |
| Church and ministry administration | Organization, campus, group, member, and role management, plus dashboard statistics and plan management. |
| Content creation | Video and sermon processing workflows, transcription hooks, and AI-assisted study-plan generation from sermon summaries. |
| Account and app experience | Expanded profiles, onboarding flows, and multiple interface languages. The active client has its own authentication, settings, links, and theme controls. |

Legacy payment-related source is retained in the older projects but is excluded from the active free client. It is not part of the migration feature set.

## Application structure

The repository contains the active client and its backend alongside three retained projects:

| Component | Role | Technology |
| --- | --- | --- |
| `bibledept-mobile` | Active free iPhone/Android/web client: reading, notes, account/settings, prayer, and habits. | Expo SDK 57, React Native, TypeScript, Firebase JS SDK. |
| `bibledept-mobile/functions` | Active habit API, migration, reminder scheduling/receipts, token binding, and account cleanup. | Node 22, TypeScript, Firebase Functions and Admin SDK. |
| `bibledept-app` | Older native mobile source for gradual migration. | React Native and TypeScript. |
| Web dashboard | Tools for leaders to manage people, groups, studies, campuses, campaigns, and reporting. | React, Next.js, and TypeScript. |
| Retained backend | Older authentication events, notifications, payments, invitations, and content-processing workflows; a migration reference. | Firebase Functions, Firestore, Authentication, and Storage. |

The retained projects reference Stream Chat, Branch, Mailchimp, video processing, AI content services, and older payment integrations. The current Expo client uses Firebase and the free Bible API.

## Current repository status

The retained source includes the [older mobile app](bibledept-app/README.md), [web dashboard](bibledept-dashboard/README.md), and [Firebase backend](bibledept-functions/README.md). The older app includes Android and iOS native projects.

The app is branded **BibleDept**, with website and email references using **thebibledept.com**. See the [complete request audit and optimization review](docs/REQUEST_AUDIT.md) for current checks, measured rendering improvements and remaining work. Native configuration includes `UIBackgroundModes: ["audio"]`, but actual Expo Go screen-lock tests still stop playback. Native directional page blur is also not implemented. Exporting JavaScript does not establish physical-device behavior.

Earlier verification recorded two Firebase auth/rules integration tests, five backend integration tests, and web/iOS/Android JavaScript exports, plus browser checks for authentication, themes, streaks, notes, and navigation. Those backend suites were not rerun for this audio/UI revision; see the [release review](docs/APP_RELEASE_REVIEW.md) for that baseline. Signed native builds and physical iPhone/Android review remain necessary. Real SMS, push delivery, public universal links, native glass, and transition performance still need device validation.

## Learn more

- [The Bible Dept website](https://www.thebibledept.com/)
- [Start Here](https://www.thebibledept.com/start-here)
- [Download the reading plan](https://www.thebibledept.com/plan)
- [Listen and watch](https://www.thebibledept.com/listen)

The purpose and public offerings above are based on these website pages. The software feature inventory is based on the app source in this repository.

## License

See the [MIT license](LICENSE.md). Original copyright attribution is preserved.

# The Bible Department

**Read Scripture, understand it, and grow together.**

The Bible Department, also known as **BibleDept**, is a Bible study and community app project built to help people develop a consistent reading habit, understand Scripture, and put what they learn into practice. It brings Bible reading, guided studies, discussion, prayer, and ministry tools into a shared experience for individuals, small groups, churches, and ministry teams.

The app's direction follows the experience described on the [Bible Dept website](https://www.thebibledept.com/): a structured journey through Scripture, practical teaching, and a community that helps people keep going.

## Purpose

Many people begin a Bible reading plan with enthusiasm but lose momentum when passages become difficult or life gets busy. The Bible Department aims to make the next step clear: know what to read, receive help understanding it, and have people to discuss it with.

The goal is both understanding and application: build a sustainable rhythm of reading, reflection, prayer, and participation in community.

## The public Bible Dept experience

The website currently offers:

- **A year-long reading journey:** a 365-day plan that starts in the New Testament and guides readers through the Bible.
- **A free printable reading plan:** available through the [reading-plan page](https://www.thebibledept.com/plan).
- **Daily teaching with Dr. Manny Arango:** podcast and video episodes available through Apple Podcasts, Spotify, and YouTube on the [Listen page](https://www.thebibledept.com/listen).
- **A guided starting point:** the [Start Here page](https://www.thebibledept.com/start-here) explains how to choose a Bible, get the plan, and follow the daily teaching.
- **Community and further learning:** connections to the ARMA community and courses for people who want to go deeper.

These are the public website's offerings. The app's existing software capabilities are outlined below; the website's content and services should not be assumed to be integrated into the app already.

## Run the current iPhone app

The active client is **[bibledept-mobile](bibledept-mobile/)**, built with Expo and the Firebase JavaScript SDK. Start here for local testing: **[Local iPhone setup](docs/LOCAL_TESTING.md)**.

BibleDept is a **free app**. The active client has no giving, checkout, subscriptions, or payment SDKs.

| Available in the current client | Status |
| --- | --- |
| Website-inspired orange, black, and warm-white design | Implemented across Today, Bible, Prayer, and Account. |
| Online Bible reading | Real passages from bible-api.com, with World English Bible and King James Version selection. No API key required. |
| Official 365-day plan | A compact 5.1 KB mapping bundled inside the app, Day 1 start, current-day marker, next-day continuation, chapter selection, and a numbered day picker with direct jump. Plan position saves only on the device. |
| Email accounts | Firebase email/password sign-in, free registration, password reset, and persistent native sessions. |
| Reading progress | Daily completion, recent reading history, and a streak calculated from saved dates. |
| Private prayer journal | Save prayers and mark them answered in Firestore. |
| Phone sign-in | Local emulator verification works in Expo Go; live SMS requires the optional signed iPhone development build. |
| App links | Validated passage/prayer/account routing and Expo Go links. Public universal links need website association deployment and a signed build. |

Offline Bible downloads are postponed. Online requests are cached briefly in memory,
with loading, retry, missing-passage, and rate-limit handling. See the
[Bible API endpoints and response format](docs/BIBLE_API.md).

Firebase journals use `/bibledeptUsers/{uid}` to stay separate from an existing church
app's records. Local emulator checks cover owner access, cross-user denial, and field validation.
The Firebase project configuration belongs in the ignored `.env.local` file.

## Retained source for future migration

The older native app, dashboard, and functions remain available as migration references.
These capabilities are present in that source and **are not yet ported into the Expo client**:

| Area | Existing capabilities |
| --- | --- |
| Bible reading | A Bible reader, translation selection, downloaded translation/database handling, verse highlighting, and verse sharing. |
| Guided studies | Reading plans, custom plan creation, reusable templates, scheduled daily activities, discussion prompts, and plan progress. |
| Community | Group creation and invitations, group chat, direct messages, study discussions, and member participation. |
| Prayer and application | Prayer requests and responses, gratitude prompts, action steps, and follow-up activities. |
| Reading habits | Daily reminders, notifications, reading streaks, achievements, and progress reviews. |
| Church and ministry administration | Organization, campus, group, member, and role management, plus dashboard statistics and plan management. |
| Content creation | Video and sermon processing workflows, transcription hooks, and AI-assisted study-plan generation from sermon summaries. |
| Account and app experience | Authentication and onboarding flows, profiles and settings, deep-link handling, dark mode, and multiple interface languages. |

Legacy payment-related source is retained in the older projects but is excluded from the active free client. It is not part of the migration feature set.

## Application structure

The repository contains the active client and three retained components:

| Component | Role | Technology |
| --- | --- | --- |
| `bibledept-mobile` | Active free iPhone client: online reading, account, prayer, and progress. | Expo SDK 57, React Native, TypeScript, Firebase JS SDK. |
| `bibledept-app` | Older native mobile source for gradual migration. | React Native and TypeScript. |
| Web dashboard | Tools for leaders to manage people, groups, studies, campuses, campaigns, and reporting. | React, Next.js, and TypeScript. |
| Backend | Authentication events, stored data, notifications, payments, invitations, scheduled work, and content-processing workflows. | Firebase Functions, Firestore, Authentication, and Storage. |

The retained projects reference Stream Chat, Branch, Mailchimp, video processing, AI content services, and older payment integrations. The current Expo client uses Firebase and the free Bible API.

## Current repository status

The retained source includes the [older mobile app](bibledept-app/README.md), [web dashboard](bibledept-dashboard/README.md), and [Firebase backend](bibledept-functions/README.md). The older app includes Android and iOS native projects.

The app has been rebranded to **BibleDept**, with website and email references using **thebibledept.com**. The Expo client's TypeScript checks, passage/link/date tests, emulator authentication/rule checks, browser preview, and iOS JavaScript bundle export have passed. A signed native build and end-to-end iPhone testing are still needed before release. Real SMS and public universal links have not been device-verified.

## Learn more

- [The Bible Dept website](https://www.thebibledept.com/)
- [Start Here](https://www.thebibledept.com/start-here)
- [Download the reading plan](https://www.thebibledept.com/plan)
- [Listen and watch](https://www.thebibledept.com/listen)

The purpose and public offerings above are based on these website pages. The software feature inventory is based on the app source in this repository.

## License

See the [MIT license](LICENSE.md). Original copyright attribution is preserved.

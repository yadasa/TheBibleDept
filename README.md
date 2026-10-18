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

## What the app already has

The existing local codebase contains mobile screens, a web dashboard, and backend workflows for the following capabilities:

| Area | Existing capabilities |
| --- | --- |
| Bible reading | A Bible reader, translation selection, downloaded translation/database handling, verse highlighting, and verse sharing. |
| Guided studies | Reading plans, custom plan creation, reusable templates, scheduled daily activities, discussion prompts, and plan progress. |
| Community | Group creation and invitations, group chat, direct messages, study discussions, and member participation. |
| Prayer and application | Prayer requests and responses, gratitude prompts, action steps, and follow-up activities. |
| Reading habits | Daily reminders, notifications, reading streaks, achievements, and progress reviews. |
| Church and ministry administration | Organization, campus, group, member, and role management, plus dashboard statistics and plan management. |
| Giving | Giving campaigns and funds, payment-method settings, and Stripe checkout, donation, and receipt workflows. |
| Content creation | Video and sermon processing workflows, transcription hooks, and AI-assisted study-plan generation from sermon summaries. |
| Account and app experience | Authentication and onboarding flows, profiles and settings, deep-link handling, dark mode, and multiple interface languages. |

This inventory describes functionality present in the source. Availability in a running app depends on configuration, enabled features, connected services, content, and release testing.

## Application structure

The existing software is organized into three components:

| Component | Role | Technology |
| --- | --- | --- |
| Mobile app | Reading, studies, conversations, prayer, progress, and giving on iOS and Android. | React Native and TypeScript. |
| Web dashboard | Tools for leaders to manage people, groups, studies, campuses, campaigns, and reporting. | React, Next.js, and TypeScript. |
| Backend | Authentication events, stored data, notifications, payments, invitations, scheduled work, and content-processing workflows. | Firebase Functions, Firestore, Authentication, and Storage. |

Supporting integrations include Stream Chat, Branch deep links, Stripe payments, Mailchimp email, and services used for video processing and AI-assisted content creation.

## Current repository status

Source code is being published in sequential stages: backend, web dashboard, mobile app source, Android, and iOS. Repository conventions and the original license are included.

The local app has been rebranded to **BibleDept**, with website and email references using **thebibledept.com**. Static checks have been completed for the rebrand. A full mobile build, connected-service verification, and device testing are still needed before describing the app as release-ready.

## Learn more

- [The Bible Dept website](https://www.thebibledept.com/)
- [Start Here](https://www.thebibledept.com/start-here)
- [Download the reading plan](https://www.thebibledept.com/plan)
- [Listen and watch](https://www.thebibledept.com/listen)

The purpose and public offerings above are based on these website pages. The software feature inventory is based on the existing local app source.

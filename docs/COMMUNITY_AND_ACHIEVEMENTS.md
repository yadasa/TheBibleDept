# Community, profiles, and achievements

The active Expo client replaces the Prayer tab with **Community**. Its three sections are Activity, Readers, and Circles. The private prayer journal is under **Account → Prayer journal**; Home’s prayer shortcut and existing `/prayer` links open that page. Account also links to Community, Reading circles & chat, and Badges & achievements.

## Profiles and sharing

Community is opt-in. A reader chooses a display name and may add, replace, or remove a profile photo from Account → Profile & sign-in. The same editor controls joining, streak sharing, and achievement sharing. Joining makes the name and thumbnail visible to signed-in community members. Neither email/phone details nor note/prayer contents enter public projections.

The system picker opens only after a photo action. Images are cropped square and re-encoded as a 192×192 JPEG (128×128 fallback), with a maximum 60,000-character data URI. The server independently decodes a new upload, rejects malformed or oversized pixel dimensions, and re-encodes it with embedded EXIF/ICC/XMP metadata removed. Unchanged, previously normalized thumbnails are reused during preference saves, and transaction retries reuse the same normalization result. This bounded thumbnail is stored in the private community settings and, with consent, the public profile document; no Storage bucket or public original-photo URL is required. Photo changes are staged until Save profile. Native builds include the image-picker permission description without camera or microphone permissions. The Functions photo decoder loads only for a new photo.

Streaks expire using each reader’s confirmed reading time zone, including while the community page remains open. Readers may hide their streak or badges independently. Preferences and public-field redaction commit in the same transaction, even if a subsequent metrics refresh fails. Leaving community removes their public profile and previous shared milestones. Private achievements and circle memberships remain, so they can rejoin later. Hidden-reader state is private, filters activity and chat, and can be cleared in the profile editor.

Reader search queries the public directory rather than filtering the first loaded page. Server-generated name prefixes support the beginning of a first or last name, with Unicode normalization and case folding. Queries debounce typing, return up to 200 readers, and ask for a more specific name at that limit. Renaming replaces old prefixes; opting out removes the searchable profile in the same transaction. No email or phone search keys are published.

Profile saves carry the private revision loaded by the editor. If another device changes the photo, name, or sharing preferences, an older form cannot overwrite those changes or restore sharing that was withdrawn. The editor offers an explicit reload of saved values. Identical retries after a lost acknowledgement return the existing revision without duplicating changes.

## The 6% Club emblem

The emblem is a vector open book beneath a rising star, surrounded by laurel branches. It uses warm gold, parchment, and a dark bronze ground. There is no numeral in its geometry. It appears at the bottom right of a qualifying reader’s round profile photo, in Account, the profile editor, community cards, reader profiles, and circle identities. Public appearances follow achievement-sharing consent.

The award requires **365 distinct saved completed plan-day IDs**, not a 365-day streak or a selected plan position. The existing account-plan synchronizer’s completed-day history is the source. Reading and plan completion remain reader affirmations; the badge does not claim measured attention. It does not expire after a missed reading day.

## Achievement catalog

All 17 definitions and progress rules live in `bibledept-mobile/shared/community.ts`.

| Badge | Requirement |
| --- | --- |
| First light | 1 saved reading day |
| A steady week | 7 consecutive reading days |
| Taking root | 30 consecutive reading days |
| Deep roots | 100 consecutive reading days |
| Keep coming back | 100 total reading days |
| The first step | 1 completed journey day |
| Finding your feet | 7 completed journey days |
| Turning pages | 90 completed journey days |
| Halfway there | 183 completed journey days |
| 6% Club | All 365 completed journey days |
| A word to keep | 1 saved verse highlight |
| Well marked | 20 retained verse highlights |
| Make it personal | 1 saved passage reflection |
| Thoughtful reader | 10 retained passage reflections |
| In good company | Create or join a reading circle |
| Lift another | Encourage another reader’s milestone |
| Encourager | Encourage milestones from 5 distinct readers |

The collection has All, Earned, and To discover filters. Each badge opens requirements, progress, its earned date when applicable, and a relevant next action. Awards are retained once earned. Refresh achievements reconciles an older account on demand; server triggers also reconcile reading stats, plan progress, and annotation changes. Only award IDs and milestone descriptions enter activity; private passage text is never shared.

Achievement and celebration-cleanup triggers enable [Firebase’s retry policy](https://firebase.google.com/docs/functions/retries) for transient failures. Transactional award checks and content cleanup are idempotent, so retries do not issue duplicate awards or celebrations.

New awards earned during the session produce a dismissible notice linking to the collection. The notice groups simultaneous awards, prioritizes the 6% Club, and leaves reading/audio playback running. Initial account history is treated as a baseline instead of replaying old celebrations on every sign-in. Community forms and conversations reset between accounts; signing in does not reset the app shell’s navigation.

## Reading circles

Members create a circle or join using its 12-character invitation code. Circles support 50 members, with at most 20 memberships per reader. Conversations open full-screen with a fixed composer, keyboard avoidance, a virtualized message list, and a shortcut back to the latest message. Members see real-time messages in chronological order, load up to 200 recent messages, copy an invitation, view member profiles, report content, hide a reader, delete their own messages, and leave. Group names and messages have bounded lengths.

Every send carries a unique retry ID; the same ID/body returns the existing message. Drafts and pending retry IDs are saved per account/circle on the device, including before a send reaches the network. Reusing an ID with another body is rejected. The server checks community consent and circle membership in the same transaction as sending, and enforces a three-second send interval. Leaving removes future read/send access. If a creator leaves, ownership passes to a remaining member; empty circles and their history are removed.

A failed conversation offers Retry conversation without discarding the saved draft. An unavailable circle shows its access/connection error instead of the empty-conversation invitation. Retrying always rechecks current membership through Firestore rules.

Circle creation also saves a stable request before HTTP and recovers it after a reload. Retries return the original circle; a server-only creation receipt prevents stale requests from recreating a closed circle. Readers can open other circles while a request finishes or explicitly start a different creation. Community callables compare the initiating account UID with the authenticated UID before handling a request, preventing delayed actions from crossing an account switch.

Circle lists sort by recent conversation. A private per-account marker tracks whether the latest message has been viewed; unread indicators appear in circle rows and the Account shortcut. The marker updates only while the app is in the foreground and the conversation is showing the latest message. Other members cannot see read receipts. Own messages and hidden readers do not create unread indicators. Deleting the most recent message updates the circle’s latest-message metadata atomically.

Readers can leave a conversation while a request finishes. Pending messages retain their saved retry identity, and an old conversation’s late completion cannot close another one. Drafts flush when the app enters the background. Local storage operations are serialized per account/circle key, and acknowledgements clear only their matching pending record, preserving newer drafts or circle requests after reopening. Deleted message IDs retain a server-only timestamp marker, so an old retry cannot recreate removed content. Closed circle IDs retain a separate server-only lifecycle marker, preventing a different account from reusing the ID while history cleanup runs. These markers contain no message text, photos, or member identifiers and do not enter automatic indexes.

The current owner can rename the circle, replace its invitation, or remove a member from Circle details → Manage circle. Replacing an invitation preserves existing membership. Removing a member also replaces the code, removes their membership/read marker, and preserves their earlier messages; a fresh invitation is required to return. Confirmation appears beside the action. All management permissions and membership-index updates are checked in server transactions. Concurrent invitation retries reuse one replacement, and a stale removal cannot remove a reader who has since received a fresh invitation. Ownership passes to a remaining member when the owner leaves.

Encouragement is one per reader per activity, excludes self-encouragement, and counts distinct recipients for the Encourager award. Live encouragement state is queried for the displayed events, so older reactions stay marked after a reader has encouraged more than 200 milestones. Reports are stored in a server-only queue for staff to review in the intended Firebase project. Each report retains a bounded copy of the reported activity/message so staff can review it after removal. Retries are deduplicated per reporter/content and preserve an existing staff resolution. Report forms explain that staff receive the content and explanation. This release does not add a staff moderation dashboard.

Reader profiles also have a direct report action, including profiles without shared activity or chat messages. These reports retain only the shared name, bounded thumbnail, reader ID, profile version, and reporter’s explanation. A server-owned version changes with name/photo edits, including reverting to earlier content, and remains stable during progress or sharing updates. The form asks readers to review changed content before submitting. Reports deduplicate per reporter and profile version, so changed profiles can receive fresh reviews while an earlier staff resolution stays intact. A lost acknowledgement can be retried after the profile is removed without duplicating its report or reopening a resolved review.

Public profile thumbnails and report content snapshots are excluded from automatic indexes because they are never query keys. The exemptions use only BibleDept collection names and preserve unrelated shared-project indexes. This follows [Firestore’s guidance for long strings and maps](https://firebase.google.com/docs/firestore/best-practices#index_exemptions).

## Backend boundaries

| Path | Access and purpose |
| --- | --- |
| `bibledeptUsers/{uid}/settings/community` | Owner-readable profile/sharing and hidden readers; callable writes |
| `bibledeptUsers/{uid}/achievements/{badge}` | Owner-readable immutable earned timestamp; server writes |
| `bibledeptUsers/{uid}/stats/achievements` | Owner-readable reconciled progress; server writes |
| `bibledeptUsers/{uid}/circles/{id}` | Owner-readable circle index; server writes |
| `bibledeptUsers/{uid}/circleCreations/{id}` | Server-only stable creation receipt, retained until account deletion |
| `bibledeptUsers/{uid}/circleReads/{id}` | Private unread marker; bounded owner writes while a circle member |
| `bibledeptUsers/{uid}/cheeredMilestones/{id}` | Owner-readable encouragement history; server writes |
| `bibledeptUsers/{uid}/encouragedReaders/{uid}` | Server-owned distinct encouragement recipients |
| `bibledeptProfiles/{uid}` | Community-member-readable consented projection; server writes |
| `bibledeptActivity/{id}` | Community-member-readable milestones; server writes |
| `bibledeptCircles/{id}/bibledeptMessages/{id}` | Circle-member-readable messages; callable writes |
| `bibledeptCircles/{id}/bibledeptMessageTombstones/{id}` | Server-only content-free deletion marker; removed with circle history |
| `bibledeptCircleRegistry/{id}` | Server-only content-free lifecycle marker preventing circle ID reuse |
| `bibledeptCircleCodes/{code}` | Server-only invitation lookup |
| `bibledeptCommunityReports/{id}` | Server-only report queue |
| `bibledeptDeletedAccounts/{uid}` | Server-only tombstone preventing delayed triggers from recreating deleted data |

Firestore clients cannot award themselves badges, edit public projections, forge chat authors, or write circle membership directly. Award reconciliation uses transaction-scoped aggregate reads. Account deletion removes community profiles, celebrations, memberships, and authored messages before the existing private-account cleanup. History cleanup pages through more than 400 messages, rechecks current authorship inside each transaction, and updates each remaining circle’s latest-message metadata. Each page contains at most 200 deletion candidates so message removals and their content-free markers stay within transaction write limits. Both the `bibledeptMessages` collection-group name and its `bibledeptCircles` parent path fence cleanup from other apps in a shared project. Deleted celebration reactions are removed by a cleanup trigger. The namespaced messages `uid` collection-group index supports authored-message cleanup. The shared-project merge helper now updates the complete marked BibleDept rule set, including community collections and its scoped helper function, while preserving unrelated rule bytes. It supports upgrading the earlier private-only namespace and refuses ambiguous unmarked community rules.

## Local and live setup

Install client and functions dependencies, build Functions, and use the existing isolated demo configuration:

```sh
npm ci
npm --prefix functions ci
npm run typecheck
npm test
npm run verify:native-config
npm --prefix functions run build
npm run test:emulators
```

The Firebase default remains `demo-bibledept`. Live release requires the intended Firebase project, reviewed/merged rules and indexes, the new callable and document triggers, and a signed native build with photo-picker verification. Preserve unrelated namespaces in a shared project. Existing notification/SMS requirements remain in `HABIT_FEATURES_SETUP.md`.

New routes are `/community`, `/circles`, and `/badges`, with the same host validation as existing app links. No group invitation automatically joins a reader, and no external messages or invitations are sent by this implementation.

The mobile GitHub Actions workflow runs locked client/Functions installs, typechecking, unit tests, native permission introspection, real SDK/rules/backend tests in the isolated demo emulators, and iOS/Android bundle exports. Native checks verify the profile-photo purpose text, explicit Android camera/microphone merge exclusions, bounded legacy storage permissions, absence of broad modern media-library permissions, and retained background playback. The SDK recovery test deliberately loses successful circle/message acknowledgements through a loopback-only proxy, then recovers the persisted retry identities and checks that no duplicate is created. The workflow uses Node 22 and Java 21, has read-only repository permissions, and does not deploy or use production credentials.

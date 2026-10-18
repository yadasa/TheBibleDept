# Layout and components

## Shared page schema

The source sites repeat a persuasive teaching sequence: clear outcome → familiar difficulty → a credible guide → a manageable process → human proof → practical answers → a final next step. ARMA adds a course collection and offer comparison; Bible Dept emphasizes daily participation and resources. Adapt this sequence to the new project's actual promise instead of copying its entire homepage.

### Recommended landing page blueprint

| Section | Content | Composition | Completion condition |
| --- | --- | --- | --- |
| Navigation | Brand, a few destinations, primary action | Dark bar with simple links | A new visitor can locate the next step. |
| Hero | Outcome title, short explanation, one main action | Bible Dept split image/text or ARMA image-backed title | The visitor understands what is offered and whom it helps. |
| Difficulty and help | One recognizable problem, specific help | Spacious copy with meaningful image | Empathy leads to a useful solution. |
| Teacher | Real host and relevant experience | Portrait plus personal introduction | Expertise feels approachable. |
| Process | Three manageable steps | Numbered columns; stack on phone | The visitor knows what happens next. |
| Proof | Approved account of a real person's experience | Strong quote or selected stories | Attribution and context are visible. |
| Questions | Time, prerequisites, recovery, access | Intro beside ruled disclosure list | Common practical hesitation is answered. |
| Closing action | Brief benefit and direct route | Strong branded field | The next destination is explicit. |
| Footer | Key destinations, official platforms, required information | Quiet grouped links | Essential navigation remains reachable. |

### Recommended resource page blueprint

Use one descriptive title and one acquisition task, then a short explanation of the resource, prerequisites, delivery, and next action. The public [Plan page](https://www.thebibledept.com/plan) pairs a Bible/notes image with an email form. A new project should only request information needed by its actual flow and explain what submitting will do. Preserve a direct download when that is the intended feature; do not add an email gate because the reference has one.

### Recommended onboarding blueprint

Use the sequential clarity of [Start Here](https://www.thebibledept.com/start-here): orient the reader, name what they need, offer the next resource, and explain how to begin. In the app, shorten this to the decisions necessary to start reading. Keep optional account or community steps visibly optional when the product permits reading without them.

## Component specifications

These specifications are recommendations for new work except where explicitly marked as extracted or existing.

### Navigation

Use an approved logo asset on a plain high-contrast field, short destination labels, and one primary action. Mark the current destination with more than color, such as an underline plus `aria-current="page"` on the web. A compact phone menu needs an accessible name, expanded state, predictable dismissal, and focus return. Avoid reproducing the public site's placeholder or decorative countdown as a persistent product element.

### Hero

Keep the promise in actual text. Use 1–2 short explanatory sentences and one primary CTA; include a quieter alternative only when it serves a different readiness level. Bible Dept's desktop split has equally strong image and text fields; its CSS collapses to a single column at tablet width. Set mobile crop and order explicitly. Do not force the full desktop title onto one line.

### Buttons and links

Extracted shared button padding is 12px vertically and 24px horizontally. Bible Dept uses 4px corners and ARMA 10px. The current app has a 50-unit minimum height. Preserve a generous hit area even for a visually compact icon; aim for 44–50 units for new product controls as a project recommendation.

| Variant | Appearance | Use |
| --- | --- | --- |
| Primary product | Darker action fill, white label | Save, continue, start, submit |
| Inverse | Paper fill, ink label | Primary choice in a branded dark/orange field |
| Secondary | Plain surface, visible border, ink label | Less prominent parallel action |
| Text link | Underlined action-colored text on light | Resource or supporting navigation |
| Destructive | Clear destructive label and error styling | A real destructive task, separated from primary progress |

Use destination links for navigation and buttons for actions. Begin labels with a concrete verb. Do not make users guess what a generic “Go” or “Learn more” will open.

| State | Required behavior |
| --- | --- |
| Default | Readable label and visible affordance |
| Hover | Small tonal change; no essential information only on hover |
| Pressed | Immediate subtle response; preserve label contrast |
| Keyboard focus | Clearly visible ring on both light and dark surfaces |
| Loading | Busy state, announced progress, no duplicate submission |
| Disabled | Actually noninteractive, with an explanation nearby when needed |
| Error | Retain the user's data and offer a clear retry or correction |
| Success | Confirm what completed; move focus only when the task requires it |

### Teaching and course cards

ARMA's course collection combines image, category, lesson metadata, title, description, and access action. For a new collection, make the title and destination clear before adding badges. Use consistent image ratios, title wrapping, and action placement. Keep metadata subordinate. Use genuine content and current access details; the source homepage contains differing course counts, so it is not a source of evergreen catalog totals.

A horizontal carousel needs visible controls, keyboard operation, a useful position announcement, and a way to reach all content. A static grid is often simpler for a small collection. Do not require swiping as the only means of navigation.

### Process steps and tabs

Use a short numbered title followed by a compact explanation. Static steps are easier to scan when all three are important. If an ARMA-style tabbed process is used, expose the active tab, implement keyboard movement, connect each tab with its panel, and keep a usable no-animation state. On a phone, static stacked steps may be preferable to tabs.

### Testimonial

Use an approved quote, the person's approved name, and relevant relationship to the program. A large typographic quote can carry a whole section without adding a card grid. Keep quotations accurate and permissions current. Sample copy in this guide is not permission to invent an endorsement or display a fake subscriber count.

### FAQ disclosure

Use thin horizontal rules and a readable question with a plus/chevron indicator, drawing on Bible Dept's `.faq3_question` structure. Use a semantic button with `aria-expanded`/`aria-controls`, or native `details`/`summary` where suitable. Enter and Space must toggle it. Keep answer text selectable and links usable. Animate only if the answer is available immediately to assistive technology and reduced-motion preferences are respected.

### Forms

Use a persistent visible label, helper text, and a clear submit action. A placeholder is an example, not a replacement label. Give email/password fields correct input modes and autofill hints. Connect error text to its field and announce asynchronous results. Keep the draft through network failures. Do not obscure disclosure text in tiny, low-contrast typography.

### Reading and progress

In a daily app, the main content is the passage. Place chapter, translation, previous/next, and text-size controls consistently. Keep reading text quiet on paper with generous leading. Make verse numbers visually subordinate without making references unreadable. Use a persistent completion state distinct from the current selection. Explain whether progress is saved on this device or in an account, according to the actual storage behavior.

### Empty, offline, and failed states

Name the condition, preserve the user's place, and give one useful action. A remote passage failure needs retry; an empty prayer journal needs a gentle invitation to write. Do not display a success state before a write succeeds or promise offline downloads when the active client only streams passages.

## Motion and media

ARMA's public markup includes video play/pause controls, a carousel, and tabs. Bible Dept uses visual section changes and disclosure structures. Preserve their sense of pacing, but do not copy content-hidden-until-scroll behavior into critical interfaces.

Recommended motion: 150ms feedback and around 200ms for simple disclosures, with no springy ornament. Support reduced motion, visible media controls, captions/transcripts for teaching, and manual playback. Reserve space for media before load. A still image and usable text should remain when video or an animation fails.

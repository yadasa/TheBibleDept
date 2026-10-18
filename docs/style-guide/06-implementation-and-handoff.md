# Implementation and handoff

## Use in this repository

The current app already carries the Bible Dept colors and compact corners. The next design pass should refine hierarchy, spacing, behavior, and consistency rather than introduce another palette. This guide is documentation only; the recommendations below are not a report of runtime changes.

| Existing location | Responsibility | Recommended next use |
| --- | --- | --- |
| [`palette.ts`](../../bibledept-app/src/config/color/palette.ts) | Existing brand constants and legacy light/dark palette | Keep orange, ink, paper, and action meanings consistent. |
| [`theme.ts`](../../bibledept-mobile/src/theme.ts) | Active mobile semantic colors | Add shared type/space/radius roles here when implementing a design pass. |
| [`ui.tsx`](../../bibledept-mobile/src/components/ui.tsx) | ActionButton, Field, Notice | Reuse controls and improve boundaries, scaling, and state communication consistently. |
| [`HomeScreen.tsx`](../../bibledept-mobile/src/screens/HomeScreen.tsx) | Daily overview | Give resume-reading priority and quiet supporting information. |
| [`BibleScreen.tsx`](../../bibledept-mobile/src/screens/BibleScreen.tsx) | Passage reading | Prioritize comfortable text, place, translation, and next chapter. |
| [`PlanScreen.tsx`](../../bibledept-mobile/src/screens/PlanScreen.tsx) | Plan progress | Separate selected day, current position, and completed state. |
| [`PrayerScreen.tsx`](../../bibledept-mobile/src/screens/PrayerScreen.tsx) | Journal | Use patient empty states and clear private save feedback. |
| [`AccountScreen.tsx`](../../bibledept-mobile/src/screens/AccountScreen.tsx) | Account tasks | Make status, recovery, and privacy expectations clear. |

The paths above resolve from this guide directory. The retained dashboard's styles are not the default token source for the active client.

## Reference artifacts

[tokens.json](tokens.json) separates source themes, shared extracted measurements, existing app values, and recommendations. It is framework-neutral reference data. [reference.css](reference.css) is a small prototype aid; it is not imported into the app and is not a production component library. [visual-reference.html](visual-reference.html) demonstrates palette, hierarchy, controls, and calm reading composition using local CSS and system fallback fonts.

For web, map semantic roles to CSS variables. For React Native, map numeric values to platform units, `StyleSheet` properties, accessible state props, and safe areas. Do not paste CSS rem values or Adobe web embeds into a native theme. Prefer extending the existing theme over creating a parallel palette inside each screen.

## Implementation sequence

1. Select Bible Dept or ARMA, define the actual task, and verify the content/assets available.
2. Sketch content order with real titles and actions before polishing.
3. Centralize color roles, type sizes, spacing, and control dimensions in the destination's existing theme system.
4. Implement the smallest set of shared primitives: text styles, buttons, field, notice, section/panel, disclosure, and media frame.
5. Build one representative marketing screen and one task screen, if both are in scope. Compare their use of brand without forcing them into identical layouts.
6. Check narrow screens, large text, keyboard/screen-reader operation, media failure, and slow network states.
7. Review the complete flow with actual content. Fix repeated inconsistencies in the primitive before fixing each screen separately.

## Recommended screen recipes

**Today:** a brief welcome, the current passage or resume context, a dominant reading action, and a small number of useful supporting items. Use a compact brand moment instead of a full-height marketing hero.

**Reader:** book/chapter and translation above the passage; clear navigation around it; completion feedback below. Avoid textures, carousel motion, and unrelated promotional cards within the passage. Preserve place while moving between supporting views.

**Plan:** an understandable day list/grid, distinct completed and selected states, a direct jump action, and accurate storage language. Never rely on orange alone to communicate completion.

**Prayer:** a visible field label, comfortable writing area, clear save state, and calm list presentation. Use an explicit destructive action for deletion and the application's established recovery/confirmation behavior.

**Account:** state the signed-in or signed-out condition first, then account actions. Keep validation adjacent to fields. Support password managers and autofill without decorative input tricks.

## Recommended accessibility and resilience review

- Readable foreground/background pairs, including text on imagery and every control state.
- Visible focus and useful reading order; every icon control has a name.
- Web controls use semantic roles; native controls expose equivalent name, role, and state.
- Labels persist after entry; validation, loading, save, and failure feedback are understandable.
- Text scales and wraps; control heights grow rather than clipping translated or enlarged labels.
- Selected, current, completed, and disabled states use shape, text, or icons as well as color.
- Media has controls and captions/transcripts; motion respects user preference.
- Content appears without waiting for a decorative reveal animation.
- Layout handles safe areas, keyboard display, narrow widths, missing images, and a failed network call.

## Handoff brief for a designer or coding agent

> Follow the Bible Dept direction in `docs/style-guide/`: paper `#FFF5F5`, ink `#0A0A09`, brand orange `#F05A00`, darker action `#B74300` for white control labels, bold sans-serif headings, crisp 4px controls, generous space, warm human imagery, and practical encouraging copy. Use ARMA's condensed/italic treatment only when an ARMA editorial direction is explicitly selected. Treat source CSS measurements, existing app adaptations, and new recommendations as separate categories. Reuse the existing mobile theme and controls, preserve the active app's free scope, and implement full loading/error/focus/large-text behavior. Keep Scripture surfaces quiet and readable.

## Definition of done for a future design pass

The primary task is clear before scrolling; color and typography follow the chosen direction; actual copy and approved assets are present; no state depends on color alone; all controls work with their intended input methods; reading remains comfortable at enlarged text; and a failed request leaves a clear route forward. A good-looking screenshot alone does not establish that a flow is ready.

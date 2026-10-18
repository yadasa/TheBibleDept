# Active app design review

This pass follows the Bible Dept product direction in this folder: paper, ink, orange, system sans, crisp controls, and calm reading surfaces. It changes `bibledept-mobile`, the active Expo app.

## Parts and review gates

1. **Foundations:** semantic type/spacing/control roles, one stroke icon system, readable field boundaries, button hierarchy, focus and loading feedback.
2. **App shell and Today:** safe areas, labeled icon navigation, one screen title, current day and actual reading before supporting actions.
3. **Plan and reader:** chapter/translation/text size before Scripture; completion below reading; current/selected/completed day states; local storage wording; working podcast controls.
4. **Prayer and account:** private journal, patient empty states, persistent field labels, explicit account status, focused sign-in actions and recovery.
5. **Flow review:** narrow and tablet widths, large reading text, day browsing/advancement, search/error recovery, auth validation, podcast, and iOS bundle verification.

Each part is reviewed and pushed separately. Check the actual controls and content, not only screenshots. Native safe areas, keyboard behavior, and VoiceOver still need a physical iPhone review; browser checks cannot establish those results.

## Part 1 — foundations
TypeScript passes. At 390 × 844, persistent 14-unit labels, 52-unit inputs, focus outline, readable secondary boundaries and 16-unit button labels render correctly. SVG icons use the SDK-compatible native module. Existing screen hierarchy is intentionally addressed in the next parts.

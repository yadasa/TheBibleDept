# Active app design review

This pass follows the Bible Dept product direction in this folder: paper, ink, orange, system sans, crisp controls, and calm reading surfaces. It changes `bibledept-mobile`, the active Expo app.

## Parts and review gates

1. **Foundations:** semantic type/spacing/control roles, one stroke icon system, readable field boundaries, button hierarchy, focus and loading feedback.
2. **App shell and Today:** safe areas, labeled icon navigation, one screen title, current day and actual reading before supporting actions.
3. **Plan and reader:** chapter/translation/text size before Scripture; completion below reading; current/selected/completed day states; local storage wording.
4. **Passage search:** shared reading controls, editable failed requests, translation choice and sharing.
5. **Daily teaching:** consistent media controls and readable episode details.
6. **Prayer:** private journal, patient empty states, persistent field labels and confirmed save feedback.
7. **Account:** explicit account status, focused sign-in actions, recovery and phone verification states.
8. **Continuity and privacy:** preserve reading place and drafts while clearing retained private state on account changes.
9. **Accessibility and final review:** focus, keyboard operation, narrow/tablet widths, large Scripture, resilience, and iOS bundle verification.

Each part is reviewed and pushed separately. Check the actual controls and content, not only screenshots. Native safe areas, keyboard behavior, and VoiceOver still need a physical iPhone review; browser checks cannot establish those results.

## Part 1 — foundations
TypeScript passes. At 390 × 844, persistent 14-unit labels, 52-unit inputs, focus outline, readable secondary boundaries and 16-unit button labels render correctly. SVG icons use the SDK-compatible native module. Existing screen hierarchy is intentionally addressed in the next parts.

## Part 2 — shell and Today
TypeScript passes. Reviewed at 390 × 844 and 768 × 1024: one title, current-day resume before scrolling, 20-unit phone gutters, bounded tablet column, and labeled icon tabs. Read day opens the correct saved plan. Supporting journal/account actions remain reachable; no plan position was reset.

## Part 3 — plan reader and day navigation
TypeScript and all 18 unit tests pass. Reviewed at 390 and 320 widths, including 28-unit Scripture, shared text-size settings after reload, chapter navigation returning to the top, day 365 browsing without advancement, and explicit completion advancing one day. Narrow grid review found a clipped Current label; changed it to Now beside the explicit current-day summary. Plan position remains local.

## Part 4 — passage search
Reviewed search with John 3:16 in WEB and KJV, a failed reference followed by correction, shared enlarged text, and Copy passage link confirmation. Fields remain editable after API errors. Improved the provider's generic 400 message so it doesn't assume every failed reference was a multi-chapter request.

## Part 5 — daily teaching player
Phone review confirms manual play, pause and 15-second skip still work. Selecting another day resets playback to the matching episode. The presentation uses the shared icons and readable metadata while preserving the existing seek-coordinate fallback, timeout, and audio lifecycle. No audio files are bundled or uploaded.

## Part 6 — prayer journal
Reviewed the guest, empty, composer and answered states at phone width. A disposable account on the local Firebase emulator verified save feedback, empty-draft validation, and marking an entry answered. Drafts survive tab navigation in the retention part. Validation clears when writing resumes. No live prayer or account data was written.

## Part 7 — account and phone
Reviewed signed-out, signed-in, validation and phone screens. Local emulator UI verified email sign-in/sign-out and fictional phone verification without sending SMS. Switching to a different test UID shows an empty journal without the other account's prayers or draft. Unsupported preview SMS is explained and disabled, with email as the usable action. The configured native phone build keeps its verification path. Both Firebase integration tests pass.

## Part 8 — continuity and privacy
Visited views now keep reader chapter/translation, search drafts, prayer drafts and scroll positions. Verified Luke 2/KJV and the exact 1,688-unit scroll offset after Prayer/Bible navigation, plus a Search draft after Home resume. Hidden views are removed from accessibility. Account changes remount retained state; a second emulator UID cannot see the prior journal/draft. Podcast continues across chapters, stops leaving the reader, and returns idle. A local passage link opens John 3:16 in KJV.

## Part 9 — accessibility and final review
Checked 320, 390 and 768 widths, with no horizontal overflow at tablet width; a second visual review found no clipping or hierarchy blocker. Browser keyboard checks cover visible 2-unit focus outlines, Tab/Enter form validation, Escape picker dismissal, and slider arrow-key seeking. Decorative SVG accessibility props are platform-specific to avoid invalid DOM warnings. Final Today reload has no console errors.

TypeScript, all 18 unit tests, both Firebase emulator integration tests and the iOS JavaScript bundle export pass. The plan JSON and podcast mappings remain bundled; no new cloud mapping was introduced. Physical iPhone safe areas, keyboard, VoiceOver and native large-text behavior remain device checks. The web audio SDK can log an AbortError when playback is immediately interrupted during startup; pause/release still works, and this is not a verified native iOS issue.

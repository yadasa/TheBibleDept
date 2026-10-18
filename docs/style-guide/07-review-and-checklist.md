# Review and checklist

## Completed review

The guide was reviewed on October 18, 2026 against fetched source CSS, public page structure, browser observations, and the active mobile theme. The review checked source attribution, measured versus proposed values, local navigation, token consistency, contrast calculations, responsive composition, and product-scope language.

### Revisions made

| Finding | Revision |
| --- | --- |
| Generic typography can hide component overrides | The guide distinguishes ARMA's 112px hero from its generic H1, Bible Dept's 1.0 hero leading from generic 1.2, and the Plan page's H2-sized H1 from generic phone H1. |
| Filename filtering omitted important images | Expanded the inventory using component roles, adding the Bible Dept hero portrait, ARMA hero background, course thumbnails, teaching stills, and testimonial portrait. Removed an unrelated Webflow background reference. |
| A reference button weight did not vary by brand | Added a semantic button-weight variable: Bible Dept 600 and ARMA 500. |
| The visual board's tablet reading column was too narrow | Collapsed the hero and content grids at 991px and gave swatches a separate tablet layout. |
| A standalone guide could be hard to find | Added a direct section in the repository README and a complete guide index. |
| Marketing orange can imply unsuitable small-text pairings | Kept brand accent distinct from readable actions, with calculated contrast and the existing app shade. |

### Verification scope

- Local Markdown destinations resolve, including the active app files named in the handoff.
- JSON reference files parse, and token roles agree with the documented source/app distinctions.
- Solid-color contrast was calculated from sRGB relative luminance; source photography and textures are not declared compliant by that calculation.
- The HTML reference was visually inspected at measured CSS viewport widths of 1440px, 768px, and 390px. It has no horizontal overflow at those widths; the revised tablet reading example uses the full content column.
- The field has a persistent associated label and accepts text; its content is never submitted. The sample disabled control is noninteractive. The disclosure expands and collapses using native browser semantics.
- Application behavior is unchanged. Runtime app tests are outside this documentation-only change.

The HTML board uses fallback fonts and original example copy. It illustrates the design roles; exact licensed font metrics, production images, real-device screen readers, and a future implementation still require verification in their destination.

## Checklist for the next project

### Brand and taste

- [ ] Choose Bible Dept or ARMA as the primary direction.
- [ ] State the reader's outcome and main next action clearly.
- [ ] Use the chosen type hierarchy, corner treatment, and palette consistently.
- [ ] Give each section one job and enough room to perform it.
- [ ] Use approved host/teaching imagery with intentional crops.
- [ ] Keep reading surfaces calm and free of decorative texture.

### Content and components

- [ ] Use actual content, current offer details, and approved testimonials.
- [ ] Give buttons concrete labels and distinguish primary from secondary actions.
- [ ] Implement loading, empty, error, saved, selected, and disabled states.
- [ ] Label fields visibly and explain submission results.
- [ ] Keep marketing claims separate from implemented product capabilities.
- [ ] Describe local versus account-backed storage accurately.

### Accessibility and resilience

- [ ] Check text contrast, control boundaries, and focus against actual backgrounds.
- [ ] Verify keyboard order, accessible names, and native/web state semantics.
- [ ] Distinguish current, selected, and completed without relying only on color.
- [ ] Check large text, safe areas, long labels, and keyboard display.
- [ ] Honor reduced motion and provide captions/transcripts for teaching media.
- [ ] Preserve a useful layout and next action when images or network calls fail.
- [ ] Check around structural breakpoints and on the intended devices.

## Maintain the guide

When the public brand changes, inspect the rendered page and its current linked stylesheet together. Update only affected findings, preserve the distinction between extracted values and recommendations, and date the evidence. Do not replace a measured component style with a generic utility merely because its class name looks authoritative.

When a new project's design intentionally departs from the guide, record the reason beside the new component or token. Reading comfort, platform behavior, and clear tasks can justify a departure while preserving the brand family.

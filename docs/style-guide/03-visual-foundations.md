# Visual foundations

## Color roles

Use the Bible Dept column by default. Keep the ARMA palette as a separate theme rather than rotating accents within a screen. Source variables are extracted from the [dated CSS evidence](source-evidence.json).

| Role | Bible Dept source | ARMA source | Recommended use |
| --- | --- | --- | --- |
| Brand accent | `#F05A00` | `#FC4615` | Identity fields, accent graphics, selected decoration |
| Brand ink | `#0A0A09` | `#151515` | Headings, reading text, dark surfaces |
| Brand paper | `#FFF5F5` | `#E6E7DA` | Warm surfaces or inverse labels |
| Secondary light | `#FFFFFF` | `#EEEFE8` text | Plain panels or text on dark backgrounds |
| Supporting accent | No second accent required | `#FE8408` utility | Use only for a deliberate ARMA treatment |
| Readable action | Existing repo `#B74300` | Proposed use of ink action | Filled controls with small white labels |

The mobile app also has `#74675F` muted text, `#E9DBD3` decorative borders, and `#FFE7D9` tint. These are **existing repository adaptations**, not extracted public-site colors. Keep brand and interface semantics separate: action, error, selection, and decoration have different jobs.

## Contrast and readable combinations

The following ratios are calculated for solid sRGB colors. Texture, photography, opacity, and overlays require checking the actual rendered surface.

| Foreground / background | Ratio | Use |
| --- | --- | --- |
| White / Bible Dept orange | 3.40:1 | Large text only; unsuitable for normal-size button labels |
| Ink / Bible Dept orange | 5.82:1 | Normal text on a solid orange field |
| White / darker action | 5.50:1 | Normal-size filled action labels |
| Darker action / paper | 5.14:1 | Text links on paper |
| Ink / paper | 18.52:1 | Main reading pair |

Use at least 4.5:1 for normal text and 3:1 for large text. Large means at least 24 CSS px regular or about 18.67 CSS px bold. Relevant control boundaries and focus indicators need 3:1 against adjacent colors. A quiet decorative border need not carry the entire affordance: add a sufficiently visible boundary when it identifies an input or control. Refer to the [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

Preserve vivid orange for recognition. For smaller white text on a filled action, use the existing darker action shade. In an orange hero, a paper button with ink text is a useful brand-consistent choice. Avoid claiming that every pairing copied from the public sites is accessible.

## Typography

### Font families

Both sites declare `neue-haas-grotesk-display, sans-serif` for body text and load Adobe Typekit kits. ARMA adds `headline-gothic-atf` for headings and `big-caslon-fb` italic for selected words. Bible Dept uses the grotesk at bold weight for headings; its CSS also contains `brush-script-std` as an accent utility.

Use the licensed families when the destination's font licensing and delivery support them. Do not copy font binaries or reuse the source site's Typekit embed as an implementation dependency. The reference CSS in this guide uses system fallbacks and records the intended families without loading remote fonts.

Recommended fallback intent: a clean system sans for the shared family; a narrow sans for an ARMA display; Georgia italic for an ARMA serif accent. These fallbacks preserve roles, not exact metrics. Recheck wrapping when real fonts arrive. Use only a few accent words per editorial heading; avoid script for controls, reading text, or dense instructions.

### Extracted type scale

At a 16px root, generic classes yield these values. Headings have no default top/bottom margins in the brand layer; spacing wrappers provide the rhythm.

| Role | Bible Dept desktop | ARMA desktop | Tablet generic | Small-screen generic |
| --- | --- | --- | --- | --- |
| H1 | 56px, 700, 1.2 | 80px, 400, 1.2 | 52px | 40px |
| H2 | 48px, 700, 1.2 | 48px, 400, 1.2 | 44px | 36px |
| H3 | 40px, 700, 1.2 | 40px, 400, 1.2 | 36px | 32px |
| H4 | 32px / 1.3 | 32px / 1.3 | Check component | Check component |
| H5 | 24px / 1.4 | 24px / 1.4 | Check component | Check component |
| H6 | 20px / 1.4 | 20px / 1.4 | Check component | Check component |
| Medium body | 18px / 1.5 | 18px / 1.5 | 18px | 16px |
| Regular body | 16px / 1.5 | 16px / 1.5 | 16px | 16px |

The actual ARMA home hero is 112px / 1 on desktop; the actual Bible Dept home hero is 56px / 1 and uppercase. Do not apply either oversized display treatment to app navigation or Scripture text. Bible Dept body letter spacing is 0.25px; ARMA button tracking is 0.05rem.

### Recommended product scale

For a phone interface, start with screen titles 28–32, section titles 20–24, body 16–18, metadata 13–14, and button labels 15–16 platform units. Scripture starts at 18–20 with a 1.5–1.7 line-height ratio and a user-adjustable text size. Use sentence case for reading and instructions; reserve uppercase for brief brand titles or small labels. Support font scaling and wrapping instead of fixed text heights.

## Layout and space

The shared desktop container is 80rem (1280px at a 16px root) inside 5% outer gutters. A full-bleed image or color field may extend beyond that container. Large section padding is 112px on desktop, 96px at the tablet tier, and 64px at the smaller tier.

Recommended internal spacing uses 4, 8, 12, 16, 24, 32, 48, and 64px steps. This is a normalized implementation scale, not a claim that the sites use only those values. Start with 16–24px between a heading and its paragraph, 24–32px before actions, and 48–80px between desktop content columns. Align related edges before introducing more containers.

For daily app views, use a 20px side inset as a starting point, 16–24px panel padding, 24–32px between groups, and safe-area-aware bottom space. Let Scripture occupy the reading width. A marketing container is not an instruction to create huge empty borders on a phone.

## Responsive behavior

| CSS range | Extracted shared tier | Recommended behavior |
| --- | --- | --- |
| Above 991px | Desktop | Split heroes, multi-column process/proof, stable aligned container |
| 768–991px | Tablet | Reduce gutters/gaps where needed; Bible Dept hero becomes one column |
| 480–767px | Small landscape | Stack split explanations and FAQ introduction/content; reduce section space |
| Up to 479px | Phone portrait | Single column; wrap actions; check cropping and title breaks |

Keep DOM reading order useful when layouts collapse. Use content-driven heights. On narrow screens, allow the primary action to become full width where needed; do not shrink labels to preserve a two-button row. Review at 390px and 768px and around each structural breakpoint. These are recommended verification widths, separate from the source's exact media queries.

## Shape and ornament

Bible Dept controls use a 4px radius; ARMA buttons use 10px. Use modest borders and crisp surfaces. A portrait or content image can have its own crop and corner treatment without making every surface a rounded card. Avoid adding shadows unless they explain elevation, such as a floating menu. Use underlines or another persistent cue for links within paragraphs.

Manuscript textures belong to branded headers, section backgrounds, or campaign art. Keep them low contrast beneath copy and absent behind long passages, forms, and small metadata. Do not substitute visual texture for a sufficient solid-color text contrast.

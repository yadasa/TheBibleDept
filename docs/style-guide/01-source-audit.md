# Source audit

## Scope and provenance

The October 18, 2026 audit uses public marketing pages and their linked stylesheets. Both homepages identify Webflow assets and use comparable utility and component naming. That supports reusing their structural approach; it does **not** establish that the same developer made both sites. Shared ownership is supplied by the project owner.

| Reference | Evidence inspected | Design role |
| --- | --- | --- |
| [ARMA home](https://www.armacourses.com/) | Rendered desktop hero, computed typography and buttons, HTML sections, responsive CSS | Course and membership marketing; dramatic editorial direction. |
| [Bible Dept home](https://www.thebibledept.com/) | Rendered desktop hero, computed headings/buttons/sections, HTML and responsive CSS | Daily Scripture journey; default product direction. |
| [Start Here](https://www.thebibledept.com/start-here) | Public HTML, headings, links and shared stylesheet | Sequential onboarding into resources. |
| [Plan](https://www.thebibledept.com/plan) | Public HTML, headings, links and shared stylesheet | Single resource acquisition task. |
| [Listen](https://www.thebibledept.com/listen) | Public HTML, headings, links and shared stylesheet | Podcast platform choice and daily teaching. |

No account, purchase, email signup, or private member area is needed for this guide. Asset URLs are references; this documentation does not bundle the sites' font files or photo library.

## Shared structure

Both stylesheets contain `.padding-global` at 5% horizontal padding, `.container-large` with an 80rem maximum, and `.padding-section-large` at 7rem above and below on desktop. Both use `.text-size-medium` at 1.125rem and body text at 1rem with 1.5 line height. These are extracted values, with a 16px root used for the pixel equivalents below.

The recurring structural vocabulary is section → outer gutter → centered container → section spacing → component grid → content and image. Reuse that separation of responsibilities even in another framework. Keep semantic document headings separate from visual size classes.

## Brand differences

| Property | ARMA | The Bible Dept |
| --- | --- | --- |
| Primary accent | `--red: #FC4615` | `--base-color-brand--orange: #F05A00` |
| Dark | `#151515` | Brand ink `#0A0A09`; neutral black also exists |
| Warm light | `#E6E7DA`; text light `#EEEFE8` | Brand paper `#FFF5F5`; white also exists |
| Shared body family | Neue Haas Grotesk Display, weight 500 base | Neue Haas Grotesk Display, weight 400 base |
| Display family | Headline Gothic ATF, weight 400 | Neue Haas Grotesk Display, weight 700 |
| Accent family | Big Caslon FB italic | Brush Script Std utility exists; not needed for the home hero |
| Actual desktop home hero | 112px / 112px, condensed plus serif accents | 56px / 56px, uppercase sans serif |
| Button radius | 10px | 4px |
| Hero composition | Full-width darkened monochrome historical sculpture | Orange manuscript field beside a warm host portrait |

The actual ARMA hero uses `.home_hero-header_heading` at **7rem**, overriding the generic 5rem H1. The Bible Dept home uses `.heading-style-h1` with line height **1**, overriding the generic H1 line height 1.2. Treat actual component styles as more specific evidence than a utility name.

## Responsive CSS evidence

Both sheets include 991px, 767px, and 479px maximum-width media queries. Large section spacing changes from 7rem to 6rem at the tablet tier and 4rem at the smaller tier. Generic H1/H2/H3 sizes follow desktop → tablet → small-screen values of 56/48/40px → 52/44/36px → 40/36/32px in Bible Dept. ARMA's generic desktop H1 is 80px, while its actual hero has further overrides. Consult the context fields in [source-evidence.json](source-evidence.json) before reproducing an individual rule.

## Repository context

The active client is `bibledept-mobile`, using `src/theme.ts` and `src/components/ui.tsx`. Its brand constants come from `bibledept-app/src/config/color/palette.ts`. The existing palette already includes Bible Dept orange, ink, paper, and the darker action shade `#B74300`. The active UI already uses 4px corners and 50-unit minimum button/input heights.

The retained native app and dashboard are migration references, as explained in the repository [README](../../README.md). Their broader palettes and old feature surfaces are not the source of the pastor's current public brand. This guide adds documentation and reference assets; it does not change runtime styling or turn retained features into active features.

## Evidence artifact

[source-evidence.json](source-evidence.json) records selected CSS declarations with their media-query context and SHA-256 hashes of fetched HTML/CSS. It deliberately omits generated Webflow boilerplate and binary assets. Use it to check measurements against the dated source without treating every unused CSS class as a visible design decision.

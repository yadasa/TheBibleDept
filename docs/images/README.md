# README images

Created October 19, 2026 using the built-in image generation tool. The running Expo web preview supplied the six real 390 × 844 screen captures below. Private content belongs to a fictional local demo account; no church account or personal journal was photographed.

The phone hardware, perspective, lighting and studio backgrounds are rendered presentation mockups, not photographs of a native iPhone build. The unframed captures remain available for checking the actual interface. In particular, the light-theme capture correctly identifies its practice account.

| Image | Screens | Output |
| --- | --- | --- |
| Banner | Home, daily player, Scripture | [bibledept-banner.webp](bibledept-banner.webp) |
| Reading and Notes | Highlighted Scripture and its connected note | [bibledept-reading-notes.webp](bibledept-reading-notes.webp) |
| Preferences | Reading preferences and light appearance | [bibledept-account-preferences.webp](bibledept-account-preferences.webp) |

All three final images were visually reviewed and encoded as WebP at quality 90 without resizing. Together they occupy **603,250 bytes**, versus 6,194,759 bytes for the generated PNGs. These documentation images live outside the app and are not included in its bundle.

## Original captures

- [Home](captures/home.jpg)
- [Scripture highlight](captures/reader.jpg)
- [Connected Notes](captures/notes.jpg)
- [Podcast player](captures/player.jpg)
- [Reading preferences](captures/preferences.jpg)
- [Light appearance](captures/appearance-light.jpg)

## Generation prompts

Mode: built-in `image_gen`, using local screenshot references, opaque backgrounds. No fallback CLI or external API key was used.

### Banner

> Use case: product-mockup / compositing. Asset: wide premium GitHub README banner for The Bible Dept app, landscape about 2400x1200. Input image 1 is the exact Home screenshot; image 2 is the exact daily podcast player screenshot; image 3 is the exact highlighted Scripture screenshot. Use these as screen inserts, preserving their existing UI, logo, text, controls, colors and proportions faithfully. Do not invent, rewrite or redesign the app screens. Render three realistic recent iPhones in black titanium with convincing physical thickness, side buttons, slim glass, subtle studio reflections, shadows and a camera island that does not cover screenshot content. Slightly skewed 3D poses, small 8–12 degree yaw and 2–4 degree roll; this must look like photographed three-dimensional devices, not flat 2D phone outlines. Place Home prominently in front, podcast player to the right and Scripture to the left behind it with modest overlap, keeping main feature titles and navigation visible. Backdrop is near-black fine grain matching the app, with one restrained circular #F05A00 orange glow near the upper-right, fading smoothly into black; do not make the whole scene gray or orange. Elegant restrained lighting. Add only this exact title in generous bold white sans-serif in the upper-left negative space: 'The Bible Dept.' and below it, smaller: 'Read Scripture. Listen daily.' Keep the devices large, entirely in the image with breathing room, and screen copy as legible as the supplied resolution permits. No extra badges, labels, awards, decorative shapes, fake app screens, watermark or unrelated objects.

### Shared feature-image prompt

Append the relevant feature-specific instruction below to this shared prefix:

> Use case: product-mockup / compositing. Create a wide landscape premium README feature photograph, around 2000x1200. Treat the supplied app screenshots as exact screen inserts: preserve their actual layout, wording, text, logos, controls and colors faithfully, without inventing UI or new features. Render realistic black-titanium iPhones with physical depth, side buttons, slim glass, natural reflections and soft contact shadows. Small 8–12 degree yaw and 2–4 degree roll create slightly skewed three-dimensional models, never flat outlines. Keep each entire phone in frame with a little breathing room and legible screen content; the camera island/status area must not cover screenshot content. Match a near-black finely grained studio backdrop and one restrained circular #F05A00 orange glow fading into black, with elegant warm edge light. Do not wash the background gray or fill it with orange. No text outside the phones, no marketing badges, no watermark, no unrelated objects.

Reading and Notes:

> Exactly two phones beside each other with modest depth separation: image1 is the highlighted Luke1 Scripture reader on the left; image2 is the connected Your notes screen on the right. Use both supplied screenshots unchanged on their respective displays. Convey the direct connection between Scripture highlighting and private notes through the paired composition, without arrows or explanatory graphics.

Preferences:

> Exactly two phones beside each other with modest depth separation: image1 is the dark Reading preferences screen on the left; image2 is the light Appearance screen on the right. Keep the contrasting dark/light screens faithful to the supplied screenshots, including existing labels and selected controls. The orange glow stays behind the hardware, never overlaid onto the screen images. Both devices have the same realistic black titanium material and scale, with subtle opposing angles.

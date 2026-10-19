# README images

Created and updated October 19, 2026. The running Expo web preview supplied real 390 × 844 captures. The original reading/notes/preferences images use a fictional local practice account. Updated Home, activity and player captures use the owner's expressly authorized preview account with example content; account identity, credentials and private settings are not photographed.

The phone hardware, perspective, lighting and studio backgrounds are rendered presentation mockups, not photographs of a native iPhone build. The unframed captures remain available for checking the actual interface. In particular, the light-theme capture correctly identifies its practice account.

| Image | Screens | Output |
| --- | --- | --- |
| Banner | Home, daily player, Scripture | [bibledept-banner.webp](bibledept-banner.webp) |
| Home and activity | Current day and full contribution calendar | [bibledept-home-activity.webp](bibledept-home-activity.webp) |
| Player GIF | Actual playback in a rendered angled phone | [bibledept-player.gif](bibledept-player.gif) |
| Reading and Notes | Highlighted Scripture and its connected note | [bibledept-reading-notes.webp](bibledept-reading-notes.webp) |
| Preferences | Reading preferences and light appearance | [bibledept-account-preferences.webp](bibledept-account-preferences.webp) |

The four static compositions were visually reviewed and encoded as WebP at quality 90 without resizing. They total **783,940 bytes**. The GIF is **429,496 bytes**, for **1,213,436 bytes** of presentation media altogether. These files live outside the app and are not included in its bundle.

## Original captures

- [Home](captures/home.jpg)
- [Full activity calendar](captures/activity.jpg)
- [Scripture highlight](captures/reader.jpg)
- [Connected Notes](captures/notes.jpg)
- [Podcast player](captures/player.jpg)
- [Reading preferences](captures/preferences.jpg)
- [Light appearance](captures/appearance-light.jpg)

## Generation prompts

Mode: built-in `image_gen`, using local screenshot references, opaque backgrounds. No fallback CLI or external API key was used.

## October 19 refresh

The banner's center Home and right player screens were replaced with their new captures, preserving the original hardware, left Scripture phone, lighting and title. A separate Home/activity composition shows the full calendar. The shots preserve the live distinction between **100 completed lessons / Day 101 next** and **99 dated readings / 11 days in a row**; lesson completions and dated reading activity are different records. No progress was reset for the images.

The player GIF uses 60 actual sequential browser screenshots over 9.439 seconds of real podcast playback. A Remotion 4.0.537 composition maps their timestamps to a 9.6-second, 10 fps, 1000 × 880 looping GIF. The waveform, time counters, transport and mini-player are captured UI, not simulated bars. Only the surrounding presentation hardware, perspective, studio light and caption are rendered. The GIF is silent. A static hardware pose keeps compression efficient. Neither Remotion nor its browser renderer is an app dependency.

### Banner refresh prompt

> Use case: compositing. Edit target image 1 is the existing The Bible Dept wide README banner. Supporting exact screen inserts: image 2 is the NEW Home screen, image 3 is the NEW daily audio player. Replace only the CENTER phone screen with image 2, and the RIGHT phone screen with image 3, faithfully compositing every piece of actual UI. In the center retain Day 101, Exodus 16-18, 100 days completed, the progress bar ABOVE the count, and the orange/white reading calendar. Do not retain old Day 01 or the obsolete time zone copy. Right phone retain Day 101: Exodus 16-18, the small rounded podcast artwork at top right, genuine orange waveform, centered controls and current mini-player. Preserve the left Scripture phone, realistic titanium hardware and slightly skewed 3D poses, depth, background near-black grain with restrained orange circular glow, title 'The Bible Dept.' and subtitle 'Read Scripture. Listen daily.' from image 1. Keep the same polished three-phone banner composition and generous device margins. Do not invent, simplify or rewrite the supplied screen UI. No additional text, labels, watermarks or devices.

### Home/activity prompt

> Use case: product-mockup / compositing. Create a premium wide README feature image with two realistic black titanium iPhones, slightly skewed three-dimensional hardware poses, physical side thickness/buttons and glass reflections, not flat outlines. Image 1 is the exact current Home screen insert for the left/front phone; image 2 is the exact activity-calendar screen insert for the right phone. Preserve all supplied actual UI faithfully, including Day 101 / 365, Exodus 16-18, Read day 101, progress bar ABOVE 100 days completed 27%, 99 total days, 11 days in a row, the 7-row orange-to-white activity squares with gaps, the frosted bottom navbar, small orange verse/book icons. Do not invent or rewrite any UI. Keep both complete devices in frame with generous margin and legible screen content, subtle opposing yaw 8–12 degrees and roll 2–3 degrees. Camera/status hardware may be above each screenshot but must not cover app content. Near-black fine-grained studio background matching the app, one restrained circular #F05A00 glow behind upper-right device fading into black, elegant warm edge lighting and soft contact shadows. No external title, badges, arrows, watermarks, or extra UI. Wide landscape about 1800x1100. This is a factual product presentation, not a redesigned concept.

## Original generation prompts

### Banner

> Use case: product-mockup / compositing. Asset: wide premium GitHub README banner for The Bible Dept app, landscape about 2400x1200. Input image 1 is the exact Home screenshot; image 2 is the exact daily podcast player screenshot; image 3 is the exact highlighted Scripture screenshot. Use these as screen inserts, preserving their existing UI, logo, text, controls, colors and proportions faithfully. Do not invent, rewrite or redesign the app screens. Render three realistic recent iPhones in black titanium with convincing physical thickness, side buttons, slim glass, subtle studio reflections, shadows and a camera island that does not cover screenshot content. Slightly skewed 3D poses, small 8–12 degree yaw and 2–4 degree roll; this must look like photographed three-dimensional devices, not flat 2D phone outlines. Place Home prominently in front, podcast player to the right and Scripture to the left behind it with modest overlap, keeping main feature titles and navigation visible. Backdrop is near-black fine grain matching the app, with one restrained circular #F05A00 orange glow near the upper-right, fading smoothly into black; do not make the whole scene gray or orange. Elegant restrained lighting. Add only this exact title in generous bold white sans-serif in the upper-left negative space: 'The Bible Dept.' and below it, smaller: 'Read Scripture. Listen daily.' Keep the devices large, entirely in the image with breathing room, and screen copy as legible as the supplied resolution permits. No extra badges, labels, awards, decorative shapes, fake app screens, watermark or unrelated objects.

### Shared feature-image prompt

Append the relevant feature-specific instruction below to this shared prefix:

> Use case: product-mockup / compositing. Create a wide landscape premium README feature photograph, around 2000x1200. Treat the supplied app screenshots as exact screen inserts: preserve their actual layout, wording, text, logos, controls and colors faithfully, without inventing UI or new features. Render realistic black-titanium iPhones with physical depth, side buttons, slim glass, natural reflections and soft contact shadows. Small 8–12 degree yaw and 2–4 degree roll create slightly skewed three-dimensional models, never flat outlines. Keep each entire phone in frame with a little breathing room and legible screen content; the camera island/status area must not cover screenshot content. Match a near-black finely grained studio backdrop and one restrained circular #F05A00 orange glow fading into black, with elegant warm edge light. Do not wash the background gray or fill it with orange. No text outside the phones, no marketing badges, no watermark, no unrelated objects.

Reading and Notes:

> Exactly two phones beside each other with modest depth separation: image1 is the highlighted Luke1 Scripture reader on the left; image2 is the connected Your notes screen on the right. Use both supplied screenshots unchanged on their respective displays. Convey the direct connection between Scripture highlighting and private notes through the paired composition, without arrows or explanatory graphics.

Preferences:

> Exactly two phones beside each other with modest depth separation: image1 is the dark Reading preferences screen on the left; image2 is the light Appearance screen on the right. Keep the contrasting dark/light screens faithful to the supplied screenshots, including existing labels and selected controls. The orange glow stays behind the hardware, never overlaid onto the screen images. Both devices have the same realistic black titanium material and scale, with subtle opposing angles.

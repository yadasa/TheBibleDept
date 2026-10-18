# Imagery and voice

## Art direction

Bible Dept's visible reference is personal and tactile: an approachable teacher, an open Bible, study notes, and manuscript surfaces. ARMA's hero uses a darkened monochrome sculptural scene. Use these as two purposeful art directions, selected by brand and message.

| Asset | Recommended treatment | Avoid |
| --- | --- | --- |
| Teacher portrait | Warm expression, natural skin tone, enough crop room, teaching context | Dramatic color grading that changes skin tone or obscures the person |
| Bible or study detail | Documentary light, readable focal object, clear connection to task | Decorative staged objects unrelated to the resource |
| Historical image | Strong silhouette or composition; careful darkening for text | Generic antiquity as a substitute for relevant content |
| Manuscript texture | Selective brand field, controlled contrast, empty breathing room for type | Texture behind long reading or essential small text |
| Course art | Consistent crop, strong title hierarchy, coherent collection | A different visual system on every card |
| Icons | One simple stroke/fill system, stable weight, labels when needed | Emoji or mixed icon packs as the primary product navigation |

## Logos and asset handling

Use the approved source logo artwork. Do not retype the Bible Dept rings or redraw the ARMA monogram with a convenient font. Preserve aspect ratio, keep clear space, and use a legible variant on each background. As a starting recommendation, keep at least half the mark's height clear around it; an official logo file's specifications take precedence.

[asset-inventory.json](asset-inventory.json) lists selected image and background references found in public HTML/CSS, including their original URLs and source pages. It is a reference inventory, not a redistribution bundle. Confirm the intended project can use the chosen portraits, textures, teaching stills, and licensed fonts before including originals in a release. Record approval, attribution if required, and the final derivative path in the destination project's asset manifest.

For new production assets, retain an original and make optimized web/native derivatives. Set dimensions to prevent layout shift, use responsive sizes on web, and choose AVIF/WebP where supported with a suitable fallback. Load the main hero deliberately; lazy-load images lower on the page. Crop by subject rather than stretching. Starting ratios for new work are 4:5 for a portrait and 16:9 for teaching/course media; these are recommendations, not measurements of every source image.

Use alt text for meaningful content and empty alt text for decorative textures. A linked logo needs a useful home/destination name. Do not repeat nearby text verbatim in alt text or put critical instructions inside an image.

## Voice principles

The source copy combines pastoral reassurance with practical teaching. Translate that into a voice that is direct, warm, confident, and patient. Address the reader as “you,” explain what they can do next, and welcome people with different levels of familiarity. Humor can ease a small moment; it should not trivialize a difficult passage or personal prayer.

| Situation | Recommended voice | Avoid |
| --- | --- | --- |
| Welcome | A clear invitation and achievable next step | Insider language that assumes church background |
| Teaching | Explain a term before using it repeatedly | Academic authority without an explanation |
| Encouragement | Recognize effort and make restarting easy | Guilt, public comparison, or spiritual judgment |
| Action | State the task and destination | Vague motivational commands |
| Error | Say what happened and how to recover | Blaming the person or exposing stack traces |
| Success | Confirm the completed action specifically | Exaggerated promises of spiritual results |

## Naming and typography in copy

Use **The Bible Dept.** for the public brand in prose, **BibleDept** for the app name where the repository already does, **ARMA** for the course brand, and **Dr. Manny Arango** when formally naming the host. Keep Bible, Scripture, and book names consistent. Do not change a Bible translation's wording to match brand voice.

Use sentence case in product controls, instructions, and reading content. Uppercase can provide a short visual brand treatment in a hero; keep the underlying text naturally cased when CSS performs that transformation. Keep headings concrete. Use short paragraphs and familiar verbs. Avoid making every sentence a slogan or every heading an exclamation.

## Original sample copy for adaptation

These are newly written examples, not quotations from the pastor or promises of implemented features.

| Context | Suggested copy |
| --- | --- |
| Daily product title | Make room for today's reading. |
| Daily helper | Open the next chapter and take it one passage at a time. |
| Resume action | Continue reading |
| Translation choice | Choose a translation |
| Reading completion | Today's reading is marked complete. |
| Missed day | Welcome back. You can begin again with today's passage. |
| Network failure | We couldn't load this chapter. Check your connection and try again. |
| Saved prayer | Your prayer is saved. |
| Empty prayer journal | A place to bring what's on your heart. Write your first prayer when you're ready. |
| Local plan position | Your place in the plan is saved on this device. |
| Unsupported offline task | Connect to the internet to load a passage. |

Only use completion and saved-state copy after that operation succeeds. Keep local plan position distinct from any account-backed completion history. Avoid wording that implies a private journal is visible to a community.

## Content integrity

Use current verified offer details when creating a course campaign; do not inherit prices, discounts, subscriber totals, deadlines, or a launch countdown from a dated reference. Keep the active app free as described in this repository. ARMA's paid-course marketing provides composition ideas, not authorization to add checkout or subscriptions.

Distinguish quoted Scripture, interpretation, personal testimony, and product instructions. Cite the translation for reproduced Scripture and follow that translation's permissions. Route theological claims through the project's editorial process. Do not attach the host's name to invented teaching or imply that a testimonial establishes a universal result.

## Editorial check

Read the title, helper, and action together. They should describe one coherent task. Then read the recovery state: it should make a difficult moment easier. If removing a decorative phrase improves understanding, remove it. If a claim needs a fact, verify the fact instead of strengthening the language.

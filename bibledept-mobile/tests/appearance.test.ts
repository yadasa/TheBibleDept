import { test } from "node:test";
import assert from "node:assert/strict";
import { colors } from "../src/themeColors";
import { annotationRange, validAnnotation } from "../shared/annotations";
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
test("both reading themes keep body, helper, action labels and links readable", () => {
  for (const [mode, c] of Object.entries(colors))
    for (const [label, fg, bg] of [
      ["body", c.ink, c.background],
      ["helper", c.muted, c.background],
      ["field helper", c.muted, c.surface],
      ["primary action", c.onAction, c.action],
      ["link", c.action, c.background],
    ])
      assert.ok(
        contrast(fg, bg) >= 4.5,
        `${mode} ${label} contrast is ${contrast(fg, bg)}`,
      );
});
test("verse ranges are reversible and empty comment-only notes are rejected", () => {
  assert.deepEqual(annotationRange(12, 4), { verseStart: 4, verseEnd: 12 });
  const note = {
    chapterId: "LUK.1",
    reference: "Luke 1",
    translation: "web" as const,
    verseStart: 1,
    verseEnd: 3,
    excerpt: "An excerpt.",
    color: "sage" as const,
    comment: "A reflection.",
  };
  assert.equal(validAnnotation(note), true);
  assert.equal(validAnnotation({ ...note, verseEnd: 999 }), false);
  assert.equal(
    validAnnotation({ ...note, color: "none", comment: "   " }),
    false,
  );
});

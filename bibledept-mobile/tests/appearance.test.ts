import { test } from "node:test";
import assert from "node:assert/strict";
import { BRAND_ORANGE, colors, luminousPalettes, orangeAlpha, ORANGE_TONES } from "../src/themeColors";
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
      ["link", c.actionText, c.background],
      ["selected text", c.actionText, c.tint],
      ["glass gradient label", c.onAction, ORANGE_TONES.light],
    ])
      assert.ok(
        contrast(fg, bg) >= 4.5,
        `${mode} ${label} contrast is ${contrast(fg, bg)}`,
      );
});
test('every theme uses the waveform orange for accent fills and one pigment for translucent accents',()=>{
  assert.equal(BRAND_ORANGE,'#F05A00');
  for(const c of Object.values(colors)) {
    assert.equal(c.orange,BRAND_ORANGE);assert.equal(c.action,BRAND_ORANGE);
    assert.equal(c.onAction,'#0A0A09');assert.equal(c.onOrange,'#0A0A09');
  }
  assert.equal(orangeAlpha(.22),'rgba(240,90,0,0.22)');
  assert.equal(orangeAlpha(4),'rgba(240,90,0,1)');
  assert.equal(orangeAlpha(NaN),'rgba(240,90,0,0)');
});

test('light-mode luminous white has a contrasting calendar bed and progress track',()=>{
  assert.ok(contrast('#FFFFFF',luminousPalettes.light.calendarWell)>=1.5);
  assert.ok(contrast('#FFFFFF',luminousPalettes.light.track)>=1.8);
  assert.ok(contrast('#FFFFFF',luminousPalettes.light.calendarWell)>contrast('#FFFFFF',colors.light.surface));
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

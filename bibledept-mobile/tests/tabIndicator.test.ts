import { test } from "node:test";
import assert from "node:assert/strict";
import { indicatorJourney, indicatorPosition, IndicatorPosition, navigationMetrics, NAV_GAP, NAV_PADDING } from "../src/services/tabIndicator";
import { pagePosition, tabOrder } from "../src/services/tabPaging";

test("rapid reversals start at the visible pill and page, without a stale endpoint", () => {
  const cell = 68;
  let visible: IndicatorPosition = { left: 151, width: cell };
  let page = 2;
  const taps = [4, 0, 3, 1, 4, 0, 2];
  for (const [index, destination] of taps.entries()) {
    const target = 7 + destination * (cell + 4);
    const journey = indicatorJourney(visible, target, cell);
    assert.deepEqual(indicatorPosition(journey, 0), visible);
    assert.equal(pagePosition({ from: page, to: destination }, 0), page);
    const progress = [0.01, 0.18, 0.4, 0.74, 0.98][index % 5];
    visible = indicatorPosition(journey, progress);
    page = pagePosition({ from: page, to: destination }, progress);
    assert.ok(Number.isFinite(visible.left));
    assert.ok(visible.width >= cell);
    assert.deepEqual(indicatorPosition(journey, 1), { left: target, width: cell });
  }
});

test("long journeys retain the original stretch and settle exactly in either direction", () => {
  const cell = 68;
  for (const [from, to] of [[0, 4], [4, 0]]) {
    const source = { left: 7 + from * 72, width: cell };
    const target = 7 + to * 72;
    const journey = indicatorJourney(source, target, cell);
    assert.deepEqual(indicatorPosition(journey, 0), source);
    assert.equal(indicatorPosition(journey, 0.24).width, 144);
    assert.deepEqual(indicatorPosition(journey, 1), { left: target, width: cell });
  }
});

test("a clipped duplicate row stays aligned at fractional mask positions and responsive widths", () => {
  for (const shellWidth of [296, 366, 420]) {
    const { cellWidth, rowWidth } = navigationMetrics(shellWidth);
    assert.equal(cellWidth * 5 + NAV_GAP * 4, rowWidth);
    assert.equal(rowWidth + NAV_PADDING * 2, shellWidth);
    for (const [from, to] of [[0, 4], [4, 0], [2, 3]]) {
      const journey = indicatorJourney({left:NAV_PADDING + from * (cellWidth + NAV_GAP),width:cellWidth},
        NAV_PADDING + to * (cellWidth + NAV_GAP),cellWidth);
      for (const progress of [0, .05, .24, .51, .72, .93, 1]) {
        const mask = indicatorPosition(journey, progress);
        const inverseOffset = NAV_PADDING - mask.left;
        for (const [index] of tabOrder.entries()) {
          const baseCenter = NAV_PADDING + index * (cellWidth + NAV_GAP) + cellWidth / 2;
          const clippedCenter = mask.left + inverseOffset + index * (cellWidth + NAV_GAP) + cellWidth / 2;
          assert.ok(Math.abs(baseCenter - clippedCenter) < 1e-9);
        }
      }
    }
  }
});

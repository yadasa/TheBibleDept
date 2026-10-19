import { test } from "node:test";
import assert from "node:assert/strict";
import { indicatorJourney, indicatorPosition, IndicatorPosition, tabUsesIndicatorInk } from "../src/services/tabIndicator";
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

test("pending destinations keep page-colored labels until the pill covers them", () => {
  for (const from of tabOrder) {
    for (const to of tabOrder) {
      if (from === to) continue;
      assert.equal(tabUsesIndicatorInk(to, to, from), false);
      assert.equal(tabUsesIndicatorInk(to, to, null), false);
      assert.equal(tabUsesIndicatorInk(from, to, null), false);
      assert.equal(tabUsesIndicatorInk(to, to, to), true);
      assert.equal(tabUsesIndicatorInk(from, to, to), false);
    }
  }
});

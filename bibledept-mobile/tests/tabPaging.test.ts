import { test } from "node:test";
import assert from "node:assert/strict";
import {
  journeyDuration,
  pagePosition,
  pagesCrossed,
  tabOrder,
} from "../src/services/tabPaging";

test("long tab jumps include every intermediate page in both directions", () => {
  assert.deepEqual(pagesCrossed(0, 4), tabOrder);
  assert.deepEqual(pagesCrossed(4, 0), tabOrder);
  assert.deepEqual(pagesCrossed(2, 3), ["Home", "Bible"]);
});

test("an interrupted swipe resumes at its fractional page without dropping either visible page", () => {
  const current = pagePosition({ from: 0, to: 4 }, 0.625);
  assert.equal(current, 2.5);
  assert.deepEqual(pagesCrossed(current, 0), [
    "Notes",
    "Prayer",
    "Home",
    "Bible",
  ]);
  assert.equal(pagePosition({ from: current, to: 0 }, 0), current);
  assert.equal(pagePosition({ from: current, to: 0 }, 1), 0);
});

test("distant journeys get more time on the shared page and indicator clock", () => {
  assert.equal(journeyDuration(0, 1), 430);
  assert.equal(journeyDuration(0, 4), 700);
  assert.equal(journeyDuration(4, 0), 700);
  assert.ok(journeyDuration(2.5, 0) > 430);
});

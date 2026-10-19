import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exposureOpacity,
  EXPOSURE_TAPS,
  MAX_MOTION_EXPOSURE,
  motionExposure,
} from "../src/services/motionExposure";

test("motion exposure follows actual lateral speed and reverses with direction", () => {
  assert.equal(motionExposure(1, 1, 16, 400), 0);
  assert.ok(Math.abs(motionExposure(1, 1.02, 16, 400) + 0.75) < 1e-10);
  assert.ok(Math.abs(motionExposure(1.02, 1, 16, 400) - 0.75) < 1e-10);
  assert.equal(motionExposure(1, 4, 16, 400), -MAX_MOTION_EXPOSURE);
  assert.ok(Math.abs(motionExposure(1, 1.02, 32, 400) + 0.375) < 1e-10);
});

test("a stalled clock or invalid layout cannot smear a stationary page", () => {
  for (const elapsed of [0, -1, 200, NaN]) {
    assert.equal(motionExposure(1, 2, elapsed, 400), 0);
  }
  assert.equal(motionExposure(1, 2, 16, 0), 0);
  assert.equal(motionExposure(1, Infinity, 16, 400), 0);
});

test("exposure weights preserve full brightness and native image composition", () => {
  assert.equal(EXPOSURE_TAPS.reduce((sum, tap) => sum + tap.weight, 0), 1);
  const sourceWeight = EXPOSURE_TAPS.slice(1).reduce(
    (remaining, _, index) => remaining * (1 - exposureOpacity(index + 1)),
    1,
  );
  assert.ok(Math.abs(sourceWeight - EXPOSURE_TAPS[0].weight) < 1e-10);
});

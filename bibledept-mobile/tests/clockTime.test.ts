import assert from "node:assert/strict";
import test from "node:test";
import { formatClockTime, to12Hour, to24Hour } from "../src/services/clockTime";

test("settings show midnight, noon, and evening on a 12-hour clock", () => {
  assert.equal(formatClockTime("00:00"), "12:00 AM");
  assert.equal(formatClockTime("12:00"), "12:00 PM");
  assert.equal(formatClockTime("19:30"), "7:30 PM");
  assert.equal(formatClockTime("09:00"), "9:00 AM");
  assert.equal(to24Hour({ hour: 12, minute: 0, period: "AM" }), "00:00");
  assert.equal(to24Hour({ hour: 12, minute: 0, period: "PM" }), "12:00");
});

test("every quarter hour round trips without changing stored reminder times", () => {
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const stored = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      assert.equal(to24Hour(to12Hour(stored)!), stored);
    }
  }
});

test("invalid clock values are rejected instead of silently normalizing", () => {
  for (const value of ["24:00", "12:60", "7:30", "-1:00", "19:30 PM", "", "aa:bb"]) {
    assert.equal(to12Hour(value), null);
    assert.equal(formatClockTime(value), "Choose time");
  }
  for (const hour of [0, 13, NaN, 1.5]) {
    assert.throws(() => to24Hour({ hour, minute: 0, period: "AM" }), RangeError);
  }
  assert.throws(() => to24Hour({ hour: 1, minute: 60, period: "PM" }), RangeError);
});

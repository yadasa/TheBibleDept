export type ClockTime = { hour: number; minute: number; period: "AM" | "PM" };

/** Storage uses HH:mm; the time controls always show a 12-hour clock. */
export function to12Hour(value: string): ClockTime | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  return {
    hour: hour % 12 || 12,
    minute,
    period: hour >= 12 ? "PM" : "AM",
  };
}

export function to24Hour({ hour, minute, period }: ClockTime): string {
  if (
    !Number.isInteger(hour) || hour < 1 || hour > 12 ||
    !Number.isInteger(minute) || minute < 0 || minute > 59 ||
    (period !== "AM" && period !== "PM")
  ) throw new RangeError("Choose a valid time.");
  return `${String(hour % 12 + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatClockTime(value: string): string {
  const time = to12Hour(value);
  return time
    ? `${time.hour}:${String(time.minute).padStart(2, "0")} ${time.period}`
    : "Choose time";
}

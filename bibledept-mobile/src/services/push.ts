import type { ResumeIntent } from "../../shared/reminders";
export const pushSupported = false;
export async function requestPushToken(
  _ask: boolean,
): Promise<{ token: string; platform: "ios" | "android" } | null> {
  throw new Error(
    "Push reminders need a signed iPhone or Android build on a physical device.",
  );
}
export function listenForPush(_listener: (data: ResumeIntent) => void) {
  return () => {};
}

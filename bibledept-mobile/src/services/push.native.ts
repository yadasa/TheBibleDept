import Constants, { ExecutionEnvironment } from "expo-constants";
import { isDevice } from "expo-device";
import { Platform } from "react-native";
import { parseResumeIntent, ResumeIntent } from "../../shared/reminders";
import { UserFacingError } from "./userMessage";
export const pushSupported =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  isDevice;
function notifications() {
  if (!pushSupported)
    throw new UserFacingError(
      "Reminders aren’t available here yet.",new Error("Push reminders need a signed native build on a physical device."),
    );
  return require("expo-notifications") as typeof import("expo-notifications");
}
export async function requestPushToken(
  ask: boolean,
): Promise<{ token: string; platform: "ios" | "android" } | null> {
  const n = notifications(),
    projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
  if (!projectId)
    throw new UserFacingError(
      "Reminders aren’t available right now. Please try again later.",new Error("This build needs its EAS project ID before push reminders can be registered."),
    );
  if (Platform.OS === "android")
    await n.setNotificationChannelAsync("reading-reminders", {
      name: "Reading reminders",
      importance: n.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
    });
  let permission = await n.getPermissionsAsync();
  if (permission.status !== "granted" && ask)
    permission = await n.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
  if (permission.status !== "granted") return null;
  return {
    token: (await n.getExpoPushTokenAsync({ projectId })).data,
    platform: Platform.OS as "ios" | "android",
  };
}
export function listenForPush(listener: (intent: ResumeIntent) => void) {
  if (!pushSupported) return () => {};
  const n = notifications();
  let active = true;
  n.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  const deliver = (data: unknown) => {
    const intent = parseResumeIntent(data);
    if (active && intent) listener(intent);
  };
  const subscription = n.addNotificationResponseReceivedListener((response) =>
    deliver(response.notification.request.content.data),
  );
  n.getLastNotificationResponseAsync()
    .then((response) => {
      if (response) deliver(response.notification.request.content.data);
    })
    .catch(() => {});
  return () => {
    active = false;
    subscription.remove();
  };
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { doc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  defaultPreferences,
  NotificationPreferences,
  ResumeIntent,
} from "../../shared/reminders";
import { useAuth } from "./AuthProvider";
import { callBackend, getFirebase } from "./firebase";
import { USER_COLLECTION } from "./dataPaths";
import { listenForPush, pushSupported, requestPushToken } from "./push";
export { pushSupported } from "./push";
type Binding = { owner: string; installationId: string; accountScope: string };
const bindingKey = "bibledept.pushBinding",
  installationKey = "bibledept.installation";
async function installation() {
  let id = await AsyncStorage.getItem(installationKey);
  if (!id) {
    id = randomUUID();
    await AsyncStorage.setItem(installationKey, id);
  }
  return id;
}
export async function detachPushDevice(owner: string) {
  const raw = await AsyncStorage.getItem(bindingKey);
  if (!raw) return;
  const binding = JSON.parse(raw) as Binding;
  if (binding.owner !== owner) return;
  await AsyncStorage.removeItem(bindingKey);
  // Sign-out still works offline. Stale lock-screen messages contain generic copy only.
  await Promise.race([
    callBackend(
      "unregisterPushDevice",
      { installationId: binding.installationId },
      owner,
    ).catch(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, 1500)),
  ]);
}
type Notifications = {
  prefs: NotificationPreferences;
  busy: boolean;
  error: string;
  binding: Binding | null;
  intent: ResumeIntent | null;
  save: (value: NotificationPreferences) => Promise<void>;
  enable: () => Promise<void>;
  consume: () => void;
};
const Context = createContext<Notifications | null>(null);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <Session key={user?.uid || "guest"} owner={user?.uid}>
      {children}
    </Session>
  );
}
function Session({ owner, children }: { owner?: string; children: ReactNode }) {
  const [prefs, setPrefs] = useState(defaultPreferences),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [binding, setBinding] = useState<Binding | null>(null),
    [intent, setIntent] = useState<ResumeIntent | null>(null);
  const lock = useRef(false),
    active = useRef(true),
    currentBinding = useRef<Binding | null>(null),
    seen = useRef(new Set<string>());
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    if (!owner) return;
    const stop = onSnapshot(
      doc(
        getFirebase().db,
        USER_COLLECTION,
        owner,
        "settings",
        "notifications",
      ),
      (snapshot) => setPrefs({ ...defaultPreferences, ...snapshot.data() }),
      () => setError("We couldn’t load your reminder settings. Check your connection."),
    );
    let mounted = true;
    AsyncStorage.getItem(bindingKey)
      .then((raw) => {
        if (mounted && raw) {
          const b = JSON.parse(raw) as Binding;
          if (b.owner === owner) {
            currentBinding.current = b;
            setBinding(b);
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
      stop();
    };
  }, [owner]);
  useEffect(() => {
    if (!owner || !binding) return;
    return listenForPush((data) => {
      if (
        data.accountScope !== binding.accountScope ||
        seen.current.has(data.notificationId)
      )
        return;
      seen.current.add(data.notificationId);
      setIntent(data);
    });
  }, [owner, binding?.accountScope]);
  useEffect(() => {
    if (!owner) return;
    let running = false;
    async function heartbeat() {
      if (running || AppState.currentState !== "active") return;
      running = true;
      try {
        await callBackend(
          "readingForeground",
          { installationId: await installation() },
          owner,
        );
      } catch {
      } finally {
        running = false;
      }
    }
    void heartbeat();
    const timer = setInterval(heartbeat, 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void heartbeat();
        void refresh();
      }
    });
    async function refresh() {
      if (!pushSupported || !currentBinding.current) return;
      try {
        const token = await requestPushToken(false);
        if (!token) {
          await detachPushDevice(owner!);
          currentBinding.current = null;
          if (active.current) setBinding(null);
        } else {
          const saved = await callBackend<Omit<Binding, "owner">>(
            "registerPushDevice",
            {
              installationId: currentBinding.current.installationId,
              expoPushToken: token.token,
              platform: token.platform,
              permissionStatus: "granted",
            },
            owner,
          );
          if (active.current) {
            const next = { owner: owner!, ...saved };
            currentBinding.current = next;
            setBinding(next);
            await AsyncStorage.setItem(bindingKey, JSON.stringify(next));
          }
        }
      } catch {}
    }
    void refresh();
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [owner, binding?.accountScope]);
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      if (active.current) setError((e as Error).message);
      throw e;
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function save(value: NotificationPreferences) {
    await run(async () => {
      await callBackend("updateNotificationPreferences", value, owner);
    });
  }
  async function enable() {
    await run(async () => {
      if (!owner) throw new Error("Sign in to choose reminders.");
      const token = await requestPushToken(true);
      if (!token)
        throw new Error(
          "Notifications are off for this app. You can enable them in your device settings.",
        );
      const id = await installation(),
        b = await callBackend<Omit<Binding, "owner">>(
          "registerPushDevice",
          {
            installationId: id,
            expoPushToken: token.token,
            platform: token.platform,
            permissionStatus: "granted",
          },
          owner,
        ),
        next = { owner, ...b };
      await AsyncStorage.setItem(bindingKey, JSON.stringify(next));
      if (!active.current) return;
      currentBinding.current = next;
      setBinding(next);
      await callBackend(
        "updateNotificationPreferences",
        { ...prefs, enabled: true, preferredInstallationId: id },
        owner,
      );
    });
  }
  function consume() {
    if (intent)
      void callBackend("readingReminderOpened", intent, owner).catch(() => {});
    setIntent(null);
  }
  return (
    <Context.Provider
      value={{ prefs, busy, error, binding, intent, save, enable, consume }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error("NotificationProvider is missing.");
  return value;
}

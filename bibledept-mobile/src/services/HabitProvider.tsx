import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
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
  chapterFromReference,
  Completion,
  currentStreak,
  emptyStreak,
  localDate,
  Receipt,
  Streak,
} from "../../shared/habits";
import { useAuth } from "./AuthProvider";
import { Passage } from "./bible";
import { callBackend, getFirebase } from "./firebase";
import { USER_COLLECTION } from "./dataPaths";
import { messageForUser, UserFacingError } from "./userMessage";
import { withRequestDeadline } from "./requestDeadline";

const setupTimeout="We couldn’t confirm your reading time zone yet. Check your connection and try again.";
const setupFailure="We couldn’t confirm your reading time zone. Please try again.";
type Habit = {
  zone: string | null;
  ready: boolean;
  loading: boolean;
  streak: Streak;
  current: number;
  today: string;
  days: string[];
  busy: boolean;
  error: string;
  pending: Completion | null;
  receipt: Receipt | null;
  configure: (zone: string) => Promise<void>;
  complete: (
    passage: Passage,
    source: "reader" | "plan",
    planDay?: number,
  ) => Promise<void>;
  retry: () => Promise<void>;
  discard: () => Promise<void>;
};
const Context = createContext<Habit | null>(null);
export function HabitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <HabitSession key={user?.uid || "guest"} owner={user?.uid}>
      {children}
    </HabitSession>
  );
}
function HabitSession({
  owner,
  children,
}: {
  owner?: string;
  children: ReactNode;
}) {
  const [zone, setZone] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState(!!owner);
  const [streak, setStreak] = useState<Streak>(emptyStreak),
    [days, setDays] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<Receipt | null>(null);
  const [pending, setPending] = useState<Completion | null>(null),
    pendingRef = useRef<Completion | null>(null),
    locked = useRef(false),
    mounted = useRef(true),
    [queueReady, setQueueReady] = useState(false),
    [now, setNow] = useState(Date.now());
  const confirmedZone=useRef<string|null>(null);
  const key = `bibledept.pendingReading.${owner}`;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (!owner) {
      setQueueReady(true);
      return;
    }
    AsyncStorage.getItem(key)
      .then((value) => {
        if (active && value) {
          const saved = JSON.parse(value) as Completion;
          pendingRef.current = saved;
          setPending(saved);
        }
        if (active) setQueueReady(true);
      })
      .catch(() => {
        if (active)
          setError(
            "We couldn’t open your unsaved reading. Restart the app to try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [key, owner]);
  useEffect(() => {
    if (!owner) return;
    const db = getFirebase().db,
      base = [USER_COLLECTION, owner] as const;
    const failed = () => {
      setLoading(false);
      setError("We couldn’t load your reading history. Check your connection.");
    };
    const unsubscribers = [
      onSnapshot(
        doc(db, ...base, "settings", "readingHabit"),
        (snapshot) => {
          const confirmed=snapshot.data()?.migrationComplete===true;
          confirmedZone.current=confirmed?snapshot.data()?.timeZone||null:null;
          setZone(snapshot.data()?.timeZone || null);
          setReady(confirmed);
          // A migration can finish after a client timeout; its saved result wins.
          if(confirmed)setError(value=>value===setupTimeout||value===setupFailure?'':value);
          setLoading(false);
        },
        failed,
      ),
      onSnapshot(
        doc(db, ...base, "stats", "streak"),
        (snapshot) => setStreak((snapshot.data() || emptyStreak) as Streak),
        failed,
      ),
      onSnapshot(
        query(
          collection(db, ...base, "habitDays"),
          orderBy("localDate", "desc"),
          limit(31),
        ),
        (snapshot) => setDays(snapshot.docs.map((d) => d.id)),
        failed,
      ),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [owner]);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 30000),
      subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") update();
      });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  async function run(action: () => Promise<void>,fallback="We couldn’t save your reading. Please try again.") {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (mounted.current)
        setError(
          messageForUser(e,fallback),
        );
      throw e;
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function send(saved: Completion) {
    const result = await callBackend<Receipt>("completeReading", saved, owner);
    await AsyncStorage.removeItem(key);
    pendingRef.current = null;
    if (mounted.current) {
      setPending(null);
      setReceipt(result);
      setNow(Date.now());
    }
  }
  async function configure(value: string) {
    await run(async () => {
      // Include credential preparation; the SDK's own timeout starts after it.
      // The server's resumable migration can continue after this UI deadline.
      try {
        await withRequestDeadline(
          ()=>callBackend("configureReadingHabit", { timeZone: value }, owner),
          20000,setupTimeout,
        );
      }catch(error){if(confirmedZone.current!==value)throw error;}
    },setupFailure);
  }
  async function complete(
    passage: Passage,
    source: "reader" | "plan",
    planDay?: number,
  ) {
    await run(async () => {
      if (!owner || !ready || !zone || !queueReady)
        throw new UserFacingError(
          "Choose your reading time zone in Account → Preferences before tracking reading days.",
        );
      const chapterId = chapterFromReference(passage.reference);
      if (!chapterId)
        throw new UserFacingError(
          "Read a whole chapter to count a reading day. You can save selected verses in Notes.",
        );
      const existing = pendingRef.current;
      if (existing) {
        if (existing.chapterId !== chapterId)
          throw new UserFacingError(
            "Save or discard the unfinished reading before saving another chapter.",
          );
        await send(existing);
        return;
      }
      const saved: Completion = {
        sessionId: randomUUID(),
        chapterId,
        translation: passage.translation_id,
        source,
        ...(planDay ? { planDay } : {}),
        expectedHabitDate: localDate(Date.now(), zone),
      };
      await AsyncStorage.setItem(key, JSON.stringify(saved));
      pendingRef.current = saved;
      if (mounted.current) setPending(saved);
      await send(saved);
    });
  }
  async function retry() {
    await run(async () => {
      if (pendingRef.current) await send(pendingRef.current);
    });
  }
  async function discard() {
    await run(async () => {
      await AsyncStorage.removeItem(key);
      pendingRef.current = null;
      setPending(null);
    });
  }
  const today = localDate(
    now,
    zone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  return (
    <Context.Provider
      value={{
        zone,
        ready,
        loading,
        streak,
        current: currentStreak(streak, today),
        today,
        days,
        busy,
        error,
        pending,
        receipt,
        configure,
        complete,
        retry,
        discard,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useHabit() {
  const habit = useContext(Context);
  if (!habit) throw new Error("HabitProvider is missing.");
  return habit;
}

import { randomUUID } from "expo-crypto";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Annotation, validAnnotation } from "../../shared/annotations";
import { useAuth } from "./AuthProvider";
import { USER_COLLECTION } from "./dataPaths";
import { getFirebase } from "./firebase";
export type { Annotation } from "../../shared/annotations";
const Context = createContext({
  notes: [] as Annotation[],
  error: "",
  loading: false,
  hasMore: false,
  loadMore: () => {},
});
export function NotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <NotesSession key={user?.uid || "guest"} owner={user?.uid}>
      {children}
    </NotesSession>
  );
}
function NotesSession({
  owner,
  children,
}: {
  owner?: string;
  children: ReactNode;
}) {
  const [notes, setNotes] = useState<Annotation[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!!owner),
    [count, setCount] = useState(50);
  useEffect(() => {
    if (!owner) return;
    setLoading(true);
    return onSnapshot(
      query(
        collection(getFirebase().db, USER_COLLECTION, owner, "annotations"),
        orderBy("updatedAt", "desc"),
        limit(count),
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        setNotes(
          snapshot.docs.map(
            (d) =>
              ({
                ...d.data(),
                id: d.id,
                pending: d.metadata.hasPendingWrites,
              }) as Annotation,
          ),
        );
        setLoading(false);
        setError("");
      },
      () => {
        setLoading(false);
        setError("Your notes could not load. Check your connection.");
      },
    );
  }, [owner, count]);
  return (
    <Context.Provider
      value={{
        notes,
        error,
        loading,
        hasMore: notes.length === count,
        loadMore: () => setCount((n) => n + 50),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useNotes = () => useContext(Context);
export function usePassageAnnotations(
  chapterIds: string[],
  translation: string,
) {
  const { user } = useAuth(),
    key = `${user?.uid}:${translation}:${chapterIds.join(",")}`;
  const [result, setResult] = useState<{
    key: string;
    notes: Annotation[];
    error: string;
  }>({ key: "", notes: [], error: "" });
  useEffect(() => {
    if (!user || !chapterIds.length) return;
    // API passages may span chapters; one bounded equality listener per loaded chapter.
    const groups = new Map<string, Annotation[]>();
    const subscriptions = chapterIds.map((chapter) =>
      onSnapshot(
        query(
          collection(
            getFirebase().db,
            USER_COLLECTION,
            user.uid,
            "annotations",
          ),
          where("chapterId", "==", chapter),
          where("translation", "==", translation),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          groups.set(
            chapter,
            snapshot.docs.map(
              (d) =>
                ({
                  ...d.data(),
                  id: d.id,
                  pending: d.metadata.hasPendingWrites,
                }) as Annotation,
            ),
          );
          setResult({ key, notes: [...groups.values()].flat(), error: "" });
        },
        () =>
          setResult({
            key,
            notes: [],
            error: "Highlights could not load. Check your connection.",
          }),
      ),
    );
    return () => subscriptions.forEach((stop) => stop());
  }, [key]);
  return result.key === key ? result : { notes: [], error: "" };
}
function ownerPath(owner: string) {
  if (getFirebase().auth.currentUser?.uid !== owner)
    throw new Error("Sign in to save your note.");
  return collection(getFirebase().db, USER_COLLECTION, owner, "annotations");
}
export async function saveAnnotation(
  owner: string,
  value: Omit<Annotation, "id">,
  existingId?: string,
) {
  if (!validAnnotation(value))
    throw new Error(
      "Select verses and choose a highlight or add a comment (up to 3,000 characters).",
    );
  const { pending, ...clean } = value;
  const ref = doc(ownerPath(owner), existingId || randomUUID());
  if (existingId)
    await updateDoc(ref, { ...clean, updatedAt: serverTimestamp() });
  else
    await setDoc(ref, {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
}
export async function removeAnnotation(owner: string, id: string) {
  await deleteDoc(doc(ownerPath(owner), id));
}

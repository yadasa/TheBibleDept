import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Passage } from "../services/bible";
import { useTheme, useThemedStyles, Colors, typography as t } from "../theme";
import { useReadingText } from "./ReaderControls";
import { AnnotationEditor, highlightBackground } from "./AnnotationEditor";
import { ActionButton, Notice } from "./ui";
import { useAuth } from "../services/AuthProvider";
import { usePassageAnnotations, Annotation } from "../services/NotesProvider";
import { annotationRange } from "../../shared/annotations";

export function PassageView({ passage }: { passage: Passage }) {
  const { c, s } = useThemedStyles(styles);
  const { fontSize } = useReadingText();
  const { user } = useAuth(),
    { mode } = useTheme(),
    [selecting, setSelecting] = useState(false),
    [selection, setSelection] = useState<{
      chapterId: string;
      first: number;
      last: number;
      reference: string;
    } | null>(null),
    [editing, setEditing] = useState<Annotation | null>(null);
  const chapterIds = [
    ...new Set(passage.verses.map((v) => `${v.book_id}.${v.chapter}`)),
  ];
  const notes = usePassageAnnotations(chapterIds, passage.translation_id);
  function choose(index: number) {
    const v = passage.verses[index],
      chapterId = `${v.book_id}.${v.chapter}`;
    setSelection((old) =>
      old?.chapterId === chapterId
        ? { ...old, last: v.verse }
        : {
            chapterId,
            first: v.verse,
            last: v.verse,
            reference: `${v.book_name} ${v.chapter}`,
          },
    );
  }
  function annotate() {
    if (!selection) return;
    const range = annotationRange(selection.first, selection.last);
    const excerpt = passage.verses
      .filter(
        (v) =>
          `${v.book_id}.${v.chapter}` === selection.chapterId &&
          v.verse >= range.verseStart &&
          v.verse <= range.verseEnd,
      )
      .map((v) => v.text.trim())
      .join(" ")
      .slice(0, 1200);
    setEditing({
      id: "",
      chapterId: selection.chapterId,
      reference: selection.reference,
      translation: passage.translation_id,
      ...range,
      excerpt,
      color: "gold",
      comment: "",
    });
  }
  const multipleChapters = passage.verses.some(
    (verse) => verse.chapter !== passage.verses[0].chapter,
  );
  return (
    <View style={s.paper}>
      <Text accessibilityRole="header" style={s.reference}>
        {passage.reference}
      </Text>
      <Text style={s.translation}>{passage.translation_name}</Text>
      {user ? (
        <View style={{ marginBottom: 20 }}>
          <ActionButton
            title={
              selecting ? "Cancel verse selection" : "Highlight or comment"
            }
            secondary
            onPress={() => {
              setSelecting(!selecting);
              setSelection(null);
            }}
          />
          {selecting && (
            <>
              <Notice text="Tap the first and last verse of a section in one chapter. Tap just one verse to select it." />
              {selection && (
                <>
                  <Notice
                    text={`Selected ${selection.reference}:${Math.min(selection.first, selection.last)}–${Math.max(selection.first, selection.last)}`}
                  />
                  <ActionButton
                    title="Annotate selected verses"
                    onPress={annotate}
                  />
                </>
              )}
            </>
          )}
        </View>
      ) : (
        <Notice text="Sign in under Account to highlight verses and keep private notes." />
      )}
      {!!notes.error && <Notice text={notes.error} error />}
      {passage.verses.map((verse, index) => (
        <View key={`${verse.book_id}:${verse.chapter}:${verse.verse}`}>
          {multipleChapters &&
            (index === 0 ||
              passage.verses[index - 1].chapter !== verse.chapter) && (
              <Text style={s.chapter}>Chapter {verse.chapter}</Text>
            )}
          {(() => {
            const chapterId = `${verse.book_id}.${verse.chapter}`,
              note = notes.notes.find(
                (n) =>
                  n.chapterId === chapterId &&
                  n.verseStart <= verse.verse &&
                  n.verseEnd >= verse.verse,
              );
            const selected =
              selecting &&
              selection?.chapterId === chapterId &&
              verse.verse >= Math.min(selection.first, selection.last) &&
              verse.verse <= Math.max(selection.first, selection.last);
            const content = (
              <Text
                selectable={!selecting}
                style={[
                  s.verse,
                  {
                    fontSize,
                    lineHeight: fontSize * 1.6,
                    backgroundColor: selected
                      ? c.tint
                      : note
                        ? highlightBackground(note.color, mode === "dark")
                        : "transparent",
                    borderLeftWidth: selected ? 3 : 0,
                    borderLeftColor: c.action,
                    paddingLeft: selected ? 8 : 0,
                  },
                ]}
              >
                <Text style={s.number}>{verse.verse} </Text>
                {verse.text.trim()}
              </Text>
            );
            return (
              <>
                {selecting ? (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Select verse ${verse.verse}: ${verse.text.trim()}`}
                    aria-checked={!!selected}
                    accessibilityState={{ checked: !!selected }}
                    onPress={() => choose(index)}
                  >
                    {content}
                  </Pressable>
                ) : (
                  content
                )}
                {!selecting && note && note.verseStart === verse.verse && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit note on verse ${verse.verse}`}
                    onPress={() => setEditing(note)}
                    style={{
                      minHeight: 44,
                      justifyContent: "center",
                      marginBottom: 16,
                      borderLeftWidth: 2,
                      borderLeftColor: c.action,
                      paddingLeft: 12,
                    }}
                  >
                    <Text style={{ ...t.meta, color: c.action }}>
                      {note.comment || "Highlighted · Add a comment"}
                      {note.pending ? " · Syncing…" : ""}
                    </Text>
                  </Pressable>
                )}
              </>
            );
          })()}
        </View>
      ))}
      {selecting && selection && (
        <ActionButton title="Annotate selected verses" onPress={annotate} />
      )}
      {!!editing && user && (
        <AnnotationEditor
          key={
            editing.id ||
            `${editing.chapterId}:${editing.verseStart}:${editing.verseEnd}`
          }
          annotation={editing}
          onClose={() => {
            setEditing(null);
            setSelection(null);
            setSelecting(false);
          }}
        />
      )}
    </View>
  );
}
const styles = (c: Colors) =>
  StyleSheet.create({
    paper: { paddingTop: 8 },
    reference: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "700",
      letterSpacing: -0.7,
      color: c.ink,
    },
    translation: { ...t.meta, color: c.muted, marginTop: 6, marginBottom: 28 },
    chapter: { ...t.label, color: c.action, marginTop: 16, marginBottom: 16 },
    verse: { color: c.ink, marginBottom: 16 },
    number: { fontSize: 13, fontWeight: "600", color: c.action },
  });
